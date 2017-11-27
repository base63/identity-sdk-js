import { expect } from 'chai'
import * as express from 'express'
import 'mocha'
import * as td from 'testdouble'
import * as uuid from 'uuid'

import { Env } from '@base63/common-js'

import {
    clearSessionTokenOnResponse,
    newSessionMiddleware,
    setSessionTokenOnResponse,
    SessionInfoSource,
    SessionLevel
} from './session-middleware'
import {
    IdentityClient,
    SESSION_TOKEN_COOKIE_NAME,
    SESSION_TOKEN_HEADER_NAME
} from '../client'
import {
    Session,
    SessionState
} from '../entities'
import { SessionToken } from '../session-token'


describe('SessionMiddleware', () => {
    const rightNow: Date = new Date(Date.UTC(2017, 11, 24));
    const toolTimeLater: Date = new Date(Date.UTC(2045, 4, 11));

    const theSessionToken = new SessionToken(uuid());

    const theSession = new Session();
    theSession.state = SessionState.Active;
    theSession.xsrfToken = ('0' as any).repeat(64);
    theSession.agreedToCookiePolicy = false;
    theSession.timeCreated = rightNow;
    theSession.timeLastUpdated = rightNow;

    const testCases = [
        {source: SessionInfoSource.Cookie, env: Env.Local, secure: false},
        {source: SessionInfoSource.Cookie, env: Env.Test, secure: true},
        {source: SessionInfoSource.Cookie, env: Env.Staging, secure: true},
        {source: SessionInfoSource.Cookie, env: Env.Prod, secure: true},
        {source: SessionInfoSource.Header, env: Env.Local, secure: false},
        {source: SessionInfoSource.Header, env: Env.Test, secure: true},
        {source: SessionInfoSource.Header, env: Env.Staging, secure: true},
        {source: SessionInfoSource.Header, env: Env.Prod, secure: true},
    ];

    for (let {source, env, secure} of testCases) {
        it(`create session on identity service when there is no session information attached for source=${source} and env=${env} and secure=${secure}`, (done) => {
            const identityClient = td.object({
                getOrCreateSession: () => {}
            });
            const sessionMiddleware = newSessionMiddleware(SessionLevel.None, source, env, identityClient as IdentityClient);

            const mockReq = td.object({
                requestTime: rightNow,
                cookies: {},
                sessionToken: null,
                session: null,
                header: (_n: string) => {}
            });
            const mockRes = td.object({
                cookie: (_n: string, _d: any, _c: any) => {},
                setHeader: (_n: string, _d: string) => {}
            });

            td.when(identityClient.getOrCreateSession()).thenResolve([theSessionToken, theSession]);
            td.when(mockReq.header(SESSION_TOKEN_HEADER_NAME)).thenReturn(undefined);

            sessionMiddleware(mockReq as any, mockRes as any, () => {
                expect(mockReq.sessionToken).to.eql(theSessionToken);
                expect(mockReq.session).to.eql(theSession);
                if (source == SessionInfoSource.Cookie) {
                    td.verify(mockRes.cookie(SESSION_TOKEN_COOKIE_NAME, {sessionId: theSessionToken.sessionId}, {
                        httpOnly: true,
                        secure: secure,
                        expires: toolTimeLater,
                        sameSite: 'lax'
                    }));
                } else {
                    td.verify(mockRes.setHeader(SESSION_TOKEN_HEADER_NAME, JSON.stringify({sessionId: theSessionToken.sessionId})));
                }
                done();
            });
        });
    }
});


describe('setSessionTokenOnResponse', () => {
    const theSessionToken = new SessionToken(uuid());

    const rightNow: Date = new Date(Date.UTC(2017, 11, 24));
    const toolTimeLater: Date = new Date(Date.UTC(2045, 4, 11));

    it('sets a non-secure http same-site cookie for the cookie source and local env', () => {
        const response = td.object({cookie: (_n: string, _d: any, _c: any) => {}});

        setSessionTokenOnResponse(response as express.Response, rightNow, theSessionToken, SessionInfoSource.Cookie, Env.Local);

        td.verify(response.cookie(SESSION_TOKEN_COOKIE_NAME, {sessionId: theSessionToken.sessionId}, {
            httpOnly: true,
            secure: false,
            expires: toolTimeLater,
            sameSite: 'lax'
        }));
    });

    for (let env of [Env.Test, Env.Staging, Env.Prod]) {
        it(`sets a non-secure http same-site cookie for the cookie source and non-local env=${env}`, () => {
            const response = td.object({cookie: (_n: string, _d: any, _c: any) => {}});

            setSessionTokenOnResponse(response as express.Response, rightNow, theSessionToken, SessionInfoSource.Cookie, env);

            td.verify(response.cookie(SESSION_TOKEN_COOKIE_NAME, {sessionId: theSessionToken.sessionId}, {
                httpOnly: true,
                secure: true,
                expires: toolTimeLater,
                sameSite: 'lax'
            }));
        });
    }

    for (let env of [Env.Local, Env.Test, Env.Staging, Env.Prod]) {
        it(`sets a header for the header source env=${env}`, () => {
            const response = td.object({setHeader: (_n: string, _d: string) => {}});

            setSessionTokenOnResponse(response as express.Response, rightNow, theSessionToken, SessionInfoSource.Header, env);

            td.verify(response.setHeader(SESSION_TOKEN_HEADER_NAME, JSON.stringify({sessionId: theSessionToken.sessionId})));
        });
    }
});


describe('clearSessionTokenOnResponse', () => {
    it('clears a non-secure cookie for the cookie source and the local env', () => {
        const response = td.object({clearCookie: (_n: string, _c: any) => {}});

        clearSessionTokenOnResponse(response as express.Response, SessionInfoSource.Cookie, Env.Local);

        td.verify(response.clearCookie(SESSION_TOKEN_COOKIE_NAME, {
            httpOnly: true,
            secure: false
        }));
    });

    for (let env of [Env.Test, Env.Staging, Env.Prod]) {
        it(`sets a non-secure http same-site cookie for the cookie source and non-local env=${env}`, () => {
            const response = td.object({clearCookie: (_n: string, _c: any) => {}});

            clearSessionTokenOnResponse(response as express.Response, SessionInfoSource.Cookie, env);

            td.verify(response.clearCookie(SESSION_TOKEN_COOKIE_NAME, {
                httpOnly: true,
                secure: true
            }));
        });
    }

    for (let env of [Env.Local, Env.Test, Env.Staging, Env.Prod]) {
        it(`sets a header for the header source env=${env}`, () => {
            const response = td.object({removeHeader: (_n: string) => {}});

            clearSessionTokenOnResponse(response as express.Response, SessionInfoSource.Header, env);

            td.verify(response.removeHeader(SESSION_TOKEN_HEADER_NAME));
        });
    }
});
