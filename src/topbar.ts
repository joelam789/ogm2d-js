
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Topbar {

    gui: any = null;
    loaded: boolean = false;

    buttons = [];
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

        let mainui = document.getElementById('topbar');
        if (mainui) mainui.style.width = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('topbar');
            if (maingui) maingui.style.width = "100%";
            //if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("project-reloaded", () => {
            this.refresh();
        }));
        this.subscribers.push(this.eventChannel.subscribe("click-link-button", (btn) => {
            this.handleButtonClick(btn);
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
        if (ide && ide.topbar) {
            let items = JSON.parse(JSON.stringify(ide.topbar));
            let locate = this.i18n.getLocale().toLowerCase();
            for (let item of items) {
                if (typeof item.text == "object") item.text = item.text[locate];
            }
            this.buttons = items;
        }
    }

    handleButtonClick(btn) {
        console.log(btn);
        if (btn.group == "ide") {
            this.eventChannel.publish("ide-" + btn.name);
        }
    }

}
