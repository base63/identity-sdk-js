import { expect } from 'chai'
import * as HttpStatus from 'http-status-codes'
import 'mocha'
import { MarshalFrom } from 'raynor'
import * as td from 'testdouble'
import * as uuid from 'uuid'

import { Env } from '@base63/common-js'
import { WebFetcher } from '@base63/common-server-js'

import {
    IdentityClient,
    IdentityError,
    newIdentityClient,
    SESSION_TOKEN_HEADER_NAME,
    UnauthorizedIdentityError,
    XSRF_TOKEN_HEADER_NAME
} from './client'
import { SessionAndTokenResponse, SessionResponse } from './dtos'
import { Session, SessionState } from './entities'
import { SessionToken } from './session-token'


describe('IdentityError', () => {
    it('should construct a proper error', () => {
        const error = new IdentityError('A problem');
        expect(error.name).to.eql('IdentityError');
        expect(error.message).to.eql('A problem');
        expect(error.stack).to.be.not.null;
    });
});


describe('UnauthorizedIdentityError', () => {
    it('should construct a proper error', () => {
        const error = new UnauthorizedIdentityError('A problem');
        expect(error.name).to.eql('UnauthorizedIdentityError');
        expect(error.message).to.eql('A problem');
        expect(error.stack).to.be.not.null;
    });
});


describe('IdentityClient', () => {
    const sessionTokenMarshaller = new (MarshalFrom(SessionToken))();
    const sessionAndTokenResponseMarshaller = new (MarshalFrom(SessionAndTokenResponse))();
    const sessionResponseMarshaller = new (MarshalFrom(SessionResponse))();

    const rightNow: Date = new Date(Date.now());

    const theSessionToken = new SessionToken(uuid());

    const theSession = new Session();
    theSession.state = SessionState.Active;
    theSession.xsrfToken = ('0' as any).repeat(64);
    theSession.agreedToCookiePolicy = false;
    theSession.timeCreated = rightNow;
    theSession.timeLastUpdated = rightNow;

    const theSessionWithAgreement = new Session();
    theSessionWithAgreement.state = SessionState.Active;
    theSessionWithAgreement.xsrfToken = ('0' as any).repeat(64);
    theSessionWithAgreement.agreedToCookiePolicy = true;
    theSessionWithAgreement.timeCreated = rightNow;
    theSessionWithAgreement.timeLastUpdated = rightNow;

    it('can be constructed', () => {
        const fetcher = td.object({});
        const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

        expect(client).is.not.null;
    });

    for (let env of [Env.Test, Env.Staging, Env.Prod]) {
        it(`can be constructed in non-local env=${env}`, () => {
            const fetcher = td.object({});
            const client = newIdentityClient(env, 'core', 'identity', fetcher as WebFetcher);

            expect(client).is.not.null;
            expect((client as any)._protocol).is.eql('https');
        });
    }

    it('can attach a context', () => {
        const fetcher = td.object({});
        const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);
        const clientWithToken = client.withContext(theSessionToken);

        expect(clientWithToken).is.not.null;
    });

    describe('getOrCreateSession', () => {
        it('should return session token and session with no session info', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

            const sessionAndTokenResponse = new SessionAndTokenResponse();
            sessionAndTokenResponse.sessionToken = theSessionToken;
            sessionAndTokenResponse.session = theSession;

            td.when(fetcher.fetch('http://identity/session', {
                method: 'POST',
                cache: 'no-cache',
                redirect: 'error',
                referrer: 'client',
                headers: {
                    'Origin': 'core'
                }
            })).thenReturn(response);
            td.when(response.json()).thenReturn(sessionAndTokenResponseMarshaller.pack(sessionAndTokenResponse));

            const [sessionToken, session] = await client.getOrCreateSession();

            expect(sessionToken).to.eql(theSessionToken);
            expect(session).to.eql(theSession);
        });

        it('should return session token and session with session info attached', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher).withContext(theSessionToken);

            const sessionAndTokenResponse = new SessionAndTokenResponse();
            sessionAndTokenResponse.sessionToken = theSessionToken;
            sessionAndTokenResponse.session = theSession;

            td.when(fetcher.fetch('http://identity/session', {
                method: 'POST',
                cache: 'no-cache',
                redirect: 'error',
                referrer: 'client',
                headers: {
                    'Origin': 'core',
                    [SESSION_TOKEN_HEADER_NAME]: JSON.stringify(sessionTokenMarshaller.pack(theSessionToken))
                }
            })).thenReturn(response);
            td.when(response.json()).thenReturn(sessionAndTokenResponseMarshaller.pack(sessionAndTokenResponse));

            const [sessionToken, session] = await client.getOrCreateSession();

            expect(sessionToken).to.eql(theSessionToken);
            expect(session).to.eql(theSession);
        });

        testErrorPaths(c => c.getOrCreateSession());
        testJSONDecoding(c => c.getOrCreateSession());
    });

    describe('getSession', () => {
        it('should return session', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher).withContext(theSessionToken);

            const sessionResponse = new SessionResponse();
            sessionResponse.session = theSession;

            td.when(fetcher.fetch('http://identity/session', {
                method: 'GET',
                cache: 'no-cache',
                redirect: 'error',
                referrer: 'client',
                headers: {
                    'Origin': 'core',
                    [SESSION_TOKEN_HEADER_NAME]: JSON.stringify(sessionTokenMarshaller.pack(theSessionToken))
                }
            })).thenReturn(response);
            td.when(response.json()).thenReturn(sessionResponseMarshaller.pack(sessionResponse));

            const session = await client.getSession();

            expect(session).to.eql(theSession);
        });

        testErrorPaths(c => c.getSession());
        testUnauthorized(c => c.getSession())
    });

    describe('removeSession', () => {
        it('should remove session', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher).withContext(theSessionToken);

            td.when(fetcher.fetch('http://identity/session', {
                method: 'DELETE',
                cache: 'no-cache',
                redirect: 'error',
                referrer: 'client',
                headers: {
                    'Origin': 'core',
                    [SESSION_TOKEN_HEADER_NAME]: JSON.stringify(sessionTokenMarshaller.pack(theSessionToken)),
                    [XSRF_TOKEN_HEADER_NAME]: theSession.xsrfToken
                }
            })).thenReturn({ ok: true });

            await client.removeSession(theSession);

            expect(true).to.be.true;
        });

        testErrorPaths(c => c.removeSession(theSession));
        testUnauthorized(c => c.removeSession(theSession))
    });

    describe('agreeToCookiePolicyForSession', () => {
        it('should return new session with agreement', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher).withContext(theSessionToken);

            const sessionResponse = new SessionResponse();
            sessionResponse.session = theSessionWithAgreement;

            td.when(fetcher.fetch('http://identity/session/agree-to-cookie-policy', {
                method: 'POST',
                cache: 'no-cache',
                redirect: 'error',
                referrer: 'client',
                headers: {
                    'Origin': 'core',
                    [SESSION_TOKEN_HEADER_NAME]: JSON.stringify(sessionTokenMarshaller.pack(theSessionToken)),
                    [XSRF_TOKEN_HEADER_NAME]: theSession.xsrfToken
                }
            })).thenReturn(response);
            td.when(response.json()).thenReturn(sessionResponseMarshaller.pack(sessionResponse));

            const session = await client.agreeToCookiePolicyForSession(theSession);

            expect(session).to.eql(theSessionWithAgreement);
        });

        testErrorPaths(c => c.agreeToCookiePolicyForSession(theSession));
        testUnauthorized(c => c.agreeToCookiePolicyForSession(theSession));
        testJSONDecoding(c => c.agreeToCookiePolicyForSession(theSession));
    });

    function testErrorPaths<T>(methodExtractor: (client: IdentityClient) => Promise<T>) {
        it('should throw when the fetch fails', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher).withContext(theSessionToken);

            td.when(fetcher.fetch(td.matchers.isA(String), td.matchers.anything())).thenThrow(new Error('An error'));

            try {
                await methodExtractor(client);
                expect(true).to.be.false;
            } catch (e) {
                expect(e.message).to.eql('Request failed because \'Error: An error\'');
            }
        });

        it('should throw when the HTTP response was an error', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: false,
                status: HttpStatus.BAD_REQUEST,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

            td.when(fetcher.fetch(td.matchers.isA(String), td.matchers.anything())).thenReturn(response);

            try {
                await methodExtractor(client);
                expect(true).to.be.false;
            } catch (e) {
                expect(e.message).to.eql('Service response 400');
            }
        });
    }

    function testUnauthorized<T>(methodExtractor: (client: IdentityClient) => Promise<T>) {
        it('should throw when the HTTP response was an UNAUTHORIZED error', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: false,
                status: HttpStatus.UNAUTHORIZED,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

            td.when(fetcher.fetch(td.matchers.isA(String), td.matchers.anything())).thenReturn(response);

            try {
                await methodExtractor(client);
                expect(true).to.be.false;
            } catch (e) {
                expect(e.message).to.eql('User is not authorized');
            }
        });
    }

    function testJSONDecoding<T>(methodExtractor: (client: IdentityClient) => Promise<T>) {
        it('should throw when the json cannot be obtained', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

            td.when(fetcher.fetch(td.matchers.isA(String), td.matchers.anything())).thenReturn(response);
            td.when(response.json()).thenThrow(new Error('Bad JSON'));

            try {
                await methodExtractor(client);
                expect(true).to.be.false;
            } catch (e) {
                expect(e.message).to.eql('JSON decoding error because \'Error: Bad JSON\'');
            }
        });

        it('should throw when the response json cannot be decoded', async () => {
            const fetcher = td.object({
                fetch: (_u: string, _o: any) => { }
            });
            const response = td.object({
                ok: true,
                json: () => { }
            })
            const client = newIdentityClient(Env.Local, 'core', 'identity', fetcher as WebFetcher);

            td.when(fetcher.fetch(td.matchers.isA(String), td.matchers.anything())).thenReturn(response);
            td.when(response.json()).thenReturn('FOO');

            try {
                await methodExtractor(client);
                expect(true).to.be.false;
            } catch (e) {
                expect(e.message).to.eql('JSON decoding error because \'ExtractError: Expected an object\'');
            }
        });
    }
});
