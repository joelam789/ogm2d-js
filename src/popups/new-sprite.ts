import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class CreateNewSpriteDlg {

    message: any = null;

    subscribers: Array<Subscription> = [];

    spriteName = 'sprite';

    spriteImage = '';

    areaLeft = 0;
    areaTop = 0;
    areaWidth = 32;
    areaHeight = 32;

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
        this.subscribers.push(this.eventChannel.subscribe("dlg-select-image-with-size-return", (data) => {
            //console.log(data);
            if (data) {
                this.spriteImage = data.filepath;
                this.areaLeft = 0;
                this.areaTop = 0;
                this.areaWidth = data.width;
                this.areaHeight = data.height;
            }
        }));
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    openSelectFileDlg() {
        (window.parent as any).appEvent.publish('dlg-select-image-with-size');
    }

    get spriteSetting() {
        return {
            spriteName: this.spriteName,
            spriteImage: this.spriteImage,
            areaLeft: parseInt(this.areaLeft.toString(), 10),
            areaTop: parseInt(this.areaTop.toString(), 10),
            areaWidth: parseInt(this.areaWidth.toString(), 10),
            areaHeight: parseInt(this.areaHeight.toString(), 10)
        }
    }
	
}
