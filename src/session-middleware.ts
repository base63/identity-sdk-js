import { wrap } from 'async-middleware'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import { MarshalFrom } from 'raynor'

import { AuthInfo } from './auth-info'
import { IdentityClient } from './client'
import { RequestWithIdentity } from './requests'


export enum SessionLevel {
    None,
    Session,
    SessionAndUser
}


export function newSessionMiddleware(sessionLevel: SessionLevel, identityClient: IdentityClient): express.RequestHandler {
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
            if (req.cookies[AuthInfo.CookieName] != undefined) {
                authInfoSerialized = req.cookies[AuthInfo.CookieName];
            } else if (req.header(AuthInfo.HeaderName) != undefined) {
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

                // Fire away.
                req.session = null;
                next();
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
                        req.session = session;
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
                        req.session = session;
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
