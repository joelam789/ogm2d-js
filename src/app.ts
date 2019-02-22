
import { autoinject } from 'aurelia-framework';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Router, RouterConfiguration } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { HttpClient } from "./http-client";

@autoinject()
export class App {

	router: Router;

	static busy: boolean = false;
	static page: string = "app";
	static lang: string = "en";
	static theme: string = "default"; // default theme should be loaded first
	static config: any = (window as any).appConfig;

	private static _project: any = null;
	private static _projectPath: string = null;
	private static _projectFile: string = null;

	constructor(public i18n: I18N, public eventChannel: EventAggregator, public dialogService: DialogService) {
		(window as any).appEvent = this.eventChannel;
		App.busy = true; // start to load stuff
	}

	attached(argument) {
		// load lang
		App.lang = this.i18n.getLocale();
		App.loadAppLanguageScript();
	}

	detached(argument) {
		// Invoked when component is detached from the dom
	}

	configureRouter(config: RouterConfiguration, router: Router) {
		config.title = 'Editor';
		config.map([
			{ route: ['', 'ide'], moduleId: 'ide', name: 'ide', title: 'IDE'},
			{ route: ['blockly'], moduleId: 'blockly', name: 'blockly', title: 'Blockly'}
		]);
		this.router = router;
	}

	static get project(): any {
		return App._project;
	}

	static get projectPath(): string {
		return App._projectPath;
	}

	static get projectFile(): string {
		return App._projectFile;
	}

	get currentPage(): string {
		if (this.router.currentInstruction) {
			App.page = this.router.currentInstruction.config.name;
		}
		return App.page;
	}

	get isBusy(): boolean {
		return App.busy;
	}

	openPage(page: string) {
		this.router.navigate(page);
	}

	changeLang(lang: string) {
		if (App.lang == lang) return;
        this.i18n.setLocale(lang)
        .then(() => {
            App.lang = this.i18n.getLocale();
			console.log(App.lang);
			App.loadAppLanguageScript();
        });
	}

	static loadAppLanguageScript() {
        let langCode = App.lang;
        if (langCode == "zh-cn") langCode = "zh_CN";
        else if (langCode == "zh-tw" || langCode == "zh-hk") langCode = "zh_TW";
        else if (langCode == "sv-se") langCode = "sv_SE";
        else if (langCode == "pt-br") langCode = "pt_BR";
        else langCode = langCode.substr(0, 2);
        // load easyui i18n
        $.getScript('js/easyui/locale/easyui-lang-' + langCode + '.js');
	}
	
	static changeTheme(themeName: string) {
		if (themeName == App.theme) return;
		// load easyui theme
		let url = "css/easyui/themes/" + themeName + "/easyui.css"
		let link = $("link[href*='easyui.css']");
		if (link.length <= 0) {
			$("head").append("<link>");
			let css = $("head").children(":last");
			css.attr({
				rel:  "stylesheet",
				type: "text/css",
				href: url
			});
		} else {
			link.attr("href", url);
		}
		App.theme = themeName;
	}

	static openProject(url: string, callback?: (project?: any)=>void) {
		HttpClient.getJSON(url, null, (json) => {
			console.log(json);
			if (json) {
				App._project = json;
				App._projectPath = url.substring(0, url.lastIndexOf('/'));
				App._projectFile = url.substr(url.lastIndexOf('/') + 1);
				App.config.projectPath = App._projectPath;
				App.config.projectFile = App._projectFile;
				(window as any).appConfig = App.config;
				if (callback) callback(json);
			}
		});
	}
	
	
}
