
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
	static entry: string = "index.html";
	static config: any = (window as any).appConfig;

	private static _project: any = null;
	private static _projectPath: string = null;
	private static _projectFile: string = null;
	private static _projectName: string = null;

	//private static _sceneFilepathMap: Map<string, string> = new Map<string, string>();

	constructor(public i18n: I18N, public eventChannel: EventAggregator, public dialogService: DialogService) {
		(window as any).appEvent = this.eventChannel;
		App.busy = true; // start to load stuff
		let url = window.location.pathname;
		let idx = url.lastIndexOf('/');
		if (idx >= 0) App.entry = url.substring(idx+1);
		console.log("App Entry - " + App.entry);
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
			{ route: ['blockly'], moduleId: 'blockly', name: 'blockly', title: 'Blockly'},
			{ route: ['jsonedt'], moduleId: 'json-editor', name: 'json-editor', title: 'Json Editor'},
			{ route: ['scriptedt'], moduleId: 'script-editor', name: 'script-editor', title: 'Script Editor'},
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

	static get projectName(): string {
		return App._projectName;
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

	get isDefaultEntry(): boolean {
		return App.entry == "index.html";
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
		if (langCode == "zh") {
			let dfLang = navigator.language;
			if (dfLang && dfLang.toString().toLowerCase().startsWith("zh")) {
				langCode = dfLang.toString().toLowerCase();
			} else langCode = "zh-cn";
		}
		if (langCode == "zh-cn") langCode = "zh_CN";
        else if (langCode == "zh-tw" || langCode == "zh-hk") langCode = "zh_TW";
        else if (langCode == "sv-se") langCode = "sv_SE";
        else if (langCode == "pt-br") langCode = "pt_BR";
        else langCode = langCode.substr(0, 2);
        // load easyui i18n
        //$.getScript('js/easyui/locale/easyui-lang-' + langCode + '.js');
		$.ajax({ 
			url: 'js/easyui/locale/easyui-lang-' + langCode + '.js', 
			async: false, dataType: "script",
		});
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
				App._projectName = json.name ? json.name : "project";
				App.config.projectPath = App._projectPath;
				App.config.projectFile = App._projectFile;
				App.config.projectName = App._projectName;
				(window as any).appConfig = App.config;
				if (callback) callback(json);
			}
		});
	}

	static getUrlParamByName(name, url = null) {
		if (!url) url = window.location.href;
		name = name.replace(/[\[\]]/g, "\\$&");
		let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
		let results = regex.exec(url);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}

	//static getSceneFilepath(sceneName: string): string {
	//	if (this._sceneFilepathMap.has(sceneName)) return this._sceneFilepathMap.get(sceneName);
	//	return "";
	//}
	//static setSceneFilepath(sceneName: string, filepath: string) {
	//	if (sceneName && filepath) this._sceneFilepathMap.set(sceneName, filepath);
	//}

	
}
