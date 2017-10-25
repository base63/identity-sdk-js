import { wrap } from 'async-middleware'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import * as moment from 'moment'
import { MarshalFrom } from 'raynor'

import { Env, isLocal } from '@base63/common-js'

import { AuthInfo } from '../auth-info'
import { IdentityClient } from '../client'
import { RequestWithIdentity } from '../request'


/**
 * The requirements for the session a request belongs to.
 */
export enum SessionLevel {
    /** It isn't necessary for a session to exist. If it exists, we use it, but if it doesn't we create a new one. */
    None,
    /** A session must exist and it's going to be attached to the request. */
    Session,
    /** A session for a user account must exist and it's going to be attached to the request. */
    SessionAndUser
}

/**
 * Where to find the session information.
 */
export enum SessionInfoSource {
    /** Can be found as a cookie. Usually used for frontend services. */
    Cookie,
    /** Can be found as a special header. Usually used for API services. */
    Header
}


/**
 * Create a connect middleware which populates the incoming request's {@link RequestWithIdentity.session} property
 * with a {@link Session} object. It does this by looking at either cookies or headers in the HTTP request, extracting
 * authentication information and using this to retrieve data about the session and potentially user from the identity
 * service. It also re-attaches the auth info to the response, as either a cookie or a header.
 * @param sessionLevel - how much of a session to expect to exist.
 * @param sessionInfoSource - where to extract the session from the request, and where to place the session info on
 *     the response.
 * @param env - the environment the code is running in.
 * @param identityClient - an {@link IdentityClient} for communicating with the identity service.
 * @returns A connect middleware of type {@link express.RequestHandler}.
 */
export function newSessionMiddleware(
    sessionLevel: SessionLevel,
    sessionInfoSource: SessionInfoSource,
    env: Env,
    identityClient: IdentityClient): express.RequestHandler {
    const authInfoMarshaller = new (MarshalFrom(AuthInfo))();
    const cookieParserMiddleware = cookieParser();

    let mustHaveSession = false;
    let mustHaveUser = false;

    // A nice use of switch fall through.
    switch (sessionLevel) {
        case SessionLevel.SessionAndUser:
            mustHaveUser = true;
        case SessionLevel.Session:
            mustHaveSession = true;
    }

    return wrap(async (req: RequestWithIdentity, res: express.Response, next: express.NextFunction) => {
        cookieParserMiddleware(req, res, () => {
            let authInfoSerialized: string | null = null;

            // Try to retrieve any side-channel auth information in the request. This can appear
            // either as a cookie with the name AuthInfo.CookieName, or as a header with the name
            // AuthInfo.HeaderName.
            if (sessionInfoSource == SessionInfoSource.Cookie && req.cookies[AuthInfo.CookieName] != undefined) {
                authInfoSerialized = req.cookies[AuthInfo.CookieName];
            } else if (sessionInfoSource == SessionInfoSource.Header && req.header(AuthInfo.HeaderName) != undefined) {
                try {
                    authInfoSerialized = JSON.parse(req.header(AuthInfo.HeaderName) as string);
                } catch (e) {
                    authInfoSerialized = null;
                }
            }

            // Treat the case of no auth info. If it's required the request handling is stopped with an
            // error, otherwise future handlers are invoked.
            if (authInfoSerialized == null) {
                if (mustHaveSession) {
                    req.log.warn('Expected some auth info but there was none');
                    res.status(HttpStatus.BAD_REQUEST);
                    res.end();
                    return;
                }

                identityClient
                    .getOrCreateSession()
                    .then(([authInfo, session]) => {
                        req.authInfo = authInfo;
                        req.session = session;
                        setAuthInfoOnResponse(res, authInfo, sessionInfoSource, env);
                        next();
                    })
                    .catch(e => {
                        req.log.error(e);
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                        res.end();
                    });
                return;
            }

            // If there is some auth info, let's extract it.
            let authInfo: AuthInfo | null = null;
            try {
                authInfo = authInfoMarshaller.extract(authInfoSerialized);
            } catch (e) {
                req.log.error(e);
                res.status(HttpStatus.BAD_REQUEST);
                res.end();
                return;
            }

            // Treat the case of incomplete auth info. If we're supposed to also have a user, but there
            // is none, the request handling is stopped with an error.
            if (mustHaveUser && authInfo.auth0AccessToken == null) {
                req.log.warn('Expected auth token but none was had');
                res.status(HttpStatus.BAD_REQUEST);
                res.end();
                return;
            }

            // Actually retrieve the session info and attach it to the request.
            if (authInfo.auth0AccessToken == null) {
                identityClient
                    .withContext(authInfo as AuthInfo)
                    .getSession()
                    .then(session => {
                        req.authInfo = authInfo as AuthInfo;
                        req.session = session;
                        setAuthInfoOnResponse(res, authInfo as AuthInfo, sessionInfoSource, env);
                        next();
                    })
                    .catch(e => {
                        if (e.name == 'UnauthorizedIdentityError') {
                            res.status(HttpStatus.UNAUTHORIZED);
                            res.end();
                            return;
                        }

                        if (e.name == 'IdentityError') {
                            res.status(HttpStatus.BAD_GATEWAY);
                            res.end();
                            return;
                        }

                        req.log.error(e);
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                        res.end();
                        return;
                    });
            } else {
                identityClient
                    .withContext(authInfo as AuthInfo)
                    .getUserOnSession()
                    .then((session) => {
                        req.authInfo = authInfo as AuthInfo;
                        req.session = session;
                        setAuthInfoOnResponse(res, authInfo as AuthInfo, sessionInfoSource, env);
                        next();
                    })
                    .catch(e => {
                        if (e.name == 'UnauthorizedIdentityError') {
                            res.status(HttpStatus.UNAUTHORIZED);
                            res.end();
                            return;
                        }

                        if (e.name == 'IdentityError') {
                            res.status(HttpStatus.BAD_GATEWAY);
                            res.end();
                            return;
                        }

                        req.log.error(e);
                        res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                        res.end();
                        return;
                    });
            }
        });
    });
}


export function setAuthInfoOnResponse(res: express.Response, authInfo: AuthInfo, sessionInfoSource: SessionInfoSource, env: Env) {
    const authInfoMarshaller = new (MarshalFrom(AuthInfo))();

    switch (sessionInfoSource) {
        case SessionInfoSource.Cookie:
            res.cookie(AuthInfo.CookieName, authInfoMarshaller.pack(authInfo), {
                httpOnly: true,
                secure: !isLocal(env),
                expires: moment.utc().add('days', 10000).toDate(),
                sameSite: 'lax'
            });
            break;
        case SessionInfoSource.Header:
            res.setHeader(AuthInfo.HeaderName, JSON.stringify(authInfoMarshaller.pack(authInfo)));
            break;
    }
}


export function clearAuthInfoOnResponse(res: express.Response, sessionInfoSource: SessionInfoSource, env: Env) {
    switch (sessionInfoSource) {
        case SessionInfoSource.Cookie:
            res.clearCookie(AuthInfo.CookieName, { httpOnly: true, secure: !isLocal(env) });
            break;
        case SessionInfoSource.Header:
            res.removeHeader(AuthInfo.HeaderName);
            break;
    }
}
