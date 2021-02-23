
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('data-list')
export class DataList {

    gui: any = null;

    @bindable listId: string = "";
    @bindable signalName: string = "";

    @bindable isPlain: string = "";
    @bindable showCheckbox: string = "";
    @bindable isSingleSelect: string = "";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.subscribers = [];

        if (this.listId && this.listId.length > 0) {
            console.log("listId", this.listId);
            this.gui = ($('#' + this.listId) as any).datalist.bind($('#' + this.listId));
            if (this.gui) this.gui({
                fit: true, 
                plain: this.isPlain == "true",
                checkbox: this.showCheckbox == "true",
                singleSelect: this.isSingleSelect == "true",
                valueField:"value", textField:"text"
            });

            let signal = this.signalName ? this.signalName : "";
            if (signal.length > 0) this.eventChannel.publish(signal);
        }
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    loadData(data: Map<string, string>) {
        if (!this.gui) return;
        let rows = [];
        data.forEach((value, key, map) => {
            rows.push({value:key, text:value});
        });
        this.gui('loadData', rows);
    }

    getSelected() {
        if (!this.gui) return null;
        if (this.showCheckbox === "true") {
            return this.gui('getChecked');
        }
        return this.gui('getSelections');
    }


}
