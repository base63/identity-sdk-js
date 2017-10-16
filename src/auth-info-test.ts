import { expect } from 'chai'
import 'mocha'

import { Auth0AccessTokenMarshaller } from './auth-info'


describe('Auth0AccessTokenMarshaller', () => {
    const AccessTokens = [
        'a',
        'afx093Uvx',
        'Uv32x',
        '020091'
    ];

    const EmptyAccessToken = [''];

    const BadContentAccessToken = [
        ' ',
        '   \t '
    ];

    describe('extract', () => {
        for (let accessToken of AccessTokens) {
            it(`should parse "${accessToken}"`, () => {
                const accessTokenMarshaller = new Auth0AccessTokenMarshaller();

                expect(accessTokenMarshaller.extract(accessToken)).to.eql(accessToken);
            });
        }

        for (let accessToken of EmptyAccessToken) {
            it(`should throw for "${accessToken}"`, () => {
                const accessTokenMarshaller = new Auth0AccessTokenMarshaller();

                expect(() => accessTokenMarshaller.extract(accessToken)).to.throw('Expected a string to be non-empty');
            });
        }

        for (let accessToken of BadContentAccessToken) {
            it(`should throw for "${accessToken}"`, () => {
                const accessTokenMarshaller = new Auth0AccessTokenMarshaller();

                expect(() => accessTokenMarshaller.extract(accessToken)).to.throw('Should only contain alphanumerics');
            });
        }
    });

    describe('pack', () => {
        for (let accessToken of AccessTokens) {
            it(`should produce the same input for "${accessToken}"`, () => {
                const accessTokenMarshaller = new Auth0AccessTokenMarshaller();

                expect(accessTokenMarshaller.pack(accessToken)).to.eql(accessToken);
            });
        }
    });

    describe('extract and pack', () => {
        for (let accessToken of AccessTokens) {
            it(`should be opposites for "${accessToken}"`, () => {
                const accessTokenMarshaller = new Auth0AccessTokenMarshaller();

                const raw = accessToken;
                const extracted = accessTokenMarshaller.extract(raw);
                const packed = accessTokenMarshaller.pack(extracted);

                expect(packed).to.eql(raw);
            });
        }
    });
});
