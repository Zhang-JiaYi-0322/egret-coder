import { CompletionItemKind, Range, TextEdit, CompletionItem } from 'vscode-languageserver';
import { Element, Group, SchemaNameChecker, ISchemaName } from '../core/Schema';
import { XMLDocument } from '../core/XMLDocument';
import { BaseSchemaStrategy } from '../schemas/BaseSchemaStrategy';
import { EUISchemaStrategy } from '../schemas/EUISchemaStrategy';
import { GUISchemaStrategy } from '../schemas/GUISchemaStrategy';
import { EUIExmlConfig, GUIExmlConfig } from '../exmlConfig/configs';
import { TextDocumentBase } from '../core/TextDocumentBase';
import { AbstractExmlConfig } from '../exmlConfig/configs';
import { SchemaModel } from '../schemas/SchemaModel';
import { FileUtil } from '../utils/FileUtil';
import { ImageSourceAssistUnit } from './ImageSourceAssistUnit';
import { QName } from '../sax/QName';
import { Namespace } from '../sax/Namespace';
import { StringUtil } from '../utils/StringUtil';
import { EgretProjectModel } from '../project/EgretProjectModel';
import { LabelStyleAssistUnit } from './labelStyleAssistUnit';

// xml解析器
import * as xml from '../sax/xml-parser';
import * as sax from '../sax/sax';
import { EXMLPos } from '../schemas/ISchemaContentAssist';
import { EgretExtensionCommand } from '../../egret';
import { XmlUtil } from '../../client/utils/XmlUtil';

/**
 * 图片的source提示解析器
 */
export class EXMLContentAssistProcessor {

    // 图像资源提示解析器
    private imageCompetion: ImageSourceAssistUnit = new ImageSourceAssistUnit();
    private labelStyle: LabelStyleAssistUnit = new LabelStyleAssistUnit();
    public constructor() {
    }

    private _exmlConfig: AbstractExmlConfig = null;
    public get exmlConfig(): AbstractExmlConfig {
        return this._exmlConfig;
    }

    private _projectModel: EgretProjectModel = null;
    public get projectModel(): EgretProjectModel {
        return this._projectModel;
    }
    public classChangedFunc: () => void;

    public initedFunc: () => void;
    public inited: boolean = false;
    /**
     * 初始化内容提示器
     * @param rootPath 项目根路径
     */
    public init(projectModel: EgretProjectModel, classChangedFunc: () => void): void {
        this._projectModel = projectModel;
        this.classChangedFunc = classChangedFunc;
        this.start();
        if (this.initedFunc) {
            this.initedFunc();
        }
        this.inited = true;
    }

    private schema: SchemaModel = null;
    /**
     * 启动代码提示助手，该方法可以重复调用，重复调用会彻底初始化内部配置
     */
    private start(): void {
        let schemaStrategy: BaseSchemaStrategy = null;
        if (this._projectModel.UILibrary === 'eui') {
            this._exmlConfig = new EUIExmlConfig();
            this._exmlConfig.init(
                this._projectModel.projectPath,
                this._projectModel.getPrioritySDKInfo().euiManifestPath,
                this._projectModel.getPrioritySDKInfo().euiPropertiesPath,
                this._projectModel.getPrioritySDKInfo().euiExmlXsdPath
            );
            schemaStrategy = new EUISchemaStrategy();
        } else if (this._projectModel.UILibrary === 'gui') {
            this._exmlConfig = new GUIExmlConfig();
            this._exmlConfig.init(
                this._projectModel.projectPath,
                this._projectModel.getPrioritySDKInfo().guiManifestPath,
                this._projectModel.getPrioritySDKInfo().guiPropertiesPath,
                this._projectModel.getPrioritySDKInfo().guiExmlXsdPath
            );
            schemaStrategy = new GUISchemaStrategy();
        }
        if (schemaStrategy) {
            this.schema = new SchemaModel();
            this.imageCompetion.init(this._projectModel.projectPath);
            this.labelStyle.init(this._projectModel.themePath);
            schemaStrategy.init(this._exmlConfig);
            this._exmlConfig.addCustomChangedHandler(() => {
                if (this.classChangedFunc) {
                    this.classChangedFunc();
                }
            }, this);
            this.schema.install(schemaStrategy, this._exmlConfig.xsdXML);
        }
    }
    /**
     * 文件改变
     * @param filePath 文件地址
     * @param type 类型 1:Added 2:Changed 3:Deleted
     */
    public fileChanged(filePath: string, type: number): void {
        filePath = FileUtil.escapePath(filePath);
        if (!this._projectModel) {
            return;
        }
        if (!this._projectModel.isEUIProj) {
            return;
        }
        // 如果改变了项目的egretProperties文件，则刷新当前的内容助手，以重新加载对应的引擎以及ui提示模块
        if (this._projectModel.needRefresh(filePath, type)) {
            this.start();
        }
        this.imageCompetion.fileChanged(filePath, type);
        if (filePath.indexOf(FileUtil.escapePath(this._projectModel.themePath)) !== 0) {
            this.labelStyle.init(this._projectModel.themePath);
        }
        if (!this._exmlConfig) {
            return;
        }
        if (type === 1) {
            this._exmlConfig.addFile(filePath);
        } else if (type === 2) {
            this._exmlConfig.updateFile(filePath);
        } else if (type === 3) {
            this._exmlConfig.deleteFile(filePath);
        }
    }

    public getSchemaModel() {
        return this.schema;
    }

    private text: string = '';
    private document: TextDocumentBase = null;
    /**
     * 计算提示列表
     * @param text 全部文本
     * @param offset 位置
     * @return 提示列表
     */
    public computeCompletion(text: string, offset: number, document: TextDocumentBase): CompletionItem[] {
        // 还没初始化完毕就直接返回
        if (!this.getSchemaModel()) {
            return [];
        }
        this.document = document;
        this.text = text;

        const posInfo = this.getSchemaModel().contentAssist.checkCursorPos(document as XMLDocument, offset);
        const tagName = posInfo.tag ? posInfo.tag.name : '';
        const attribute = posInfo.attribute || '';
        const attributeValue = posInfo.attributeValue || '';
        const range = posInfo.editRange
            ? Range.create(document.positionAt(posInfo.editRange.start), document.positionAt(posInfo.editRange.end))
            : (void 0);

        let completions: CompletionItem[] = [];

        if (EXMLPos.NodeStart === posInfo.pos) { // 节点名
            const tagPath: string[] = [];

            let curTag: sax.Tag | undefined = posInfo.tag;
            if (curTag) { while (curTag.parent) { curTag = curTag.parent; tagPath.push(curTag.name); } }

            tagPath.reverse();
            this.refreshCurrentNs();
            completions = this.createNodeStartCompletions(tagPath, text, range);
        } else if (EXMLPos.NodeEnd === posInfo.pos) { // 结束节点
            completions = completions.concat(this.createNodeEndCompletions(tagName, range));
        } else if (EXMLPos.AttributeName === posInfo.pos) {// 输入属性名
            const dotIndex = attribute.indexOf('.');
            if (dotIndex >= 0) {// 属性的状态
                completions = this.createAttributeStateCompletions(attribute.slice(dotIndex + 1), text);
            } else {
                this.refreshCurrentNs();
                completions = this.createAttributeCompetions(tagName, text, range, attributeValue);
            }
        } else if (EXMLPos.AttributeValue === posInfo.pos || EXMLPos.AttributeValueLeftQuote === posInfo.pos) { // 输入属性内的值
            this.refreshCurrentNs();
            if (attribute.indexOf('source') === 0 && tagName.indexOf(':Image') !== -1) {
                completions = this.imageCompetion.getKeyCompetions();
            } else if (attribute.indexOf('style') === 0 && tagName.indexOf(':Label') !== -1) {
                completions = this.labelStyle.getStyles();
            } else if (attribute.indexOf('skinName') === 0) {
                completions = this.createSkinNameCompletions();
            } else {
                const flag = EXMLPos.AttributeValueLeftQuote === posInfo.pos ? 1 : 0;
                completions = this.createAttributeValueCompletions(tagName, attribute, text, range, flag);
            }
        }
        return completions;
    }

    /**
     * 起始节点的自动补全
     * @param parentNodeName 父级的节点名
     * @param typeInNodeName 当前正在输入的节点名
     */
    private createNodeStartCompletions(nodePath: any[], fullText: string, range?: Range): CompletionItem[] {
        let pathQNames: any = [];
        for (let i: number = 0; i < nodePath.length; i++) {
            pathQNames.push(this.getQNameWithNode(nodePath[i], fullText));
        }
        let elements: Element[] = this.getSchemaModel().contentAssist.getPossibleElement(pathQNames, this.getSchemaModel().schemaDecoder.schema);
        let completions: CompletionItem[] = [];
        let nsList: Namespace[] = this.getNamespaces(this.text);
        for (let i = 0; i < elements.length; i++) {
            let prefix: string = this.getSchemaModel().contentAssist.getPrefix(elements[i].qName.uri);
            let classId: string = elements[i].qName.localName;
            let leftText: string = prefix ? prefix + ':' + classId : classId;
            let rightText: string = elements[i].qName.uri;
            rightText = rightText.replace('.*', '');
            rightText = rightText.replace('*', '默认包');
            // 如果是属性
            if (elements[i].parent && elements[i].parent.parent && elements[i].parent.parent instanceof Group && (<Group>elements[i].parent.parent).qName &&
                Group && (<Group>elements[i].parent.parent).qName.localName.indexOf('_attributeElement') !== -1
            ) {
                rightText = (<Group>elements[i].parent.parent).qName.localName.slice(0, (<Group>elements[i].parent.parent).qName.localName.length - ('_attributeElement').length);
                if (elements[i].type && SchemaNameChecker.isTypeOf(elements[i].type)) {
                    leftText += ' : ' + (<ISchemaName>elements[i].type).qName.localName;
                }
            }

            let uri: any = elements[i].qName.uri;

            let ns: Namespace = null;
            let needNs: boolean = false;
            if (uri !== this.getSchemaModel().getGuiNS().uri && uri !== this.getSchemaModel().getWorkNS().uri) {
                ns = this.getSchemaModel().createNamespace(uri, nsList);
                if (!this.getNamespaceByUri(ns.uri)) {
                    needNs = true;
                }
            }
            let insertText: string = '';
            if (ns) {
                insertText = ns.prefix + ':' + classId;
            } else {
                insertText = this.getSchemaModel().contentAssist.getPrefix(uri) ? this.getSchemaModel().contentAssist.getPrefix(uri) + ':' + classId : classId;
            }
            const completion: CompletionItem = {
                label: leftText,
                detail: rightText,
                kind: CompletionItemKind.Property,
                data: { type: 0 },
                insertText: insertText,
            };

            if (needNs) {
                const xmlnsObj = XmlUtil.addNamespace(fullText, ns.prefix, ns.uri);
                if (xmlnsObj) {
                    const arg = { offset: xmlnsObj['index'], value: xmlnsObj['xmlns'] };
                    completion.command = { command: EgretExtensionCommand.EXmlInsertNamespace, title: 'add namespace...', arguments: [arg] };
                }
            }

            if (range) {
                completion.textEdit = TextEdit.replace(range, insertText);
            }
            completions.push(completion);
        }
        return completions;
    }

    private getNamespaceByUri(uri: String): Namespace {
        let nsList: Namespace[] = this.getNamespaces(this.text);
        for (let i = 0; i < nsList.length; i++) {
            let ns: Namespace = nsList[i];
            if (ns.uri === uri) {
                return ns;
            }
        }
        return null;
    }

    /**
     * 结束节点的自动补全
     * @param value
     * @param onComplete
     */
    private createNodeEndCompletions(value: string, range?: Range): CompletionItem[] {
        let completions: CompletionItem[] = [];
        let insertText: string = '/' + value;
        const completion: CompletionItem = {
            label: insertText,
            detail: '',
            kind: CompletionItemKind.Property,
            data: { type: 1 },
            insertText: insertText,
            sortText: '!',
        };
        if (range) {
            completion.textEdit = TextEdit.replace(range, insertText);
        }
        completions.push(completion);
        return completions;
    }

    /**
     * 显示节点属性的自动补全
     * @param currentNodeName 当前所在的节点名
     * @param typeInAttName 正在输入的属性名
     */
    private createAttributeCompetions(currentNodeName: string, fullText: string, range?: Range, value?: string): CompletionItem[] {
        let completions: CompletionItem[] = [];
        let qName: QName = this.getQNameWithNode(currentNodeName, fullText); // TODO:
        if (!qName) {
            return completions;
        }
        let attArr: any[] = this.getSchemaModel().contentAssist.getPossibleAttribute(qName, this.getSchemaModel().schemaDecoder.schema);
        value = value || '';

        for (let attr of attArr) {
            const completion: CompletionItem = {
                label: attr['attribute'],
                detail: attr['className'],
                kind: CompletionItemKind.Property,
                data: { type: 2 },
                insertText: `${attr['attribute']}="${value}"`,
                command: { command: EgretExtensionCommand.EXmlCursorBack, title: 'move cursor back...' },
            };
            if (range) {
                completion.textEdit = TextEdit.replace(range, completion.insertText);
            }
            completions.push(completion);
        }
        return completions;
    }

    /**
     * 得到所有的皮肤名
     */
    private createSkinNameCompletions(): CompletionItem[] {
        let completions: CompletionItem[] = [];
        let skinNames = this.getSchemaModel().skinClassNames;
        for (let i: number = 0; i < skinNames.length; i++) {
            completions.push({
                label: skinNames[i],
                detail: '',
                kind: CompletionItemKind.Value,
                data: { type: 3 },
                insertText: skinNames[i]
            });
        }
        return completions;
    }

    /**
     * 得到属性的值
     * @param qNameStr
     * @param attribute
     * @param value
     * @return
     */
    private createAttributeValueCompletions(qNameStr: string, attribute: string, fullText: string, range?: Range, flag: number = 0): CompletionItem[] {
        let completions: CompletionItem[] = [];
        let qName: QName = this.getQNameWithNode(qNameStr, fullText);
        let attValuesArr: string[];
        // 这里对xml的state做一下特殊判断，如果输入的属性名为includeIn或excludeFrom则将可以输入的内容提示变为当前exml内状态数组
        if (attribute === 'includeIn' || attribute === 'excludeFrom') {
            attValuesArr = this.getStates(fullText);
        } else {
            attValuesArr = this.getSchemaModel().contentAssist.getPossibleAttributeValue(qName, attribute, this.getSchemaModel().schemaDecoder.schema);
        }
        for (let i: number = 0; i < attValuesArr.length; i++) {
            const completion: CompletionItem = {
                label: attValuesArr[i],
                detail: '',
                kind: CompletionItemKind.Value,
                data: { type: 3 },
                insertText: (flag ? '"' : '') + attValuesArr[i] + '"'
            };
            if (range) {
                completion.textEdit = TextEdit.replace(range, completion.insertText);
            }
            completions.push(completion);
        }
        return completions;
    }

    /**
     * 得到属性的状态
     * @param child
     * @return
     */
    private createAttributeStateCompletions(child: String, fullText: string): CompletionItem[] {
        let completions: CompletionItem[] = [];
        let stateArr: string[] = this.getStates(fullText);
        for (let i: number = 0; i < stateArr.length; i++) {
            completions.push({
                label: stateArr[i],
                detail: '',
                kind: CompletionItemKind.Property,
                data: { type: 4 },
                insertText: stateArr[i]
            });
        }
        return completions;
    }

    /**
     * 通过节点的字符串得到qName
     * @param nodeStr
     * @return
     *
     */
    private getQNameWithNode(nodeStr: string, fullText: string): QName {
        let nodeArr: string[] = (<string>nodeStr).split(':');
        let classId: string = nodeArr.length === 2 ? nodeArr[1] : nodeArr[0];
        let ns: Namespace = this.getNamespaceByPrefix(nodeArr[0], fullText);
        if (!ns) {
            return null;
        }
        let qName: QName = new QName(ns.uri, classId);
        return qName;
    }

    private getNamespaceByPrefix(prefix: string, fullText: string): Namespace {
        let nsList: any = this.getNamespaces(fullText);
        for (let i: number = 0; i < nsList.length; i++) {
            let ns: Namespace = nsList[i];
            if (ns.prefix === prefix) {
                return ns;
            }
        }
        return null;
    }

    /**
     * 以字符串的方式读取一个xml中的命名空间数组。
     * @param xmlStr
     * @return
     *
     */
    private getNamespaces(xmlStr: string): Namespace[] {
        let result: Namespace[] = [];
        let arr: any[] = xmlStr.match(/(xmlns.*?=(\"|\').*?(\"|\'))/g);
        if (!arr) { return []; }
        for (let i: number = 0; i < arr.length; i++) {
            let xmlns: string = arr[i];

            let prefixStart: number = -1;
            let prefixEnd: number = -1;
            let char: string = '';
            let uriStart: number = -1;
            let uriEnd: number = -1;
            for (let j: number = 0; j < xmlns.length; j++) {
                if (xmlns.charAt(j) === ':' && prefixStart === -1) {
                    prefixStart = j + 1;
                }
                if (xmlns.charAt(j) === '=' && prefixEnd === -1) {
                    prefixEnd = j;
                }
                if ((xmlns.charAt(j) === '\"' || xmlns.charAt(j) === '\'') && char === '') {
                    char = xmlns.charAt(j);
                }
                if (xmlns.charAt(j) === char && xmlns.charAt(j - 1) !== '\\') {
                    if (uriStart === -1) {
                        uriStart = j + 1;
                    } else if (uriEnd === -1) {
                        uriEnd = j;
                    }
                }
            }

            let prefix: string = '';
            if (prefixStart > 0 && prefixEnd > 0) {
                prefix = StringUtil.trim(xmlns.slice(prefixStart, prefixEnd));
            }
            let uri: string = '';
            if (uriStart > 0 && uriEnd > 0) {
                uri = StringUtil.trim(xmlns.slice(uriStart, uriEnd));
            }
            let ns: Namespace = new Namespace(prefix, uri);
            result.push(ns);
        }
        return result;
    }
    /**
     * 得到当前Exml文档的States
     * @return
     */
    private getStates(fullText: string): string[] {
        // 先读节点的，如果读不到节点的则从属性中读取
        let arr: string[] = this.getStatesByNode(fullText);
        if (!arr || arr.length === 0) {
            arr = this.getStatesByAttribute();
        }
        return arr;
    }

    /**
     * 从节点中读取states
     * @return
     */
    private getStatesByNode(fullText: string): string[] {
        let text: String = fullText;
        let arr: string[] = [];
        let statesStart: number = text.indexOf('<s:states');
        let statesEnd: number = -1;
        if (statesStart >= 0) {
            statesEnd = text.indexOf('</s:states');
            if (statesEnd >= 0) {
                for (let i: number = statesEnd; i < text.length; i++) {
                    if (text.charAt(i) === '>') {
                        statesEnd = i + 1;
                        break;
                    }
                }
            }
        }

        if (statesStart >= 0 && statesEnd >= 0) {
            let statesXmlStr: String = text.slice(statesStart, statesEnd);
            statesXmlStr = statesXmlStr.replace(/\<s\:/g, '<');
            statesXmlStr = statesXmlStr.replace(/<\/s\:/g, '</');
            let statesXml: sax.Tag;
            try {
                statesXml = xml.parse(statesXmlStr);
            } catch (error) {

            }
            if (statesXml) {
                let children: sax.Tag[] = statesXml.children;
                let stateXmlList: sax.Tag[] = [];
                for (let i: number = 0; i < children.length; i++) {
                    if (children[i].localName === 'State') {
                        stateXmlList.push(children[i]);
                    }
                }
                for (let stateXml of stateXmlList) {
                    arr.push(stateXml.attributes['name'].toString());
                }
            }
        }
        return arr;
    }

    /**
     * 从属性中读取states
     * @return
     */
    private getStatesByAttribute(): string[] {
        let reg: RegExp = /\<.*?\:Skin[\s\S]*?states[\s\S]*?\=[\s\S]*?[\'|\"](.*?)[\'|\"][\s\S]*?\>/;
        let arr: string[] = this.text.match(reg);
        if (arr) {
            let str: String = arr[1];
            let states: string[] = str.split(',');
            for (let i: number = 0; i < states.length; i++) {
                states[i] = StringUtil.trim(states[i]);
            }
            return states;
        }
        return [];
    }

    // 在要出现之前调用，刷新当前文档的所有命名空间
    private refreshCurrentNs(): void {
        let nss: Namespace[] = this.getNamespaces(this.text);
        this.getSchemaModel().contentAssist.clearCurrentNs();
        for (let i = 0; i < nss.length; i++) {
            let currentNs: Namespace = nss[i] as Namespace;
            this.getSchemaModel().contentAssist.registerCurrentNs(currentNs.uri, currentNs.prefix);
        }
    }
}