import { expect } from 'chai'
import 'mocha'

import {
    PrivateUser,
    Role,
    User,
    UserState,
    Session,
    SessionState,
    XsrfTokenMarshaller
} from './entities'


describe('XsrfTokenMarshaller', () => {
    const XsrfTokens = [
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        '0000000000000000000000000000000000000000000000000000000000000000',
        '0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
        '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    ];

    const BadLengthXsrfTokens = [
        '',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ];

    const BadContentXsrfTokens = [
        ',,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA(',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:',
        'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAA'
    ];

    describe('extract', () => {
        for (let xsrfToken of XsrfTokens) {
            it(`should extract "${xsrfToken}"`, () => {
                const xsrfTokenMarshaller = new XsrfTokenMarshaller();

                expect(xsrfTokenMarshaller.extract(xsrfToken)).to.eql(xsrfToken);
            });
        }

        for (let xsrfToken of BadLengthXsrfTokens) {
            it(`should throw for "${xsrfToken}"`, () => {
                const xsrfTokenMarshaller = new XsrfTokenMarshaller();

                expect(() => xsrfTokenMarshaller.extract(xsrfToken)).to.throw('Expected string to be 64 characters');
            });
        }

        for (let xsrfToken of BadContentXsrfTokens) {
            it(`should throw for "${xsrfToken}"`, () => {
                const xsrfTokenMarshaller = new XsrfTokenMarshaller();

                expect(() => xsrfTokenMarshaller.extract(xsrfToken)).to.throw('Expected a base64 string');
            });
        }
    });

    describe('pack', () => {
        for (let xsrfToken of XsrfTokens) {
            it(`should produce the same input for "${xsrfToken}"`, () => {
                const xsrfTokenMarshaller = new XsrfTokenMarshaller();

                expect(xsrfTokenMarshaller.pack(xsrfToken)).to.eql(xsrfToken);
            });
        }

    });

    describe('extract and pack', () => {
        for (let xsrfToken of XsrfTokens) {
            it(`should be opposites for "${xsrfToken}"`, () => {
                const xsrfTokenMarshaller = new XsrfTokenMarshaller();

                const raw = xsrfToken;
                const extracted = xsrfTokenMarshaller.extract(raw);
                const packed = xsrfTokenMarshaller.pack(extracted);

                expect(packed).to.eql(raw);
            });
        }
    });
});


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


describe('Session', () => {
    describe('hasUser', () => {
        it('should return false when there is no user', () => {
            const session = new Session();
            session.state = SessionState.Active;
            expect(session.hasUser()).to.be.false;
        });

        it('should return false when the state is correct but there is no user', () => {
            const session = new Session();
            session.state = SessionState.ActiveAndLinkedWithUser;
            expect(session.hasUser()).to.be.false;
        });

        it('should return false when there is a user but the state is wrong', () => {
            const session = new Session();
            session.state = SessionState.Active;
            session.user = new PrivateUser();
            expect(session.hasUser()).to.be.false;
        });

        it('should return true when there is a user', () => {
            const session = new Session();
            session.state = SessionState.ActiveAndLinkedWithUser;
            session.user = new PrivateUser();
            expect(session.hasUser()).to.be.true;
        });
    });
});
