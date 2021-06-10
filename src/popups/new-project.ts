import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { DialogController } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

@autoinject
export class CreateNewProjectDlg {

    message: any = null;

    subscribers: Array<Subscription> = [];

    projectName = 'project1';

    screenWidth = 640;
    screenHeight= 480;


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
	}

    detached() {
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get projectSetting() {
        return {
            projectName: this.projectName,
            screenWidth: parseInt(this.screenWidth.toString(), 10),
            screenHeight: parseInt(this.screenHeight.toString(), 10)
        }
    }
	
}
