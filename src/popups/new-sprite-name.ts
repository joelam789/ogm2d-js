import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class CreateNewSpriteNameDlg {

    message: any = null;

    subscribers: Array<Subscription> = [];

    spriteName = 'sprite1';

    constructor(public controller: DialogController, public binding: BindingEngine, public i18n: I18N, public eventChannel: EventAggregator) {
        //controller.settings.centerHorizontalOnly = true;
        this.subscribers = [];
    }

    activate(message) {
        this.message = message;
        this.spriteName = message;
        
    }

    deactivate() {

    }
	
	attached() {
        this.subscribers = [];
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
	
}
