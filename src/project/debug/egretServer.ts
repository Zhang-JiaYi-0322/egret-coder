import * as vscode from 'vscode';
import * as http from 'http';
const StaticServer = require('static-server');

export class EgretServer {
    private port = 8080;
    private _server = null;
    private serverRunning = false;

    public getPortString(): string {
        return this.port.toString();
    }
    public IsRunning(){
        return this.serverRunning;
    }

    private getAvailablePort(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            const server = http.createServer();
            server.listen(0);
            server.on('listening', () => {
                this.port = server.address().port;
                server.close();
                resolve(this.port);
            });
        });
    }

    private getServer() {
        if (this._server !== null) {
            this._server.port = this.port;
            return this._server;
        }
        const _rootPath = vscode.workspace.rootPath;
        const myStaticServer = new StaticServer({
            rootPath: _rootPath,
            port: this.port,
            name: 'egret-server',
            host: '0.0.0.0',
            cors: '*',
            followSymlink: true,
            templates: {
                index: 'index.html'
            }
        });
        this._server = myStaticServer;
        return this._server;
    }

    public async startServer(): Promise<void> {
        return new Promise<void>( async (resolve, reject) => {
            if (this.serverRunning) {
                resolve();
                return;
            }
            await this.getAvailablePort();
            this.getServer().start(() => {
                console.log("服务器开始")
                this.serverRunning = true;
                resolve();
            });
        });
    }

    public async stopServer(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.getServer().stop();
            this.serverRunning = false;
            console.log("停止")
            resolve();
        });
    }

}