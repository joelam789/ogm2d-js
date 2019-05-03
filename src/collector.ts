
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Collector {

    gui: any = null;
    loaded: boolean = false;

    groups = [];
    mainPath: string = "";
    
    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        console.log("collector - attached");

        this.gui = null;
        this.loaded = false;

        //this.gui = ($('#collector') as any).accordion.bind($('#collector'));
        //if (this.gui) this.gui();

        let mainui = document.getElementById('collector');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('collector');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("components-loaded", () => {
            this.loaded = true;
            this.gui = ($('#collector') as any).accordion.bind($('#collector'));
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("project-reloaded", () => {
            this.refresh();
        }));
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    refresh() {
        let ide = App.project.containers;
        if (ide && ide.collector) {
            let items = JSON.parse(JSON.stringify(ide.collector));
            let locate = this.i18n.getLocale().toLowerCase();
            for (let item of items) {
                if (typeof item.title == "object") item.title = item.title[locate];
            }
            this.mainPath = App.projectPath;
            this.groups = items;
        }
    }

}
