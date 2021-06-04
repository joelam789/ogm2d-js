
import { ipcRenderer } from "electron";

export class Ipc {

	private static _dirtreeReuests: Array<any> = [];
	
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

	static async getDirTreeAsync(currentPath: string, filePattern: string = "*"): Promise<Array<string>> {
		let result = await ipcRenderer.invoke("get-dir-tree-async", currentPath, filePattern);
		if (result.error) {
			console.error("get dir tree error", result.error);
			return [];
		}
		return result.tree;
	}

	static getDirTreeSync(currentPath: string, filePattern: string = "*"): Array<string> {
		let result = ipcRenderer.sendSync("get-dir-tree-sync", currentPath, filePattern);
		if (result.error) {
			console.error("get dir tree error", result.error);
			return [];
		}
		return result.tree;
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

	static readTextFile(filepath: string, callback: (content: string)=>void) {
		ipcRenderer.once("read-text-file-return", (event, result) => {
			if (result.error) {
				console.error("readTextFile", result.error);
				if (callback) callback(null);
			} else {
				if (callback) callback(result.content);
			}
		});
		ipcRenderer.send("read-text-file", filepath);
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

	static saveTextSync(items: Array<any>): string {
		if (!items || items.length <= 0) return "";
		let result = ipcRenderer.sendSync("save-text-sync", items);
		if (result.error) {
			console.error("save text error", result.error);
			return result.error;
		}
		return "";
	}

	static isFileExistingSync(filepath: string, abs: boolean = false): boolean {
		if (!filepath) return false;
		let result = ipcRenderer.sendSync("file-existing-sync", filepath, abs);
		if (result.error) {
			console.error("check file existing error", result.error);
			return false;
		}
		return result.existing;
	}

	static deleteFilesSync(filepaths: Array<string>, abs: boolean = false): boolean {
		if (!filepaths) return false;
		let result = ipcRenderer.sendSync("delete-files-sync", filepaths, abs);
		if (result.error) {
			console.error("delete files error", result.error);
			return false;
		}
		return true;
	}

	static createDirSync(filepath: string, abs: boolean = false): boolean {
		if (!filepath) return false;
		let result = ipcRenderer.sendSync("create-dir-sync", filepath, abs);
		if (result.error) {
			console.error("create dir error", result.error);
			return false;
		}
		return result.success;
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

	static getBgLog(callback: (lines: Array<string>)=>void) {
		ipcRenderer.once("get-bg-log-return", (event, result) => {
			if (result.error) {
				console.error("get bg log error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback(result.lines);
			}
		});
		ipcRenderer.send("get-bg-log");
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

	static transpileTsFiles(files: Array<string>, outputDir, callback: (err: string)=>void) {
		if (!files || files.length <= 0) return;
		ipcRenderer.once("transpile-ts-return", (event, result) => {
			if (result.error) {
				console.error("run gulp task error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("transpile-ts", files, outputDir);
	}

	static async transpileTsFilesAsync(currentPath: string): Promise<Array<string>> {
		let result = await ipcRenderer.invoke("transpile-ts-async", currentPath);
		if (result.error) {
			console.error("transpile ts error", result.error);
			return [];
		}
		return result.jsfiles;
	}

	static runGame(gameUrl, gameWidth, gameHeight, callback: (err: string)=>void) {
		if (!gameUrl) return;
		ipcRenderer.once("run-game-return", (event, result) => {
			if (result.error) {
				console.error("run game error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("run-game", gameUrl, gameWidth, gameHeight);
	}

	static runJsonEditor(jsonFileUrl, callback: (err: string)=>void) {
		//if (!jsonFileUrl) return;
		ipcRenderer.once("run-json-editor-return", (event, result) => {
			if (result.error) {
				console.error("run-json-editor error", result.error);
				if (callback) callback(result.error);
			} else {
				if (callback) callback("");
			}
		});
		ipcRenderer.send("run-json-editor", jsonFileUrl);
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

	static getTilemapListToSelect(tilemapDir: string, callback: (tilemapList: Array<string>)=>void) {
		ipcRenderer.once("dlg-get-tilemap-list-return", (event, result) => {
            if (result.error) {
				console.error("dlg-get-tilemap-list", result.error);
				if (callback) callback([]);
			} else {
				if (callback) callback(result.list);
			}
        });
        ipcRenderer.send("dlg-get-tilemap-list", tilemapDir);
	}

	static getTilesetListToSelect(fromDir: string, callback: (list: Array<string>)=>void) {
		ipcRenderer.once("dlg-get-tileset-list-return", (event, result) => {
            if (result.error) {
				console.error("dlg-get-tileset-list", result.error);
				if (callback) callback([]);
			} else {
				if (callback) callback(result.list);
			}
        });
        ipcRenderer.send("dlg-get-tileset-list", fromDir);
	}

	static getProjectListToSelect(fromDir: string, callback: (list: Array<string>)=>void) {
		ipcRenderer.once("dlg-get-project-list-return", (event, result) => {
            if (result.error) {
				console.error("dlg-get-project-list", result.error);
				if (callback) callback([]);
			} else {
				if (callback) callback(result.list);
			}
        });
        ipcRenderer.send("dlg-get-project-list", fromDir);
	}

	static selectImageFile(callback: (filepath: string)=>void) {
		ipcRenderer.once("dlg-select-image-file-return", (event, result) => {
            if (result.error) {
				console.error("dlg-select-image-file-return", result.error);
				if (callback) callback("");
			} else {
				if (callback) callback(result.data);
			}
        });
        ipcRenderer.send("dlg-select-image-file");
	}

	static selectJsonFile(callback: (filepath: string)=>void) {
		ipcRenderer.once("dlg-select-json-file-return", (event, result) => {
            if (result.error) {
				console.error("dlg-select-json-file-return", result.error);
				if (callback) callback("");
			} else {
				if (callback) callback(result.data);
			}
        });
        ipcRenderer.send("dlg-select-json-file");
	}

	static copyImageFile(imgpath, outDir, smallw, smallh, callback: (newpath: string)=>void) {
		ipcRenderer.once("dlg-copy-image-file-return", (event, result) => {
            if (result.error) {
				console.error("dlg-copy-image-file-return", result.error);
				if (callback) callback("");
			} else {
				if (callback) callback(result.newpath);
			}
        });
        ipcRenderer.send("dlg-copy-image-file", imgpath, outDir, smallw, smallh);
	}

	static async copyImageFileAsync(imgpath, outDir, smallw, smallh): Promise<string> {
		let result = await ipcRenderer.invoke("dlg-copy-image-file-async", imgpath, outDir, smallw, smallh);
		if (result.error) {
			console.error("copy image files error", result.error);
			return "";
		}
		return result.newpath;
	}

	static async saveTilemapFileAsync(tilemapSetting: any)  {
		let result = await ipcRenderer.invoke("dlg-save-tilemap-file-async", tilemapSetting);
		if (result.error) {
			console.error("copy image files error", result.error);
			return "";
		}
		return result.outpath;
	}
	
	static async copyFilesAsync(srcFiles: Array<string>, 
								destFiles: Array<string>, 
								absFlag: number = 0): Promise<string> {
		if (!srcFiles || !destFiles) return null;
		let result = await ipcRenderer.invoke("copy-files-async", srcFiles, destFiles, absFlag);
		if (result.error) {
			console.error("copy files error", result.error);
			return result.error.toString();
		}
		return "";
	}

	static async readFileAsync(filepath: string, abs: boolean = false): Promise<string> {
		if (!filepath) return null;
		let result = await ipcRenderer.invoke("read-file-async", filepath, abs);
		if (result.error) {
			console.error("read file error", result.error);
			return null;
		}
		return result.content;
	}

	static async writeFileAsync(filepath: string, content: string, abs: boolean = false): Promise<string> {
		if (!filepath) return "";
		let result = await ipcRenderer.invoke("write-file-async", filepath, content, abs);
		if (result.error) {
			console.error("write file error", result.error);
			return result.error;
		}
		return "";
	}

	static readFileSync(filepath: string, abs: boolean = false): string {
		if (!filepath) return null;
		let result = ipcRenderer.sendSync("read-file-sync", filepath, abs);
		if (result.error) {
			console.error("read file error", result.error);
			return null;
		}
		return result.content;
	}

	static writeFileSync(filepath: string, content: string, abs: boolean = false): string {
		if (!filepath) return "";
		let result = ipcRenderer.sendSync("write-file-sync", filepath, content, abs);
		if (result.error) {
			console.error("write file error", result.error);
			return result.error;
		}
		return "";
	}
	
	static async saveTextAsync(items: Array<any>): Promise<string> {
		if (!items || items.length <= 0) return "";
		let result = await ipcRenderer.invoke("save-text-async", items);
		if (result.error) {
			console.error("save text error", result.error);
			return result.error;
		}
		return "";
	}
	
	static reloadProject(projectName: string) {
        ipcRenderer.send("reload-project", projectName);
	}
}
