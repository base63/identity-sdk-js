/** Defines the {@link AuthInfo} class as well as marshallers for various Auth0 types. */

/** Imports. Also so typedoc works correctly. */

import { ExtractError, MarshalWith, OptionalOf, StringMarshaller, UuidMarshaller } from 'raynor'


export class Auth0AccessTokenMarshaller extends StringMarshaller {
    private static readonly _alnumRegExp: RegExp = new RegExp('^[0-9a-zA-Z_-]+$');

    filter(s: string): string {
        if (s.length == 0) {
            throw new ExtractError('Expected a string to be non-empty');
        }

        if (!Auth0AccessTokenMarshaller._alnumRegExp.test(s)) {
            throw new ExtractError('Should only contain alphanumerics');
        }

        return s;
    }
}


export class Auth0AuthorizationCodeMarshaller extends StringMarshaller {
    private static readonly _alnumRegExp: RegExp = new RegExp('^[0-9a-zA-Z_-]+$');

    filter(s: string): string {
        if (s.length == 0) {
            throw new ExtractError('Expected a string to be non-empty');
        }

        if (!Auth0AuthorizationCodeMarshaller._alnumRegExp.test(s)) {
            throw new ExtractError('Should only contain alphanumerics');
        }

        return s;
    }
}


/**
 * The authentication information needed by a user of the identity service. This is the session state basically.
 */
export class AuthInfo {
    static readonly CookieName = 'neoncity-authinfo';
    static readonly HeaderName = 'X-NeonCity-AuthInfo';

    /** An identifier for the session. Globally unique. */
    @MarshalWith(UuidMarshaller)
    sessionId: string;

    /** An Auth0 provided access token. Used when making calls to Auth0. Optional if user isn't authenticated. */
    @MarshalWith(OptionalOf(Auth0AccessTokenMarshaller))
    auth0AccessToken: string | null;

    /**
     * @param sessionId - the session identifier to use.
     * @param auth0AccessToken - the optional Auth0 access token.
     */
    constructor(sessionId: string, auth0AccessToken: string | null = null) {
        this.sessionId = sessionId;
        this.auth0AccessToken = auth0AccessToken;
    }
}
