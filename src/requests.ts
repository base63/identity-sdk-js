import { Request } from '@base63/common-server-js'

import { Session } from './entities'


export interface RequestWithIdentity extends Request {
    session: Session | null;
    xsrfToken: string | null;
}
