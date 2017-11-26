//import { expect } from 'chai'
import * as express from 'express'
import 'mocha'
import * as td from 'testdouble'
import * as uuid from 'uuid'

import { Env } from '@base63/common-js'

import {
    setSessionTokenOnResponse,
    SessionInfoSource } from './session-middleware'
import { SESSION_TOKEN_COOKIE_NAME } from '../client'
import { SessionToken } from '../session-token'


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
});


