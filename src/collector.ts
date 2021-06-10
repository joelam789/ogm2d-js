import { RuntimeGenerator } from './generator';

import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { SelectSpriteTypeDlg } from './popups/sprite/select-sprite-type';
import { CreateNewSpriteDlg } from './popups/new-sprite';

import { App } from "./app";
import { Ipc } from './ipc';


@autoinject()
export class Collector {

    gui: any = null;
    loaded: boolean = false;

    groups = [];
    mainPath: string = "";
    
    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        console.log("collector - attached");

        this.gui = null;
        this.loaded = false;

        //this.gui = ($('#collector') as any).accordion.bind($('#collector'));
        //if (this.gui) this.gui();

        let mainui = document.getElementById('collector');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('collector');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("components-loaded", () => {
            this.loaded = true;
            this.gui = ($('#collector') as any).accordion.bind($('#collector'));
            if (this.gui && this.loaded) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("project-reloaded", () => {
            this.refresh();
        }));
        this.subscribers.push(this.eventChannel.subscribe("tilemaps-refresh-tilemaps", () => {
            this.eventChannel.publish("refresh-list-view");
        }));
        this.subscribers.push(this.eventChannel.subscribe("sprites-add-sprite", () => {
            //this.openSelectSpriteTypeDlg();
            this.openCreateNewSpriteDlg();
        }));
        this.subscribers.push(this.eventChannel.subscribe("create-new-sprite", (data) => {
            this.createNewSprite(data);
        }));
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    refresh() {
        let ide = App.project.containers;
        if (ide && ide.collector) {
            let items = JSON.parse(JSON.stringify(ide.collector));
            let locate = this.i18n.getLocale().toLowerCase();
            for (let item of items) {
                if (item.title && item.title.indexOf('.') > 0) item.title = this.i18n.tr(item.title);
                if (item.tools && item.tools.length > 0) {
                    for (let tool of item.tools) {
                        if (tool.text && tool.text.indexOf('.') > 0) tool.text = this.i18n.tr(tool.text);
                    }
                    item.toolsValue = JSON.stringify(item.tools);
                } else item.toolsValue = "";
                //console.log(item.toolsValue);
            }
            this.mainPath = App.projectPath;
            this.groups = items;
        }
    }

    //jsonToStr(obj) {
    //    return obj ? JSON.stringify(obj) : "";
    //}

    openSelectSpriteTypeDlg() {
        this.dialogService.open({viewModel: SelectSpriteTypeDlg})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                console.log(response.output);
            } else {
                console.log('Give up selecting sprite type to create');
            }
        });
    }

    openCreateNewSpriteDlg() {
        this.dialogService.open({viewModel: CreateNewSpriteDlg})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                console.log(response.output);

                let setting = response.output;
                let imgFile = setting.spriteImage;
                imgFile = imgFile.replace(/\\/g, "/");
                imgFile = imgFile.substring(imgFile.lastIndexOf("/") + 1);
                let imgFileExt = imgFile.substring(imgFile.lastIndexOf(".") );

                let spriteJson = RuntimeGenerator.genBasicSpriteJson();
                if (spriteJson.components && spriteJson.components.graphic) {
                    spriteJson.components.graphic.image = imgFile;
                    spriteJson.components.graphic.area  = {
                        x: setting.areaLeft,
                        y: setting.areaTop,
                        width: setting.areaWidth,
                        height: setting.areaHeight
                    }
                }

                let spriteSetting = {
                    spriteName: setting.spriteName,
                    spriteImage: setting.spriteImage,
                    areaLeft: setting.areaLeft,
                    areaTop: setting.areaTop,
                    areaWidth: setting.areaWidth,
                    areaHeight: setting.areaHeight,

                    jsonData: spriteJson,
                    jsonFile: App.projectPath + "/design/template/sprites/" + setting.spriteName + ".json",
                    imgPath: App.projectPath + "/runtime/project/res/img/" + imgFile,
                    imgDesign: App.projectPath + "/design/collector/sprites/" + setting.spriteName + ".ds" + imgFileExt,
                    imgPreview: App.projectPath + "/design/collector/sprites/" + setting.spriteName + ".pv" + imgFileExt

                }

                this.eventChannel.publish('create-new-sprite', spriteSetting);



            } else {
                console.log('Give up creating a new sprite');
            }
        });
    }

    async createNewSprite(setting) {
        let result = await Ipc.saveSpriteFileAsync(setting);
        console.log(result);
        this.eventChannel.publish("refresh-list-view");
    }

}
