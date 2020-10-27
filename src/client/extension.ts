/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';

import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, Range, } from 'vscode-languageclient';
import * as notifClient from './protocolclient/ProtocolClient';
import { XmlUtil } from './utils/XmlUtil';

export async function activateEXML(context: vscode.ExtensionContext) {

    console.log('starting exml language client');

    // 服务端在一个node进程中启动
    let serverModule = context.asAbsolutePath(path.join('out', 'server/server.js'));

    console.log(serverModule);
    // server的调试参数
    let debugOptions = { execArgv: ['--nolazy', '--inspect=6777'] };

    // 如果这个插件是在调试模式下启动的则使用debug参数，否则使用run参数
    let serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    // 语言服务客户端的控制参数
    let clientOptions: LanguageClientOptions = {
        // 注册这个服务为纯文本文档
        documentSelector: ['exml'],
        synchronize: {
            // Synchronize the setting section 'languageServerExample' to the server
            configurationSection: 'exml',
            // 通知服务端工作空间中的文件改变,exml文件为皮肤和组件等，json文件为资源配置
            // fileEvents: vscode.workspace.createFileSystemWatcher('{**/*.exml,**/*.json,**/*.ts}')
            fileEvents: vscode.workspace.createFileSystemWatcher('**/')
        },
        outputChannelName: 'exml language server',
    };
    // 创建这个语言客户端并启动
    let languageClient: LanguageClient = new LanguageClient('exmllangue', 'EXML Language Server', serverOptions, clientOptions, true);


    let disposable = languageClient.start();
    languageClient.onReady().then(() => {
        console.log('exml language client started');
    });
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);

    // /* --------------------- register the commands --------------------- */
    // //Custom class changed
    // languageClient.onNotification(notif.ClassChangedNotifSC.type, function (params: notif.ClassChangedParamsSC): void {
    //     vscode.commands.executeCommand('exml.action.customClassChanged', params.classData);
    // });

    // //Init the exml config
    // vscode.commands.registerCommand('exml.action.initConfig', function (): Promise<string> {
    //     console.log("exml初始化配置文件完成，准备发送initConfigCS消息");
    //     return new Promise((c, e) => {
    //         languageClient.sendNotification(notif.InitConfigCS.type, {});
    //         languageClient.onNotification(notif.InitConfigSC.type, function (params: notif.InitConfigParamsSC): void {
    //             console.log("服务器初始化完成");
    //             c(params.classData);
    //         });
    //     });
    // });



}


