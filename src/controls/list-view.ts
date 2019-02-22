
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('list-view')
export class ListView {

    items: any = null;

    @bindable dataSource: string = "";
    @bindable signalName: string = "";
    @bindable imagePath: string = ".";
    @bindable imageTag: string = "icon";

    @bindable isDraggable: string = "false";
    @bindable isDroppable: string = "false";

    @bindable itemWidth: number = 64;
    @bindable itemHeight: number = 64;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {
        this.subscribers = [];
        let signal = this.signalName ? this.signalName : "";
        if (signal.length > 0) this.eventChannel.publish(signal);
        console.log("isDraggable: " + this.isDraggable);
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    private dataSourceChanged(newValue, oldValue) {
        console.log("dataSourceChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.dataSource && this.dataSource.length > 0) {
            HttpClient.getJSON(this.dataSource, null, (json) => {
                if (json) {
                    let count = 0;
                    this.items = [];
                    for (let item of json.items) {
                        count++;
                        item.selected = false;
                        item.width = this.itemWidth;
                        item.height = this.itemHeight;
                        item.id = "lv-img-" + this.imageTag + "-" + count;
                        item.pid = "lv-item-" + this.imageTag + "-" + count;
                        this.items.push(item);
                    }
                }
                console.log(json);
            });
        }
        
    }

    clickItem(event, itemId) {
        //console.log(event);
        for (let item of this.items) {
            if (item.pid == itemId) {
                item.selected = !item.selected;
            } else {
                item.selected = false;
            }
        }
    }

}
