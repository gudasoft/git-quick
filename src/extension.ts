// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { GitExtension, API } from './git';

// samples:  https://github.com/microsoft/vscode-extension-samples
// publishing: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
// auto attach https://code.visualstudio.com/docs/nodejs/nodejs-debugging
// The git extension: https://github.com/microsoft/vscode/blob/54edfb7675200c441099515cde2b960c668012fd/extensions/git/README.md?plain=1#L18
// continue reading from here ... https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/api1.ts
// repistory.ts - https://github.com/microsoft/vscode/blob/main/extensions/git/src/repository.ts#L2197

function getGitExtension(): vscode.Extension<GitExtension> | undefined {
	const gitExtension = vscode.extensions.getExtension('vscode.git') as vscode.Extension<GitExtension>;
	if (!gitExtension) {
		vscode.window.showErrorMessage('Git extension is not installed.');
		return undefined;
	}
	return gitExtension;
}

function getFirstRepository(gitExtension: vscode.Extension<GitExtension>) : API | undefined {
	const gitApi = gitExtension.exports.getAPI(1);
	if (gitApi.repositories.length) {
		return gitApi;
	} else {
		vscode.window.showErrorMessage('No git repositories found.');
		return undefined;
	}
}

function fileChanged(gitExtension: vscode.Extension<GitExtension>, currentFileUri: vscode.Uri) : boolean {
	const api = gitExtension.exports.getAPI(1);

	if (!api) {
			vscode.window.showErrorMessage('Unable to load Git extension');
			return false;
	}


	const repository = api.repositories.find((repo: any) => currentFileUri.fsPath.startsWith(repo.rootUri.fsPath));
	if (!repository) {
			return false;
	}

	const changedList = repository.state.workingTreeChanges.filter((change: any) => currentFileUri.fsPath === change.uri.fsPath);

	return changedList.length > 0;

}


function checkout(gitExtension: vscode.Extension<GitExtension>, currentFileUri: vscode.Uri) : boolean{
	const api = gitExtension.exports.getAPI(1);
	if (!api) {
		vscode.window.showErrorMessage('Unable to load Git extension');
		return false;
	}

	const repository = api.repositories.find((repository: any) => currentFileUri.fsPath.startsWith(repository.rootUri.fsPath));
	if (!repository) {
			return false;
	}

	repository.checkout(currentFileUri.fsPath);
	return true;
}

function commitWithMessage(message: string, currentFilePath: string) {
	const gitExtension = vscode.extensions.getExtension('vscode.git');
	if (!gitExtension) {
		vscode.window.showErrorMessage('Git extension is not installed.');
		return;
	}

	const git = gitExtension.exports.getAPI(1);
	if (!git.repositories.length) {
		vscode.window.showErrorMessage('No git repositories found.');
		return;
	}

	const repository = git.repositories[0];
	try {
		repository.add([currentFilePath]);
		repository.commit(message);

		vscode.window.showInformationMessage('Commit successful.');
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to commit: ${(error as Error).message}`);
	}
}

function getCurrentFileUri() : vscode.Uri | undefined {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const currentFileUri = editor.document.uri;
		return currentFileUri;
	} else {
		vscode.window.showWarningMessage('No file is currently open.');
		return undefined;
	}
}

function saveCurrentFile(currentFilePath: string) {
	const editor = vscode.window.activeTextEditor;
	if (editor) {
		const document = editor.document;
		document.save();
		// if (document.isDirty) {
		// 		const response = vscode.window.showWarningMessage(
		// 				'The file has unsaved changes. Do you want to save it before committing?',
		// 				'Yes',
		// 				'No'
		// 		);
		// 		if (response === 'Yes') {
		// 				document.save();
		// 		} else {
		// 				return undefined; // Return undefined if the user chooses not to save
		// 		}
		// }
		// return document.uri.fsPath;
	} else {
		vscode.window.showWarningMessage('No file is currently open.');
		// return undefined;
	}
}

const quickCommit = async () => {

	const currentFileUri = getCurrentFileUri();
	if (!currentFileUri) {
		return undefined;
	}


	const gitExtension = getGitExtension();
	if (gitExtension === undefined) {
		vscode.window.showInformationMessage(`Git repository not found. ${currentFileUri.fsPath}`);
		return undefined;
	}

	const isFileChanged = fileChanged(gitExtension, currentFileUri);
	if (!isFileChanged) {
		vscode.window.showInformationMessage('No changes to commit.');
		return;
	}

	saveCurrentFile(currentFileUri.fsPath);

	// vscode.window.showInformationMessage('Current file path:', currentFilePath);

	const commitMessage = await vscode.window.showInputBox({
		prompt: 'Commit message:',
		placeHolder: 'Type something here...',
		validateInput: text => {
			// https://stackoverflow.com/questions/65999892/does-vscode-window-showinputbox-provide-a-means-to-reject-the-input-with-a-messa
			return text !== '' ? null : 'Write something..';  // return null if validates
		}
	});

	if (commitMessage && currentFileUri) {
		// vscode.window.showInformationMessage(`Commit message: ${commitMessage}`);
		commitWithMessage(commitMessage, currentFileUri.fsPath);
	}

};

const quickCheckout = async () => {

	const currentFileUri = getCurrentFileUri();
	if (!currentFileUri) {
		return undefined;
	}

	const gitExtension = getGitExtension();
	if (gitExtension === undefined) {
		vscode.window.showInformationMessage(`Git repository not found. ${currentFileUri.fsPath}`);
		return undefined;
	}

	const isFileChanged = fileChanged(gitExtension, currentFileUri);
	if (!isFileChanged) {
		vscode.window.showInformationMessage('File not changed');
		return;
	}

	saveCurrentFile(currentFileUri.fsPath);

	if (checkout(gitExtension, currentFileUri)) {
		vscode.window.showInformationMessage('File restored');
	}

};




// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('git-quick-current-file.quick-commit', quickCommit);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('git-quick-current-file.quick-checkout', quickCheckout);
	context.subscriptions.push(disposable);
	disposable = vscode.commands.registerCommand('git-quick-current-file.quick-restore', quickCheckout);
	context.subscriptions.push(disposable);

}

// This method is called when your extension is deactivated
export function deactivate() { }

