import { wrap } from 'async-middleware'
import * as express from 'express'
import * as HttpStatus from 'http-status-codes'
import { MarshalFrom, MarshalWith, OptionalOf } from 'raynor'

import { Env } from '@base63/common-js'
import { WebFetcher } from '@base63/common-server-js'

import {
    Auth0AccessTokenMarshaller,
    Auth0AuthorizationCodeMarshaller,
    AuthInfo,
} from './auth-info'
import { Auth0Config, PostLoginRedirectInfo, PostLoginRedirectInfoMarshaller } from './auth-flow'
import { IdentityClient } from './client'
import { RequestWithIdentity } from './request'
import {
    newSessionMiddleware,
    SessionLevel,
    SessionInfoSource,
    setAuthInfoOnResponse,
    clearAuthInfoOnResponse
} from './session-middleware'


export class Auth0AuthorizeRedirectInfo {
    @MarshalWith(OptionalOf(Auth0AuthorizationCodeMarshaller), 'code')
    authorizationCode: string | null;

    @MarshalWith(PostLoginRedirectInfoMarshaller)
    state: PostLoginRedirectInfo;
}


export class Auth0TokenExchangeResult {
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

export function newAuthFlowRouter(env: Env, auth0Config: Auth0Config, webFetcher: WebFetcher, identityClient: IdentityClient): express.Router {
    const auth0TokenExchangeResultMarshaller = new (MarshalFrom(Auth0TokenExchangeResult))();
    const auth0AuthorizeRedirectInfoMarshaller = new (MarshalFrom(Auth0AuthorizeRedirectInfo))();

    const authFlowRouter = express.Router();

    authFlowRouter.use(newSessionMiddleware(SessionLevel.Session, SessionInfoSource.Cookie, env, identityClient))

    authFlowRouter.get('/login', wrap(async (req: RequestWithIdentity, res: express.Response) => {
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
                redirect_uri: auth0Config.callbackUri
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

        let authInfo = new AuthInfo((req.authInfo).sessionId, auth0TokenExchangeResult.accessToken);

        try {
            authInfo = (await identityClient.withContext(authInfo).getOrCreateUserOnSession(req.session))[0];
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        setAuthInfoOnResponse(res, authInfo, SessionInfoSource.Cookie, env);
        res.redirect(redirectInfo.state.path);
    }));

    authFlowRouter.get('/logout', wrap(async (req: RequestWithIdentity, res: express.Response) => {
        try {
            await identityClient.withContext(req.authInfo as AuthInfo).expireSession(req.session);
        } catch (e) {
            req.log.error(e);
            req.errorLog.error(e);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR);
            res.end();
            return;
        }

        clearAuthInfoOnResponse(res, SessionInfoSource.Cookie, env);
        res.redirect('/');
    }));

    return authFlowRouter;
}
