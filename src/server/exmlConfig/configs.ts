import {TsParser, ExmlParser, EUIParser, GUIParser} from './configcore';
import * as sax from '../sax/sax';
import * as xml from '../sax/xml-parser';
import {Namespace} from '../sax/Namespace';
import {StringUtil} from '../utils/StringUtil';
import {Prop, ClassNode} from './syntaxNodes';
import * as fs from 'fs';
import {FileUtil} from '../utils/FileUtil';


function isTs(path: string): boolean {
	if (
		StringUtil.endWith(path.toLocaleLowerCase(), '.ts') &&
		!StringUtil.endWith(path.toLocaleLowerCase(), '.exml.e.d.ts') &&
		!StringUtil.endWith(path.toLocaleLowerCase(), '.exml.g.d.ts')
	) {
		return true;
	}
	return false;
}
function isExml(path: string): boolean {
	if (StringUtil.endWith(path.toLocaleLowerCase(), '.exml')) {
		return true;
	}
	return false;
}
function isIgnore(path: string): boolean {
	if (path.indexOf('bin-debug/') === 0 || path.indexOf('bin-release/') === 0) {
		return true;
	}
	return false;
}

/**
 * @author featherJ
 */
export class AbstractExmlConfig {
	constructor() {
		this.initConfig();
	}
	/**默认值字典，该字典由子类维护，该属性由当前类或当前类的子类进行维护*/
	public defaultValueDic: { [prop: string]: any } = {};


	protected tsParser: TsParser;
	protected exmlParser: ExmlParser;
	protected initConfig(): void {
		this.tsParser = new TsParser();
	}

	/** property map in egret engine. This map will provide the eumn data */
	private properties: any = {};
	protected manifest: sax.Tag = null;
	private _xsdXML: sax.Tag = null;
	public get xsdXML(): sax.Tag {
		return this._xsdXML;
	}

	private _projectPath: string;
	public get projectPath(): string {
		return this._projectPath;
	}

	public init(
		projectPath: string,
		manifestPath: string,
		propertiesPath: string,
		xsdPath: string
	) {

		projectPath = projectPath.split('\\').join('/');
		this._projectPath = projectPath;

		this.customClassChanged = false;
		this.customChangedHandlers = [];

		this.exmlParser.init(this._projectPath, (node) => {
			return this.getRootClassName(node);
		});
		this.properties = this.initPropertyMap(propertiesPath);
		this.manifest = this.initManifest(manifestPath);
		this._xsdXML = this.initXsd(xsdPath);
		this.initFile();
	}

	private initPropertyMap(propertiesPath: string): any {
		var propertyMapStr: string = '';
		try {
			propertyMapStr = fs.readFileSync(propertiesPath, 'utf-8');
		} catch (error) { }
		if (!propertyMapStr) {
			return null;
		}
		var propertyMap: any = null;
		try {
			propertyMap = JSON.parse(propertyMapStr);
		} catch (error) { }
		return propertyMap;
	}

	private idMap: { [id: string]: string } = {};
	private initManifest(manifestPath: string): sax.Tag {
		var manifestStr: string = '';
		try {
			manifestStr = fs.readFileSync(manifestPath, 'utf-8');
		} catch (error) { }
		if (!manifestStr) {
			return null;
		}
		var manifest: sax.Tag = null;
		try {
			var manifest = xml.parse(manifestStr);
		} catch (error) { }
		if (manifest) {
			for (var i = 0; i < manifest.children.length; i++) {
				var item = manifest.children[i];
				var id = item.attributes['id'];
				var className = item.attributes['module'] + '.' + id;
				this.idMap[id] = className;
			}
		}
		return manifest;
	}

	private initXsd(xsdPath: string): sax.Tag {
		var xsdStr: string = '';
		try {
			xsdStr = fs.readFileSync(xsdPath, 'utf-8');
		} catch (error) { }
		if (!xsdStr) {
			return null;
		}
		var xsdXML: sax.Tag = null;
		try {
			var xsdXML = xml.parse(xsdStr);
		} catch (error) { }
		return xsdXML;
	}

	private initFile(): void {
		FileUtil.select(this.projectPath, ['exml', 'ts'], (filePath: string) => {
			this.addFile(filePath);
		}, this);
		this.doFilesChanged(false);
	}

	private tsAdds: string[] = [];
	private tsModifies: string[] = [];
	private tsDelete: string[] = [];

	private exmlAdds: string[] = [];
	private exmlModifies: string[] = [];
	private exmlDelete: string[] = [];
	public addFile(filePath: string): void {
		if (isIgnore(filePath)) {
			return;
		}
		if (isTs(filePath)) {
			var index = this.tsModifies.indexOf(filePath);
			if (index !== -1) {
				this.tsModifies.splice(index, 1);
			}
			index = this.tsDelete.indexOf(filePath);
			if (index !== -1) {
				this.tsDelete.splice(index, 1);
			}
			index = this.tsAdds.indexOf(filePath);
			if (index === -1) {
				this.tsAdds.push(filePath);
			}
			this.fileChanged('ts');
		} else if (isExml(filePath)) {
			var index = this.exmlModifies.indexOf(filePath);
			if (index !== -1) {
				this.exmlModifies.splice(index, 1);
			}
			index = this.exmlDelete.indexOf(filePath);
			if (index !== -1) {
				this.exmlDelete.splice(index, 1);
			}
			index = this.exmlAdds.indexOf(filePath);
			if (index === -1) {
				this.exmlAdds.push(filePath);
			}
			this.fileChanged('exml');
		}
	}

	public deleteFile(filePath: string): void {
		if (isTs(filePath)) {
			var index = this.tsModifies.indexOf(filePath);
			if (index !== -1) {
				this.tsModifies.splice(index, 1);
			}
			index = this.tsAdds.indexOf(filePath);
			if (index !== -1) {
				this.tsAdds.splice(index, 1);
			}
			index = this.tsDelete.indexOf(filePath);
			if (index === -1) {
				this.tsDelete.push(filePath);
			}
			this.fileChanged('ts');
		} else if (isExml(filePath)) {
			var index = this.exmlModifies.indexOf(filePath);
			if (index !== -1) {
				this.exmlModifies.splice(index, 1);
			}
			index = this.exmlAdds.indexOf(filePath);
			if (index !== -1) {
				this.exmlAdds.splice(index, 1);
			}
			index = this.exmlDelete.indexOf(filePath);
			if (index === -1) {
				this.exmlDelete.push(filePath);
			}
			this.fileChanged('exml');
		}
	}

	public updateFile(filePath: string): void {
		if (isTs(filePath)) {
			var index = this.tsModifies.indexOf(filePath);
			if (index === -1) {
				this.tsModifies.push(filePath);
			}
			this.fileChanged('ts');
		} else if (isExml(filePath)) {
			var index = this.exmlModifies.indexOf(filePath);
			if (index === -1) {
				this.exmlModifies.push(filePath);
			}
			this.fileChanged('exml');
		}
	}

	private tsFileChanged: boolean = false;
	private exmlFileChanged: boolean = false;

	private fileChanged(type: string = ''): void {
		let onSchedule = this.tsFileChanged || this.exmlFileChanged;
		if (type === 'ts') {
			this.tsFileChanged = true;
		} else if (type === 'exml') {
			this.exmlFileChanged = true;
		}
		if (!onSchedule && (this.tsFileChanged || this.exmlFileChanged)) {
			setTimeout(() => {
				this.doFilesChanged();
			}, 100);
		}
	}

	private doFilesChanged(fire: boolean = true): void {
		if (this.tsFileChanged) {
			this.tsParser.fileChanged(this.tsAdds, this.tsModifies, this.tsDelete);
			this.tsAdds = [];
			this.tsModifies = [];
			this.tsDelete = [];
		}
		if (this.exmlFileChanged) {
			this.exmlParser.fileChanged(this.exmlAdds, this.exmlModifies, this.exmlDelete);
			this.exmlAdds = [];
			this.exmlModifies = [];
			this.exmlDelete = [];
		}
		this.exmlFileChanged = false;
		this.tsFileChanged = false;
		this.currentStamp = process.uptime();
		if (fire) {
			this.customClassChange();
		}
	}

	private currentStamp: number = -1;
	private cacheStamp: number = -1;
	private _classNodeMap: { [fullName: string]: ClassNode } = {};
	public getClassNodeMap(): { [fullName: string]: ClassNode } {
		if (this.currentStamp !== this.cacheStamp) {
			this._classNodeMap = {};
			var tsClassDataMap = this.tsParser.getClassDataMap();
			var exmlClassDataMap = this.exmlParser.getClassDataMap();
			var classNodes: ClassNode[] = [];
			for (var className in tsClassDataMap) {
				var classNode: ClassNode = tsClassDataMap[className].classNode;
				var baseNames: string[] = tsClassDataMap[className].baseNames;
				var implementedNames: string[] = tsClassDataMap[className].implementedNames;
				for (var i = 0; i < baseNames.length; i++) {
					var baseClass = tsClassDataMap[baseNames[i]];
					var baseClassNode = baseClass ? baseClass.classNode : null;
					if (baseClassNode) {
						classNode.baseClass = baseClassNode;
					}
				}
				for (var i = 0; i < implementedNames.length; i++) {
					var interfaceClass = tsClassDataMap[implementedNames[i]];
					var interfaceClassNode = interfaceClass ? interfaceClass.classNode : null;
					if (interfaceClassNode) {
						classNode.implementeds.push(interfaceClassNode);
					}
				}
				this.parseAvailableProps(classNode);
				classNodes.push(classNode);
			}
			for (var className in exmlClassDataMap) {
				var baseNames = exmlClassDataMap[className].baseNames;
				var classNode = exmlClassDataMap[className].classNode;
				for (var i = 0; i < baseNames.length; i++) {
					var baseClass = tsClassDataMap[baseNames[i]];
					var baseClassNode = baseClass ? baseClass.classNode : null;
					if (baseClass) {
						classNode.baseClass = baseClassNode;
					}
					classNodes.push(classNode);
				}
			}

			for (var i = 0; i < classNodes.length; i++) {
				this._classNodeMap[classNodes[i].fullName] = classNodes[i];
			}
			this.cacheStamp = this.currentStamp;
		}
		return this._classNodeMap;
	}

	public getClassNode(className: string): ClassNode {
		return this.getClassNodeMap()[className];
	}

	private customClassChanged: boolean = false;
	/**
	 * 自定义类列表改变
	 */
	private customClassChange(): void {
		if (this.customClassChanged) {
			return;
		}
		this.customClassChanged = true;
		setTimeout(function (target: any): void {
			target.customClassChanged = false;
			for (var i = 0; i < target.customChangedHandlers.length; i++) {
				var func: Function = target.customChangedHandlers[i]['func'];
				var thisArg: any = target.customChangedHandlers[i]['thisArg'];
				func.call(thisArg);
			}
		}, 100, this);
	}
	private customChangedHandlers: any[] = [];
	/**
	 * 添加自定义文件改变的回调
	 */
	public addCustomChangedHandler(callBack: () => void, thisArg: any): void {
		var canAdded: boolean = true;
		for (var i = 0; i < this.customChangedHandlers.length; i++) {
			if (this.customChangedHandlers[i]['func'] === callBack && this.customChangedHandlers[i]['thisArg'] === thisArg) {
				canAdded = false;
				break;
			}
		}
		if (canAdded) {
			this.customChangedHandlers.push({
				'func': callBack,
				'thisArg': thisArg
			});
		}
	}
	/**
	 * 移除自定义文件改变的回调
	 */
	public removeCustomChangedHandler(callBack: () => void, thisArg: any): void {
		for (var i = 0; i < this.customChangedHandlers.length; i++) {
			if (this.customChangedHandlers[i]['func'] === callBack && this.customChangedHandlers[i]['thisArg'] === thisArg) {
				this.customChangedHandlers.splice(i, 1);
				break;
			}
		}
	}

	/* -------------------- TypeScript sub parsers -------------------- */
	private parseAvailableProps(classNode: ClassNode): void {
		var eumnData = this.properties ? this.properties['eumn'] : null;
		if (!eumnData) {
			return;
		}
		var fullClassName: string = classNode.fullName;
		for (var i = 0; i < classNode.props.length; i++) {
			var prop = classNode.props[i];
			if (eumnData[fullClassName] && eumnData[fullClassName][prop.name]) {
				prop.available = eumnData[eumnData[fullClassName][prop.name]];
			}
		}
	}

	/** Sub class override this function */
	protected getBasicTypes(): string[] {
		return [];
	}
	/** Sub class override this function */
	protected getEgretClasses(): string[] {
		return [];
	}
	/** Sub class override this function */
	public getUINs(): Namespace {
        return null;
    }
	/** Sub class override this function */
    public getWorkNs(): Namespace {
        return null;
    }
	/** Sub class override this function */
	protected getUIPrefix(): string {
		return '';
	}

	private getCustomStamp: number = -1;
	private customClassNames: string[] = [];
	/**
	 * 自定义类名列表
	 * todo 这个方法还是旧的形式 要换掉
	 */
	public get customClassNameList(): string[] {
		if (this.currentStamp !== this.getCustomStamp) {
			this.customClassNames = [];
			var classNodeMap = this.getClassNodeMap();
			for (var className in classNodeMap) {
				if (!classNodeMap[className].inEngine && !classNodeMap[className].isInterface) {
					this.customClassNames.push(classNodeMap[className].fullName);
				}
			}
			this.getCustomStamp = this.currentStamp;
		}
		return this.customClassNames;
	}

	private getCodePromptStamp: number = -1;
	private codePromptclassNames: string[] = [];
	/**
	 * 自定义类名列表
	 * todo 这个方法还是旧的形式 要换掉
	 */
	public get codePromptClassNameList(): string[] {
		if (this.currentStamp !== this.getCodePromptStamp) {
			this.codePromptclassNames = [];
			var classNodeMap = this.getClassNodeMap();
			for (var className in classNodeMap) {
				if (!classNodeMap[className].isInterface && (
					!classNodeMap[className].inEngine || classNodeMap[className].inPrompt
				)) {
					this.codePromptclassNames.push(classNodeMap[className].fullName);
				}
			}
			this.getCodePromptStamp = this.currentStamp;
		}
		return this.codePromptclassNames;
	}


	/**
	 * 得到一个类名
	 * todo 这个方法应该由getClassName取代
	 */
	public getClassNameById(id: string, ns: Namespace = null): string {
		return this.getClassName(id, ns);
	}

	/**
	 * Get a full class name by id and namespace.
	 */
	public getClassName(id: string, ns: Namespace): string {
		if (ns.uri === EUIExmlConfig.EUI.uri) {
			if (id === 'Object') {
				return id;
			}
			if (this.getEgretClasses().indexOf(id) !== -1 && ns.uri === this.getUINs().uri) {
                return 'egret.' + id;
			}
		}
		var name: string = '';
        if (this.getBasicTypes().indexOf(id) !== -1) {
            return id;
		}
		if (ns.uri === this.getWorkNs().uri) {
        } else if (!ns || !ns.uri || (ns.uri === this.getUINs().uri)) {
            name = this.getUIPrefix() + id;
        } else {
            name = ns.uri.substring(0, ns.uri.length - 1) + id;
        }
		return name;
    }

	public getRootClassName(node: sax.Tag): string {
		if (!node) {
			return '';
		}
		var name: string = node.localName;
		var ns: Namespace = new Namespace(node.prefix, node.namespace);
		var className: string = this.getClassName(name, ns);
		if (!className) {
			if (ns.uri === '*' || StringUtil.endWith(ns.uri, '.*')) {
				className = ns.uri.substring(0, ns.uri.length - 1) + name;
			}
		}
		return className;
	}

	public isInstanceOf(classNameA: string, classNameB: string): boolean {
		if (classNameB === 'any' || classNameB === 'Class') {
			return true;
		}
		if (classNameA === classNameB) {
			return true;
		}
		var classNode = this.getClassNode(classNameA);
		if (!classNode) {
			return false;
		}
		var baseClassNode = classNode.baseClass;
		if (baseClassNode) {
			if (this.isInstanceOf(baseClassNode.fullName, classNameB)) {
				return true;
			}
		}
		var implementedNodes = classNode.implementeds;
		for (var i = 0; i < implementedNodes.length; i++) {
			if (this.isInstanceOf(implementedNodes[i].fullName, classNameB)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * 得到一个类的属性，不递归。
	 * todo  这个方法没用，直接可以可以通过数据结构拿到
	 */
	public getProperty(className: string): any {
		var classNode = this.getClassNode(className);
		if (!classNode) {
			return null;
		}
		var prop = {};
		var implementsArr: string[] = [];
		for (var i = 0; i < classNode.implementeds.length; i++) {
			implementsArr.push(classNode.implementeds[i].fullName);
		}
		prop['implements'] = implementsArr;
		if (classNode.baseClass) {
			prop['super'] = classNode.baseClass.fullName;
		}
		for (var i = 0; i < classNode.props.length; i++) {
			prop[classNode.props[i].name] = classNode.props[i].type;
		}
		return prop;
	}
	/**
	 * todo 这个方法没用，直接从数据结构就可以得到结果
	 * 得到父类全名
	 */
	public getSuperClsName(className: string): string {
		var classNode = this.getClassNode(className);
		if (!classNode) {
			return null;
		}
		var baseClass = classNode.baseClass;
		if (!baseClass) {
			return null;
		}
		return baseClass.fullName;
	}

	/**
	 * todo fuck it
	 */
	public getAllInterface(className: string): string[] {
		var result: ClassNode[] = [];
		var doGet: (classNode: ClassNode) => void = (classNode: ClassNode) => {
			var implementeds = classNode.implementeds;
			for (var i = 0; i < implementeds.length; i++) {
				var implementedArr = this.getExtendsChainNew(implementeds[i].fullName);
				result = result.concat(implementedArr);
			}
			var baseClass = classNode.baseClass;
			if (baseClass) {
				doGet(baseClass);
			}
		};
		var classNode = this.getClassNode(className);
		if (classNode) {
			doGet(classNode);
		}
		var newResult = [];
		for (var i = 0; i < result.length; i++) {
			if (newResult.indexOf(result[i].fullName) === -1 && result[i].isInterface) {
				newResult.push(result[i].fullName);
			}
		}
		return newResult;
	}

	public getExtendsChainNew(className: string): ClassNode[] {
		var arr: ClassNode[] = [];
		var currentClassNode = this.getClassNode(className);
		while (true) {
			if (!currentClassNode) {
				break;
			}
			arr.push(currentClassNode);
			currentClassNode = currentClassNode.baseClass;
		}
		return arr;
	}

	/**
	 * todo 这个方法应该由 getExtendsChainNew 取代
	 * @param className
	 * @return
	 */
	public getExtendsChain(className: string): string[] {
		var classNodes = this.getExtendsChainNew(className);
		var result: string[] = [];
		for (var i = 0; i < classNodes.length; i++) {
			result.push(classNodes[i].fullName);
		}
		return result;
	}
	/**
	 * Get props with in an class. This function will recursive lookup the props.
	 * 替换 getAllPropertyByName 和 getPropertyAfterBase 方法。
	 */
	public getProps(className: string, baseClassName: string = ''): Prop[] {
		var props: Prop[] = [];
		var currentClassNode = this.getClassNode(className);
		while (true) {
			if (!currentClassNode || currentClassNode.fullName === baseClassName) {
				break;
			}
			props = props.concat(currentClassNode.props);
			currentClassNode = currentClassNode.baseClass;
		}
		return props;
	}

	/**
	 * todo 这个方法应该由 getProps 代替
	 */
	public getAllPropertyByName(className: string): any {
		return this.getPropertyAfterBase(className, '');
	}

	/**
	 * todo 这个方法应该由 getProps 代替
	 */
	public getPropertyAfterBase(className: string, base: string): any {
		var prop = {};
		var props = this.getProps(className, base);
		if (props) {
			for (var i = 0; i < props.length; i++) {
				if (props[i].available.length > 0) {
					prop[props[i].name] = props[i].available;
				} else {
					prop[props[i].name] = props[i].type;
				}
			}
		}
		return prop;
	}

	/**
	 * 为指定的完整类名创建命名空间。
	 * @param className 类名
	 * @param xml 要加入到的XML对象，用于检查前缀重复。
	 */
	public createNamespace(className: string, nsList: Namespace[]): Namespace {
		className = className.split('::').join('.');
		var id: string = className;
		var index: number = className.lastIndexOf('.');
		if (index !== -1) {
			id = className.substring(index + 1);
		}
		if (this.idMap[id] === className) {
			return this.getUINs();
		}
		var uri: string = '*';
		if (index !== -1) {
			uri = className.substring(0, index + 1) + '*';
		}
		var prefixes: string[] = [];
		for (var i = 0; i < nsList.length; i++) {
			var ns = nsList[i];
			if (ns.uri === uri) {
				return ns;
			}
			prefixes.push(ns.prefix);
		}
		var prefix: string = '';
		var preStr: string = '';
		if (index === -1) {
			preStr = 'ns';
			prefix = 'ns1';
		}
		else {
			var subStr: string = className.substring(0, index);
			index = subStr.lastIndexOf('.');
			if (index === -1) {
				prefix = subStr;
			} else {
				prefix = subStr.substring(index + 1);
			}
			preStr = prefix;
		}
		index = 0;
		while (prefixes.indexOf(prefix) !== -1) {
			index++;
			prefix = preStr + index;
		}
		return new Namespace(prefix, uri);
	}

	public getAllSkinClassName(): string[] {
		return this.exmlParser.getAllSkinClassName();
	}

	/**
	 * 得到类有默认值的属性map，不递归。
	 * todo 这个方法并没有什么用，因为新的数据结构里已经包含默认值了。
	 */
	public getPropertyDefaultValue(className: string): any {
		var classNode = this.getClassNode(className);
		var prop = {};
		for (var i = 0; i < classNode.props.length; i++) {
			var propNode = classNode.props[i];
			prop[propNode.name] = propNode.value;
		}
		return prop;
	}

	/**
	 * 对自定义组件类名进行排序，按照从子类到父类的顺序排列。
	 * @param classNames
	 */
	public sortComponentClassNames(classNames: string[]): void {
		//对customClassNameList进行排序，按照从子类到父类的顺序排列
		var newClassNames: string[] = [];
		while (classNames.length > 0) {
			var className: string = classNames.pop();
			var isInsert: boolean = false;
			for (var i = 0; i < newClassNames.length - 1; i++) {
				var isCurrent: boolean = this.isInstanceOf(className, newClassNames[i]);
				var isNext: boolean = i + 1 < newClassNames.length ? this.isInstanceOf(className, newClassNames[i + 1]) : false;
				//插入到i的后面
				if (isCurrent && !isNext) {
					newClassNames.push(className);
					for (var j = newClassNames.length - 1; j > i; j--) {
						newClassNames[j] = newClassNames[j - 1];
					}
					newClassNames[i] = className;
					isInsert = true;
					break;
				}
			}
			if (!isInsert) {
				newClassNames.push(className);
			}
		}
		for (i = 0; i < newClassNames.length; i++) {
			classNames.unshift(newClassNames[i]);
		}
	}

	/**
	 * todo 这个方法最好被命名为
	 */
	public isTsCustomClass(className: string): boolean {
		var classNode = this.getClassNodeMap()[className];
		if (!classNode) {
			return false;
		}
		//todo 这里最好搞一下，因为没有必要判断是不是exml
		var exmlPath = this.getClassPath(className);
		if (exmlPath) {
			return false;
		}
		return !classNode.inEngine;
	}

	/**
	 * Todo 这个方法最好被命名为 getExmlPath 因为这里不需要取到任何ts的路径
	 */
	public getClassPath(className: string): string {
		return this.exmlParser.getExmlPath(className);
	}

	public get skinClassNameToPath(): { [className: string]: string } {
		return this.exmlParser.skinClassNameToPath;
	}

}


/**
 * @author featherJ
 */
export class EUIExmlConfig extends AbstractExmlConfig {

	protected initConfig(): void {
		super.initConfig();
		this.exmlParser = new EUIParser();
	}

	public static W: Namespace = new Namespace('w', 'http://ns.egret.com/wing');
    public static EUI: Namespace = new Namespace('e', 'http://ns.egret.com/eui');
    public getUINs(): Namespace {
        return EUIExmlConfig.EUI;
    }
    public getWorkNs(): Namespace {
        return EUIExmlConfig.W;
    }

	private static coreClasses: string[] = ['Point', 'Matrix', 'Rectangle'];
    private static basicTypes: string[] = ['Array', 'boolean', 'string', 'number'];
    protected getBasicTypes(): string[] {
        return EUIExmlConfig.basicTypes;
    }
	protected getEgretClasses(): string[] {
		return EUIExmlConfig.coreClasses;
	}

	protected getUIPrefix(): string {
		return 'eui.';
	}
}


/**
 * @author featherJ
 */
export class GUIExmlConfig extends AbstractExmlConfig {
	protected initConfig(): void {
		super.initConfig();
		this.exmlParser = new GUIParser();
	}

    public static GUI: Namespace = new Namespace('e', 'http://ns.egret-labs.org/egret');
	public static W: Namespace = new Namespace('w', 'http://ns.egret-labs.org/wing');
    public getUINs(): Namespace {
        return GUIExmlConfig.GUI;
    }
    public getWorkNs(): Namespace {
        return GUIExmlConfig.W;
    }

	private static coreClasses: string[] = ['Point', 'Matrix', 'Rectangle'];
	private static basicTypes: string[] = ['void', 'any', 'number', 'string', 'boolean', 'Object', 'Array', 'Function'];
    protected getBasicTypes(): string[] {
        return GUIExmlConfig.basicTypes;
    }
	protected getEgretClasses(): string[] {
		return GUIExmlConfig.coreClasses;
	}

	protected getUIPrefix(): string {
		return 'egret.gui.';
	}
}