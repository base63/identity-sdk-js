import { ArrayOf, MarshalFrom, MarshalWith } from 'raynor'

import { AuthInfo } from './auth-info'
import { PublicUser, Session } from './entities'


export class AuthInfoAndSessionResponse {
    @MarshalWith(MarshalFrom(AuthInfo))
    authInfo: AuthInfo;

    @MarshalWith(MarshalFrom(Session))
    session: Session;
}


export class SessionResponse {
    @MarshalWith(MarshalFrom(Session))
    session: Session;
}


export class UsersInfoResponse {
    @MarshalWith(ArrayOf(MarshalFrom(PublicUser)))
    usersInfo: PublicUser[];
}
