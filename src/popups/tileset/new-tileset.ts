import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class NewTilesetDlg {

    message: any = null;
    subscribers: Array<Subscription> = [];
    setting: any = {
        name: "tileset1",
        tileWidth: 32,
        tileHeight: 32,
        image: ""
    };

    constructor(public controller: DialogController, public binding: BindingEngine, public i18n: I18N, public eventChannel: EventAggregator) {
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
        this.subscribers.push(this.eventChannel.subscribe("dlg-select-image-file-return", (imgpath) => {
            console.log(imgpath);
            if (imgpath && imgpath.length > 0) this.setting.image = imgpath;
        }));
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get currentSetting() {
        let result = JSON.parse(JSON.stringify(this.setting));
        result.tileWidth = parseInt(this.setting.tileWidth);
        result.tileHeight = parseInt(this.setting.tileHeight);
        return result;
    }

    openSelectFileDlg() {
        (window.parent as any).appEvent.publish('dlg-select-image-file');
    }
}
