import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class SelectTilesetDlg {

    message: any = null;
    multiple: boolean = false;
	tilesets: Array<any> = [];

    subscribers: Array<Subscription> = [];

    constructor(public controller: DialogController, public i18n: I18N, public eventChannel: EventAggregator) {
        //controller.settings.centerHorizontalOnly = true;
        this.subscribers = [];
    }

    activate(message) {
        this.message = message;
        if (message && message.multiple) this.multiple = true;
        
    }

    deactivate() {

    }
	
	attached() {
        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("dlg-get-tileset-list-return", (list) => {
            if (list && list.length > 0) {
                for (let item of list) this.tilesets.push({name: item, selected: false});
            }
        }));
        (window.parent as any).appEvent.publish('dlg-get-tileset-list');
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get currentSelectedTilesets() {
        let list = [];
        for (let item of this.tilesets) {
            if (item.selected) list.push(item.name);
        }
        if (list.length <= 0 && this.tilesets.length == 1 && this.multiple == false) {
            list.push(this.tilesets[0].name);
        }
        return list;
    }
	
	selectTileset(tilesetName: string) {
        for (let item of this.tilesets) {
            if (item.name == tilesetName) item.selected = !item.selected;
            else if (this.multiple == false) item.selected = false;
        }
	}
}
