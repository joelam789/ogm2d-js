
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogController, DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";
import { HttpClient } from "./http-client";

@autoinject()
export class BlocklyPage {

    ide: any = window.parent;
    blockly: any = (window as any).Blockly;
    workspace: any = null;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        console.log(this.ide.appConfig);

        if (this.blockly) this.workspace = this.blockly.inject('blocklyDiv', {toolbox: document.getElementById('toolbox')});

        let defaultBlocks = document.getElementById('blocklyDefault');
        if (this.blockly && this.workspace && defaultBlocks) {
            console.log("load blocks");
            this.blockly.Xml.domToWorkspace(defaultBlocks, this.workspace);
        }

        document.getElementById('top-loading').style.display = 'none';
        document.getElementById('app').style.visibility = 'visible';

        this.subscribers = [];

        this.subscribers.push(this.eventChannel.subscribe("blockly-reload", () => {
            console.log("blockly-reload");
        }));

        this.subscribers.push(this.eventChannel.subscribe("blockly-save", () => {
            console.log("blockly-save");
        }));

        this.subscribers.push(this.eventChannel.subscribe("blockly-save-close", () => {
            console.log("blockly-save-close");
            this.ide.appEvent.publish('blockly-close');
        }));

        App.busy = false;
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

}
