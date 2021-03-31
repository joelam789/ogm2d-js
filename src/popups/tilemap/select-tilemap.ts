import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class SelectTilemapDlg {

    message: any = null;
	tilemaps: Array<any> = [];

    subscribers: Array<Subscription> = [];

    constructor(public controller: DialogController, public i18n: I18N, public eventChannel: EventAggregator) {
        //controller.settings.centerHorizontalOnly = true;
        this.subscribers = [];
    }

    activate(message) {
        this.message = message;
        
    }

    deactivate() {

    }
	
	attached() {
        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("dlg-get-tilemap-list-return", (list) => {
            if (list && list.length > 0) {
                for (let item of list) this.tilemaps.push({name: item, selected: false});
            }
        }));
        (window.parent as any).appEvent.publish('dlg-get-tilemap-list');
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get currentSelectedTilemap() {
        let list = [];
        for (let item of this.tilemaps) {
            if (item.selected) list.push(item.name);
        }
        if (list.length <= 0 && this.tilemaps.length == 1) {
            list.push(this.tilemaps[0].name);
        }
        return list;
    }
	
	selectTilemap(tilemapName: string) {
        for (let item of this.tilemaps) {
            if (item.name == tilemapName) item.selected = !item.selected;
            else item.selected = false;
        }
	}
}
