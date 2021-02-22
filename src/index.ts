import { app, BrowserWindow, dialog, ipcMain } from "electron";
//import * as jsonstringify from 'json-stringify-deterministic';

const fs = require('fs');
const fse = require('fs-extra');

const path = require('path');
const glob = require('glob');

const tsc = require('typescript');
const tsconfig = {
    compilerOptions: {
        target: tsc.ScriptTarget.ES5,
        module: tsc.ModuleKind.CommonJS,
        noImplicitAny: false,
        noEmitOnError: true
    }
};

function transpileTsFiles(fileNames: string[], options: any = null) {
    let transpileOptions = options ? options : tsconfig.compilerOptions;
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
    console.log(`Process exiting with code '${exitCode}'.`);
    return exitCode;
}

let mainWin = null;
let gameWin = null;

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = '1'; // ...

function createMainWindow() {
    // Create the browser window.
    mainWin = new BrowserWindow({
        title: "Editor", width: 1280, height: 720, 
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

function createGameWindow(gameUrl) {
    // Create the browser window.
    gameWin = new BrowserWindow({
        title: "Game", width: 680, height: 550, 
        autoHideMenuBar: true, darkTheme: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    // and load the index.html of the app.
    gameWin.loadURL('file://' + __dirname + '/' + gameUrl);

    // Open the DevTools.
    //gameWin.webContents.openDevTools();

    // Emitted when the window is closed.
    gameWin.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        gameWin = null
        console.log("Game window is closed");
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


ipcMain.on("get-dir-tree", (event, input) => {
    console.log(input);
    let filepath = __dirname + "/" + input;
    let output = [];
    if (fs.existsSync(filepath)) {
        glob(filepath + '/**/*', (err, res) => {
            if (!err) event.sender.send('get-dir-tree-return', {error: null, tree: res});
            else event.sender.send('get-dir-tree-return', {error: "Failed to get dir tree", path: filepath});
        });
    } else event.sender.send('get-dir-tree-return', {error: "Path is not existing", path: filepath});
});

ipcMain.on("get-path-by-name", (event, folder, filename) => {
    console.log(folder, filename);
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
    console.log("get-fullpaths", filepaths);
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

ipcMain.on("run-cmd", (event, cmd, args = [], opt = null) => {
    console.log(cmd, args, opt);
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
            event.sender.send('run-cmd-return', {error: null});
        });
        childp.on('error', () => {
            console.log('failed to start sub-process');
            event.sender.send('run-cmd-return', {error: "Failed to exec command - " + cmd});
        });
        //event.sender.send('run-cmd-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('run-cmd-return', {error: "Failed to exec command - " + cmd});
    }
});

ipcMain.on("transpile-ts", (event, files) => {
    console.log("transpile ts files - ", files);
    try {
        //let sourceCode = "let x: string  = 'abc'";
        //let result = tsc.transpileModule(sourceCode, tsconfig);
        //console.log(JSON.stringify(result));
        let exitCode = transpileTsFiles(files);
        if (exitCode == 0) event.sender.send('transpile-ts-return', {error: null});
        else event.sender.send('transpile-ts-return', {error: "Failed to transpile typescript files"});
        
    } catch(err) {
        console.error(err);
        event.sender.send('transpile-ts-return', {error: "Failed to transpile typescript files"});
    }
});

ipcMain.on("copy-dir-content", (event, src, dest, absFlag = 0, exts = null) => {
    let srcpath = (absFlag & 1) != 0 ? src : __dirname + "/" + src;
    let destpath = (absFlag & 2) != 0 ? dest : __dirname + "/" + dest;
    console.log("copy-dir-content from ", srcpath, ' to ', destpath);
    if (exts && exts.length > 0) console.log("for ", exts);
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

ipcMain.on("run-game", (event, gameUrl) => {
    console.log("run game - ", gameUrl);
    if (!fs.existsSync(__dirname + "/" + gameUrl)) {
        event.sender.send('run-game-return', {error: "Game path is not valid"});
        return;
    }
    try {
        createGameWindow(gameUrl);
        event.sender.send('run-game-return', {error: null});
    } catch(err) {
        console.error(err);
        event.sender.send('run-game-return', {error: "Failed to run the game"});
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

ipcMain.on("get-tilemap-list", (event) => {
    fs.readdir(__dirname + "/json/tilemaps", (err, files) => {
        if (err) event.sender.send('get-tilemap-list-return', []);
        else {
            let list = [];
            for (let filepath of files) {
                let file = path.basename(filepath);
                let pos = file.indexOf(".json");
                if (pos > 0) list.push(file.substring(0, pos));
            }
            event.sender.send('get-tilemap-list-return', list);
        }
    });
});
