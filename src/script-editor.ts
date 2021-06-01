
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

    isClosing: boolean = false;
    scriptFilepath: string = "";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    activate(parameters, routeConfig) {

        console.log("activate script editor!");
        this.isClosing = false;

    }

    attached(argument) {

        console.log("this is script editor entry...");

        let tscript = `

        export class SceneStage1 {
    
            onInit(scene) {
                console.log("on scene init: " + scene.name);
            }
        
            onActivate(scene) {
        
                console.log("on scene activate: " + scene.name);
        
                let profile = scene.game.components.shooting;
                profile.progress = 0;
                profile.score = 0;
                profile.lives = 2;
        
                scene.reset();
        
                scene.systems["stage"].setPos(0, 6688);
                scene.systems["stage"].scroll(0, -1);
                scene.sprites["plot1"].active = true;
        
            }
        }

        `;

        this.ide = window.parent;

        // create editor
        let AceEditor = (window as any).ace;
        let container = document.getElementById("scripteditor");
        if (AceEditor && container) {
            
            this.editor = AceEditor.edit(container.id);
            //this.editor.session.setValue(tscript); // set script for testing

            //let ret = this.editor.find("return x");
            //console.log(ret);
            ////let selection = this.editor.getSelectionRange();
            ////console.log(selection);
            //if (ret) this.editor.gotoLine(ret.start.row + 1, ret.end.column + 1, true);
            //else console.log("not found");

        }

        // set editor style
        if (this.editor) {
            this.editor.setTheme("ace/theme/textmate");
            this.editor.session.setMode("ace/mode/typescript");
        }

        document.getElementById('top-loading').style.display = 'none';
        document.getElementById('app').style.visibility = 'visible';

        this.subscribers = [];

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-reload", () => {
            console.log("script-reload");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-save", () => {
            console.log("script-save");
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-editor-save-close", () => {
            console.log("script-save-close");
            if (this.editor && this.scriptFilepath) {
                this.isClosing = true;
                let setting = {
                    filepath: this.scriptFilepath,
                    content: this.editor.session.getValue()
                };
                //console.log(setting);
                (window.parent as any).appEvent.publish('dlg-write-text-file', setting);
            }
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-read-script-file-return", (content) => {
            if (this.editor && content) {
                this.editor.session.setValue(content);
            }
        }));

        this.subscribers.push(this.eventChannel.subscribe("dlg-write-text-file-return", (content) => {
            if (this.isClosing === true && this.ide) {
                this.ide.appEvent.publish('dlg-editor-close');
                this.isClosing = false;
            }
        }));

        if (AceEditor && container) {
            this.scriptFilepath = App.getUrlParamByName("file");
            console.log(this.scriptFilepath);
            let isForGame = this.scriptFilepath.indexOf("/games/") > 0;
            let isForSceneSprite = this.scriptFilepath.indexOf("/scenes/") > 0 && this.scriptFilepath.indexOf("/sprites/") > 0;
            let isForScene = !isForSceneSprite && this.scriptFilepath.indexOf("/scenes/") > 0;
            let isForSprite = !isForSceneSprite && this.scriptFilepath.indexOf("/sprites/") > 0;
            let defaultClassName = "Class1";
            if (isForGame) defaultClassName = "Game1";
            else if (isForScene) defaultClassName = "Scene1";
            else if (isForSceneSprite || isForSprite) defaultClassName = "Sprite1";
            let readSetting = {
                filepath: this.scriptFilepath,
                classname: defaultClassName
            };
            (window.parent as any).appEvent.publish('dlg-read-script-file', readSetting);
        }

        App.busy = false;
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

}
