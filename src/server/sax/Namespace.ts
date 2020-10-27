/**
 * QName 对象表示 XML 元素和属性的限定名。
 * @author featherJ
 */
export class Namespace {
    private _uri: string;
    private _prefix: any;
    public constructor(prefix?: any, uri?: string) {
        this._prefix = prefix;
        this._uri = uri;
    }
    public get uri(): string {
        return this._uri;
    }
    public get prefix(): any {
        return this._prefix;
    }
}