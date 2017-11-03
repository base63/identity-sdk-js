import { wrap } from 'async-middleware'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import { ExtractError, MarshalFrom, MarshalWith, OptionalOf, StringMarshaller } from 'raynor'

import { Env } from '@base63/common-js'
import { WebFetcher } from '@base63/common-server-js'

import { Auth0Config } from '../auth0'
import { PostLoginRedirectInfo, PostLoginRedirectInfoMarshaller } from '../auth-flow'
import { IdentityClient } from '../client'
import { RequestWithIdentity } from '../request'
import {
    newSessionMiddleware,
    SessionLevel,
    SessionInfoSource,
    setSessionTokenOnResponse,
    clearSessionTokenOnResponse
} from './session-middleware'
import { SessionToken } from '../session-token'


class Auth0AccessTokenMarshaller extends StringMarshaller {
    private static readonly _alnumRegExp: RegExp = new RegExp('^[0-9a-zA-Z_-]+$');

    filter(s: string): string {
        if (s.length == 0) {
            throw new ExtractError('Expected a string to be non-empty');
        }

        if (!Auth0AccessTokenMarshaller._alnumRegExp.test(s)) {
            throw new ExtractError('Should only contain alphanumerics');
        }

        return s;
    }
}


class Auth0AuthorizationCodeMarshaller extends StringMarshaller {
    private static readonly _alnumRegExp: RegExp = new RegExp('^[0-9a-zA-Z_-]+$');

    filter(s: string): string {
        if (s.length == 0) {
            throw new ExtractError('Expected a string to be non-empty');
        }

        if (!Auth0AuthorizationCodeMarshaller._alnumRegExp.test(s)) {
            throw new ExtractError('Should only contain alphanumerics');
        }

        return s;
    }
}


class Auth0AuthorizeRedirectInfo {
    @MarshalWith(OptionalOf(Auth0AuthorizationCodeMarshaller), 'code')
    authorizationCode: string | null;

    @MarshalWith(PostLoginRedirectInfoMarshaller)
    state: PostLoginRedirectInfo;
}


class Auth0TokenExchangeResult {
    @MarshalWith(Auth0AccessTokenMarshaller, 'access_token')
    accessToken: string;
}


const AUTHORIZE_OPTIONS = {
    method: 'POST',
    mode: 'cors',
    cache: 'no-cache',
    redirect: 'error',
    referrer: 'client',
    headers: {
        'Content-Type': 'application/json'
    }
};

export function newAuth0AuthFlowRouter(env: Env, auth0Config: Auth0Config, webFetcher: WebFetcher, identityClient: IdentityClient): express.Router {
    const auth0TokenExchangeResultMarshaller = new (MarshalFrom(Auth0TokenExchangeResult))();
    const auth0AuthorizeRedirectInfoMarshaller = new (MarshalFrom(Auth0AuthorizeRedirectInfo))();

    const router = express.Router();

    router.use(newSessionMiddleware(SessionLevel.Session, SessionInfoSource.Cookie, env, identityClient))

    router.get('/login', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        let redirectInfo: Auth0AuthorizeRedirectInfo | null = null;
        try {
            redirectInfo = auth0AuthorizeRedirectInfoMarshaller.extract(req.query);
        } catch (e) {
            req.log.error('Auth error');
            req.errorLog.error(e);
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        const options = (Object as any).assign({}, AUTHORIZE_OPTIONS, {
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: auth0Config.clientId,
                client_secret: auth0Config.clientSecret,
                code: redirectInfo.authorizationCode,
                redirect_uri: auth0Config.loginCallbackUri
            })
        });

        let rawResponse: Response;
        try {
            rawResponse = await webFetcher.fetch(`https://${auth0Config.domain}/oauth/token`, options);
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        let auth0TokenExchangeResult: Auth0TokenExchangeResult | null = null;
        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                auth0TokenExchangeResult = auth0TokenExchangeResultMarshaller.extract(jsonResponse);
            } catch (e) {
                req.log.error(e, 'Deserialization error');
                req.errorLog.error(e);
                res.status(HttpStatus.INTERNAL_SERVER_ERROR);
                res.end();
                return;
            }
        } else {
            req.log.error(`Auth error - bad code ${rawResponse.status}`);
            req.errorLog.error(`Auth error - bad code ${rawResponse.status}`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        let sessionToken = new SessionToken((req.sessionToken).sessionId, auth0TokenExchangeResult.accessToken);

        try {
            sessionToken = (await identityClient.withContext(sessionToken).getOrCreateUserOnSession(req.session))[0];
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        setSessionTokenOnResponse(res, sessionToken, SessionInfoSource.Cookie, env);
        res.redirect(redirectInfo.state.path);
    }));

    router.get('/logout', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            await identityClient.withContext(req.sessionToken as SessionToken).removeSession(req.session);
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        clearSessionTokenOnResponse(res, SessionInfoSource.Cookie, env);
        res.redirect('/');
    }));

    return router;
}
