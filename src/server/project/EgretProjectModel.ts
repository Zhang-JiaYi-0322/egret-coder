import { FileUtil } from '../utils/FileUtil';
import { EgretSDKManager, EgretSDKInfo } from './EgretSDKManager';

/**
 * 项目数据层模块
 * @author featherJ
 */
export class EgretProjectModel {

    private _projectPath: string = '';
    /**
     * 初始化Egret项目数据模块
     * @param rootPath 项目根路径
     */
    public init(projectPath: string): void {
        this._projectPath = projectPath;
    }

    /**
     * 目标工程的路径
     */
    public get projectPath(): string {
        return this._projectPath;
    }

    /**
     * 项目目标工程的Wing配置文件路径
     */
    public get wingPropertiesPath(): string {
                if (this._projectPath.charAt(this._projectPath.length - 1) === '/' || this._projectPath.charAt(this._projectPath.length - 1) === '\\') {
            return this._projectPath + 'wingProperties.json';
        }
                return this._projectPath + '/wingProperties.json';
    }

    private wingProperties: any = null;
    private wingPropertiesParserd: boolean = false;
    /** 得到项目Wing的属性 */
    private getWingProperties(): any {
        if (!this.wingPropertiesParserd) {
            this.wingPropertiesParserd = true;
            try {
                let wingPropertyStr: string = FileUtil.openAsString(this.wingPropertiesPath);
                this.wingProperties = JSON.parse(wingPropertyStr);
            } catch (error) { }
        }
        return this.wingProperties;
    }


    /**
     * 当前项目的主题路径
     */
    public get themePath(): string {
        if (this.getWingProperties()) {
            if (this.getWingProperties()['theme']) {
                return this.getWingProperties()['theme'];
            }
        }
        return '';
    }
    /**
     * 得到目标工程的src路径
     */
    public get srcPath(): string {
        if (this._projectPath.charAt(this._projectPath.length - 1) === '/' || this._projectPath.charAt(this._projectPath.length - 1) === '\\') {
            return this._projectPath + 'src/';
        }
        return this._projectPath + '/src/';
    }
    /**
     * 得到目标工程的src路径
     */
    public get egretPropertiesPath(): string {
        if (this._projectPath.charAt(this._projectPath.length - 1) === '/' || this._projectPath.charAt(this._projectPath.length - 1) === '\\') {
            return this._projectPath + 'egretProperties.json';
        }
        return this._projectPath + '/egretProperties.json';
    }

    /**
     * 项目指定的引擎版本
     */
    public get egretVersion(): string {
        if (this.getEgretProperties()) {
            let version = this.getEgretProperties()['egret_version'];
            if (!version) {
                version = this.getEgretProperties()['engineVersion'];
            }
            return version;
        }
        return '';
    }

    private egretProperties: any = null;
    private egretPropertiesParserd: boolean = false;
    /** 得到项目的属性 */
    private getEgretProperties(): any {
        if (!this.egretPropertiesParserd) {
            this.egretPropertiesParserd = true;
            try {
                let egretPropertyStr: string = FileUtil.openAsString(this.egretPropertiesPath);
                this.egretProperties = JSON.parse(egretPropertyStr);
            } catch (error) { }
        }
        return this.egretProperties;
    }

    /**
     * 得到当前使用的ui库
     */
    public get UILibrary(): string {
        let modules: string[] = [];
        let properties: any = this.getEgretProperties();
        if (properties && properties['modules'] && properties['modules'].length) {
            for (let i = 0; i < properties['modules'].length; i++) {
                let name: string = properties['modules'][i]['name'];
                if (name) {
                    modules.push(name);
                }
            }
        }
        if (modules.indexOf('eui') !== -1) {
            return 'eui';
        } else if (modules.indexOf('gui') !== -1) {
            return 'gui';
        }
        return '';
    }

    /**
     * 得到优先的引擎信息，该方法会先寻找对应的引擎版本，如果无法找到则得到当前的引擎版本。
     * @return 引擎SDK信息
     */
    public getPrioritySDKInfo(): EgretSDKInfo {
        let sdkInfo: EgretSDKInfo = EgretSDKManager.getSDKInfo(this.egretVersion);
        if (!sdkInfo) {
            sdkInfo = EgretSDKManager.getCurrentSDKInfo();
        }
        return sdkInfo;
    }

    /**
     * 检查是否需要刷新项目数据层，只有当改变的文件是egretProperties文件的时候，才需要刷新数据层
     * @param filePath 文件地址
     * @param type 类型 0:Added 1:Changed 2:Deleted
     */
    public needRefresh(filePath: string, type: number): boolean {
        // 检查到如果是egretProperties文件发生了变化，则将已解析的标识设置为false
        if (type === 0 || type === 1) {
            let ext: string = FileUtil.getExtension(filePath);
            if (ext === 'json') {
                let fileName: string = FileUtil.getFileName(filePath);
                if (fileName === 'egretProperties') {
                    this.egretPropertiesParserd = false;
                    return true;
                }
            }
        }
    }

    public get isEUIProj(): boolean {
        return this.UILibrary === 'eui';
    }
}