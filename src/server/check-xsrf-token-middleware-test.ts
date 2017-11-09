import { expect } from 'chai'
import 'mocha'
import * as td from 'testdouble'

import { newCheckXsrfTokenMiddleware } from './check-xsrf-token-middleware'
import { XSRF_TOKEN_HEADER_NAME } from '../client'
import { Session } from '../entities'


describe('CheckXsrfTokenMiddleware', () => {
    it('should pass XSRF-valid request later', () => {
        const checkXsrfTokenMiddleware = newCheckXsrfTokenMiddleware();

        let passedCheck = false;

        const session = new Session();
        session.xsrfToken = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

        const mockReq: td.DoubledObject<{ session: Session, header: () => void }> = td.object({
            session: session,
            header: () => { }
        });
        const mockRes = td.object(['on']);

        td.when((mockReq as any).header(XSRF_TOKEN_HEADER_NAME)).thenReturn('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');

        checkXsrfTokenMiddleware(mockReq as any, mockRes as any, () => { passedCheck = true });

        expect(passedCheck).to.be.true;
    });
});
