
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { Ipc } from "../ipc";

import { HttpClient } from "../http-client";

@autoinject()
@customElement('list-view')
export class ListView {

    items: any = null;
    tools: any = null;

    @bindable dataSource: string = "";
    @bindable imagePath: string = ".";

    @bindable sourcePath: string = "";
    @bindable designSign: string = ".ds.";
    @bindable previewSign: string = ".pv.";

    @bindable signalName: string = "";
    @bindable imageTag: string = "icon";

    @bindable isMovable: string = "true";
    @bindable isDraggable: string = "false";
    @bindable isDroppable: string = "false";

    @bindable itemWidth: number = 64;
    @bindable itemHeight: number = 64;

    @bindable toolsValue: string = "";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {
        this.subscribers = [];
        let signal = this.signalName ? this.signalName : "";
        if (signal.length > 0) this.eventChannel.publish(signal);
        //console.log("isDraggable: " + this.isDraggable);
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    genRandomName(length) {
        const mychars        = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = mychars.length;
        let result = [];
        for (let i = 0; i < length; i++) {
            result.push(mychars.charAt(Math.floor(Math.random() * charactersLength)));
        }
        return result.join('');
    }

    private toolsValueChanged(newValue, oldValue) {
        //console.log(oldValue);
        //console.log(newValue);
        if (newValue) this.tools = JSON.parse(newValue);
        //console.log(this.tools);
    }
    
    private dataSourceChanged(newValue, oldValue) {
        //console.log("dataSourceChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.dataSource && this.dataSource.length > 0) {
            HttpClient.getJSON(this.dataSource, null, (json) => {
                if (json) {
                    let count = 0;
                    this.items = [];
                    for (let item of json.items) {
                        count++;
                        item.selected = false;
                        item.movable = this.isMovable;
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

    private sourcePathChanged(newValue, oldValue) {
        //console.log("sourcePathChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.sourcePath && this.sourcePath.length > 0) {
            Ipc.getDirTree(this.sourcePath, (paths) => {
                //console.log(paths);
                let count = 0;
                //let newitems = [];
                this.items = [];
                if (paths) for (let filepath of paths) {
                    let idx = filepath.indexOf(this.previewSign);
                    if (idx > 0) {
                        count++;
                        let item = { 
                            name: filepath.substring(filepath.lastIndexOf('/') + 1, idx),
                            image: filepath,
                            movable: this.isMovable,
                            selected: false,
                            width: this.itemWidth,
                            height: this.itemHeight,
                            id: "lv-img-" + this.imageTag + "-" + count,
                            pid: "lv-item-" + this.imageTag + "-" + count
                        }
                        //newitems.push(item);
                        this.items.push(item);
                    }
                }
                //console.log(newitems);
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
