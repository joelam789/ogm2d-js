import { RuntimeGenerator } from './generator';

import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { DirTreeDlg } from "./popups/dirtree/dirtree";
import { CommonInfoDlg } from './popups/common-info';
import { CreateNewSceneDlg } from './popups/new-scene';

import { App } from "./app";
import { Ipc } from "./ipc";
import { CommonConfirmDlg } from './popups/common-confirm';


@autoinject()
export class Explorer {

    gui: any = null;
    loaded: boolean = false;

    groups = [];
    mainPath: string = null;
    mainFile: string = null;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.gui = null;
        this.loaded = false;

        //this.gui = ($('#explorer') as any).tabs.bind($('#explorer'));
        //if (this.gui) this.gui();

        let mainui = document.getElementById('explorer');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('explorer');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("structures-loaded", () => {
            this.loaded = true;
            this.gui = ($('#explorer') as any).tabs.bind($('#explorer'));
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("project-reloaded", () => {
            this.refresh();
        }));

        this.subscribers.push(this.eventChannel.subscribe("scenes-edit-scene-tree", () => {
            this.openSceneTreeDlg();
        }));

        this.subscribers.push(this.eventChannel.subscribe("scenes-edit-scene-json", () => {
            this.openJsonEditor();
        }));

        this.subscribers.push(this.eventChannel.subscribe("scenes-edit-scene-script", () => {
            this.openScriptEditor();
        }));

        this.subscribers.push(this.eventChannel.subscribe("scenes-add-scene", () => {
            this.createNewScene();
        }));

        this.subscribers.push(this.eventChannel.subscribe("scenes-remove-scene", () => {
            this.deleteSelectedScene();
        }));

        this.subscribers.push(this.eventChannel.subscribe("tree-node-selection-reply", (evt) => {
            if (!evt || !evt.node || evt.requester != "explorer") return;
            console.log(evt);
            if (evt.query == "json") {
                let jsonFilepath = "";
                if (evt.node.id == 1) { // project
                    //let jsonFilepath = App.projectPath + "/design/template/games/" + App.projectName + ".json";
                    jsonFilepath = App.projectPath + "/design/template/games/game.json"; // must be game.json...
                } else if (evt.node.iconCls.indexOf("file") >= 0) { // scene
                    jsonFilepath = App.projectPath + "/design/template/scenes/"+ evt.node.text + "/" + evt.node.text + ".json"; // must be game.json...
                }
                if (jsonFilepath) this.eventChannel.publish('dlg-editor-open', {
                    url: "index-json.html#jsonedt?file=" + jsonFilepath,
                    width: 640, height: 480
                });
            } else if (evt.query == "script") {
                let scriptFilepath = "";
                if (evt.node.id == 1) { // project
                    //let jsonFilepath = App.projectPath + "/design/template/games/" + App.projectName + ".json";
                    scriptFilepath = App.projectPath + "/design/template/games/game.ts"; // must be game.ts...
                } else if (evt.node.iconCls.indexOf("file") >= 0) { // scene
                    scriptFilepath = App.projectPath + "/design/template/scenes/"+ evt.node.text + "/" + evt.node.text + ".ts"; // must be game.json...
                }
                if (scriptFilepath) this.eventChannel.publish('dlg-editor-open', {
                    url: "index-script.html#scriptedt?file=" + scriptFilepath,
                    width: 800, height: 600
                });
            } else if (evt.query == "delete") {
                if (evt.node.iconCls.indexOf("file") >= 0) { // scene
                    this.deleteScene(evt.node.text);
                }
                
            }
            
        }));
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    refresh() {
        if (App.projectPath && App.projectFile) {
            this.mainPath = App.projectPath;
            this.mainFile = App.projectFile;
        }
        let ide = App.project.containers;
        if (ide && ide.explorer) {
            let items = JSON.parse(JSON.stringify(ide.explorer));
            let locate = this.i18n.getLocale().toLowerCase();
            for (let item of items) {
                //if (typeof item.title == "object") item.title = item.title[locate];
                if (item.title && item.title.indexOf('.') > 0) item.title = this.i18n.tr(item.title);
                if (item.tools && item.tools.length > 0) {
                    for (let tool of item.tools) {
                        //if (typeof tool.text == "object") tool.text = tool.text[locate];
                        if (tool.text && tool.text.indexOf('.') > 0) tool.text = this.i18n.tr(tool.text);
                    }
                }
            }
            this.groups = items;
        }
    }

    openJsonEditor() {
        console.log("open scene json editor");

        //Ipc.runJsonEditor("scene.json", (err) => {
        //    if (err) console.error(err);
        //});

        //let jsonFilepath = "scene.json";
        //this.eventChannel.publish('dlg-editor-open', {
        //    url: "index-json.html#jsonedt?file=" + jsonFilepath,
        //    width: 640, height: 480
        //});

        this.eventChannel.publish('tree-node-selection-query', {
            query: "json",
            sender: "explorer"
        });

    }

    openScriptEditor() {
        console.log("open scene script editor");
        //let scriptFilepath = "scene.ts";
        //this.eventChannel.publish('dlg-editor-open', {
        //    url: "index-script.html#scriptedt?file=" + scriptFilepath,
        //    width: 800, height: 600
        //});

        this.eventChannel.publish('tree-node-selection-query', {
            query: "script",
            sender: "explorer"
        });
    }

    deleteSelectedScene() {
        this.eventChannel.publish('tree-node-selection-query', {
            query: "delete",
            sender: "explorer"
        });
    }

    openSceneTreeDlg() {

        console.log("open scenes tree editor");

        let param = {
            file: "",
            folder: "",
            tools: App.project.dialogs.dirtree.tools
        };
        this.dialogService.open({viewModel: DirTreeDlg, model: param })
        .whenClosed((response) => {
            if (!response.wasCancelled) {
                
                
                console.log('Finish editing tree');
            } else {
                console.log('Give up editing tree');
            }
        });

    }


    createNewScene() {
        console.log("open new scene dialog...");
        this.dialogService.open({viewModel: CreateNewSceneDlg, model: 0})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output != undefined) {
                console.log(response.output);
                let newSceneName = response.output;
                let sceneJsonFilepath = App.projectPath + "/design/template/scenes/" + newSceneName + "/" + newSceneName + ".json";
                if (Ipc.isFileExistingSync(sceneJsonFilepath)) {
                    this.dialogService.open({viewModel: CommonInfoDlg, model: "A scene with same name is already existing."});
                } else {
                    //this.dialogService.open({viewModel: CommonInfoDlg, model: "Okay."});
                    //Ipc.createDirSync(App.projectPath + "/design/template/scenes/" + newSceneName);
                    
                    let jsonobj = RuntimeGenerator.genBasicSceneJson();
                    let jsonstr = JSON.stringify(jsonobj, null, 4);
                    Ipc.writeFileSync(sceneJsonFilepath, jsonstr);

                    let dsJsonPath = App.projectPath + "/design/explorer/scenes/" + newSceneName + ".json";
                    let dsJsonObj = {
                        version: "3.6.4",
                        objects: []
                    }
                    Ipc.writeFileSync(dsJsonPath, JSON.stringify(dsJsonObj, null, 4));

                    let treeJsonPath = App.projectPath + "/design/explorer/scenes.json";
                    jsonstr = Ipc.readFileSync(treeJsonPath);
                    let treeJsonObj = JSON.parse(jsonstr);
                    treeJsonObj.items[0].children.push({
                        text: newSceneName,
                        iconCls: "my-icon-file",
                        attributes: 
                        {
                            data: "design/explorer/scenes/" + newSceneName + ".json"
                        }
                    });
                    jsonstr = JSON.stringify(treeJsonObj, null, 4);
                    Ipc.writeFileSync(treeJsonPath, jsonstr);

                    this.eventChannel.publish('tree-content-refresh', {
                        treeId: "tree-scenes"
                    });

                }
                
            } else {
                console.log('Give up creating a new scene');
            }
        });
    }

    removeLeafFromTree(rootNode, nodeText) {
        if (rootNode.children && rootNode.children.length > 0) {
            for (let i = 0; i<rootNode.children.length; i++) {
                let treeNode = rootNode.children[i];
                if (treeNode.children) this.removeLeafFromTree(treeNode, nodeText);
                else if (treeNode.iconCls == "my-icon-file") {
                    if (treeNode.text == nodeText) {
                        rootNode.children.splice(i, 1);
                        return;
                    }
                }
            }
        }
    }

    deleteScene(sceneName: string) {
        this.dialogService.open({viewModel: CommonConfirmDlg, model: this.i18n.tr("confirm.remove-selected-scene")})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output && response.output == 'yes') {
                console.log("remove scene - ", sceneName);
                let sceneJsonFileDir = App.projectPath + "/design/template/scenes/" + sceneName;
                Ipc.deleteDirSync(sceneJsonFileDir);
                let dsJsonPath = App.projectPath + "/design/explorer/scenes/" + sceneName + ".json";
                Ipc.deleteFilesSync([dsJsonPath]);
                let treeJsonPath = App.projectPath + "/design/explorer/scenes.json";
                let jsonstr = Ipc.readFileSync(treeJsonPath);
                let treeJsonObj = JSON.parse(jsonstr);
                this.removeLeafFromTree(treeJsonObj.items[0], sceneName);
                jsonstr = JSON.stringify(treeJsonObj, null, 4);
                Ipc.writeFileSync(treeJsonPath, jsonstr);
                this.eventChannel.publish('close-canvas', sceneName);
                this.eventChannel.publish('tree-content-refresh', {
                    treeId: "tree-scenes"
                });
            }
        });
    }
    

}
