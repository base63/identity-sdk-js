/** Common types relevant to the auth flow. */

/** Imports. Also so typedoc works correctly. */
import * as r from 'raynor'
import { ExtractError, MarshalFrom, MarshalWith } from 'raynor'
import * as serializeJavascript from 'serialize-javascript'


class AllowedRoutesMarshaller extends r.AbsolutePathMarshaller {
    filter(path: string): string {
        if (!(path == '/'
            || path.indexOf('/c/') == 0
            || path.indexOf('/admin') == 0)) {
            throw new ExtractError('Expected one of our paths');
        }

        return path;
    }
}


/**
 * Information passed to the identity provider as part of the login flow, which it returns to us,
 * as a means of maintaining state across the various requests and redirects.
 */
export class PostLoginRedirectInfo {
    /**
     * The path of the view the user was on when the auth flow began. Used so the application knows
     * where to return to.
     */
    @MarshalWith(AllowedRoutesMarshaller)
    path: string;

    /**
     * Construct a {@link PostLoginRedirectInfo}.
     * @param path - The path of the view the user was on when the auth flow began.
     */
    constructor(path: string) {
        this.path = path;
    }
}


/**
 * A marshaller for {@link PostLoginRedirectInfo}. This is a bit more involved than a regular
 * marshaller obtained via {@link MarshalFrom}, since the basic representation is that of a string.
 * For deep lore reasons the basic representation is doubly URI encoded.
 */
export class PostLoginRedirectInfoMarshaller extends r.BaseStringMarshaller<PostLoginRedirectInfo> {
    private static readonly _objectMarshaller = new (MarshalFrom(PostLoginRedirectInfo))();

    build(a: string): PostLoginRedirectInfo {
        try {
            // Don't ask. Auth0 seems to double encode this.
            const redirectInfoSer = decodeURIComponent(decodeURIComponent(a));
            const redirectInfoRaw = JSON.parse(redirectInfoSer);
            return PostLoginRedirectInfoMarshaller._objectMarshaller.extract(redirectInfoRaw);
        } catch (e) {
            throw new ExtractError(`Could not build redirect info "${e.toString()}"`);
        }
    }

    unbuild(redirectInfo: PostLoginRedirectInfo) {
        const redirectInfoRaw = PostLoginRedirectInfoMarshaller._objectMarshaller.pack(redirectInfo);
        const redirectInfoSer = serializeJavascript(redirectInfoRaw, { isJSON: true });
        return encodeURIComponent(redirectInfoSer);
    }
}
