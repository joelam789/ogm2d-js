
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { DirTreeDlg } from "./popups/dirtree/dirtree";

import { App } from "./app";

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

        this.subscribers.push(this.eventChannel.subscribe("stages-edit-stage-tree", () => {
            this.openStageTreeDlg();
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

    openStageTreeDlg() {

        console.log("open stages tree editor");

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

    

}
