import { expect } from 'chai'
import 'mocha'
import * as serializeJavascript from 'serialize-javascript'

import {
    Auth0AuthorizeRedirectInfo,
    Auth0AuthorizeRedirectInfoMarshaller,
    Auth0AuthorizationCodeMarshaller,
    Auth0AccessTokenMarshaller
} from './auth0-auth-flow-router'
import { PathMatch, PostLoginRedirectInfo } from '../auth-flow'


describe('Auth0AccessTokenMarshaller', () => {
    const auth0AccessTokens = [
        'foogazi',
        'aGoodToken',
        'A-Good-Token',
        'A_Good_Token'
    ];

    const emptyAuth0AccessTokens = [
        ''
    ];

    const badAuth0AccessTokens = [
        '$',
        '  ',
        'a.bad.token'
    ];

    describe('extract', () => {
        for (let accessToken of auth0AccessTokens) {
            it(`should extract "${accessToken}"`, () => {
                const marshaller = new Auth0AccessTokenMarshaller();

                expect(marshaller.extract(accessToken)).to.eql(accessToken);
            });
        }

        for (let accessToken of emptyAuth0AccessTokens) {
            it(`should throw for empty "${accessToken}"`, () => {
                const marshaller = new Auth0AccessTokenMarshaller();

                expect(() => marshaller.extract(accessToken)).to.throw('Expected a string to be non-empty');
            });
        }

        for (let accessToken of badAuth0AccessTokens) {
            it(`should throw for bad "${accessToken}"`, () => {
                const marshaller = new Auth0AccessTokenMarshaller();

                expect(() => marshaller.extract(accessToken)).to.throw('Should only contain alphanumerics');
            });
        }
    });

    describe('pack', () => {
        for (let accessToken of auth0AccessTokens) {
            it(`should produce the same input "${accessToken}"`, () => {
                const marshaller = new Auth0AccessTokenMarshaller();

                expect(marshaller.pack(accessToken)).to.eql(accessToken);
            });
        }
    });
});


describe('Auth0AuthorizationCodeMarshaller', () => {
    const auth0AuthorizationCode = [
        'foogazi',
        'aGoodToken',
        'A-Good-Token',
        'A_Good_Token'
    ];

    const emptyAuth0AuthorizationCodes = [
        ''
    ];

    const badAuth0AuthorizationCodes = [
        '$',
        '  ',
        'a.bad.token'
    ];

    describe('extract', () => {
        for (let accessToken of auth0AuthorizationCode) {
            it(`should extract "${accessToken}"`, () => {
                const marshaller = new Auth0AuthorizationCodeMarshaller();

                expect(marshaller.extract(accessToken)).to.eql(accessToken);
            });
        }

        for (let accessToken of emptyAuth0AuthorizationCodes) {
            it(`should throw for empty "${accessToken}"`, () => {
                const marshaller = new Auth0AuthorizationCodeMarshaller();

                expect(() => marshaller.extract(accessToken)).to.throw('Expected a string to be non-empty');
            });
        }

        for (let accessToken of badAuth0AuthorizationCodes) {
            it(`should throw for bad "${accessToken}"`, () => {
                const marshaller = new Auth0AuthorizationCodeMarshaller();

                expect(() => marshaller.extract(accessToken)).to.throw('Should only contain alphanumerics');
            });
        }
    });

    describe('pack', () => {
        for (let accessToken of auth0AuthorizationCode) {
            it(`should produce the same input "${accessToken}"`, () => {
                const marshaller = new Auth0AuthorizationCodeMarshaller();

                expect(marshaller.pack(accessToken)).to.eql(accessToken);
            });
        }
    });
});


describe('Auth0AuthorizeRedirectInfo', () => {
    it('can be constructed', () => {
        const redirectInfo = new Auth0AuthorizeRedirectInfo('a-code', new PostLoginRedirectInfo('/'));

        expect(redirectInfo.authorizationCode).to.eql('a-code');
        expect(redirectInfo.state).to.eql(new PostLoginRedirectInfo('/'));
    });

    describe('marshalling', () => {
        const allowedPaths: PathMatch[] = [
            { path: '/', mode: 'full' },
            { path: '/admin', mode: 'full' },
            { path: '/admin/', mode: 'prefix' }
        ];

        const auth0AuthorizeRedirectInfos = [
            [{code: 'abcabc', state: quickEncode({path: '/'})}, new Auth0AuthorizeRedirectInfo('abcabc', new PostLoginRedirectInfo('/'))],
            [{code: 'abcabc', state: quickEncode({path: '/admin'})}, new Auth0AuthorizeRedirectInfo('abcabc', new PostLoginRedirectInfo('/admin'))],
            [{code: 'abcabc', state: quickEncode({path: '/admin/foo'})}, new Auth0AuthorizeRedirectInfo('abcabc', new PostLoginRedirectInfo('/admin/foo'))],
            [{code: 'abcabc', state: quickEncode({path: '/admin/foo?id=10'})}, new Auth0AuthorizeRedirectInfo('abcabc', new PostLoginRedirectInfo('/admin/foo?id=10'))]
        ];

        const badAuth0AuthorizeRedirectInfos = [
            {code: 'abcabc', state: quickEncode({path: '/a-bad-path'})},
            {code: 'abcabc', state: quickEncode({path: 'admin'})}
        ];

        describe('extract', () => {
            for (let [raw, extracted] of auth0AuthorizeRedirectInfos) {
                it(`should extract ${JSON.stringify(raw)}`, () => {
                    const marshaller = new (Auth0AuthorizeRedirectInfoMarshaller(allowedPaths))();
                    expect(marshaller.extract(raw)).to.eql(extracted);
                })
            }

            for (let example of badAuth0AuthorizeRedirectInfos) {
                it(`should throw for ${JSON.stringify(example)}`, () => {
                    const marshaller = new (Auth0AuthorizeRedirectInfoMarshaller(allowedPaths))();
                    expect(() => marshaller.extract(example)).to.throw;
                });
            }
        });

        describe('pack', () => {
            for (let [raw, extracted] of auth0AuthorizeRedirectInfos)  {
                it(`should produce the same input for ${JSON.stringify(raw)}`, () => {
                    const marshaller = new (Auth0AuthorizeRedirectInfoMarshaller(allowedPaths))();
                    expect(marshaller.pack(extracted as Auth0AuthorizeRedirectInfo)).to.eql(raw);
                });
            }
        });

        describe('extract and pack', () => {
            for (let [example] of auth0AuthorizeRedirectInfos)  {
                it(`should be opposites ${JSON.stringify(example)}`, () => {
                    const marshaller = new (Auth0AuthorizeRedirectInfoMarshaller(allowedPaths))();

                    const raw = example;
                    const extracted = marshaller.extract(raw);
                    const packed = marshaller.pack(extracted);

                    expect(packed).to.eql(raw);
                });
            }
        });

        function quickEncode(obj: any): string {
            return encodeURIComponent(encodeURIComponent(serializeJavascript(obj)));
        }
    });
});
