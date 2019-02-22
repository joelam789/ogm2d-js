
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('tree-view')
export class TreeView {

    gui: any = null;

    @bindable treeId: string = "";
    @bindable rootName: string = "";
    @bindable signalName: string = "";
    @bindable dataSource: string = "";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.subscribers = [];

        if (this.treeId && this.treeId.length > 0) {
            this.gui = ($('#' + this.treeId) as any).tree.bind($('#' + this.treeId));
            if (this.gui) this.gui({
                onDblClick: (node) => {
                    this.eventChannel.publish("open-canvas", node.text);
                }
            });
            if (this.gui && this.rootName && this.dataSource && this.dataSource.length > 0) {
                HttpClient.getJSON(this.dataSource, null, (json) => {
                    console.log(json);
                    if (json) this.gui("loadData", json[this.rootName]);
                });
            }
        }

        let signal = this.signalName ? this.signalName : "";
        if (signal.length > 0) this.eventChannel.publish(signal);
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    private dataSourceChanged(newValue, oldValue) {
        console.log("dataSourceChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.rootName && this.dataSource && this.dataSource.length > 0) {
            HttpClient.getJSON(this.dataSource, null, (json) => {
                console.log(json);
                if (json) this.gui("loadData", json[this.rootName]);
            });
        }
        
    }

}
