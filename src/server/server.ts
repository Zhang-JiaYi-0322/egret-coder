/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {
    createConnection, IConnection, TextDocumentSyncKind,
    Diagnostic, DiagnosticSeverity,
    InitializeResult,
    CompletionItem,
    Range, DidChangeTextDocumentParams, DidOpenTextDocumentParams, DidChangeWatchedFilesParams,
    DocumentFormattingParams, TextEdit, DocumentRangeFormattingParams, TextDocumentPositionParams, ProposedFeatures
} from 'vscode-languageserver';

import { ClassNode } from './exmlConfig/syntaxNodes';
import { Log } from './utils/Log';
import { EgretSDKManager } from './project/EgretSDKManager';
import { EgretProjectModel } from './project/EgretProjectModel';
import { XMLDocument } from './core/XMLDocument';
import { EXMLContentAssistProcessor } from './contentassist/EXMLContentAssistProcessor';
import { XMLFormatUtil } from './utils/XMLFormatUtil';
import * as notif from '../protocol/protocol';

// 创建一个server的连接，用于消息的标准输入输出流传递。
let connection: IConnection = createConnection(ProposedFeatures.all);
Log.connection = connection;

let contentAssistProcessor: EXMLContentAssistProcessor = new EXMLContentAssistProcessor();
// 服务器启动之后，客户端会发送一个初始化的请求。 服务端会接受到传递的参数，其中包含：工作空间的根路径和客户端功能
connection.onInitialize((params): InitializeResult => {

    // 初始化引擎SDK信息列表完成之后，启动内容助手进程
    if (!params.rootPath) {
        return;
    }
    EgretSDKManager.initSDKS(() => {
        let projectModel: EgretProjectModel = new EgretProjectModel();
        projectModel.init(params.rootPath);
        contentAssistProcessor.init(projectModel, () => {
            classChangedHandler();
        });
    });
    return {
        capabilities: {
            // 告诉客户端，服务器在完整文档的增量模式下工作。
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // 告诉客户端，服务器支持代码完成
            completionProvider: {
                resolveProvider: true,
                triggerCharacters: [':', '<', '\'', '\'', ' ', '.', '/']
            },
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true
            // documentOnTypeFormattingProvider: true
        }
    };
});

// 设置的接口用于描述服务器有关的设置
interface Settings {
    exml: ExmlSettings;
}

// 这个是在客户端的package.json文件中定义的示例设置
interface ExmlSettings {
    maxNumberOfProblems: number;
}

function isEUIProj(): boolean {
    if (!contentAssistProcessor) {
        return false;
    }
    if (!contentAssistProcessor.projectModel) {
        return false;
    }
    return contentAssistProcessor.projectModel.isEUIProj;
}

// 最大问题数
let maxNumberOfProblems: number;
// 设置改变了。当服务端被激活的时候也会发送。
connection.onDidChangeConfiguration((change) => {
    let settings = <Settings>change.settings;
    maxNumberOfProblems = settings.exml.maxNumberOfProblems || 100;
    // 验证所有打开的文本文档
    for (let uri in docMap) {
        let xmlDocument: XMLDocument = docMap[uri];
        validateXMLDocument(xmlDocument);
    }
});

// 这个回调方法提供补全信息的初始化列表
connection.onCompletion((textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    if (!isEUIProj()) {
        return [];
    }
    try {
        let xmlDocument: XMLDocument = docMap[textDocumentPosition.textDocument.uri];
        let text: string = xmlDocument.getText();
        let offset: number = xmlDocument.offsetAt(textDocumentPosition.position);
        return contentAssistProcessor.computeCompletion(text, offset, xmlDocument);
    } catch (e) {
        connection.console.log(e);
        return [];
    }
});

// 这个回调方法用于提供选择的补全信息中的附加信息。
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    return item;
});

connection.onDidOpenTextDocument(function (params: DidOpenTextDocumentParams) {
    // 文本文档在VSCode中被打开。params.uri 用于唯一标识该文档。
    // 在硬盘中存储的文档路径就是URI。 params.text为初始化之后的文档的全部文本内容
    let xmlDocument: XMLDocument = new XMLDocument(params.textDocument.uri, params.textDocument.text);
    docMap[params.textDocument.uri] = xmlDocument;
    validateXMLDocument(xmlDocument);
});

connection.onDidChangeTextDocument(function (params: DidChangeTextDocumentParams) {
    // 一个文档的文本内容在VSCode中已经被改变。params.uri 用于唯一标识该文档。
    // params.contentChanges 描述改变的部分。
    let xmlDocument: XMLDocument = docMap[params.textDocument.uri];
    xmlDocument.update(params);
    validateXMLDocument(xmlDocument);
});

connection.onDidCloseTextDocument((params) => {
    // A text document got closed in VSCode.
    // params.uri uniquely identifies the document.
    // connection.console.log(`${params.textDocument.uri} closed.`);
    // 一个文档被关闭了。
    // params.uri 用于唯一标识该文档。
    delete docMap[params.textDocument.uri];
});

connection.onDidChangeWatchedFiles((change: DidChangeWatchedFilesParams) => {
    if (!isEUIProj()) {
        return;
    }
    // 检测VSCode中的文件改变
    for (let i = 0; i < change.changes.length; i++) {
        let changeObj = change.changes[i];
        // 1:added 2:changed 3:deleted
        contentAssistProcessor.fileChanged(changeObj.uri, changeObj.type);
    }
});

connection.onDocumentFormatting((formattingParams: DocumentFormattingParams): TextEdit[] => {
    let tabSize = formattingParams.options.tabSize;
    let insertSpaces = formattingParams.options.insertSpaces;
    let xmlDocument: XMLDocument = docMap[formattingParams.textDocument.uri];
    let text: string = xmlDocument.getText();
    let lineBreak: string = '\n';
    if (text.indexOf('\r\n') !== -1) {
        lineBreak = '\r\n';
    } else if (text.indexOf('\n') !== -1) {
        lineBreak = '\n';
    } else if (text.indexOf('\r') !== -1) {
        lineBreak = '\n';
    }
    let result = XMLFormatUtil.format(text, 0, text.length, !insertSpaces, insertSpaces ? tabSize : 1, 120, false, true, lineBreak);
    let formatedStart: number = result['formatedStart'];
    let formatedEnd: number = result['formatedEnd'];
    let textEdit = TextEdit.replace(
        Range.create(xmlDocument.positionAt(formatedStart), xmlDocument.positionAt(formatedEnd)),
        result['formatedText']);
    return [textEdit];
});

connection.onDocumentRangeFormatting((formattingParams: DocumentRangeFormattingParams): TextEdit[] => {
    let tabSize = formattingParams.options.tabSize;
    let insertSpaces = formattingParams.options.insertSpaces;
    let xmlDocument: XMLDocument = docMap[formattingParams.textDocument.uri];
    let text: string = xmlDocument.getText();

    let start = xmlDocument.offsetAt(formattingParams.range.start);
    let end = xmlDocument.offsetAt(formattingParams.range.end);

    let lineBreak: string = '\n';
    if (text.indexOf('\r\n') !== -1) {
        lineBreak = '\r\n';
    } else if (text.indexOf('\n') !== -1) {
        lineBreak = '\n';
    } else if (text.indexOf('\r') !== -1) {
        lineBreak = '\n';
    }
    let result = XMLFormatUtil.format(text, start, end, !insertSpaces, insertSpaces ? tabSize : 1, 120, false, true, lineBreak);
    let formatedStart: number = result['formatedStart'];
    let formatedEnd: number = result['formatedEnd'];
    let textEdit = TextEdit.replace(
        Range.create(xmlDocument.positionAt(formatedStart), xmlDocument.positionAt(formatedEnd)),
        result['formatedText']);
    return [textEdit];
});

// 开始监听连接
connection.listen();

// 当前打开的所有文档
let docMap: { [uri: string]: XMLDocument } = {};
/**
 * 验证XML文本文档
 */
function validateXMLDocument(xmlDocument: XMLDocument): void {
    let diagnostics: Diagnostic[] = [];
    let problems = 0;
    let errors = xmlDocument.getError();
    for (let i = 0; i < errors.length && problems < maxNumberOfProblems; i++) {
        let error = errors[i];
        let startPos = Math.max(error.start - 1, 0);
        let endPos = Math.max(error.end - 1, 0);
        problems++;
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: xmlDocument.positionAt(startPos),
                end: xmlDocument.positionAt(endPos)
            },
            message: error.name
        });
    }
    // 将诊断信息发送给VSCode
    connection.sendDiagnostics({ uri: xmlDocument.uri, diagnostics });
}

// Init the config
connection.onNotification(notif.InitConfigCS.type, function (): void {
    let inited = () => {
        connection.sendNotification(notif.InitConfigSC.type, { classData: getClassData() });
    };
    if (contentAssistProcessor.inited) {
        inited();
    } else {
        contentAssistProcessor.initedFunc = () => {
            inited();
        };
    }
});

// Custom class changed
function classChangedHandler(): void {
    connection.sendNotification(notif.ClassChangedNotifSC.type, { classData: getClassData() });
}

function getClassData(): any {
    if (!isEUIProj()) {
        return {};
    }
    let classMap: { [fullName: string]: ClassNode } = contentAssistProcessor.exmlConfig ? contentAssistProcessor.exmlConfig.getClassNodeMap() : {};
    let classDataMap = {};
    for (let fullName in classMap) {
        let classNode = classMap[fullName];
        let implementeds: string[] = [];
        for (let j = 0; j < classNode.implementeds.length; j++) {
            implementeds.push(classNode.implementeds[j].fullName);
        }
        let newClassData = {
            'inEngine': classNode.inEngine,
            'inPrompt': classNode.inPrompt,
            'fullName': classNode.fullName,
            'baseClass': classNode.baseClass ? classNode.baseClass.fullName : '',
            'implementeds': implementeds,
            'props': classNode.props,
            'isInterface': classNode.isInterface
        };
        classDataMap[fullName] = newClassData;
    }
    let resultMap = {};
    resultMap['classDataMap'] = classDataMap;
    resultMap['allSkinClassName'] = contentAssistProcessor.exmlConfig ? contentAssistProcessor.exmlConfig.getAllSkinClassName() : [];
    resultMap['skinClassNameToPath'] = contentAssistProcessor.exmlConfig ? contentAssistProcessor.exmlConfig.skinClassNameToPath : {};
    return resultMap;
}