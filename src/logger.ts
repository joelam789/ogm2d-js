
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Logger {

    gui: any = null;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {
        this.gui = ($('#logger') as any).tabs.bind($('#logger'));
        if (this.gui) this.gui();

        let mainui = document.getElementById('logger');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('logger');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui) this.gui();
        }));
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
	}

}
