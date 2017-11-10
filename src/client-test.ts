import { expect } from 'chai'
import 'mocha'

import {
    IdentityError,
    UnauthorizedIdentityError
} from './client'


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
