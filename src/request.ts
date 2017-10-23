import { Request } from '@base63/common-server-js'

import { AuthInfo } from './auth-info'
import { Session } from './entities'


export interface RequestWithIdentity extends Request {
    authInfo: AuthInfo;
    session: Session;
    xsrfToken: string | null;
}
