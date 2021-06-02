
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";
import { Ipc } from './ipc';

@autoinject()
export class Logger {

    gui: any = null;

    bgLogMonitor: any = null;

    labelMessage: string = "Message";

    mainLogText: string = "";
    updatingBgLog = false;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.labelMessage = this.i18n.tr('logger.message');
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
        this.subscribers.push(this.eventChannel.subscribe("add-ide-log", (line) => {
            if (!this.mainLogText) this.mainLogText = line;
            else this.mainLogText += "\n" + line;
            setTimeout(() => {
                let textareaMainLog = document.getElementById('ideMainLog');
                if (textareaMainLog) textareaMainLog.scrollTop = textareaMainLog.scrollHeight;
            }, 500);
        }));

        this.updatingBgLog = false;
        if (this.bgLogMonitor != null) {
            clearInterval(this.bgLogMonitor);
            this.bgLogMonitor = null;
        }
        this.bgLogMonitor = setInterval(() => {
            if (this.updatingBgLog === true) return;
            this.updatingBgLog = true;
            Ipc.getBgLog((lines) => {
                for (let line of lines) {
                    if (!this.mainLogText) this.mainLogText = line;
                    else this.mainLogText += "\n" + line;
                }
                setTimeout(() => {
                    let textareaMainLog = document.getElementById('ideMainLog');
                    if (textareaMainLog) textareaMainLog.scrollTop = textareaMainLog.scrollHeight;
                }, 500);
                this.updatingBgLog = false;
            })
        }, 1000);
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];

        if (this.bgLogMonitor != null) {
            clearInterval(this.bgLogMonitor);
            this.bgLogMonitor = null;
        }
	}

}
