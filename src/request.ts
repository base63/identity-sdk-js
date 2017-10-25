import { Request } from '@base63/common-server-js'

import { Session } from './entities'
import { SessionToken } from './session-token'


export interface RequestWithIdentity extends Request {
    sessionToken: SessionToken;
    session: Session;
    xsrfToken: string | null;
}
