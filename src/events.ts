import * as r from 'raynor'
import { MarshalEnum, MarshalWith } from 'raynor'



export enum UserEventType {
    Unknown = 0,
    Created = 1,
    Recreated = 2,
    Removed = 3,
    AgreedToCookiePolicy = 4
}


export class UserEvent {
    @MarshalWith(r.IdMarshaller)
    id: number;

    @MarshalWith(MarshalEnum(UserEventType))
    type: UserEventType;

    @MarshalWith(r.TimeMarshaller)
    timestamp: Date;

    @MarshalWith(r.NullMarshaller)
    data: null;
}


export enum SessionEventType {
    Unknonw = 0,
    Created = 1,
    LinkedWithUser = 2,
    Expired = 3,
    AgreedToCookiePolicy = 4
}


export class SessionEvent {
    @MarshalWith(r.IdMarshaller)
    id: number;

    @MarshalWith(MarshalEnum(SessionEventType))
    type: SessionEventType;

    @MarshalWith(r.TimeMarshaller)
    timestamp: Date;

    @MarshalWith(r.NullMarshaller)
    data: null;
}
