import { AuthInfo } from './auth-info'
import { PublicUser, Session } from './entities'


export class IdentityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IdentityError';
    }
}


export class UnauthorizedIdentityError extends IdentityError {
    constructor(message: string) {
        super(message);
        this.name = 'UnauthorizedIdentityError';
    }
}


export interface IdentityClient {
    withContext(authInfo: AuthInfo): IdentityClient;

    getOrCreateSession(): Promise<[AuthInfo, Session]>;
    getSession(): Promise<Session>;
    expireSession(session: Session): Promise<void>;
    agreeToCookiePolicyForSession(session: Session): Promise<Session>;
    getOrCreateUserOnSession(session: Session): Promise<[AuthInfo, Session]>;
    getUserOnSession(): Promise<Session>;

    getUsersInfo(ids: number[]): Promise<PublicUser[]>;
}
