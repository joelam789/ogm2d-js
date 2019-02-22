
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Ide {

    gui: any = null;

    blocklyDlg: any = null;
    blocklyFrame: any = null;

    centerSettings: string = "region:'center',title:'Design'";
    eastSettings: string = "region:'east',title:'Inspector',split:true";
    westSettings: string = "region:'west',title:'Resource',split:true";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    activate(parameters, routeConfig) {

        this.centerSettings = "region:'center',title:'" + this.i18n.tr("ide.title.center") + "'";
        this.eastSettings = "region:'east',title:'" + this.i18n.tr("ide.title.east") + "',split:true";
        this.westSettings = "region:'west',title:'" + this.i18n.tr("ide.title.west") + "',split:true";

    }

    attached(argument) {
        document.getElementById('top-loading').style.display = 'none';

        this.blocklyFrame = document.getElementById('blockly-window');

        this.blocklyDlg = ($('#blockly-dialog') as any).dialog.bind($('#blockly-dialog'));
        if (this.blocklyDlg) this.blocklyDlg({
            modal: true,
            closed: true,
            resizable: true, 
            maximizable: true, 
            title: "Blockly Dialog",
            iconCls: 'icon-edit',
            toolbar: [{
                text:'Reload',
                iconCls:'icon-reload',
                handler: () => {
                    this.blocklyFrame.contentWindow.appEvent.publish('blockly-reload');
                }
            },'-',{
                text:'Save',
                iconCls:'icon-save',
                handler: () => {
                    this.blocklyFrame.contentWindow.appEvent.publish('blockly-save');
                }
            }],
            buttons: [{
                text:'Ok',
                iconCls:'icon-ok',
                handler: () => {
                    this.blocklyFrame.contentWindow.appEvent.publish('blockly-save-close');
                }
            },{
                text:'Cancel',
                handler: () => {
                    if (this.blocklyDlg) this.blocklyDlg("close");
                }
            }]
        });

        this.gui = ($('#ide-layout') as any).layout.bind($('#ide-layout'));
        if (this.gui) this.gui({fit: true});
        let centerlayout = ($('#center-layout') as any).layout.bind($('#center-layout'));
        if (centerlayout) centerlayout({fit: true});
        let eastlayout = ($('#east-layout') as any).layout.bind($('#east-layout'));
        if (eastlayout) eastlayout({fit: true});

        document.getElementById('app').style.visibility = 'visible';

        // load theme
		let themeName = "default";
		if (App.config.ide.theme) themeName = App.config.ide.theme;
        App.changeTheme(themeName);

        let mainui = document.getElementById('ide-layout');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let mainlayout = document.getElementById('ide-layout');
            if (this.blocklyDlg) this.blocklyDlg("center");
            if (mainlayout) mainlayout.style.width = mainlayout.style.height = "100%";
            let sublayout1 = document.getElementById('center-layout');
            if (sublayout1) sublayout1.style.width = sublayout1.style.height = "100%";
            let sublayout2 = document.getElementById('east-layout');
            if (sublayout2) sublayout2.style.width = sublayout2.style.height = "100%";
        }));

        this.subscribers.push(this.eventChannel.subscribe("display-dblclick", (data) => {
            if (data) {
                console.log(data);
                if (this.blocklyDlg) this.blocklyDlg("open");
                if (this.blocklyFrame) this.blocklyFrame.src = "index-blockly.html#blockly"; // may reload a new url if necessary
            } 
        }));

        this.subscribers.push(this.eventChannel.subscribe("blockly-close", () => {
            console.log("received: blockly-close");
            if (this.blocklyDlg) this.blocklyDlg("close");
        }));

        App.openProject("sample/project1/main.json", () => {
            this.eventChannel.publish('project-reloaded');
            App.busy = false;
        });
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }
    
    changeLang(lang: string) {
        if (App.lang == lang) return;
        this.i18n.setLocale(lang)
        .then(() => {
            App.lang = this.i18n.getLocale();
            console.log("current lang: " + App.lang);

            this.centerSettings = "region:'center',title:'" + this.i18n.tr("ide.title.center") + "'";
            this.eastSettings = "region:'east',title:'" + this.i18n.tr("ide.title.east") + "',split:true";
            this.westSettings = "region:'west',title:'" + this.i18n.tr("ide.title.west") + "',split:true";

			App.loadAppLanguageScript();
        });
	}

}
