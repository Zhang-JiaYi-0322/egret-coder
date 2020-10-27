import * as vscode from 'vscode';
import { LauncherErrorCode, EgretWebsite } from './launcherDefines';
import { tr } from '../i18n';
import * as opn from 'opn';

export { msgGotoEgretWebsite, openExternal, onLauncherTask };

function _tr(id: string, ...params: string[]) {
    return tr('Engine', id, ...params);
}

function openExternal(url: string): boolean {
    return false;
}

const msgGotoEgretWebsite = _tr('Go to download at official website：{0}', EgretWebsite);

function onLauncherTask<T>(promise: Promise<T>) {
    promise.catch((error) => {
        let errorMsg: string = _tr('Inner error happened');
        if (error) {
            switch (error.code) {
                case LauncherErrorCode.NotFound:
                    errorMsg = _tr('Please install Egret Launcher');
                    break;
                case LauncherErrorCode.VersionNotMatch:
                    errorMsg = _tr('Version of Egret Launcher should not be lower than {0}', error.minVersion);
                    break;
                default: break;
            }
        }
        vscode.window.showInformationMessage(errorMsg, msgGotoEgretWebsite)
            .then(t => {
                if (t === msgGotoEgretWebsite) { opn(EgretWebsite); }
            });
        return;
    });
}

