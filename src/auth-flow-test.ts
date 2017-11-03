import { expect } from 'chai'
import 'mocha'

import { PostLoginRedirectInfo } from './auth-flow'


describe('PostLoginRedirectInfo', () => {
    it('is constructed properl', () => {
        const info = new PostLoginRedirectInfo('/a/path');
        expect(info.path).to.eql('/a/path');
    });
});
