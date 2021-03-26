
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router, RouterConfiguration } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

@autoinject()
export class TilemapApp {

	router: Router;

	ide: any = null;
    editor: any = null;

	subscribers: Array<Subscription> = [];

	static busy: boolean = false;
	static page: string = "app";
	static lang: string = "en";

	constructor(public i18n: I18N, public eventChannel: EventAggregator, public dialogService: DialogService) {
		(window as any).appEvent = this.eventChannel;
		TilemapApp.busy = true; // start to load stuff
		this.subscribers = [];
	}

	attached(argument) {
		// Invoked once the component is attached to the DOM...

		console.log("this is tilemap editor entry...");

        this.ide = window.parent;
		TilemapApp.lang = this.i18n.getLocale();

		this.subscribers = [];

        this.subscribers.push(this.eventChannel.subscribe("dlg-tilemap-open", () => {
            console.log("tilemap-open");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-tilemap-update", () => {
            console.log("tilemap-update");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-tilemap-save-close", () => {
            console.log("tilemap-save-close");
            if (this.ide) this.ide.appEvent.publish('dlg-editor-close');
        }));

        TilemapApp.busy = false;
	}

	detached(argument) {
		// Invoked when component is detached from the dom
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
	}

	configureRouter(config: RouterConfiguration, router: Router) {
		config.title = 'Editor';
		config.map([
			{ route: ['', 'tilemap-home'], moduleId: 'tilemap-home', name: 'tilemap-home', title: 'Home'},
			{ route: 'tileset-editor', moduleId: 'tileset-editor', name: 'tileset', title: 'Tileset'},
			{ route: 'tilemap-editor', moduleId: 'tilemap-editor', name: 'tilemap', title: 'Tilemap'}
		]);
		this.router = router;
	}

	get currentPage(): string {
		if (this.router.currentInstruction) {
			TilemapApp.page = this.router.currentInstruction.config.name;
		}
		return TilemapApp.page;
	}

	get isBusy(): boolean {
		return TilemapApp.busy;
	}

	createNewFile() {
		//this.eventChannel.publish(new UI.CreateNewFile(""));
		console.log("createNewFile()");
	}

	openFile() {
		//this.eventChannel.publish(new UI.OpenFile(""));
		console.log("openFile()");
	}

	saveFile() {
		//this.eventChannel.publish(new UI.SaveFile(""));
		console.log("saveFile()");
	}

	saveFileAs() {
		//this.eventChannel.publish(new UI.SaveFileAs(""));
		console.log("saveFileAs()");
	}

	openPage(page: string) {
		this.router.navigate(page);
	}

	changeLang(lang: string) {
        this.i18n.setLocale(lang)
        .then(() => {
            TilemapApp.lang = this.i18n.getLocale();
            console.log(TilemapApp.lang);
        });
	}
	
	
}
