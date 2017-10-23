import { History } from 'history'
import 'require-ensure'

import { Auth0Config, PostLoginRedirectInfo, PostLoginRedirectInfoMarshaller } from './auth-flow'


export class Auth0Service {
    private readonly _postLoginRedirectInfoMarshaller: PostLoginRedirectInfoMarshaller;
    private readonly _history: History;
    private readonly _auth0Config: Auth0Config;

    constructor(history: History, auth0Config: Auth0Config) {
        this._postLoginRedirectInfoMarshaller = new PostLoginRedirectInfoMarshaller();
        this._history = history;
        this._auth0Config = auth0Config;
    }

    showLock(canDismiss: boolean = true): void {
        var _this = this;

        // This generates an async chunk.
        (require as any).ensure([], function(asyncRequire: (moduleName: string) => any) {
            const auth0Lock = asyncRequire('auth0-lock');

            const currentLocation = _this._history.location;
            const postLoginInfo = new PostLoginRedirectInfo(currentLocation.pathname);
            const postLoginInfoSer = _this._postLoginRedirectInfoMarshaller.pack(postLoginInfo);

            const auth0: any = new ((auth0Lock as any).default)(
                _this._auth0Config.clientId,
                _this._auth0Config.domain, {
                    closable: canDismiss,
                    auth: {
                        redirect: true,
                        redirectUrl: _this._auth0Config.callbackUri,
                        responseType: 'code',
                        params: {
                            state: postLoginInfoSer
                        }
                    }
                }
            );

            auth0.show();
        }, 'auth0-lock');
    }
}
