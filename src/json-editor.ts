
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogController, DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class JsonEditorPage {

    ide: any = null;
    editor: any = null;

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        console.log("this is json editor entry...");

        this.ide = window.parent;

        // create the json editor
        let JSONEditor = (window as any).JSONEditor;
        let container = document.getElementById("jsoneditor");
        let options = {sortObjectKeys: false, modes: ["tree","code"]};
        if (JSONEditor && container) this.editor = new JSONEditor(container, options);

        // set json for testing
        const initialJson = {
            "Array": [1, 2, 3],
            "Boolean": true,
            "Null": null,
            "Number": 123,
            "String": "Hello World",
            "Object": {"a": "b", "c": "d"}
        }
        if (this.editor) {
            this.editor.set(initialJson);
            console.log(App.getUrlParamByName("file"));
            console.log(this.editor.get());
        }

        document.getElementById('top-loading').style.display = 'none';
        document.getElementById('app').style.visibility = 'visible';

        this.subscribers = [];

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-reload", () => {
            console.log("json-reload");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-save", () => {
            console.log("json-save");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-save-close", () => {
            console.log("json-save-close");
            if (this.ide) this.ide.appEvent.publish('dlg-editor-close');
        }));

        App.busy = false;
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

}
