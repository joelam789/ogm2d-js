
import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { I18N } from 'aurelia-i18n';

import { App } from "../../app";

@autoinject
export class DirTreeDlg {

    sourceFile = "";
    targetFolder = "";
    toolButtons = [];

    treeRef: any;
    listRef: any;

    subscribers: Array<Subscription> = [];

    constructor(public i18n: I18N, public eventChannel: EventAggregator, public controller: DialogController) {
        //controller.settings.centerHorizontalOnly = true;
        this.subscribers = [];
    }

    activate(param) {
        this.sourceFile = param.file;
        this.targetFolder = param.folder;
        for (let tool of param.tools) {
            if (tool.text && tool.text.indexOf('.') > 0) tool.text = this.i18n.tr(tool.text);
        }
        this.toolButtons = param.tools;
        //this.treeRef.dataSource = App.projectPath +  "/design/explorer/stages.json";
        console.log("tree dlg activate");
    }

    deactivate() {
        console.log("tree dlg deactivate");
    }

    attached(argument) {

        this.subscribers = [];

        this.subscribers.push(this.eventChannel.subscribe("dirtree-tree-ready", () => {
            this.initDirTree();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dirtree-list-ready", () => {
            this.initFileList();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dirtree-move-folder", () => {
            this.moveFolder();
        }));

        this.subscribers.push(this.eventChannel.subscribe("dirtree-move-files", () => {
            this.moveFiles();
        }));

        console.log("tree dlg attached");
    }

    detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
        console.log("tree dlg detached");
    }

    initDirTree() {
        this.treeRef.dataSource = App.projectPath +  "/design/explorer/stages.json";
    }

    initFileList() {
        let map = new Map<string, string>();
        map.set("stage1", "stage1.json");
        map.set("stage2", "stage2.json");
        this.listRef.loadData(map);
    }
    
    moveFolder() {
        let treeNode = this.treeRef.getSelected();
        console.log(treeNode);
    }

    moveFiles() {
        let rows = this.listRef.getSelected();
        console.log(rows);
    }

}
