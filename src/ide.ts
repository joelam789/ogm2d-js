
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

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
                    if (this.editorDlg) this.editorDlg("close");
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
                console.log("going to open blockly... ??");
                this.openEditorDlg("index-blockly.html#blockly", 800, 600);
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

        App.openProject("workspace/project2/main.json", () => {
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
            this.editorFrame.src = url;
        }
    }

    closeEditorDlg() {
        if (this.editorDlg && this.editorFrame) {
            this.editorDlg("close");
        }
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

        let srcDir = App.projectPath + "/runtime/project/res";
        let destDir = App.projectPath + "/runtime/build/debug";

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

        if (sceneName) {
            let rtGameFile = App.projectPath + "/runtime/build/debug/json/games/game.json";
            let gameJsonStr = await Ipc.readFileAsync(rtGameFile, false);
            if (gameJsonStr) {
                let gameJson = JSON.parse(gameJsonStr);
                if (gameJson) {
                    
                    // we should make sure all scenes were generated first ...
                    //if (!gameJson.scenes) gameJson.scenes = [sceneName]
                    //else {
                    //    let idx = gameJson.scenes.indexOf(sceneName);
                    //    if (idx < 0) gameJson.scenes.push(sceneName);
                    //    gameJson.first = sceneName;
                    //}
                    
                    // since so far we would generate only current scene , 
                    // so just let it be the only one scene of the game ...
                    gameJson.scenes = [sceneName];

                }
                await Ipc.writeFileAsync(rtGameFile, JSON.stringify(gameJson, null, 4), false);
            }
        }

        let srcFiles = [App.projectPath + "/runtime/project/index.html"];
        let destFiles = [App.projectPath + "/runtime/build/debug/index.html"];

        errmsg = await Ipc.copyFilesAsync(srcFiles, destFiles, 0);

        if (errmsg) console.log("Failed to copy html or js files - " + errmsg);
        else {
            console.log("copying project files done");
            Ipc.runGame(App.projectPath + "/runtime/build/debug/index.html", (err) => {
                if (err) console.log("Failed to run the game - " + err);
                else {
                    console.log("the game is running");
                }
            });
        }
        

    }

}