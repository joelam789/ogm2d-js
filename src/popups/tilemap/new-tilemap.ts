import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

@autoinject
export class NewTilemapDlg {

    message: any = null;
    setting: any = {
        name: "tilemap1",
        tilesetNames: [],
        tileWidth: 32,
        tileHeight: 32,
        columnCount: 20, // width = 32 * 20 = 640
        rowCount: 15,    // height = 32 * 15 = 480
        bgcolor: "#000000", // black
        bgcolorOpacity: 0.0 // no bg color by default
    };

    tilesets: Array<any> = [];

    tilesetNames = [];
    selectedTilesetNames = [];

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
        this.subscribers.push(this.eventChannel.subscribe("dlg-get-tileset-list-return", (list) => {
            if (list && list.length > 0) {
                for (let item of list) this.tilesetNames.push(item);
            }
        }));
        (window.parent as any).appEvent.publish('dlg-get-tileset-list');
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get currentSetting() {
        this.setting.tilesetNames = [];
        this.setting.tilesetNames.push(...this.selectedTilesetNames);
        if (this.setting.tilesetNames.length <= 0 && this.tilesetNames.length > 0) {
            this.setting.tilesetNames.push(this.tilesetNames[0]);
        }
        let result = JSON.parse(JSON.stringify(this.setting));
        result.tileWidth = parseInt(this.setting.tileWidth);
        result.tileHeight = parseInt(this.setting.tileHeight);
        result.columnCount = parseInt(this.setting.columnCount);
        result.rowCount = parseInt(this.setting.rowCount);
        let alpha = Math.round(0xff * parseFloat(result.bgcolorOpacity)).toString(16);
        if (alpha.length == 1) alpha = "0" + alpha;
        result.bgcolor = (result.bgcolor + alpha).toLowerCase();
        delete result.bgcolorOpacity;
        return result;
    }

    selectTileset(tilesetName: string) {
        for (let item of this.tilesets) {
            if (item.name == tilesetName) item.selected = !item.selected;
        }
	}

}
