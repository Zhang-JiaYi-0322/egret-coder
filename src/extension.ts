import * as vscode from 'vscode';
import { EgretConst, EgretExtensionCommand } from './egret';
import { Project } from './project/project';
import { activateEXML } from './client/extension';
import { tr } from './i18n';
import { EgretCustomBuildTaskProvider } from "./customTaskProvider"
const cmd = require("node-cmd");
import fs = require("fs");
import { parse, stringify, assign } from 'comment-json';

interface StatusBarButtonSetting {
    priority: number;
    command: string;
    tooltip: string;
    text: string;
}

const project = new Project();
let customTaskProvider: vscode.Disposable | undefined;
vscode.debug.onDidTerminateDebugSession(() => {
    for (let child of vscode.tasks.taskExecutions) {
        if (child.task.name = "egret: build") {
            child.terminate();
            break;
        }
    }
    const _uri = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const uri = addUri(_uri, "\\.vscode\\launch.json", "/.vscode/launch.json");
    let port = 3000;
    console.log("uri: " + uri);
    if (fs.existsSync(uri)) {
        let text = fs.readFileSync(uri, "utf-8");
        const json = parse(text);
        for (let item of json.configurations) {
            if (item.name == "Egret WebpackDevServer Debugger") {
                port = Number(item.url.replace("http://localhost:", ""));
                break;
            }
        }
    } else {
        console.log("file not exists");
    }
    console.log("port: " + port);
    cmd.get(`netstat -aon|findstr "${port}"`,
        (err, data, stderr) => {
            // console.log(data)
            data.split("TCP").map((item: string) => {
                if (item.search(/\d+/) > -1) {
                    let arr = [];
                    let mark = false;
                    for (let i = item.length - 1; i >= 0; i--) {
                        if (mark && item[i] == " ") {
                            break;
                        }
                        if (item[i].search(/\d/) > -1) {
                            if (mark == false) {
                                mark = true;
                            }
                            arr.push(item[i])
                        }
                    }
                    // console.log(arr.reverse().join(""));
                    const pid = Number(arr.reverse().join(""));
                    // if (pid > 0) {
                    console.log(`kill ${pid}`)
                    // cmd.run(`kill ${pid}`)
                    cmd.run(`taskkill /pid ${pid} -t -f`)
                    // }
                }
            })
        })
    cmd.get(`lsof -i:${port}`,
        (err, data, stderr) => {
            data.split("\n").map((item: string) => {
                if (item.indexOf("COMMAND") == -1) {
                    const arr = item.split(" ");
                    for (let i = 0; i < arr.length; i++) {
                        if (arr[i].search(/\d/) > -1) {
                            const pid = Number(arr[i]);
                            console.log(`kill ${pid}`);
                            cmd.run(`kill -9 ${pid}`);
                            break;
                        }
                    }
                }
            });
            data.split("\r").map((item: string) => {
                if (item.indexOf("COMMAND") == -1) {
                    const arr = item.split(" ");
                    for (let i = 0; i < arr.length; i++) {
                        if (arr[i].search(/\d/) > -1) {
                            const pid = Number(arr[i]);
                            console.log(`kill ${pid}`);
                            cmd.run(`kill -9 ${pid}`);
                            break;
                        }
                    }
                }
            })
        })
    // cmd.run("tskill node");
    // cmd.run("pkill -f node");
})


// Entry point
export function activate(context: vscode.ExtensionContext) {
    installEventListeners(context);
    installButtons(context);
    installCommands(context);
    installDebugger(context);

    activateEXML(context);

    customTaskProvider = vscode.tasks.registerTaskProvider(EgretCustomBuildTaskProvider.CustomBuildScriptType, new EgretCustomBuildTaskProvider());

    disposeFiles();
}

export function deactivate(): void {
    if (customTaskProvider) {
        customTaskProvider.dispose();
    }
}

let autoOpenEgretTool = false;
function installEventListeners(context: vscode.ExtensionContext) {
    // this feature is closed temporarily
    if (autoOpenEgretTool) {
        vscode.workspace.onDidOpenTextDocument(e => {
            const setting = vscode.workspace.getConfiguration().get('egret.autoOpenEgretTool');
            if (setting) {
                project.open(e.fileName);
            }
        });
    }
}

function installCommands(context: vscode.ExtensionContext) {
    const handlerMap = {
        [EgretExtensionCommand.Build]: () => project.build(),
        [EgretExtensionCommand.Run]: () => project.run(),
        [EgretExtensionCommand.Clean]: () => project.clean(),
        [EgretExtensionCommand.Create]: () => project.create(),
        [EgretExtensionCommand.Publish]: () => project.publish(),
        [EgretExtensionCommand.OpenFile]: () => project.open(),
        [EgretExtensionCommand.Server]: () => project.openServerQR(),
        [EgretExtensionCommand.GetWebsitePort]: () => project.getDebugPort(),
        [EgretExtensionCommand.OpenEUIProject]: () => project.openEUIProject(),
        [EgretExtensionCommand.OpenEXmlInEui]: (argument) => project.openEXmlInEui(argument.fsPath),
    };
    for (const cmd in handlerMap) {
        context.subscriptions.push(vscode.commands.registerCommand(cmd, handlerMap[cmd]));
    }

    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        EgretExtensionCommand.EXmlCursorBack,
        (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => {
            if (!editor) { return; }

            // 把光标前移一格
            const newSelection: vscode.Selection[] = [];
            for (const sel of editor.selections) {
                const pos = sel.end.translate(0, -1);
                newSelection.push(new vscode.Selection(pos, pos));
            }
            editor.selections = newSelection;
            // 并触发提示
            vscode.commands.executeCommand('editor.action.triggerSuggest');
        })
    );

    context.subscriptions.push(vscode.commands.registerTextEditorCommand(
        EgretExtensionCommand.EXmlInsertNamespace,
        (editor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => {
            if (!editor || !editor.document) { return; }
            if (!args || !args[0]) { return; }

            editor.edit((editorEdit: vscode.TextEditorEdit) => {
                editorEdit.insert(editor.document.positionAt(args[0].offset), args[0].value);
            });
        })
    );
}

function installDebugger(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.debug.registerDebugConfigurationProvider(EgretConst.Tag, project.getDebugConfigurationProvider())
    );
}

function installButtons(context: vscode.ExtensionContext) {
    [
        {
            priority: 1,
            command: EgretExtensionCommand.Publish,
            tooltip: 'Egret publish',
            text: `$(rocket)`,
        },
        {
            priority: 2,
            command: EgretExtensionCommand.Clean,
            tooltip: 'Egret clean',
            text: `$(trashcan)`,
        },
        {
            priority: 3,
            command: EgretExtensionCommand.Build,
            tooltip: 'Egret build',
            text: `$(tools)`,
        },
        {
            priority: 4,
            command: EgretExtensionCommand.Server,
            tooltip: 'Egret server',
            text: `$(server)`,
        },
    ].map(btn => createStatusBarButton(btn));
}

function createStatusBarButton(btnSetting: StatusBarButtonSetting) {
    let button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, btnSetting.priority);
    button.command = btnSetting.command;
    button.tooltip = btnSetting.tooltip;
    button.text = btnSetting.text;
    button.show();
}

function addUri(_uri: string, add1: string, add2: string): string {
    let uri = ""
    if (_uri.indexOf("/") == -1) {
        uri = _uri + add1;
    }
    else {
        uri = _uri + add2;
    }
    return uri;
}

function disposeFiles(): void {
    const _uri = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const uri = addUri(_uri, "\\egretProperties.json", "/egretProperties.json");
    if (fs.existsSync(uri)) {
        const folder_uri = addUri(_uri, "\\.vscode", "/.vscode");
        const launch_uri = addUri(_uri, "\\.vscode\\launch.json", "/.vscode/launch.json");
        const tasks_uri = addUri(_uri, "\\.vscode\\tasks.json", "/.vscode/tasks.json");
        if (fs.existsSync(folder_uri) && fs.existsSync(launch_uri)) {
            const text = fs.readFileSync(launch_uri, "utf-8");
            let json = parse(text);
            let isFound = false
            for (let item of json.configurations) {
                if (item.name == "Egret WebpackDevServer Debugger") {
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                json.configurations.push(
                    {
                        type: "Egret",
                        request: "launch",
                        name: "Egret WebpackDevServer Debugger",
                        url: "http://localhost:3000",
                        webRoot: "${workspaceFolder}",
                        preLaunchTask: "egret: build"
                    }
                );
                const sorted = assign(
                    {},
                    json,
                    Object.keys(json).sort()
                );
                fs.writeFileSync(launch_uri, stringify(sorted, null, 4), "utf-8");
            }
        }
        else {
            if (!fs.existsSync(folder_uri)) {
                fs.mkdirSync(folder_uri);
            }
            const json = {
                version: "0.2.0",
                configurations: [
                    {
                        type: "Egret",
                        request: "launch",
                        name: "Egret WebpackDevServer Debugger",
                        url: "http://localhost:3000",
                        webRoot: "${workspaceFolder}",
                        preLaunchTask: "egret: build"
                    }
                ]
            }
            const sorted = assign(
                {},
                json,
                Object.keys(json).sort()
            );
            fs.writeFileSync(launch_uri, stringify(sorted, null, 4), "utf-8");
        }
        if (fs.existsSync(tasks_uri)) {
            const text = fs.readFileSync(tasks_uri, "utf-8");
            let json = parse(text);
            let isFound = false
            for (let item of json.tasks) {
                if (item.label == "egret: build") {
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                json.tasks.push(
                    {
                        type: "egret",
                        isBackground: true,
                        problemMatcher: "$egret",
                        label: "egret: build"
                    }
                );
                const sorted = assign(
                    {},
                    json,
                    Object.keys(json).sort()
                );
                fs.writeFileSync(tasks_uri, stringify(sorted, null, 4), "utf-8");
            }
        }
        else {
            const json = {
                version: "0.2.0",
                tasks: [
                    {
                        type: "egret",
                        isBackground: true,
                        problemMatcher: "$egret",
                        label: "egret: build"
                    }
                ]
            }
            const sorted = assign(
                {},
                json,
                Object.keys(json).sort()
            );
            fs.writeFileSync(tasks_uri, stringify(sorted, null, 4), "utf-8");
        }
    }
}