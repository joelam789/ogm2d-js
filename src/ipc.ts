
import { ipcRenderer } from "electron";

export class Ipc {

	private static _dirtreeReuests: Array<any> = [];
	//private static _stageFilepathMap: Map<string, string> = new Map<string, string>();
	
	private static getDirTreeOneByOne(currentPath: string, callback: (filepaths: Array<string>)=>void) {
		ipcRenderer.once("get-dir-tree-return", (event, result) => {
			if (result.error) {
				console.error(result.error);
				if (callback) callback([]);
				this._dirtreeReuests.shift();
				if (this._dirtreeReuests.length > 0) {
					let req = this._dirtreeReuests[0];
					if (req && req.path && req.callback) {
						this.getDirTreeOneByOne(req.path, req.callback);
					}
				}
			} else {
				let paths = [];
				if (result.tree) for (let item of result.tree) {
					//console.log(item);
					let startIdx = item.indexOf(currentPath);
					if (startIdx >= 0) paths.push(item.substring(startIdx));
				}
				if (callback) callback(paths);
				this._dirtreeReuests.shift();
				if (this._dirtreeReuests.length > 0) {
					let req = this._dirtreeReuests[0];
					if (req && req.path && req.callback) {
						this.getDirTreeOneByOne(req.path, req.callback);
					}
				}
			}
		});
		ipcRenderer.send("get-dir-tree", currentPath);
	}

	static getDirTree(currentPath: string, callback: (filepaths: Array<string>)=>void) {
		let req = {
			path: currentPath,
			callback: callback
		};
		this._dirtreeReuests.push(req);
		if (this._dirtreeReuests.length == 1) {
			let req = this._dirtreeReuests[0];
			if (req && req.path && req.callback) {
				this.getDirTreeOneByOne(req.path, req.callback);
			}
		}
		
	}

	static getFilepathByName(folder: string, filename: string, callback: (filepath: string)=>void) {
		ipcRenderer.once("get-path-by-name-return", (event, result) => {
			if (result.error) {
				console.error("getFilepathByName", result.error);
				if (callback) callback("");
			} else {
				if (callback) callback(result.filepath);
			}
		});
		ipcRenderer.send("get-path-by-name", folder, filename);
	}

	static getFullpaths(filepaths: Array<string>, callback: (fullpaths: Array<string>)=>void) {
		ipcRenderer.once("get-fullpaths-return", (event, result) => {
			if (result.error) {
				console.error("getFullpaths", result.error);
				if (callback) callback([]);
			} else {
				if (callback) callback(result.fullpaths);
			}
		});
		ipcRenderer.send("get-fullpaths", filepaths);
	}

	static saveText(items: Array<any>, callback: (errs: Array<string>)=>void) {
		ipcRenderer.once("save-text-return", (event, result) => {
			if (result.error) {
				console.error("saveText", result.error);
				if (callback) callback(result.errors);
			} else {
				if (callback) callback(result.errors);
			}
		});
		ipcRenderer.send("save-text", items);
	}

	static copyDirContent(src: string, dest: string, 
		absFlag: number = 0, exts: Array<string> = null, callback: (err: string)=>void) {
		if (!src || !dest) return;
		ipcRenderer.once("copy-dir-content-return", (event, result) => {
			if (result.error) {
				console.error("copy dir content error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("copy-dir-content", src, dest, absFlag, exts);
	}

	static copyFiles(srcFiles: Array<string>, destFiles: Array<string>, 
		absFlag: number = 0, callback: (err: string)=>void) {
		if (!srcFiles || !destFiles) return;
		ipcRenderer.once("copy-files-return", (event, result) => {
			if (result.error) {
				console.error("copy files error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("copy-files", srcFiles, destFiles, absFlag);
	}

	static runCmd(cmd, args = [], opt = null, callback: (err: string)=>void) {
		let cmdopt = opt ? opt : {};
		ipcRenderer.once("run-cmd-return", (event, result) => {
			if (result.error) {
				console.error("run cmd error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("run-cmd", cmd, args, cmdopt);
	}

	static transpileTsFiles(files: Array<string>, callback: (err: string)=>void) {
		if (!files || files.length <= 0) return;
		ipcRenderer.once("transpile-ts-return", (event, result) => {
			if (result.error) {
				console.error("run gulp task error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("transpile-ts", files);
	}

	static runGame(url, callback: (err: string)=>void) {
		if (!url) return;
		ipcRenderer.once("run-game-return", (event, result) => {
			if (result.error) {
				console.error("run game error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("run-game", url);
	}

	static copyDirContentSync(src: string, dest: string, 
		absFlag: number = 0, exts: Array<string> = null): string {
		if (!src || !dest) return "invalid src or dest path";
		let result = ipcRenderer.sendSync("copy-dir-content-sync", src, dest, absFlag, exts);
		if (result.error) {
			console.error("copy dir content error", result.error);
			return result.error.toString();
		}
		return "";
	}
	
	static async copyFilesAsync(srcFiles: Array<string>, 
								destFiles: Array<string>, 
								absFlag: number = 0): Promise<string> {
		if (!srcFiles || !destFiles) return;
		let result = await ipcRenderer.invoke("copy-files-async", srcFiles, destFiles, absFlag);
		if (result.error) {
			console.error("copy files error", result.error);
			return result.error.toString();
		}
		return "";
	}

	static async readFileAsync(filepath: string, abs: boolean = false): Promise<string> {
		if (!filepath) return;
		let result = await ipcRenderer.invoke("read-file-async", filepath, abs);
		if (result.error) {
			console.error("read file error", result.error);
			return null;
		}
		return result.content;
	}

	static async writeFileAsync(filepath: string, content: string, abs: boolean = false): Promise<string> {
		if (!filepath) return;
		let result = await ipcRenderer.invoke("write-file-async", filepath, content, abs);
		if (result.error) {
			console.error("write file error", result.error);
			return result.error;
		}
		return "";
	}

	
	
}
