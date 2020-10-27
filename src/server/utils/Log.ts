import { IConnection } from 'vscode-languageserver';

/**
 * 输出工具
 * @author featherJ
 */
export class Log {

    public static connection: IConnection = null;
    public static log(...args: any[]): void {
        const str: string = args.map(arg => arg + '').join(' ');
        if (Log.connection) {
            Log.connection.console.log(str);
        }
    }
}