
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('property-editor')
export class PropertyEditor {

    gui: any = null;

    @bindable editorId: string = "";
    @bindable rootName: string = "";
    @bindable signalName: string = "";
    @bindable dataSource: string = "";

    defaultSignal: string = "editor-loaded";

    columnSetting = [[
        {field:'name', title:'Name' , width:"49%", resizable:true, sortable:true },
        {field:'value', title:'Value' , width:"49%", resizable:true }
    ]];

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.subscribers = [];

        this.columnSetting[0][0].title = this.i18n.tr("propertygrid.name");
        this.columnSetting[0][1].title = this.i18n.tr("propertygrid.value");

        if (this.editorId && this.editorId.length > 0) {
            this.gui = ($('#' + this.editorId) as any).propertygrid.bind($('#' + this.editorId));
            if (this.gui) this.gui({
                showGroup: true,
                columns: this.columnSetting,
                onEndEdit: (index, row, changes) => {
                    this.eventChannel.publish('editor-update-ui', {source: this.editorId, data: {index: index, row: row, changes: changes}});
                }
            });
            if (this.gui && this.rootName && this.dataSource && this.dataSource.length > 0) {
                HttpClient.getJSON(this.dataSource, null, (json) => {
                    //console.log(json);
                    if (json) this.gui("loadData", json[this.rootName]);
                });
            }
        }

        let signal = this.signalName ? this.signalName : "";
        if (signal.length > 0) this.eventChannel.publish(signal, this);
        else this.eventChannel.publish(this.defaultSignal, this);
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    private dataSourceChanged(newValue, oldValue) {
        //console.log("dataSourceChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.rootName && this.dataSource && this.dataSource.length > 0) {
            HttpClient.getJSON(this.dataSource, null, (json) => {
                //console.log(json);
                if (json) this.gui("loadData", json[this.rootName]);
            });
        }
        
    }

}
