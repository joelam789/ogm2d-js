import { app, BrowserWindow, dialog, ipcMain } from "electron";
import * as jsonstringify from 'json-stringify-deterministic';

const fs = require('fs');
const fse = require('fs-extra');

const path = require('path');
const glob = require('glob');
const gp = require('glob-promise');

const imgsize  = require('image-size');
const sharp = require('sharp');

const tsc = require('typescript');
const tsconfig = {
    compilerOptions: {
        target: tsc.ScriptTarget.ES5,
        module: tsc.ModuleKind.CommonJS,
        noImplicitAny: false,
        noEmitOnError: true
    }
};

let mainWin = null;
let gameWin = null;
let editorWin = null;

let mainLogLines = [];

function addMainLog(line) {
    mainLogLines.push(line);
}

function transpileTsFiles(fileNames: string[], outDir: string = null, options: any = null) {
    let transpileOptions = options ? options : tsconfig.compilerOptions;
    if (outDir) transpileOptions.outDir = outDir;
    let program = tsc.createProgram(fileNames, transpileOptions);
    let emitResult = program.emit();

    let allDiagnostics = tsc
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

    allDiagnostics.forEach(diagnostic => {
        if (diagnostic.file) {
            let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
            let message = tsc.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
        } else {
            console.log(tsc.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });

    let exitCode = emitResult.emitSkipped ? 1 : 0;
    let logline = `Process exiting with code '${exitCode}'.`;
    console.log(logline);
    //addMainLog(logline);
    return exitCode;
}

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'; // ...

function createMainWindow() {
    // Create the browser window.
    mainWin = new BrowserWindow({
        title: "Editor", width: 1280, height: 780, 
        autoHideMenuBar: true, darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // and load the index.html of the app.
    mainWin.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    mainWin.webContents.openDevTools( {mode: 'detach'} );

    // Emitted when the window is closed.
    mainWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWin = null
    });
}

function createGameWindow(gameUrl, width, height) {
    // Create the browser window.
    gameWin = new BrowserWindow({
        title: "Game", width: width + 40, height: height + 70, 
        autoHideMenuBar: true, darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // and load the index.html of the app.
    gameWin.loadURL('file://' + __dirname + '/' + gameUrl);

    // Open the DevTools.
    gameWin.webContents.openDevTools( {mode: 'detach'} );

    // Emitted when the window is closed.
    gameWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        gameWin = null
        //console.log("Game window is closed");
        addMainLog("Game window is closed.");
    });
}

function createJsonEditorWindow(jsonFileUrl) {
    // Create the browser window.
    editorWin = new BrowserWindow({
        title: "Json Editor", width: 800, height: 600, 
        autoHideMenuBar: true, darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // and load the index.html of the app.
    editorWin.loadURL('file://' + __dirname + '/index-json.html#jsonedt?file=' + jsonFileUrl);

    // Open the DevTools.
    editorWin.webContents.openDevTools();

    // Emitted when the window is closed.
    editorWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        editorWin = null
        console.log("Json editor window is closed");
    });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => createMainWindow());

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWin === null) {
        createMainWindow();
    }
});


ipcMain.on("read-text-file", (event, input) => {
    //console.log(input);
    let filepath = __dirname + "/" + input;
    //console.log(filepath);
    if (!filepath || !fs.existsSync(filepath)) {
        event.sender.send('read-text-file-return', {error: "File path not valid", content: null});
        return;
    }
    try {
        let content = fs.readFileSync(filepath, 'utf8');
        event.sender.send('read-text-file-return', {error: null, content: content});
    } catch(err) {
        console.error(err);
        event.sender.send('read-text-file-return', {error: "Failed to read file", content: null});
    }
});

ipcMain.on("get-dir-tree", (event, input) => {
    //console.log(input);
    let filepath = __dirname + "/" + input;
    let output = [];
    if (fs.existsSync(filepath)) {
        glob(filepath + '/**/*', (err, res) => {
            if (!err) event.sender.send('get-dir-tree-return', {error: null, tree: res});
            else event.sender.send('get-dir-tree-return', {error: "Failed to get dir tree", path: filepath});
        });
    } else event.sender.send('get-dir-tree-return', {error: "Path is not existing", path: filepath});
});

ipcMain.handle("get-dir-tree-async", async (event, currentPath, filePattern) => {
    //console.log(input);
    let filepath = __dirname + "/" + currentPath;
    if (fs.existsSync(filepath)) {
        try {
            let res = await gp.promise(filepath + '/**/' + filePattern);
            return {error: null, tree: res};
        } catch(err) {
            console.error(err);
            return {error: "Failed to get dir tree", path: filepath};
        }

    } else return {error: "File path is not valid", path: filepath};
});

ipcMain.on("get-path-by-name", (event, folder, filename) => {
    //console.log(folder, filename);
    let filepath = __dirname + "/" + folder;
    if (fs.existsSync(filepath)) {
        glob(filepath + '/**/*', (err, res) => {
            if (err) event.sender.send('get-path-by-name-return', {error: "Failed to read dir tree", path: filepath});
            else {
                let found = false;
                for (let item of res) {
                    if (item.endsWith(filename)) {
                        found = true;
                        let finalpath = item.replace(/\\/g,'/');
                        event.sender.send('get-path-by-name-return', {error: null, filepath: finalpath});
                        break;
                    }
                }
                if (!found) event.sender.send('get-path-by-name-return', {error: "File not found", file: filename});
            }
        });
    } else event.sender.send('get-path-by-name-return', {error: "Path is not existing", path: filepath});
});

ipcMain.on("get-fullpaths", (event, filepaths) => {
    //console.log("get-fullpaths", filepaths);
    let fullpaths = [];
    for (let i=0; i<filepaths.length; i++) {
        let filepath = filepaths[i];
        if (!filepath) {
            event.sender.send('get-fullpaths-return', {error: "Wrong path: " + filepath});
            break;
        }
        let fullpath = __dirname + "/" + filepath;
        fullpath = fullpath.replace(/\\/g,'/');
        fullpaths.push(fullpath);
    }
    if (fullpaths.length == filepaths.length)
        event.sender.send('get-fullpaths-return', {error: null, fullpaths: fullpaths});
});

ipcMain.on("save-text", (event, items) => {

    let errs = [];

    for (let item of items) {

        let text = item.text;
        let filepath = item.path;
        let isAbsPath = item.abs && item.abs === true;

        if (!text) text = "";
        if (!filepath) {
            errs.push("Path not found");
            continue;
        }

        let outputFilepath = filepath;
        if (!isAbsPath) outputFilepath = __dirname + "/" + outputFilepath;

        outputFilepath = outputFilepath.replace(/\\/g,'/');
        let outputFolder = outputFilepath.substring(0, outputFilepath.lastIndexOf('/'));
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
        if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
        let saved = false;
        try {
            fs.writeFileSync(outputFilepath, text);
            saved = true;
            errs.push("ok");
        } catch(err) {
            console.error(err);
            if (!saved) errs.push("Failed to save file - " + outputFilepath);
        }
    }

    if (errs.length == items.length) event.sender.send('save-text-return', {error: null, errors: errs});
    else event.sender.send('save-text-return', {error: "Got some errors", errors: errs});
    
});

ipcMain.on("save-text-sync", (event, items) => {

    let errs = [];

    for (let item of items) {

        let text = item.text;
        let filepath = item.path;
        let isAbsPath = item.abs && item.abs === true;

        if (!text) text = "";
        if (!filepath) {
            errs.push("Path not found");
            continue;
        }

        let outputFilepath = filepath;
        if (!isAbsPath) outputFilepath = __dirname + "/" + outputFilepath;

        outputFilepath = outputFilepath.replace(/\\/g,'/');
        let outputFolder = outputFilepath.substring(0, outputFilepath.lastIndexOf('/'));
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
        if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
        let saved = false;
        try {
            fs.writeFileSync(outputFilepath, text);
            saved = true;
            errs.push("ok");
        } catch(err) {
            console.error(err);
            if (!saved) errs.push("Failed to save file - " + outputFilepath);
        }
    }

    if (errs.length == items.length) event.returnValue = {error: null, errors: errs};
    else event.returnValue = {error: "Got some errors", errors: errs};
    
});

ipcMain.on("file-existing-sync", (event, filepath, abs) => {
    let outputFilepath = abs ? filepath : __dirname + "/" + filepath;
    try {
        event.returnValue = {error: null, existing: fs.existsSync(outputFilepath)};
    } catch(err) {
        console.error(err);
        event.returnValue = {error: "get errors when check file existing", existing: false};
    }
});

ipcMain.on("create-dir-sync", (event, filepath, abs) => {
    let outputFolder = abs ? filepath : __dirname + "/" + filepath;
    try {
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
        event.returnValue = {error: null, success: fs.existsSync(outputFolder)};
    } catch(err) {
        console.error(err);
        event.returnValue = {error: "get errors when create new dir", success: false};
    }
});

ipcMain.on("copy-dir-content-sync", (event, src, dest, absFlag = 0, exts = null) => {
    let srcpath = (absFlag & 1) != 0 ? src : __dirname + "/" + src;
    let destpath = (absFlag & 2) != 0 ? dest : __dirname + "/" + dest;
    //console.log("copy-dir-content from ", srcpath, ' to ', destpath);
    //if (exts && exts.length > 0) console.log("for ", exts);
    try {
        if (fs.existsSync(srcpath) && fs.existsSync(destpath)) {
            fse.copySync(srcpath, destpath, {
                filter: (file) => {
                    if (!exts || exts.length <= 0) return true;
                    if (file.indexOf('.') < 0) return true;
                    for (let ext of exts) {
                        if (file.endsWith(ext)) return true;
                    }
                    return false;
                }
            });
            event.returnValue = {error: null};
        } else {
            event.returnValue = {error: "Folders not found"};
        }
    } catch(err) {
        console.error(err);
        event.returnValue = {error: "Failed to copy dir content"};
    }
});

ipcMain.on("write-file-sync", (event, filepath, content, abs) => {
    try {
        let outputFilepath = abs ? filepath : __dirname + "/" + filepath;
        //console.log("write content to ", destpath);
        outputFilepath = outputFilepath.replace(/\\/g,'/');
        let outputFolder = outputFilepath.substring(0, outputFilepath.lastIndexOf('/'));
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
        if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
        fs.writeFileSync(outputFilepath, content, 'utf8');
        event.returnValue = {error: null};
    } catch(err) {
        console.error(err);
        event.returnValue = {error: "Failed to write file"};
    }
});

ipcMain.on("read-file-sync", (event, filepath, abs) => {
    try {
        let inputFilepath = abs ? filepath : __dirname + "/" + filepath;
        if (!inputFilepath || !fs.existsSync(inputFilepath)) {
            event.returnValue = {error: "Invalid file path", content: null};
            return;
        }
        let content = fs.readFileSync(inputFilepath, 'utf8');
        event.returnValue = {error: null, content: content};
    } catch(err) {
        console.error(err);
        event.returnValue = {error: "Failed to read file", content: null};
    }
});

ipcMain.on("get-bg-log", (event) => {

    try {
        let lines = [];
        while (mainLogLines.length > 0) {
            let line = mainLogLines.shift();
            console.log(line);
            lines.push(line);
        }
        event.sender.send('get-bg-log-return', {error: null, lines: lines});
    } catch(err) {
        console.error(err);
        event.sender.send('get-bg-log-return', {error: "Failed to get bg log", lines: []});
    }
    
});

ipcMain.on("run-cmd", (event, cmd, args = [], opt = null) => {
    console.log(cmd, args, opt);
    addMainLog("Running command line - " + cmd);
    try {
        let spawn = require('child_process').spawn;
        //exec('gulp build_dist', {'cwd': 'projectPath'});
        let childp = spawn(cmd, args, opt);
        childp.stdout.on('data', (data) => {
            console.log('stdout: ' + data.toString());
        });
        childp.stderr.on('data', (data) => {
            console.log('stdout: ' + data.toString());
        });
        childp.on('close', (code) => {
            console.log('child process exited with code ' + code.toString());
            addMainLog("End of command line - " + cmd);
            event.sender.send('run-cmd-return', {error: null});
        });
        childp.on('error', () => {
            console.log('failed to start sub-process');
            addMainLog("Error of command line - " + cmd);
            event.sender.send('run-cmd-return', {error: "Failed to exec command - " + cmd});
        });
        //event.sender.send('run-cmd-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('run-cmd-return', {error: "Failed to exec command - " + cmd});
    }
});

ipcMain.on("transpile-ts", (event, files, outdir) => {
    console.log("transpile ts files - ", files);
    console.log("transpile js out put dir - ", outdir);
    //addMainLog("Transpile ts files...");
    try {
        //let sourceCode = "let x: string  = 'abc'";
        //let result = tsc.transpileModule(sourceCode, tsconfig);
        //console.log(JSON.stringify(result));
        let exitCode = transpileTsFiles(files, outdir);
        //addMainLog("Finish transpiling ts files.");
        if (exitCode == 0) event.sender.send('transpile-ts-return', {error: null});
        else event.sender.send('transpile-ts-return', {error: "Failed to transpile typescript files"});
        
    } catch(err) {
        console.error(err);
        event.sender.send('transpile-ts-return', {error: "Failed to transpile typescript files"});
    }
});

ipcMain.handle("transpile-ts-async", async (event, currentPath) => {
    //console.log(input);
    let filepath = __dirname + "/" + currentPath;
    if (fs.existsSync(filepath)) {
        try {
            //addMainLog("Transpile ts files...");
            let tsfiles = await gp.promise(filepath + '/**/*.ts');
            let exitCode = transpileTsFiles(tsfiles);
            //addMainLog("Finish transpiling ts files.");
            if (exitCode == 0) {
                let jsfiles = await gp.promise(filepath + '/**/*.js');
                return {error: null, jsfiles: jsfiles};
            }
            else return {error: "Failed to transpile typescript files", code: exitCode};
        } catch(err) {
            console.error(err);
            return {error: "Failed to transpile ts files in specified dir", path: filepath};
        }

    } else return {error: "File path is not valid", path: filepath};
});

ipcMain.handle("save-text-async", async (event, items) => {

    let errs = [];

    for (let item of items) {

        let text = item.text;
        let filepath = item.path;
        let isAbsPath = item.abs && item.abs === true;

        if (!text) text = "";
        if (!filepath) {
            errs.push("Path not found");
            continue;
        }

        let outputFilepath = filepath;
        if (!isAbsPath) outputFilepath = __dirname + "/" + outputFilepath;

        outputFilepath = outputFilepath.replace(/\\/g,'/');
        let outputFolder = outputFilepath.substring(0, outputFilepath.lastIndexOf('/'));
        if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder, { recursive: true });
        if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
        let saved = false;
        try {
            await fs.promises.writeFile(outputFilepath, text, 'utf8');
            saved = true;
            errs.push("ok");
        } catch(err) {
            console.error(err);
            if (!saved) errs.push("Failed to save file - " + outputFilepath);
        }
    }

    if (errs.length == items.length) return {error: null, errors: errs};
    else return {error: "Got some errors", errors: errs};
    
});

ipcMain.on("copy-dir-content", (event, src, dest, absFlag = 0, exts = null) => {
    let srcpath = (absFlag & 1) != 0 ? src : __dirname + "/" + src;
    let destpath = (absFlag & 2) != 0 ? dest : __dirname + "/" + dest;
    //console.log("copy-dir-content from ", srcpath, ' to ', destpath);
    //if (exts && exts.length > 0) console.log("for ", exts);
    try {
        if (fs.existsSync(srcpath) && fs.existsSync(destpath)) {
            fse.copySync(srcpath, destpath, {
                filter: (file) => {
                    if (!exts || exts.length <= 0) return true;
                    if (file.indexOf('.') < 0) return true;
                    for (let ext of exts) {
                        if (file.endsWith(ext)) return true;
                    }
                    return false;
                }
            });
            event.sender.send('copy-dir-content-return', {error: null});
        } else {
            event.sender.send('copy-dir-content-return', {error: "Folders not found"});
        }
    } catch(err) {
        console.error(err);
        event.sender.send('copy-dir-content-return', {error: "Failed to copy dir content"});
    }
});

ipcMain.on("copy-files", (event, srcFiles, destFiles, absFlag = 0) => {

    if (!srcFiles || srcFiles.length <= 0 
        || !destFiles || destFiles.length <= 0
        || srcFiles.length != destFiles.length) {
        event.sender.send('copy-files-return', {error: "File paths not valid"});
        return;
    }

    try {
        for (let i=0; i<srcFiles.length; i++) {
            let srcpath = (absFlag & 1) != 0 ? srcFiles[i] : __dirname + "/" + srcFiles[i];
            let destpath = (absFlag & 2) != 0 ? destFiles[i] : __dirname + "/" + destFiles[i];
            console.log("copy file from ", srcpath, ' to ', destpath);
            fs.copyFileSync(srcpath, destpath);
        }
        event.sender.send('copy-files-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('copy-files-return', {error: "Failed to copy files"});
    }
    
});

ipcMain.on("run-game", (event, gameUrl, gameWidth, gameHeight) => {
    console.log("run game - ", gameUrl);
    if (!fs.existsSync(__dirname + "/" + gameUrl)) {
        event.sender.send('run-game-return', {error: "Game path is not valid"});
        return;
    }
    try {
        createGameWindow(gameUrl, gameWidth, gameHeight);
        event.sender.send('run-game-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('run-game-return', {error: "Failed to run the game"});
    }
});

ipcMain.on("run-json-editor", (event, jsonFileUrl) => {
    console.log("run json editor - ", jsonFileUrl);
    //if (!fs.existsSync(__dirname + "/" + jsonFileUrl)) {
    //    event.sender.send('run-json-editor-return', {error: "Json file path is not valid"});
    //    return;
    //}
    try {
        createJsonEditorWindow(jsonFileUrl);
        event.sender.send('run-json-editor-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('run-json-editor-return', {error: "Failed to run json editor"});
    }
});

ipcMain.handle('copy-files-async', async (event, srcFiles, destFiles, absFlag) => {
    if (!srcFiles || srcFiles.length <= 0 
        || !destFiles || destFiles.length <= 0
        || srcFiles.length != destFiles.length) {
        return {error: "File paths not valid"};
    }
    try {
        for (let i=0; i<srcFiles.length; i++) {
            let srcpath = (absFlag & 1) != 0 ? srcFiles[i] : __dirname + "/" + srcFiles[i];
            let destpath = (absFlag & 2) != 0 ? destFiles[i] : __dirname + "/" + destFiles[i];
            //console.log("copy file from ", srcpath, ' to ', destpath);
            await fs.promises.copyFile(srcpath, destpath);
        }
        return {error: null};
    } catch(err) {
        console.error(err);
        return {error: "Failed to copy files"};
    }
});

ipcMain.handle('read-file-async', async (event, filepath, abs = false) => {
    if (!filepath) {
        return {error: "File path not valid"};
    }
    try {
        let srcpath = abs ? filepath : __dirname + "/" + filepath;
        //console.log("read file from ", srcpath);
        let content = await fs.promises.readFile(srcpath, 'utf8');
        return {error: null, content: content};
    } catch(err) {
        console.error(err);
        return {error: "Failed to read file"};
    }
});

ipcMain.handle('write-file-async', async (event, filepath, content, abs = false) => {
    if (!filepath) {
        return {error: "File path not valid"};
    }
    try {
        let destpath = abs ? filepath : __dirname + "/" + filepath;
        //console.log("write content to ", destpath);
        await fs.promises.writeFile(destpath, content, 'utf8');
        return {error: null};
    } catch(err) {
        console.error(err);
        return {error: "Failed to write file"};
    }
});



ipcMain.on("copy-tileset-img", (event, input) => {
    //console.log(input);
    let output = "img/tilesets/" + path.basename(input);
    let outputFilepath = __dirname + "/" + output;
    if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
    fs.createReadStream(input).pipe(fs.createWriteStream(outputFilepath)
    .on("close", () => event.sender.send('copy-tileset-img-return', {err: null, url: output}))
    .on("error", (err) => event.sender.send('copy-tileset-img-return', {err: err, url: ""})));
});

ipcMain.on("dlg-get-tilemap-list", (event, srcDir) => {
    fs.readdir(__dirname + "/" + srcDir, (err, files) => {
        if (err) event.sender.send('dlg-get-tilemap-list-return', {error: err, list: []});
        else {
            let list = [];
            for (let filepath of files) {
                let file = path.basename(filepath);
                let pos = file.indexOf(".json");
                if (pos > 0) list.push(file.substring(0, pos));
            }
            event.sender.send('dlg-get-tilemap-list-return', {error: null, list: list});
        }
    });
});

ipcMain.on("dlg-get-tileset-list", (event, srcDir) => {
    fs.readdir(__dirname + "/" + srcDir, (err, files) => {
        if (err) event.sender.send('dlg-get-tileset-list-return', {error: err, list: []});
        else {
            let list = [];
            for (let filepath of files) {
                let file = path.basename(filepath);
                let pos = file.indexOf(".json");
                if (pos > 0) list.push(file.substring(0, pos));
            }
            event.sender.send('dlg-get-tileset-list-return', {error: null, list: list});
        }
    });
});

ipcMain.on("dlg-get-project-list", (event, srcDir) => {
    fs.readdir(__dirname + "/" + srcDir, (err, files) => {
        if (err) event.sender.send('dlg-get-project-list-return', {error: err, list: []});
        else {
            let list = [];
            for (let filepath of files) {
                let file = path.basename(filepath);
                if (file != "_init" && file != "_default" && file != "_sample") list.push(file);
            }
            event.sender.send('dlg-get-project-list-return', {error: null, list: list});
        }
    });
});

ipcMain.on("dlg-select-image-file", (event) => {
    dialog.showOpenDialog(mainWin, {
        defaultPath: __dirname,
        filters: [ { name: 'Images', extensions: ['jpg', 'png', 'bmp'] } ],
    }).then(filepath => {
        //console.log(filepath);
        event.sender.send('dlg-select-image-file-return', {error: null, data: filepath});
    }).catch(err => {
        event.sender.send('dlg-select-image-file-return', {error: err, data: null});
    });
});

ipcMain.on("dlg-select-json-file", (event) => {
    dialog.showOpenDialog(mainWin, {
        defaultPath: __dirname,
        filters: [ { name: 'JSON', extensions: ['json'] } ],
    }).then(filepath => {
        //console.log(filepath);
        event.sender.send('dlg-select-json-file-return', {error: null, data: filepath});
    }).catch(err => {
        event.sender.send('dlg-select-json-file-return', {error: err, data: null});
    });
});

ipcMain.handle("dlg-copy-image-file-async", async (event, imgpath, outDir, smallw, smallh) => {


    try {

        //let output = outDir + "/" + path.basename(imgpath);
        //let outputFilepath = __dirname + "/" + output;

        const idlist = "0123456789abcdefghijklmnopqrstuvwxyz";
        let size = imgsize(imgpath);

        let shortnames = [];

        let smallIds = new Array<Array<string>>();
        let smallRects = new Array<Array<any>>();

        let totalW = size.width, currentW = 0, lastX = 0;
        let totalH = size.height, currentH = 0, lastY = 0;;
        let row = 0, col = 0;

        while (totalH > 0) {
            currentH = totalH >= smallh ? smallh : totalH;

            let colIds = new Array<string>();
            let colRects = new Array<any>();
            while (totalW > 0) {
                currentW = totalW >= smallw ? smallw : totalW;
                colIds.push(idlist[row] + idlist[col]);
                colRects.push({
                    x: lastX, 
                    y: lastY, 
                    w: currentW, 
                    h: currentH });
                col++;
                totalW -= smallw;
                lastX += currentW;
            }

            smallIds.push(colIds);
            smallRects.push(colRects);

            row++;
            col = 0;
            lastX = 0;
            lastY += currentH;
            totalH -= smallh;
            totalW = size.width;
        }

        //console.log(smallIds);
        //console.log(smallRects);

        let fullname = path.basename(imgpath);
        let filename = fullname.substring(0, fullname.lastIndexOf('.'));
        let fileext = fullname.substring(fullname.lastIndexOf('.'));

        for (let i=0; i<smallIds.length; i++) {
            let colIds = smallIds[i];
            for (let j=0; j<colIds.length; j++) {
                let shortname = filename + "_" + smallIds[i][j] + fileext;
                let outputFilepath = __dirname + "/" + outDir + "/" + shortname;
                let rect = smallRects[i][j];
                await sharp(imgpath).extract({ width: rect.w, height: rect.h, left: rect.x, top: rect.y }).toFile(outputFilepath);
                shortnames.push(outputFilepath);
            }
        }

        //event.sender.send('dlg-copy-image-file-return', {error: "not impl", newpath: ""});
        
        return {error: null, newpath: shortnames.join(',')};
    } catch(err) {
        console.error(err);
        return {error: "Failed to copy image file", newpath: ""};
    }
});

ipcMain.handle("dlg-save-tilemap-file-async", async (event, input) => {
    
    //console.log(input);

    try {

        // save json
        let tilemap = JSON.parse(JSON.stringify(input.tilemapData));
        let keys = [];
        let jsonstr = jsonstringify(tilemap, {
            space: '\t',
            stringify: (value, replacer, space) => {
                let key = keys.pop();
                let ret = (key == "ids" || key == "areas")  && typeof value == "string" ? value : JSON.stringify(value);
                return ret;
            }, 
            compare: (a, b) => {
                if (Array.isArray(a.value) && Array.isArray(b.value)) return a.value.length > b.value.length ? 1 : -1;
                else if (Array.isArray(a.value) && !Array.isArray(b.value)) return 1;
                else if (!Array.isArray(a.value) && Array.isArray(b.value)) return -1;
                else if (typeof a.value === "number" && typeof b.value === "string") return 1;
                else if (typeof a.value === "string" && typeof b.value === "number") return -1;
                else if (typeof a.value === "string" && typeof b.value === "string") return a.key.length > b.key.length ? 1 : -1;
                else return a.key > b.key ? -1 : 1;
            },
            replacer: (k, v) => {
                keys.push(k);
                let ret = (k == "ids") && Array.isArray(v) ? JSON.stringify(v) : v;
                if (k == "areas") {
                    //console.log(ret);
                    ret = "";
                    let str = JSON.stringify(v);
                    let items = str.split(',');
                    for (let i=0; i<items.length; i++) {
                        if (ret.length == 0) ret += items[i];
                        else ret += "," + items[i];
                        if (i % 4 == 3) ret += '\n\t\t\t\t\t';
                    }
                }
                return ret;
            }
        });
        let outputJsonFilepath = __dirname + "/" + input.tilemapFile;
        if (fs.existsSync(outputJsonFilepath)) fs.unlinkSync(outputJsonFilepath);
        await fs.promises.writeFile(outputJsonFilepath, jsonstr);

        // save preview
        sharp.cache({ files : 0 }); // clear cache ...
        let imgdata = input.tilemapPicture;
        let outputFilepath = __dirname + "/" + input.tilemapDesign;
        let outputPreviewFilepath = __dirname + "/" + input.tilemapPreview;
        if (fs.existsSync(outputFilepath)) fs.unlinkSync(outputFilepath);
        if (fs.existsSync(outputPreviewFilepath)) fs.unlinkSync(outputPreviewFilepath);
        await sharp(Buffer.from(imgdata.split(';base64,').pop(), 'base64')).toFile(outputFilepath);
        let orgSize = imgsize(outputFilepath);
        let newWidth = orgSize.width >= orgSize.height ? 128 : 0;
        let newHeight = orgSize.width <= orgSize.height ? 128 : 0;
        if (newWidth == 0) newWidth = orgSize.width * 128 / orgSize.height;
        if (newHeight == 0) newHeight = orgSize.height * 128 / orgSize.width;
        //if (fs.existsSync(outputPreviewFilepath)) fs.unlinkSync(outputPreviewFilepath);
        //console.log(outputFilepath);
        await sharp(outputFilepath).resize(newWidth, newHeight).toFile(outputPreviewFilepath);
        //console.log(outputPreviewFilepath);
        return {error: null, outpath: outputJsonFilepath};

    } catch(err) {
        console.error(err);
        return {error: "Failed to save tilemap file", outpath: ""};
    }
    
});


ipcMain.on("reload-project", (event, projectName) => {
    mainWin.loadURL('file://' + __dirname + '/index.html?project=' + projectName);
});
