import { expect } from 'chai'
import { MarshalFrom } from 'raynor'
import 'mocha'

import { SessionToken } from './session-token'


describe('SessionToken', () => {
    it('should construct with no user token', () => {
        const sessionToken = new SessionToken('aaa-bbb');

        expect(sessionToken.sessionId).to.eql('aaa-bbb');
        expect(sessionToken.userToken).to.be.null;
    });

    it('should construct with user token', () => {
        const sessionToken = new SessionToken('aaa-bbb', 'xAbc');

        expect(sessionToken.sessionId).to.eql('aaa-bbb');
        expect(sessionToken.userToken).to.eql('xAbc');
    });

    describe('serialization', () => {
        const Examples = [
            [{ sessionId: '01234567-0123-0123-0123-0123456789ab' }, new SessionToken('01234567-0123-0123-0123-0123456789ab')],
            [{ sessionId: '01234567-0123-0123-0123-0123456789ab', userToken: 'hello' }, new SessionToken('01234567-0123-0123-0123-0123456789ab', 'hello')]
        ];

        const BadCases = [
            [{ sessionId: '' }, 'Expected a uuid'],
            [{ sessionId: '01234567-0123-0123-0123-0123456789ab', userToken: '' }, 'Expected a string to be non-empty'],
            [{ sessionId: '01234567-0123-0123-0123-0123456789ab', userToken: '$$#1' }, 'Should only contain alphanumerics']
        ]

        for (let [raw, token] of Examples) {
            it(`should extract ${JSON.stringify(raw)}`, () => {
                const marshaller = new (MarshalFrom(SessionToken))();

                const extracted = marshaller.extract(raw);
                expect(extracted).to.eql(token);
            });
        }

        for (let [raw, token] of Examples) {
            it(`should pack ${JSON.stringify(token)}`, () => {
                const marshaller = new (MarshalFrom(SessionToken))();

                const packed = marshaller.pack(token as SessionToken);
                expect(packed).to.eql(raw);
            });
        }

        for (let [badCase, message] of BadCases) {
            it(`should fail to extract ${JSON.stringify(badCase)}`, () => {
                const marshaller = new (MarshalFrom(SessionToken))();

                expect(() => marshaller.extract(badCase)).to.throw(message as string);
            });
        }
    });
});
