import * as HttpStatus from 'http-status-codes'
import { MarshalFrom, Marshaller } from 'raynor'

import { Env, isLocal } from '@base63/common-js'
import { WebFetcher } from '@base63/common-server-js'

import { AuthInfo } from './auth-info'
import {
    IdentityClient,
    IdentityError,
    UnauthorizedIdentityError,
    SESSION_TOKEN_HEADER_NAME,
    XSRF_TOKEN_HEADER_NAME
} from './client'
import { PublicUser, Session } from './entities'
import {
    AuthInfoAndSessionResponse,
    SessionResponse,
    UsersInfoResponse
} from './dtos'


export function newIdentityClient(env: Env, origin: string, identityServiceHost: string, webFetcher: WebFetcher): IdentityClient {
    const authInfoMarshaller = new (MarshalFrom(AuthInfo))();
    const authInfoAndSessionResponse = new (MarshalFrom(AuthInfoAndSessionResponse))();
    const sessionResponseMarshaller = new (MarshalFrom(SessionResponse))();
    const usersInfoResponseMarshaller = new (MarshalFrom(UsersInfoResponse))();

    return new IdentityClientImpl(
        env,
        origin,
        identityServiceHost,
        webFetcher,
        authInfoMarshaller,
        authInfoAndSessionResponse,
        sessionResponseMarshaller,
        usersInfoResponseMarshaller);
}


class IdentityClientImpl implements IdentityClient {
    private static readonly _getOrCreateSessionOptions: RequestInit = {
        method: 'POST',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _getSessionOptions: RequestInit = {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _expireSessionOptions: RequestInit = {
        method: 'DELETE',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _agreeToCookiePolicyForSessionOptions: RequestInit = {
        method: 'POST',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _getOrCreateUserOnSessionOptions: RequestInit = {
        method: 'POST',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _getUserOnSessionOptions: RequestInit = {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private static readonly _getUsersInfoOptions: RequestInit = {
        method: 'GET',
        cache: 'no-cache',
        redirect: 'error',
        referrer: 'client',
    };

    private readonly _env: Env;
    private readonly _origin: string;
    private readonly _identityServiceHost: string;
    private readonly _webFetcher: WebFetcher;
    private readonly _authInfoMarshaller: Marshaller<AuthInfo>;
    private readonly _authInfoAndSessionResponseMarshaller: Marshaller<AuthInfoAndSessionResponse>;
    private readonly _sessionResponseMarshaller: Marshaller<SessionResponse>;
    private readonly _usersInfoResponseMarshaller: Marshaller<UsersInfoResponse>;
    private readonly _authInfo: AuthInfo | null;
    private readonly _defaultHeaders: HeadersInit;
    private readonly _protocol: string;

    constructor(
        env: Env,
        origin: string,
        identityServiceHost: string,
        webFetcher: WebFetcher,
        authInfoMarshaller: Marshaller<AuthInfo>,
        authInfoAndSessionResponseMarshaller: Marshaller<AuthInfoAndSessionResponse>,
        sessionResponseMarshaller: Marshaller<SessionResponse>,
        usersInfoResponseMarshaller: Marshaller<UsersInfoResponse>,
        authInfo: AuthInfo | null = null) {
        this._env = env;
        this._origin = origin;
        this._identityServiceHost = identityServiceHost;
        this._webFetcher = webFetcher;
        this._authInfoMarshaller = authInfoMarshaller;
        this._authInfoAndSessionResponseMarshaller = authInfoAndSessionResponseMarshaller
        this._sessionResponseMarshaller = sessionResponseMarshaller;
        this._usersInfoResponseMarshaller = usersInfoResponseMarshaller;
        this._authInfo = authInfo;

        this._defaultHeaders = {
            'Origin': origin
        }

        if (authInfo != null) {
            this._defaultHeaders[SESSION_TOKEN_HEADER_NAME] = JSON.stringify(this._authInfoMarshaller.pack(authInfo));
        }

        if (isLocal(this._env)) {
            this._protocol = 'http';
        } else {
            this._protocol = 'https';
        }
    }

    withContext(authInfo: AuthInfo): IdentityClient {
        return new IdentityClientImpl(
            this._env,
            this._origin,
            this._identityServiceHost,
            this._webFetcher,
            this._authInfoMarshaller,
            this._authInfoAndSessionResponseMarshaller,
            this._sessionResponseMarshaller,
            this._usersInfoResponseMarshaller,
            authInfo);
    }

    async getOrCreateSession(): Promise<[AuthInfo, Session]> {
        const options = this._buildOptions(IdentityClientImpl._getOrCreateSessionOptions);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/session`, options);
        } catch (e) {
            throw new IdentityError(`Could not create session - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const sessionResponse = this._authInfoAndSessionResponseMarshaller.extract(jsonResponse);
                return [sessionResponse.authInfo, sessionResponse.session];
            } catch (e) {
                throw new IdentityError(`Could not retrieve session '${e.toString()}'`);
            }
        } else {
            throw new IdentityError(`Could not retrieve session - service response ${rawResponse.status}`);
        }
    }

    async getSession(): Promise<Session> {
        const options = this._buildOptions(IdentityClientImpl._getSessionOptions);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/session`, options);
        } catch (e) {
            throw new IdentityError(`Could not create session - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const sessionResponse = this._sessionResponseMarshaller.extract(jsonResponse);
                return sessionResponse.session;
            } catch (e) {
                throw new IdentityError(`Could not retrieve session '${e.toString()}'`);
            }
        } else if (rawResponse.status == HttpStatus.UNAUTHORIZED) {
            throw new UnauthorizedIdentityError('User is not authorized');
        } else {
            throw new IdentityError(`Could not retrieve session - service response ${rawResponse.status}`);
        }
    }

    async expireSession(session: Session): Promise<void> {
        const options = this._buildOptions(IdentityClientImpl._expireSessionOptions, session);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/session`, options);
        } catch (e) {
            throw new IdentityError(`Could not expire session - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            // Do nothing
        } else {
            throw new IdentityError(`Could not expire session - service response ${rawResponse.status}`);
        }
    }

    async agreeToCookiePolicyForSession(session: Session): Promise<Session> {
        const options = this._buildOptions(IdentityClientImpl._agreeToCookiePolicyForSessionOptions, session);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/session/agree-to-cookie-policy`, options);
        } catch (e) {
            throw new IdentityError(`Could not agree to cookie policy - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const sessionResponse = this._sessionResponseMarshaller.extract(jsonResponse);
                return sessionResponse.session;
            } catch (e) {
                throw new IdentityError(`Could not agree to cookie policy '${e.toString()}'`);
            }
        } else if (rawResponse.status == HttpStatus.UNAUTHORIZED) {
            throw new UnauthorizedIdentityError('User is not authorized');
        } else {
            throw new IdentityError(`Could not agree to cookie policy - service response ${rawResponse.status}`);
        }
    }

    async getOrCreateUserOnSession(session: Session): Promise<[AuthInfo, Session]> {
        const options = this._buildOptions(IdentityClientImpl._getOrCreateUserOnSessionOptions, session);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/user`, options);
        } catch (e) {
            throw new IdentityError(`Could not create session - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const sessionResponse = this._authInfoAndSessionResponseMarshaller.extract(jsonResponse);
                return [sessionResponse.authInfo, sessionResponse.session];
            } catch (e) {
                throw new IdentityError(`Could not retrieve session '${e.toString()}'`);
            }
        } else if (rawResponse.status == HttpStatus.UNAUTHORIZED) {
            throw new UnauthorizedIdentityError('User is not authorized');
        } else {
            throw new IdentityError(`Could not retrieve session - service response ${rawResponse.status}`);
        }
    }

    async getUserOnSession(): Promise<Session> {
        const options = this._buildOptions(IdentityClientImpl._getUserOnSessionOptions);

        let rawResponse: Response;
        try {
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/user`, options);
        } catch (e) {
            throw new IdentityError(`Could not retrieve user - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const sessionResponse = this._sessionResponseMarshaller.extract(jsonResponse);
                return sessionResponse.session;
            } catch (e) {
                throw new IdentityError(`Could not retrieve session '${e.toString()}'`);
            }
        } else if (rawResponse.status == HttpStatus.UNAUTHORIZED) {
            throw new UnauthorizedIdentityError('User is not authorized');
        } else {
            throw new IdentityError(`Could not retrieve session - service response ${rawResponse.status}`);
        }
    }

    async getUsersInfo(ids: number[]): Promise<PublicUser[]> {
        const dedupedIds: number[] = [];
        for (let id of ids) {
            if (dedupedIds.indexOf(id) != -1)
                continue;
            dedupedIds.push(id);
        }

        const options = this._buildOptions(IdentityClientImpl._getUsersInfoOptions);

        let rawResponse: Response;
        try {
            const encodedIds = encodeURIComponent(JSON.stringify(dedupedIds));
            rawResponse = await this._webFetcher.fetch(`${this._protocol}://${this._identityServiceHost}/users-info?ids=${encodedIds}`, options);
        } catch (e) {
            throw new IdentityError(`Could not retrieve users - request failed because '${e.toString()}'`);
        }

        if (rawResponse.ok) {
            try {
                const jsonResponse = await rawResponse.json();
                const usersInfoResponse = this._usersInfoResponseMarshaller.extract(jsonResponse);
                return usersInfoResponse.usersInfo;
            } catch (e) {
                throw new IdentityError(`Could not retrieve user info '${e.toString()}'`);
            }
        } else {
            throw new IdentityError(`Could not retrieve user info - service response ${rawResponse.status}`);
        }
    }

    private _buildOptions(template: RequestInit, session: Session | null = null) {
        const options = (Object as any).assign({ headers: this._defaultHeaders }, template);

        if (session != null) {
            options.headers = (Object as any).assign(options.headers, { [XSRF_TOKEN_HEADER_NAME]: session.xsrfToken });
        }

        return options;
    }
}
