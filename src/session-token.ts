/** Defines the {@link SessionToken} class as well as marshallers for various Auth0 types. */

/** Imports. Also so typedoc works correctly. */

import { MarshalWith, OptionalOf, UuidMarshaller } from 'raynor'

import { Auth0AccessTokenMarshaller } from './auth0'


/**
 * That which identifies a particular user, in a session. A _real_ user might have several such
 * identifiers attached, but no two users will have the same one.
 */
export class SessionToken {
    /** An identifier for the session. Globally unique.. */
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
