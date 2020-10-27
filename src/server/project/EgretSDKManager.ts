import {EgretVersions, VersionObj} from './EgretVersions';

/**
 * EgretSDK管理器，管理多个SDK
 * @author featherJ
 */
export class EgretSDKManager {
    private static instance: EgretSDKManager = new EgretSDKManager();
    /**
     * 初始化引擎版本
     * @param callback 完成回调
     * @param thisArg this指针
     */
    public static initSDKS(callback: () => void): void {
        EgretSDKManager.instance.initSDKS(callback);
    }
    /**
     * 通过版本号得到一个SDK信息
     * @param version 版本号
     */
    public static getSDKInfo(version: string): EgretSDKInfo {
        return EgretSDKManager.instance.getSDKInfo(version);
    }
    /**
     * 得到全部引擎信息列表
     */
    public static getSDKInfos(): EgretSDKInfo[] {
        return EgretSDKManager.instance.getSDKInfos();
    }

    /**
     * 得到当前的引擎信息
     */
    public static getCurrentSDKInfo(): EgretSDKInfo {
        return EgretSDKManager.instance.getCurrentSDKInfo();
    }

    private callback: () => void = null;
    /**
     * 初始化引擎版本
     * @param callback 完成回调
     * @param thisArg this指针
     */
    public initSDKS(callback: () => void): void {
        this.callback = callback;
        var egretVersions: EgretVersions = new EgretVersions();
        egretVersions.getVersion(this.onGetEgretPaths, this);
    }

    private SDKList: EgretSDKInfo[] = [];
    private currentSDK: EgretSDKInfo = null;
    /**
     * 接收到获取的Egret版本列表和默认版本
     */
    private onGetEgretPaths(versions: VersionObj[], currentVersion: VersionObj): void {
        for (var i = 0; i < versions.length; i++) {
            this.SDKList.push(new EgretSDKInfo(versions[i].version, versions[i].path));
        }
        this.currentSDK = new EgretSDKInfo(currentVersion.version, currentVersion.path);
        if (this.callback) {
            this.callback();
        }
    }

    /**
     * 通过版本号得到一个SDK信息
     * @param version 版本号
     */
    public getSDKInfo(version: string): EgretSDKInfo {
        for (var i = 0; i < this.SDKList.length; i++) {
            if (this.SDKList[i].version === version) {
                return this.SDKList[i];
            }
        }
        return null;
    }
    /**
     * 得到全部引擎信息列表
     */
    public getSDKInfos(): EgretSDKInfo[] {
        return this.SDKList;
    }

    /**
     * 得到当前的引擎信息
     */
    public getCurrentSDKInfo(): EgretSDKInfo {
        return this.currentSDK;
    }
}

/**
 * EgretSDK信息
 * @author featherJ
 */
export class EgretSDKInfo {
    /**
     * 版本号
     */
    public version: string = '';
    /**
     * 该版本Egret文件夹路径
     */
    public path: string = '';

    public constructor(version: string, path: string) {
        this.version = version;
        this.path = path;
    }

    /**
     * 得到gui框架属性表文件路径
     */
    public get guiPropertiesPath(): string {
        return this.path + 'tools/lib/exml/properties.json';
    }

    /**
     * 得到gui框架清单文件路径
     */
    public get guiManifestPath(): string {
        return this.path + 'tools/lib/exml/egret-manifest.xml';
    }

    /**
     * 得到gui框架清单文件路径
     */
    public get guiExmlXsdPath(): string {
        return this.path + 'tools/lib/exml/exml.xsd';
    }

    /**
     * 得到gui框架属性表文件路径
     */
    public get euiPropertiesPath(): string {
        return this.path + 'tools/lib/eui/properties.json';
    }

    /**
     * 得到gui框架清单文件路径
     */
    public get euiManifestPath(): string {
        return this.path + 'tools/lib/eui/manifest.xml';
    }

    /**
     * 得到gui框架清单文件路径
     */
    public get euiExmlXsdPath(): string {
        return this.path + 'tools/lib/eui/exml.xsd';
    }
}