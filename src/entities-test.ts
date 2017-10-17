import { expect } from 'chai'
import 'mocha'

import { Auth0UserIdHashMarshaller, Role, User, UserState } from './entities'


describe('User', () => {
    const userOne: User = (() => {
        const user = new User();
        user.id = 1;
        user.state = UserState.Active;
        user.role = Role.Admin;
        user.name = 'John Doe';
        user.pictureUri = 'https =//example.com/1.jpg';
        user.language = 'en';
        user.timeCreated = new Date(Date.UTC(2017, 1, 17));
        user.timeLastUpdated = new Date(Date.UTC(2017, 1, 17))
        return user;
    })();

    const userTwo: User = (() => {
        const user = new User();
        user.id = 1;
        user.state = UserState.Active;
        user.role = Role.Regular;
        user.name = 'James Doe';
        user.pictureUri = 'https =//example.com/1.jpg';
        user.language = 'en';
        user.timeCreated = new Date(Date.UTC(2017, 1, 17));
        user.timeLastUpdated = new Date(Date.UTC(2017, 1, 17))
        return user;
    })();

    const UserTestCases = [
        {
            user: userOne,
            isAdmin: true
        },
        {
            user: userTwo,
            isAdmin: false
        }
    ];

    describe('isAdmin', () => {
        for (let tc of UserTestCases) {
            it(`should properly identity admin for ${JSON.stringify(tc.user)}`, () => {
                expect(tc.user.isAdmin()).to.eql(tc.isAdmin);
            });
        }
    });
});


describe('Auth0UserIdHashMarshaller', () => {
    const Hashes = [
        '0000000000000000000000000000000000000000000000000000000000000000',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    ];

    const BadLengthHashes = [
        '',
        '0',
        '000000000000000000000000000000000000000000000000000000000000000',
        '00000000000000000000000000000000000000000000000000000000000000000'
    ];

    const BadContentHashes = [
        ' 000000000000000000000000000000000000000000000000000000000000000',
        '0123456789Abcdef0123456789Abcdef0123456789Abcdef0123456789Abcdef',
        '                                                                '
    ];

    describe('extract', () => {
        for (let hash of Hashes) {
            it(`should parse "${hash}"`, () => {
                const hashMarshaller = new Auth0UserIdHashMarshaller();

                expect(hashMarshaller.extract(hash)).to.eql(hash);
            });
        }

        for (let hash of BadLengthHashes) {
            it(`should throw for bad-length "${hash}"`, () => {
                const hashMarshaller = new Auth0UserIdHashMarshaller();

                expect(() => hashMarshaller.extract(hash)).to.throw('Expected string to be 64 characters');
            });
        }

        for (let hash of BadContentHashes) {
            it(`should throw for bad-content "${hash}"`, () => {
                const hashMarshaller = new Auth0UserIdHashMarshaller();

                expect(() => hashMarshaller.extract(hash)).to.throw('Expected all hex characters');
            });
        }
    });

    describe('pack', () => {
        for (let hash of Hashes) {
            it(`should produce the same input for "${hash}"`, () => {
                const hashMarshaller = new Auth0UserIdHashMarshaller();

                expect(hashMarshaller.pack(hash)).to.eql(hash);
            });
        }
    });

    describe('extract and pack', () => {
        for (let hash of Hashes) {
            it(`should be opposites for "${hash}"`, () => {
                const hashMarshaller = new Auth0UserIdHashMarshaller();

                const raw = hash;
                const extracted = hashMarshaller.extract(raw);
                const packed = hashMarshaller.pack(extracted);

                expect(packed).to.eql(raw);
            });
        }
    });
});
