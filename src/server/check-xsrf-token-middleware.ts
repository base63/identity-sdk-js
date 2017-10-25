import * as express from 'express'
import * as HttpStatus from 'http-status-codes'

import { RequestWithIdentity } from '../request'
import { Session, XsrfTokenMarshaller } from '../entities'
import { XSRF_TOKEN_HEADER_NAME } from '../client'


export function newCheckXsrfTokenMiddleware() {
    const xsrfTokenMarshaller = new XsrfTokenMarshaller();

    return function(req: RequestWithIdentity, res: express.Response, next: express.NextFunction): any {
        try {
            const xsrfTokenRaw = req.header(XSRF_TOKEN_HEADER_NAME);
            req.xsrfToken = xsrfTokenMarshaller.extract(xsrfTokenRaw);
        } catch (e) {
            req.log.warn('Bad XSRF token');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        if (req.xsrfToken != (req.session as Session).xsrfToken) {
            req.log.warn('Mismatching XSRF token');
            res.status(HttpStatus.BAD_REQUEST);
            res.end();
            return;
        }

        // Fire away.
        next();
    };
}
