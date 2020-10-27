import * as ts from './typescript_inner';
import * as utils from "./utils";
import { Prop, ClassNode} from './syntaxNodes';
import * as xml from '../sax/xml-parser';
import * as sax from '../sax/sax';
import {StringUtil} from '../utils/StringUtil';
import * as fs from 'fs';

var _inEgret = [
	'/libs/modules/egret/',
	'/libs/modules/eui/',
	'/libs/modules/egret-wasm/',
	'/libs/modules/eui-wasm/',
	'/libs/modules/gui/',
	'/libs/modules/res/',
	'/libs/modules/tween/'
];

var _needPrompt = [
	'/libs/modules/tween/'
];

function inEgret(path: string): boolean {
	path = path.replace(/\\/g, '/');
	for (var i = 0; i < _inEgret.length; i++) {
		if (path.indexOf(_inEgret[i]) !== -1) {
			return true;
		}
	}
	return false;
}

function inPrompt(path: string): boolean {
	path = path.replace(/\\/g, '/');
	for (var i = 0; i < _needPrompt.length; i++) {
		if (path.indexOf(_needPrompt[i]) !== -1) {
			return true;
		}
	}
	return false;
}

const options: ts.CompilerOptions = { module: ts.ModuleKind.CommonJS };

export interface TempClassData {
	baseNames: string[];
	implementedNames: string[];
	classNode: ClassNode;
}


/**
 * @author featherJ
 */
export class TsParser {
	constructor() {
	}

	private files: ts.Map<{ version: number }>;
	private servicesHost: ts.LanguageServiceHost;
	private services: ts.LanguageService;
	public fileChanged(adds: string[], modifies: string[], deletes: string[]): void {
		var mPaths: string[] = modifies;
		var dPaths: string[] = deletes;
		var cPaths: string[] = adds;
		if (!this.files) {
			this.files = Object.create(null);
		}
		for (var i = 0; i < cPaths.length; i++) {
			if (this.files[cPaths[i]]) {
				this.files[cPaths[i]].version++;
			} else {
				this.files[cPaths[i]] = { version: 0 };
			}
		}
		for (var i = 0; i < mPaths.length; i++) {
			if (this.files[mPaths[i]]) {
				this.files[mPaths[i]].version++;
			} else {
				this.files[mPaths[i]] = { version: 0 };
			}
		}
		for (var i = 0; i < dPaths.length; i++) {
			delete this.files[dPaths[i]];
		}
		if (!this.servicesHost) {
			this.servicesHost = {
				getScriptFileNames: () => {
					var paths: string[] = [];
					for (var path in this.files) {
						paths.push(path);
					}
					return paths;
				},
				getScriptVersion: (fileName) => this.files[fileName] && this.files[fileName].version.toString(),
				getScriptSnapshot: (fileName) => {
					if (!fs.existsSync(fileName)) {
						return undefined;
					}
					return ts.ScriptSnapshot.fromString(fs.readFileSync(fileName).toString());
				},
				getCurrentDirectory: () => process.cwd(),
				getCompilationSettings: () => options,
				getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
			};
			this.services = ts.createLanguageService(this.servicesHost, ts.createDocumentRegistry());
		}
		this.currentStamp = process.uptime();
	}
	private currentStamp: number = -1;
	private cacheStamp: number = -1;
	public getClassDataMap(): { [className: string]: TempClassData } {
		if (this.cacheStamp !== this.currentStamp) {
			this.services.getProgram();
			this.tmpClassMap = {};
			var program = this.services.getProgram();
			var sourceCodes = program.getSourceFiles();
			var checker = program.getTypeChecker();
			for (var i = 0; i < sourceCodes.length; i++) {
				if (sourceCodes[i].fileName.indexOf('lib.d.ts') === -1) {
					this.delintNode(sourceCodes[i], checker, inEgret(sourceCodes[i].fileName), inPrompt(sourceCodes[i].fileName));
				}
			}
			this.cacheStamp = this.currentStamp;
		}
		return this.tmpClassMap;
	}

	private tmpClassMap: { [className: string]: TempClassData } = {};
	private delintNode(node: ts.Node, checker: ts.TypeChecker, inEngine: boolean = false, inPrompt: boolean = false): void {
		if ((node.kind === ts.SyntaxKind.ClassDeclaration || node.kind === ts.SyntaxKind.InterfaceDeclaration) &&
			this.isExport(node, checker)
		) {
			var nodeType = checker.getTypeAtLocation(node);
			var baseTypes = checker.getBaseTypes(<ts.InterfaceType>nodeType);
			var implementedTypes = utils.getImplementedInterfaces(nodeType, checker);
			var symbol = nodeType.getSymbol();
			var className = utils.getFullyQualifiedName(symbol, checker);
			var props = symbol.members;
			var baseClassNames = this.getIds(baseTypes, checker);
			var implementedNames = this.getIds(implementedTypes, checker);
			var propList: Prop[] = [];
			for (var name in props) {
				if (name.indexOf('$') === 0) {
					continue;
				}
				var prop = props[name];
				if (prop.flags & (ts.SymbolFlags.Property | ts.SymbolFlags.Accessor)) {
					var modifierFlags = ts.getCombinedModifierFlags(prop.declarations[0])
					if (modifierFlags & (ts.ModifierFlags.Protected | ts.ModifierFlags.Private | ts.ModifierFlags.Readonly)) {
						continue;
					}
					if ((prop.flags & ts.SymbolFlags.Accessor) && prop.declarations.filter(d => d.kind === ts.SyntaxKind.SetAccessor).length === 0) {
						continue;
					}
					if (prop.getDocumentationComment().some(c => c.text.indexOf('@private') >= 0)) {
						continue;
					}
					var type: string = '';
					if (prop.valueDeclaration && (<ts.VariableDeclaration>prop.valueDeclaration).initializer) {
						var initializer = (<ts.VariableDeclaration>prop.valueDeclaration).initializer;
					}
					var defaultValue = '';
					var propType = checker.getTypeAtLocation(prop.declarations[0]);
					if (propType.getFlags() & ts.TypeFlags.Boolean) {
						type = 'boolean';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = 'false';
						}
					} else if (propType.getFlags() & ts.TypeFlags.String) {
						type = 'string';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = '\"\"';
						}
					} else if (propType.getFlags() & ts.TypeFlags.Number) {
						type = 'number';
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = '0';
						}
					} else {
						var symbol = propType.getSymbol();
						if (symbol) {
							type = utils.getFullyQualifiedName(symbol, checker);
						} else {
							type = 'any';
						}
						if (initializer) {
							defaultValue = initializer.getText();
						} else {
							defaultValue = 'null';
						}
					}
					var propNode = new Prop();
					propNode.name = name;
					propNode.type = type;
					propNode.value = defaultValue;
					propList.push(propNode);
				}
			}
			var classNode: ClassNode = new ClassNode();
			classNode.inEngine = inEngine;
			classNode.inPrompt = inPrompt;
			classNode.props = propList;
			classNode.fullName = className;
			if (node.kind === ts.SyntaxKind.InterfaceDeclaration) {
				classNode.isInterface = true;
			}
			var tempClassNode = {
				baseNames: baseClassNames,
				implementedNames: implementedNames,
				classNode: classNode
			};
			if (this.checkCanAdded(classNode)) {
				this.tmpClassMap[className] = tempClassNode;
			}
		}
		ts.forEachChild(node, (node) => {
			this.delintNode(node, checker, inEngine, inPrompt);
		});
	}
	private checkCanAdded(node: ClassNode): boolean {
		if (node.inEngine) {
			return true;
		}
		if (this.tmpClassMap[node.fullName] && this.tmpClassMap[node.fullName]['classNode']) {
			var classNode: ClassNode = this.tmpClassMap[node.fullName]['classNode'];
			if (classNode.inEngine) {
				return false;
			}
		}
		return true;
	}
	private isExport(node: ts.Node, checker: ts.TypeChecker): boolean {
		var symbol: ts.Symbol = checker.getTypeAtLocation(node).getSymbol();
		if (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile) {
			if (!symbol['parent']) {
				return true;
			}
		} else {
			if (symbol['parent']) {
				return true;
			}
		}
		return false;
	}

	private getId(type: ts.Type, checker: ts.TypeChecker): string {
		var symbol = type.getSymbol();
		var className = utils.getFullyQualifiedName(symbol, checker);
		return className;
	}
	private getIds(types: ts.Type[], checker: ts.TypeChecker): string[] {
		var ids: string[] = [];
		for (var i = 0; i < types.length; i++) {
			ids.push(this.getId(types[i], checker));
		}
		return ids;
	}
}

/**
 * @author featherJ
 */
export class ExmlParser {

	private projectPath: string;
	protected getRootClassName: (node: sax.Tag) => string;
	public init(projectPath: string, getRootClassName: (node: sax.Tag) => string): void {
		this.projectPath = projectPath;
		this.getRootClassName = getRootClassName;
	}

	public get srcPath(): string {
		if (this.projectPath.charAt(this.projectPath.length - 1) === '/' || this.projectPath.charAt(this.projectPath.length - 1) === '\\') {
			return this.projectPath + 'src/';
		}
		return this.projectPath + '/src/';
	}

	private _skinClassNameToPath: { [className: string]: string } = {};
	public get skinClassNameToPath(): { [className: string]: string }{
		return this._skinClassNameToPath;
	}

	private pathToClassData: { [path: string]: { className: string, baseName: string, shortUrl: string, isSkin: boolean } } = {};
	private tempClassDataMap: { [className: string]: TempClassData } = {};
	public fileChanged(adds: string[], modifies: string[], deletes: string[]): void {
		var mPaths: string[] = modifies;
		var dPaths: string[] = deletes;
		var cPaths: string[] = adds;

		//delete
		for (var i = 0; i < dPaths.length; i++) {
			delete this.pathToClassData[dPaths[i]];
		}
		//added and modify
		var newPaths: string[] = cPaths.concat(mPaths);
		for (var i = 0; i < newPaths.length; i++) {
			var path = newPaths[i];
			var content = fs.readFileSync(path, 'utf-8');
			var contentTag: sax.Tag = null;
			try {
				contentTag = xml.parse(content);
			} catch (error) { }
			var className = this.parseExmlClassName(path, contentTag);
			var shortUrl = this.path2relative(path);
			var baseClassName = this.getBaseClassName(contentTag);
			var isSkin = this.checkIsExmlSkin(contentTag);
			this.pathToClassData[path] = {
				className: className,
				baseName: baseClassName,
				shortUrl: shortUrl,
				isSkin: isSkin
			};
		}
		this.tempClassDataMap = {};
		//sum
		for (var path in this.pathToClassData) {
			var currentClassData = this.pathToClassData[path];
			var className = currentClassData.className;
			var baseClassName = currentClassData.baseName;
			var shortUrl = currentClassData.shortUrl;
			var isSkin = currentClassData.isSkin;
			if (className) {
				this._skinClassNameToPath[className] = path;
			} else {
				this._skinClassNameToPath[shortUrl] = path;
			}
			if (className) {
				var classNode = new ClassNode();
				classNode.fullName = className;
				var tempClassData: TempClassData = {
					baseNames: [baseClassName],
					implementedNames: [],
					classNode: classNode
				};
				this.tempClassDataMap[className] = tempClassData;
			}
		}
	}

	public getClassDataMap(): { [className: string]: TempClassData } {
		return this.tempClassDataMap;
	}

	private path2relative(path: string): string {
		var index = path.indexOf(this.projectPath);
		if (index === 0) {
			return path.substring(this.projectPath.length);
		} else {
			return '';
		}
	}

	private getBaseClassName(text: string | sax.Tag): string {
		var exml: sax.Tag = null;
		if (text) {
			if (typeof text === 'string') {
				try {
					exml = xml.parse(text);
				} catch (error) { }
			} else {
				exml = text;
			}
		}
		if (!exml) {
			return null;
		}
		var superClass: string = this.getRootClassName(exml);
		return superClass;
	}

	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
		return '';
	}

	protected checkIsExmlSkin(content: string | sax.Tag): boolean {
		return false;
	}

	public getAllSkinClassName(): string[] {
		var array: string[] = [];
		for (var skinClassName in this._skinClassNameToPath) {
			if (!StringUtil.endWith(skinClassName.toLowerCase(), '.exml')) {
				array.push(skinClassName);
			}
		}
		array.sort();
		return array;
	}

	public getExmlPath(className: string): string {
		if (!className) {
			return null;
		}
		if (StringUtil.endWith(className.toLowerCase(), '.exml')) {
			return this.projectPath + className;
		}
		return this._skinClassNameToPath[className];
	}
}
/**
 * @author featherJ
 */
export class EUIParser extends ExmlParser {
	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
        if (!content) {
            return '';
		}
        try {
			var exml: sax.Tag;
			if (typeof content === 'string') {
				exml = xml.parse(content);
			} else {
				exml = content;
			}
            var className: string = exml.attributes['class'];
            if (className) {
                return className;
			}
            return '';
        }
        catch (error) {
        }
        return '';
    }

    protected checkIsExmlSkin(content: string | sax.Tag): boolean {
        var rootClassName: string = null;
        if (content) {
			if (typeof content === 'string') {
				try {
					rootClassName = this.getRootClassName(xml.parse(<string>content));
				} catch (error) {
					return false;
				}
			} else {
				rootClassName = this.getRootClassName(<sax.Tag>content);
			}
        }
        if (rootClassName === 'eui.Skin') {
            return true;
		}
        return false;
    }
}

/**
 * @author featherJ
 */
export class GUIParser extends ExmlParser {
	protected parseExmlClassName(filePath: string, content: string | sax.Tag): string {
        var className: string = '';
        if (filePath.substring(0, this.srcPath.length) === this.srcPath) {
            className = filePath.substring(this.srcPath.length, filePath.length - 5);
            className = className.split('/').join('.');
        }
        return className;
    }

	protected checkIsExmlSkin(content: string | sax.Tag): boolean {
        return true;
    }
}
