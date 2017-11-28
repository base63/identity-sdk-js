import { expect } from 'chai'
import 'mocha'

import {
    Auth0AuthorizationCodeMarshaller,
    Auth0AccessTokenMarshaller
} from './auth0-auth-flow-router'


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
