import { PublicUser, Session } from './entities'
import { SessionToken } from './session-token'


export const SESSION_TOKEN_COOKIE_NAME: string = 'base63-sessiontoken';
export const SESSION_TOKEN_HEADER_NAME: string = 'X-Base63-SessionToken';
export const XSRF_TOKEN_HEADER_NAME: string = 'X-Base63-XsrfToken';


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
    withContext(authInfo: SessionToken): IdentityClient;

    getOrCreateSession(): Promise<[SessionToken, Session]>;
    getSession(): Promise<Session>;
    expireSession(session: Session): Promise<void>;
    agreeToCookiePolicyForSession(session: Session): Promise<Session>;
    getOrCreateUserOnSession(session: Session): Promise<[SessionToken, Session]>;
    getUserOnSession(): Promise<Session>;

    getUsersInfo(ids: number[]): Promise<PublicUser[]>;
}
