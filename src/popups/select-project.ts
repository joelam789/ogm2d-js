import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class SelectProjectDlg {

    message: any = null;
    multiple: boolean = false;
	datalist: Array<any> = [];

    subscribers: Array<Subscription> = [];

    constructor(public controller: DialogController, public i18n: I18N, public eventChannel: EventAggregator) {
        //controller.settings.centerHorizontalOnly = true;
        this.subscribers = [];
    }

    activate(message) {
        this.message = message;
        if (message && message.multiple === true) this.multiple = true;
        
    }

    deactivate() {

    }
	
	attached() {
        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("dlg-get-project-list-return", (list) => {
            if (list && list.length > 0) {
                for (let item of list) this.datalist.push({name: item, selected: false});
            }
        }));
        (window.parent as any).appEvent.publish('dlg-get-project-list');
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get currentSelectedItems() {
        let list = [];
        for (let item of this.datalist) {
            if (item.selected) list.push(item.name);
        }
        if (list.length <= 0 && this.datalist.length == 1 && this.multiple == false) {
            list.push(this.datalist[0].name);
        }
        return list;
    }
	
	selectItem(itemName: string) {
        for (let item of this.datalist) {
            if (item.name == itemName) item.selected = !item.selected;
            else if (this.multiple == false) item.selected = false;
        }
	}
	
}
