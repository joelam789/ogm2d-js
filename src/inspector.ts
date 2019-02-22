
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Inspector {

    gui: any = null;
    loaded: boolean = false;

    tabs = [];
    mainPath: string = null;

    editors = new Map<string, any>();

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.gui = null;
        this.loaded = false;

        //this.gui = ($('#inspector') as any).tabs.bind($('#inspector'));
        //if (this.gui) this.gui();

        let mainui = document.getElementById('inspector');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('inspector');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("editor-loaded", (edt) => {
            this.editors.set(edt.editorId, edt);
        }));
        this.subscribers.push(this.eventChannel.subscribe("editors-loaded", (edt) => {
            this.editors.set(edt.editorId, edt);
            this.loaded = true;
            this.gui = ($('#inspector') as any).tabs.bind($('#inspector'));
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("project-reloaded", () => {
            this.refresh();
        }));

        this.subscribers.push(this.eventChannel.subscribe("ui-update-editor", (evt) => {
            //console.log(evt);
            //console.log(this.editors);
            let edt = this.editors.get(evt.target);
            if (edt) {
                let rows = edt.gui("getData").rows;
                let fields = Object.keys(evt.data);
                for (let row of rows) {
                    if (fields.indexOf(row.name) >= 0)
                        row.value = evt.data[row.name].toString();
                }
                //console.log(rows);
                edt.gui("loadData", rows);
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
        }
        let project = App.project;
        if (project && project.inspector) {
            let items = JSON.parse(JSON.stringify(project.inspector));
            let locate = this.i18n.getLocale().toLowerCase();
            for (let item of items) {
                if (typeof item.title == "object") item.title = item.title[locate];
            }
            this.tabs = items;
        }
    }

}
