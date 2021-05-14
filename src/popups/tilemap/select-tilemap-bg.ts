import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class SelectTilemapBgDlg {

    message: any = null;

    subscribers: Array<Subscription> = [];

    imageFilepath = '';

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
        this.subscribers.push(this.eventChannel.subscribe("dlg-select-image-file-return", (imgpath) => {
            console.log(imgpath);
            if (imgpath && imgpath.length > 0) this.imageFilepath = imgpath;
        }));
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    openSelectFileDlg() {
        (window.parent as any).appEvent.publish('dlg-select-image-file');
    }
	
}
