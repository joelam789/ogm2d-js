
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('link-button')
export class LinkButton {

    gui: any = null;

    @bindable linkId: string = "";
    @bindable buttonName: string = "btn1";
    @bindable buttonText: string = "btn1";
    @bindable buttonGroup: string = "ide";

    @bindable isPlain: string = "";
    @bindable iconCss: string = "";
    @bindable iconAlign: string = "top";
    @bindable buttonSize: string = "large";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.subscribers = [];

        if (this.linkId && this.linkId.length > 0) {
            this.gui = ($('#' + this.linkId) as any).linkbutton.bind($('#' + this.linkId));
            if (this.gui) this.gui({
                iconCls: this.iconCss,
                plain: this.isPlain && this.isPlain == "true",
                size: this.buttonSize,
                iconAlign: this.iconAlign,
                onClick: () => {
                    this.eventChannel.publish("click-link-button", {
                        name: this.buttonName,
                        group: this.buttonGroup
                    });
                }
            });
        }
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
}
