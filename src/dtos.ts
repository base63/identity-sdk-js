import { ArrayOf, MarshalFrom, MarshalWith } from 'raynor'

import { PublicUser, Session } from './entities'
import { SessionToken } from './session-token'


export class SessionAndTokenResponse {
    @MarshalWith(MarshalFrom(SessionToken))
    sessionToken: SessionToken;

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
