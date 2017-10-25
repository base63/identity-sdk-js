/** Defines the {@link SessionToken} class. */

/** Imports. Also so typedoc works correctly. */

import { ExtractError, MarshalWith, OptionalOf, UuidMarshaller, StringMarshaller } from 'raynor'


class UserIdMarshaller extends StringMarshaller {
    private static readonly _alnumRegExp: RegExp = new RegExp('^[0-9a-zA-Z_-]+$');

    filter(s: string): string {
        if (s.length == 0) {
            throw new ExtractError('Expected a string to be non-empty');
        }

        if (!UserIdMarshaller._alnumRegExp.test(s)) {
            throw new ExtractError('Should only contain alphanumerics');
        }

        return s;
    }
}


/**
 * That which identifies a particular user, in a session. A _real_ user might have several such
 * identifiers attached, but no two users will have the same one.
 */
export class SessionToken {
    /** An identifier for the session. Globally unique. */
    @MarshalWith(UuidMarshaller)
    sessionId: string;

    /**
     * An externally provided access token. Used when making calls to those services to uniquely identify a user
     * Optional if user isn't authenticated.
     */
    @MarshalWith(OptionalOf(UserIdMarshaller))
    userToken: string | null;

    /**
     * @param sessionId - the session identifier to use.
     * @param userToken - the optional user token.
     */
    constructor(sessionId: string, userToken: string | null = null) {
        this.sessionId = sessionId;
        this.userToken = userToken;
    }
}
