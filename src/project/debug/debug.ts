
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as Core from 'vscode-chrome-debug-core';
import { DebugFileServer } from './debugFileServer';
import { Command } from '../command';

export class Debug {
    public getPort(): string {
        return DebugProvider.getInstance().getPort();
    }
    public getDebugConfigurationProvider() {
        return new ChromeConfigurationProvider();
    }
}

class DebugProvider {
    private fileServer: DebugFileServer;
    // 这个是当没有launch.json的时候会初始配置这个
    public static DEFAULT_CONFIG = {
        type: 'Egret',
        request: 'launch',
        name: 'Egret Debugger',
        url: 'http://localhost:${command:WebsitePort}',
        webRoot: '${workspaceFolder}',
        sourceMaps: true,
        userDataDir: '${tmpdir}'
    };

    private tsconfigDefaultJson = {
        compilerOptions: {
            target: 'es5',
            outDir: 'bin-debug',
            experimentalDecorators: true,
            lib: [
                'es5',
                'dom',
                'es2015.promise'
            ],
            types: [],
            sourceMap: true
        },
        include: [
            'src',
            'libs'
        ]
    };

    private static instance = null;
    public static getInstance() {
        if ( this.instance === null ) {
            this.instance = new DebugProvider();
        }
        return this.instance;
    }

    constructor() {
        this.fileServer = new DebugFileServer();
    }

    public getPort(): string {
        return this.fileServer.getPortString();
    }

    public setSourceMap() {
        let tsconfigRoot = path.join(vscode.workspace.rootPath, 'tsconfig.json');
        let data = null;
        const isHave = fs.existsSync(tsconfigRoot);
        if (!isHave) {
            data = JSON.stringify(this.tsconfigDefaultJson, null, 2);
        } else {
            const tsconfigString = fs.readFileSync(tsconfigRoot).toString();
            const tsconfigObject = JSON.parse(tsconfigString);
            if (tsconfigObject) {
                if (!tsconfigObject['compilerOptions']) {
                    tsconfigObject['compilerOptions'] = {};
                }
                if (tsconfigObject['compilerOptions']['sourceMap'] === true) {
                    return;
                }
                tsconfigObject['compilerOptions']['sourceMap'] = true;
            }
            data = JSON.stringify(tsconfigObject, null, 2);
        }
        fs.writeFileSync(tsconfigRoot, data);
    }

    // public async getAvailablePort(): Promise<number> {
    //    return await this.fileServer.getAvailablePort();
    // }

    public async startServer(): Promise<void> {
        return await this.fileServer.startServer();
    }

}

export class ChromeConfigurationProvider implements vscode.DebugConfigurationProvider {

    provideDebugConfigurations(folder: vscode.WorkspaceFolder | undefined, token?: vscode.CancellationToken): vscode.ProviderResult<vscode.DebugConfiguration[]> {
        console.log('生成默认配置');
        console.log(DebugProvider.DEFAULT_CONFIG,1)
        return Promise.resolve([DebugProvider.DEFAULT_CONFIG]);
    }

    async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, config: vscode.DebugConfiguration, token?: vscode.CancellationToken): Promise<vscode.DebugConfiguration> {
        if (!config.type && !config.request && !config.name) {
            return null;
        }
        // 服务器有关
        if (config.request === 'launch') {
            // 操作步骤
            // 设置sourcemap 属性
            // 执行一次编译操作
            // 生成可用端口号(该操作删除，合并到startServer函数中)
            // 启动静态文件服务器
            await DebugProvider.getInstance().setSourceMap();
            await Command.build();
            // await DebugProvider.getInstance().getAvailablePort();
            await DebugProvider.getInstance().startServer();
            console.log('获取端口号，并且开启服务器');
        }
        console.log('返回配置');
        return config;
    }
}

