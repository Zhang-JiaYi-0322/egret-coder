import * as vscode from 'vscode';

interface CustomBuildTaskDefinition extends vscode.TaskDefinition {
	/**
	 * The build flavor. Should be either '32' or '64'.
	 */
	flavor: string;

}

export class EgretCustomBuildTaskProvider implements vscode.TaskProvider {
	static CustomBuildScriptType = 'egret';
	private tasks: vscode.Task[] | undefined;

	// We use a CustomExecution task when state needs to be shared accross runs of the task or when 
	// the task requires use of some VS Code API to run.
	// If you don't need to share state between runs and if you don't need to execute VS Code API in your task, 
	// then a simple ShellExecution or ProcessExecution should be enough.
	// Since our build has this shared state, the CustomExecution is used below.

	constructor() { }

	public async provideTasks(): Promise<vscode.Task[]> {
		return this.getTasks();
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const flavor: string = _task.definition.flavor;
		if (flavor) {
			const definition: CustomBuildTaskDefinition = <any>_task.definition;
			return this.getTask(definition.flavor, definition);
		}
		return undefined;
	}

	private getTasks(): vscode.Task[] {
		if (this.tasks !== undefined) {
			return this.tasks;
		}
		// In our fictional build, we have two build flavors
		const flavors: string[] = ['build'];

		this.tasks = [];
		flavors.forEach(flavor => {
			this.tasks!.push(this.getTask(flavor));
		});
		return this.tasks;
	}

	private getTask(flavor: string, definition?: CustomBuildTaskDefinition): vscode.Task {
		if (definition === undefined) {
			definition = {
				type: EgretCustomBuildTaskProvider.CustomBuildScriptType,
				flavor
			};
		}
		return new vscode.Task(definition, vscode.TaskScope.Workspace, `${flavor}`,
			EgretCustomBuildTaskProvider.CustomBuildScriptType, new vscode.ShellExecution(`${EgretCustomBuildTaskProvider.CustomBuildScriptType} ${flavor}`));
	}
}
