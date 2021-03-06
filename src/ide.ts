
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { RuntimeGenerator } from "./generator";
import { SelectProjectDlg } from './popups/select-project';
import { CreateNewProjectDlg } from './popups/new-project';
import { CommonInfoDlg } from './popups/common-info';

import { App } from "./app";
import { Ipc } from "./ipc";


@autoinject()
export class Ide {

    gui: any = null;

    editorDlg: any = null;
    editorFrame: any = null;

    centerSettings: string = "region:'center',title:'Design'";
    eastSettings: string = "region:'east',title:'Inspector',split:true";
    westSettings: string = "region:'west',title:'Resource',split:true";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    activate(parameters, routeConfig) {

        this.centerSettings = "region:'center',title:'" + this.i18n.tr("ide.title.center") + "'";
        this.eastSettings = "region:'east',title:'" + this.i18n.tr("ide.title.east") + "',split:true";
        this.westSettings = "region:'west',title:'" + this.i18n.tr("ide.title.west") + "',split:true";

    }

    attached(argument) {
        document.getElementById('top-loading').style.display = 'none';

        this.editorFrame = document.getElementById('editor-window');

        this.editorDlg = ($('#editor-dialog') as any).dialog.bind($('#editor-dialog'));
        if (this.editorDlg) this.editorDlg({
            modal: true,
            closed: true,
            resizable: true, 
            maximizable: true, 
            title: this.i18n.tr("editor.dlg-title"),
            iconCls: 'icon-edit',
            onBeforeClose: function() {
                (document.getElementById('editor-window') as any).src = "about:blank";
                return true;
            },
            /*
            toolbar: [{
                text:'Reload',
                iconCls:'icon-reload',
                handler: () => {
                    this.editorFrame.contentWindow.appEvent.publish('dlg-editor-reload');
                }
            },'-',{
                text:'Save',
                iconCls:'icon-save',
                handler: () => {
                    this.editorFrame.contentWindow.appEvent.publish('dlg-editor-save');
                }
            }],
            */
            buttons: [{
                text: this.i18n.tr("ide.ok"),
                iconCls:'icon-ok',
                handler: () => {
                    this.editorFrame.contentWindow.appEvent.publish('dlg-editor-save-close');
                }
            },{
                text: this.i18n.tr("ide.cancel"),
                iconCls:'icon-cancel',
                handler: () => {
                    this.closeEditorDlg();
                }
            }]
        });

        this.gui = ($('#ide-layout') as any).layout.bind($('#ide-layout'));
        if (this.gui) this.gui({fit: true});
        let centerlayout = ($('#center-layout') as any).layout.bind($('#center-layout'));
        if (centerlayout) centerlayout({fit: true});
        let eastlayout = ($('#east-layout') as any).layout.bind($('#east-layout'));
        if (eastlayout) eastlayout({fit: true});

        document.getElementById('app').style.visibility = 'visible';

        // load theme
		let themeName = "default";
		if (App.config.ide.theme) themeName = App.config.ide.theme;
        App.changeTheme(themeName);

        let mainui = document.getElementById('ide-layout');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let mainlayout = document.getElementById('ide-layout');
            if (this.editorDlg) this.editorDlg("center");
            if (mainlayout) mainlayout.style.width = mainlayout.style.height = "100%";
            let sublayout1 = document.getElementById('center-layout');
            if (sublayout1) sublayout1.style.width = sublayout1.style.height = "100%";
            let sublayout2 = document.getElementById('east-layout');
            if (sublayout2) sublayout2.style.width = sublayout2.style.height = "100%";
        }));

        this.subscribers.push(this.eventChannel.subscribe("display-dblclick", (data) => {
            if (data) {
                console.log(data);
                if (!data.object) return;
                console.log("going to open blockly... ??", data.object.name);
                //this.openEditorDlg("index-blockly.html#blockly", 800, 600);
            }
        }));

        this.subscribers.push(this.eventChannel.subscribe("click-link-button", (btn) => {
            this.handleIdeButtonClick(btn);
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-run-current", () => {
            this.eventChannel.publish("ide-save-current-and-run");
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-run-current-only", (data) => {
            this.runCurrent(data ? data.scene : "");
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-reload-game-size", () => {
            this.reloadGameSize();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-open", (data) => {
            if (data) {
                console.log(data);
                console.log("going to open editor dialog...");
                this.openEditorDlg(data.url, data.width, data.height);
            }
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-close", () => {
            console.log("received: dlg-editor-close");
            this.closeEditorDlg();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-switch-to-script", (setting) => {
            Ipc.writeFileSync(setting.filepath, setting.content);
            this.closeEditorDlg();
            let filename = setting.filepath.substring(0, setting.filepath.lastIndexOf('.'));
            let scriptfile = filename + ".ts";
            this.eventChannel.publish('dlg-editor-open', {
                url: "index-script.html#scriptedt?file=" + scriptfile,
                width: 800, height: 600
            });

        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-edit-tilemap", () => {
            console.log("Show Tilemap Dialog...");
            this.openTilemapEditor();
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-edit-tileset", (data) => {
            console.log("Show Tileset Dialog...");
            //this.openTilesetEditor(data ? data.tileset : "");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-copy-tileset-img", (imgPathSetting) => {
            this.copyTilesetImage(imgPathSetting);
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-save-new-tileset-file", (data) => {
            Ipc.saveTilesetFile(data, (newpath) => {
                if (newpath) this.editorFrame.contentWindow.appEvent.publish('dlg-save-new-tileset-file-return', newpath);
            })
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-save-tileset-file", (data) => {
            Ipc.saveTilesetFile(data, (newpath) => {
                if (newpath) this.editorFrame.contentWindow.appEvent.publish('dlg-save-tileset-file-return', newpath);
            })
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-get-tilemap-list", () => {
            console.log("Try to get tilemap list for Dialog...");
            this.getTilemapListToSelect();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-get-tileset-list", () => {
            console.log("Try to get tileset list for Dialog...");
            this.getTilesetListToSelect();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-select-image-file", () => {
            console.log("Try to select an image file for Dialog...");
            this.selectImageFile();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-select-image-with-size", () => {
            console.log("Try to select an image file for Dialog...");
            this.selectImageWithSize();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-copy-image-file", (imgsetting) => {
            console.log("Try to copy an image file for Dialog...");
            this.copyImageFile(imgsetting.imageFile, imgsetting.pieceWidth, imgsetting.pieceHeight);
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-save-tilemap-file", (tilemapSetting) => {
            console.log("Try to save a tilemap file for Dialog...");
            this.saveTilemapFile(tilemapSetting);
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-read-text-file", (filepath) => {
            console.log("Try to read a text file for Dialog...");
            this.readTextFile(filepath);
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-write-text-file", (settings) => {
            console.log("Try to write a text file for Dialog...");
            this.writeTextFile(settings.filepath, settings.content);
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-read-script-file", (settings) => {
            console.log("Try to write a script file for Dialog...");
            this.tryToReadScript(settings.filepath, settings.classname);
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-open-project", () => {
            this.openProject();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-select-json-file", () => {
            console.log("Try to select a json file for Dialog...");
            this.selectJsonFile();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-get-project-list", () => {
            this.getProjectListToSelect();
        }));

        this.subscribers.push(this.eventChannel.subscribe("ide-new-project", () => {
            this.createNewProject();
        }));

        //App.busy = false;

        let projectName = App.getUrlParamByName("project");
        console.log("project name - ", projectName);
        if (!projectName) projectName = "_init";

        App.loadProject("workspace/" + projectName + "/main.json", () => {
            this.eventChannel.publish('project-reloaded');
            App.busy = false;
        });
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    changeLang(lang: string) {
        if (App.lang == lang) return;
        this.i18n.setLocale(lang)
        .then(() => {
            App.lang = this.i18n.getLocale();
            console.log("current lang: " + App.lang);

            this.centerSettings = "region:'center',title:'" + this.i18n.tr("ide.title.center") + "'";
            this.eastSettings = "region:'east',title:'" + this.i18n.tr("ide.title.east") + "',split:true";
            this.westSettings = "region:'west',title:'" + this.i18n.tr("ide.title.west") + "',split:true";

			App.loadAppLanguageScript();
        });
	}

    handleIdeButtonClick(btn) {
        console.log(btn);
        this.eventChannel.publish(btn.group + "-" + btn.name);
    }

    openEditorDlg(url: string, w?: number, h?: number) {
        let dlgWidth = w ? w : 800;
        let dlgHeight = h ? h : 600;
        if (this.editorDlg && this.editorFrame) {
            this.editorDlg('resize',{
                width: dlgWidth,
                height: dlgHeight
            });
            this.editorDlg('center');
            this.editorDlg("open");
            //let newpath = url + "&temp=" + App.genRandomName(16);
            let newurl = url;
            let oldurl = this.editorFrame.src;
            console.log("going to refresh iframe with the url...", oldurl, newurl);
            let isNewOne = !oldurl || oldurl != newurl;
            if (oldurl && oldurl.endsWith(newurl)) isNewOne = false;
            this.editorFrame.src = newurl;
            if (!isNewOne) {
                console.log("force iframe to refresh...");
                this.editorFrame.contentWindow.location.reload(true); // force iframe to refresh
            }
            //if (isSameUrl) this.editorFrame.contentWindow.location.reload(true);
            //this.editorFrame.contentWindow.location.replace(url);
        }
    }

    closeEditorDlg() {
        if (this.editorDlg && this.editorFrame) {
            this.editorFrame.src = "about:blank";
            this.editorDlg("close");
        }
    }

    openTilemapEditor() {
        console.log("open tilemap editor");
        let tilemapFilepath = "tilemap.json";
        this.eventChannel.publish('dlg-editor-open', {
            url: "index-tilemap.html#tilemapedt?file=" + tilemapFilepath,
            width: 1240, height: 650
        });

    }

    openTilesetEditor(tilesetName: string) {
        console.log("openTilesetEditor...");
    }

    getTilemapListToSelect() {
        let srcDir = App.projectPath + "/runtime/project/res/json/tilemaps";
        Ipc.getTilemapListToSelect(srcDir, (list) => {
            this.editorFrame.contentWindow.appEvent.publish('dlg-get-tilemap-list-return', list);
        });
    }

    getTilesetListToSelect() {
        let srcDir = App.projectPath + "/runtime/project/res/json/tilesets";
        Ipc.getTilesetListToSelect(srcDir, (list) => {
            this.editorFrame.contentWindow.appEvent.publish('dlg-get-tileset-list-return', list);
        });
    }

    getProjectListToSelect() {
        let srcDir = "/workspace";
        Ipc.getProjectListToSelect(srcDir, (list) => {
            this.eventChannel.publish('dlg-get-project-list-return', list);
        });
    }

    selectImageFile() {
        Ipc.selectImageFile((imgpathinfo) => {
            //console.log(imgpathinfo);
            let ret: any = imgpathinfo;
            this.editorFrame.contentWindow.appEvent.publish('dlg-select-image-file-return', ret.filePaths[0]);
        });
    }

    selectImageWithSize() {
        Ipc.selectImageWithSize((data) => {
            //console.log(data);
            this.eventChannel.publish('dlg-select-image-with-size-return', data);
        });
    }

    selectJsonFile() {
        Ipc.selectJsonFile((filepathinfo) => {
            console.log(filepathinfo);
            let ret: any = filepathinfo;
            this.eventChannel.publish('dlg-select-json-file-return', ret.filePaths[0]);
        });
    }

    copyTilesetImage(imgPathSetting) {
        Ipc.copyTilesetImage(imgPathSetting, (newpath) => {
            //console.log(data);
            this.editorFrame.contentWindow.appEvent.publish('dlg-copy-tileset-img-return', newpath);
        });
    }

    async copyImageFile(imgpath, smallw, smallh) {
        let srcDir = App.projectPath + "/runtime/project/res/img";
        //Ipc.copyImageFile(imgpath, srcDir, smallw, smallh, (newpath) => {
        //    console.log(newpath);
        //    this.editorFrame.contentWindow.appEvent.publish('dlg-copy-image-file-return', newpath);
        //});
        let newpath = await Ipc.copyImageFileAsync(imgpath, srcDir, smallw, smallh);
        this.editorFrame.contentWindow.appEvent.publish('dlg-copy-image-file-return', newpath);
    }

    async saveTilemapFile(tilemapSetting) {
        let tilemapOutputPath = await Ipc.saveTilemapFileAsync(tilemapSetting);
        console.log(tilemapOutputPath);
        this.editorFrame.contentWindow.appEvent.publish('dlg-save-tilemap-file-return', tilemapOutputPath);
    }

    async readTextFile(filepath) {
        let textFile = await Ipc.readFileAsync(filepath);
        this.editorFrame.contentWindow.appEvent.publish('dlg-read-text-file-return', textFile);
    }

    async writeTextFile(filepath, content) {
        let error = await Ipc.writeFileAsync(filepath, content);
        if (error) console.log("Failed to write a text file - " + error);
        else this.editorFrame.contentWindow.appEvent.publish('dlg-write-text-file-return');
    }

    async reloadGameSize() {
        let rtGameFile = App.projectPath + "/design/template/games/game.json"; // must be game.json...
        if (!Ipc.isFileExistingSync(rtGameFile)) return;
        let gameJsonStr = await Ipc.readFileAsync(rtGameFile, false);
        if (gameJsonStr) {
            let gameJson = JSON.parse(gameJsonStr);
            if (gameJson) {
                let gameSize = {
                    width: gameJson.components.display.width,
                    height: gameJson.components.display.height
                }
                this.eventChannel.publish("update-game-size", gameSize);
            }
        }
    }

    async tryToReadScript(filepath, className = "Game1") {
        let scriptContent = "";
        if (Ipc.isFileExistingSync(filepath)) scriptContent = await Ipc.readFileAsync(filepath);
        if (!scriptContent) {
            scriptContent = RuntimeGenerator.genEmptyClassScript(className);
            let error = await Ipc.writeFileAsync(filepath, scriptContent);
            if (error) {
                console.log("Failed to write a script file with default content - " + error);
                scriptContent = "";
            }
        }
        this.editorFrame.contentWindow.appEvent.publish('dlg-read-script-file-return', scriptContent);
    }

    saveCurrent() {
        console.log("save current scene");
    }

    async runCurrent(sceneName: string = "") {

        console.log("run current scene", sceneName);

        //let tsfiles = [];
        //tsfiles.push("C:/javascript/ogm2d-dev/dist/workspace/project2/design/template/games/demo.ts");
        //App.transpileTsFiles(tsfiles, (err) => {
        //    if (err) console.log("Failed to run current scene - " + err);
        //    else console.log("Running current scene is done");
        //});

        this.eventChannel.publish("add-ide-log", "Building current scene...");

        let srcDir = App.projectPath + "/runtime/project/res";
        let destDir = App.projectPath + "/runtime/build/debug";

        Ipc.deleteDirSync(destDir);

        let errmsg = Ipc.copyDirContentSync(srcDir, destDir, 0, []);
        if (errmsg) {
            console.log("Failed to copy resource - " + errmsg);
            return;
        }

        srcDir = App.projectPath + "/design/template";
        destDir = App.projectPath + "/runtime/build/debug/json";

        errmsg = Ipc.copyDirContentSync(srcDir, destDir, 0, ['.json']);
        if (errmsg) {
            console.log("Failed to copy json files - " + errmsg);
            return;
        }

        this.eventChannel.publish("add-ide-log", "Tanspiling script files...");
        let jsFiles = await Ipc.transpileTsFilesAsync(srcDir);
        //console.log(jsFiles);

        destDir = App.projectPath + "/runtime/build/debug";
        errmsg = Ipc.copyDirContentSync(srcDir, destDir, 0, ['.js']);
        if (errmsg) {
            console.log("Failed to copy js files - " + errmsg);
            return;
        }


        let gameJson = null;
        if (sceneName) {
            let rtGameFile = App.projectPath + "/runtime/build/debug/json/games/game.json"; // must be game.json...
            let gameJsonStr = await Ipc.readFileAsync(rtGameFile, false);
            if (gameJsonStr) {
                gameJson = JSON.parse(gameJsonStr);
                if (gameJson) {

                    console.log(gameJson);
                    
                    // we should make sure all scenes were generated first ...
                    if (!gameJson.scenes) gameJson.scenes = [sceneName]
                    else {
                        let idx = gameJson.scenes.indexOf(sceneName);
                        if (idx < 0) gameJson.scenes.push(sceneName);
                        gameJson.first = sceneName;
                    }
                    
                    // since so far we would generate only current scene , 
                    // so just let it be the only one scene of the game ...
                    //gameJson.scenes = [sceneName];

                }
                await Ipc.writeFileAsync(rtGameFile, JSON.stringify(gameJson, null, 4), false);
            }
        }

        let srcFiles = [App.projectPath + "/runtime/project/index.html"];
        let destFiles = [App.projectPath + "/runtime/build/debug/index.html"];

        errmsg = await Ipc.copyFilesAsync(srcFiles, destFiles, 0);

        if (errmsg) console.log("Failed to copy html or js files - " + errmsg);
        else {
            console.log("copying project files done", gameJson.components.display);
            this.eventChannel.publish("add-ide-log", "Running current scene...");
            Ipc.runGame(App.projectPath + "/runtime/build/debug/index.html", 
                gameJson.components.display.width,
                gameJson.components.display.height, (err) => {
                if (err) console.log("Failed to run the game - " + err);
                else {
                    console.log("the game is running");
                }
            });
        }
        

    }

    openProject() {
        console.log("open select project dialog...");
        this.dialogService.open({viewModel: SelectProjectDlg, model: 0})
            .whenClosed((response) => {
                if (!response.wasCancelled && response.output != undefined) {
                    console.log(response.output);
                    let projectName = response.output[0];
                    if (projectName) Ipc.reloadProject(projectName);
                    
                } else {
                    console.log('Give up selecting project to open');
                }
            });
    }

    createNewProject() {
        console.log("open new project dialog...");
        this.dialogService.open({viewModel: CreateNewProjectDlg, model: 0})
            .whenClosed((response) => {
                if (!response.wasCancelled && response.output != undefined) {
                    console.log(response.output);
                    let projectSetting = response.output;
                    let projectFolder = "/workspace/" + projectSetting.projectName;
                    if (Ipc.isFileExistingSync(projectFolder)) {
                        this.dialogService.open({viewModel: CommonInfoDlg, model: "A project with same name is already existing."});
                    } else {
                        //this.dialogService.open({viewModel: CommonInfoDlg, model: "Okay."});
                        Ipc.createDirSync(projectFolder);
                        Ipc.copyDirContentSync("/workspace/_sample", projectFolder, 0, []);
                        
                        let jsonstr = Ipc.readFileSync(projectFolder + "/design/explorer/scenes.json");
                        let jsonobj = JSON.parse(jsonstr);
                        jsonobj.items[0].text = projectSetting.projectName;
                        jsonstr = JSON.stringify(jsonobj, null, 4);
                        Ipc.writeFileSync(projectFolder + "/design/explorer/scenes.json", jsonstr);

                        jsonstr = Ipc.readFileSync(projectFolder + "/design/template/games/game.json");
                        jsonobj = JSON.parse(jsonstr);
                        jsonobj.title = projectSetting.projectName;
                        jsonobj.components.display.width = parseInt(projectSetting.screenWidth.toString(), 10);
                        jsonobj.components.display.height = parseInt(projectSetting.screenHeight.toString(), 10);
                        jsonstr = JSON.stringify(jsonobj, null, 4);
                        Ipc.writeFileSync(projectFolder + "/design/template/games/game.json", jsonstr);

                        Ipc.reloadProject(projectSetting.projectName);

                    }
                    
                } else {
                    console.log('Give up creating a new project');
                }
            });
    }

    

}
