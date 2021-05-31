
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";
import { Ipc } from "./ipc";

import { HttpClient } from "./http-client";
import { RuntimeGenerator } from "./generator";

@autoinject()
export class Designer {

    gui: any = null;

    subscribers: Array<Subscription> = [];

    labelWelcome: string = "welcome";

    private _nextTabId: number = 0;
    private _currentCanvasTitle: string = "";
    private _canvasMap: Map<string, any> = new Map<string, any>();
    private _containerMap: Map<string, any> = new Map<string, any>();
    private _counterMap: Map<string, Map<string, number>> = new Map<string, Map<string, number>>();
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.labelWelcome = this.i18n.tr('designer.welcome');
        this.subscribers = [];
    }

    attached(argument) {
        this.gui = ($('#designer') as any).tabs.bind($('#designer'));
        if (this.gui) this.gui({
            onSelect: (title, index) => {
                this._currentCanvasTitle = title;
                let canvas = this._canvasMap.get(this._currentCanvasTitle);
                if (canvas) {
                    let activeObject = canvas.getActiveObject();
                    if (activeObject) this.requestEditorUpdate(activeObject, 'property');
                }
            }
        });

        let mainui = document.getElementById('designer');
        if (mainui) mainui.style.width = mainui.style.height = "100%";

        this.subscribers = [];
        this.subscribers.push(this.eventChannel.subscribe("ide-resize", () => {
            let maingui = document.getElementById('designer');
            if (maingui) maingui.style.width = maingui.style.height = "100%";
            if (this.gui) this.gui();
        }));
        this.subscribers.push(this.eventChannel.subscribe("open-canvas", (data) => {
            this.openCanvas(data.title, data.content);
        }));
        this.subscribers.push(this.eventChannel.subscribe("ide-save-current", () => {
            let title = this.getCurrentTitle();
            if (!title || !this._canvasMap.has(title)) return;
            this.saveCurrent();
        }));
        this.subscribers.push(this.eventChannel.subscribe("ide-save-current-and-run", () => {
            let title = this.getCurrentTitle();
            if (!title || !this._canvasMap.has(title)) return;
            let titleText = this.getCurrentTitleDisplay();
            if (titleText) {
                if (titleText.startsWith('*')) this.saveCurrent();
                this.runCurrent();
            }
        }));
        this.subscribers.push(this.eventChannel.subscribe("display-dblclick", (data) => {
            if (data) {
                console.log(data);
                if (!data.object) return;
                this.saveCurrent();
                let sceneName = this._currentCanvasTitle;
                let spriteName = data.object.name;
                let jsonFilepath = App.projectPath + "/design/template/scenes/" + sceneName + "/sprites/" + spriteName + ".json";
                this.eventChannel.publish('dlg-editor-open', {
                    url: "index-json.html#jsonedt?file=" + jsonFilepath,
                    width: 640, height: 480
                });
            }
        }));
        this.subscribers.push(this.eventChannel.subscribe("editor-update-ui", (edt) => {
            if (edt.source == 'editor-property') {
                //console.log(edt.data);
                //console.log(this._canvasMap);
                //console.log(this._currentCanvasTitle);
                let fieldName = edt.data.row.name;
                let fieldValue = edt.data.row.value;
                let canvas = this._canvasMap.get(this._currentCanvasTitle);
                if (canvas) {
                    let activeObject = canvas.getActiveObject();
                    //console.log(activeObject);
                    if (activeObject) {
                        let fields = Object.keys(activeObject);
                        if (fields.indexOf(fieldName) >= 0) {
                            //console.log(activeObject[fieldName]);
                            let value = activeObject[fieldName];
                            if (typeof value == "number") {
                                activeObject[fieldName] = parseFloat(fieldValue);
                                activeObject.setCoords();
                            } else {
                                if (fieldValue == "true") activeObject[fieldName] = true;
                                else if (fieldValue == "false") activeObject[fieldName] = false;
                            }
                            console.log(activeObject[fieldName], typeof fieldValue, fieldValue);
                        } else {
                            //let value = activeObject.get(fieldName);
                            //if (value != undefined) {
                            //    if (typeof value == "number") {
                            //        activeObject.set(fieldName, parseFloat(fieldValue));
                            //        activeObject.setCoords();
                            //    }
                            //}
                            //console.log(fieldName, typeof fieldValue, fieldValue);
                            if (fieldValue == "true") activeObject[fieldName] = true;
                            else if (fieldValue == "false") activeObject[fieldName] = false;
                            console.log(fieldName, activeObject[fieldName]);
                        }
                        canvas.requestRenderAll();
                    }
                }
            }
        }));
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    private getNextTabId() {
        this._nextTabId++;
        return this._nextTabId;
    }

    dropImage(ev) {
        ev.preventDefault();
        //console.log(ev);
        let data = JSON.parse(ev.dataTransfer.getData("text"));
        //console.log(data);
        let img = document.getElementById(data.id) as any;
        let container = ev.target.parentElement;
        this._containerMap.forEach((value, key) => {
            if (value && value == container) {
                let canvas = this._canvasMap.get(key);
                let fabric = (window as any).fabric;
                if (fabric && canvas && img) {
                    let url = img.src;
                    url = url.replace(".pv.", ".ds.");
                    let signPos = url.indexOf(App.projectPath + '/design/collector/');
                    if (signPos > 0) url = url.substring(signPos);
                    //url = url.replace("image/small", "image/normal");
                    //console.log(url);
                    let movable = img.movable && img.movable == "true";

                    if (data.name == "panel") {

                        let rect = ev.target.getBoundingClientRect();
                        let panel = new fabric.Rect({
                            originX: 'left',
                            originY: 'top',
                            width: 120,
                            height: 60,
                            fill: 'rgba(0,0,0,0.8)',
                            left: ev.clientX - rect.x,
                            top: ev.clientY - rect.y,
                        });

                        panel.template = data.name;
                        panel.enabled = true;
                        panel.selectable = movable;

                        if (panel.template) {
                            let counter = this._counterMap.get(key);
                            if (!counter) this._counterMap.set(key, new Map<string, number>());
                            counter = this._counterMap.get(key);
                            if (!counter.has(panel.template)) {
                                counter.set(panel.template, 1);
                                panel.name = panel.template.toString() + 1;
                            } else {
                                counter.set(panel.template, counter.get(panel.template) + 1);
                                panel.name = panel.template.toString() + counter.get(panel.template);
                            }
                        }

                        canvas.add(panel).setActiveObject(panel);

                    } else {
                        fabric.Image.fromURL(url, (oImg) => {
                            let rect = ev.target.getBoundingClientRect();
                            //console.log(rect);
                            if (movable) {
                                oImg.originX = "center";
                                oImg.originY = "center";
                                oImg.centeredRotation = true;
                                oImg.centeredScaling = true;
                                oImg.left = ev.clientX - rect.x;
                                oImg.top = ev.clientY - rect.y;
                            } else {
                                oImg.left = 0;
                                oImg.top = 0;
                                oImg.hoverCursor = 'default';
                            }
                            oImg.url = url;
                            oImg.template = data.name;
                            oImg.enabled = true;
                            oImg.selectable = movable;
    
                            if (oImg.template == "plot") oImg.hasControls = false;
    
                            if (oImg.template) {
                                let counter = this._counterMap.get(key);
                                if (!counter) this._counterMap.set(key, new Map<string, number>());
                                counter = this._counterMap.get(key);
                                if (!counter.has(oImg.template)) {
                                    counter.set(oImg.template, 1);
                                    oImg.name = oImg.template.toString() + 1;
                                } else {
                                    counter.set(oImg.template, counter.get(oImg.template) + 1);
                                    oImg.name = oImg.template.toString() + counter.get(oImg.template);
                                }
                            }
    
                            canvas.add(oImg).renderAll();
                            if (!movable) canvas.sendToBack(oImg);
                        });
                    }

                    
                }
            }
        });
    }



    requestEditorUpdate(obj, editorName, updateSceneTitle = false) {

        if (updateSceneTitle) {
            let currentPage = this.gui("getSelected");
            if (currentPage) {
                let currentTab = currentPage.panel('options');
                if (currentTab) {
                    let title: string = currentTab.title.toString();
                    //if (!title.startsWith('*')) this.setCurrentTitle('*' + title);
                    if (!title.startsWith('*')) this.updateCurrentTitleDisplay(title, '*' + title);
                }
            }
        }
        
        let display = obj.target ? obj.target : obj;
        let json = display.toJSON();
        //console.log(json);
        json.name = display.name;
        this.eventChannel.publish('ui-update-editor', {target: "editor-" + editorName, data: json});

    }
    
    openCanvas(title: string, url: string) {
        if (!this.gui) return;
        if (this.gui("getTab", title)) {
            this.gui("select", title);
        } else {

            let dataUrl = App.projectPath + "/" + url;

            HttpClient.getJSON(dataUrl, null, (json) => {

                //console.log(json);

                if (!json) console.error("failed to load json data of fabric canvas");
                let fabric = (window as any).fabric;
                if (!fabric) {
                    console.error("fabric lib not found");
                    return;
                }

                let newCanvasId = "fc" + this.getNextTabId();
                this.gui("add", {
                    title: title,
                    content: "<div style='border-right: 2px dashed gainsboro; border-bottom: 2px dashed gainsboro;'>"
                            + "<canvas id='" + newCanvasId + "'></canvas>"
                            +"</div>",
                    closable: true
                });
                let originalContainer = document.getElementById(newCanvasId).parentElement;
                let newCanvas = new fabric.Canvas(newCanvasId);
                this._canvasMap.set(title, newCanvas);
                
                //console.log(document.getElementById(newCanvasId));

                newCanvas.on('object:added', (ev) => this.requestEditorUpdate(ev, 'property', true));
                newCanvas.on('selection:created', (ev) => this.requestEditorUpdate(ev, 'property'));
                newCanvas.on('selection:updated', (ev) => this.requestEditorUpdate(ev, 'property'));
                //newCanvas.on('selection:cleared', (ev) => this.requestEditorUpdate(ev, 'property'));
                newCanvas.on('object:modified', (ev) => this.requestEditorUpdate(ev, 'property', true));
                
                newCanvas.imageSmoothingEnabled = false;
                newCanvas.setWidth(App.gameWidth);
                newCanvas.setHeight(App.gameHeight);
                newCanvas.renderAll();

                //console.log(newCanvas.toJSON());

                originalContainer.style.width = newCanvas.getWidth() + "px";
                originalContainer.style.height = newCanvas.getHeight() + "px";

                let canvasContainer = document.getElementById(newCanvasId).parentElement;
                this._containerMap.set(title, canvasContainer);
                if (!this._counterMap.has(title)) this._counterMap.set(title, new Map<string, number>());
                this._currentCanvasTitle = title;
                //console.log(canvasContainer);
                canvasContainer.ondragover = (ev) => ev.preventDefault();
                canvasContainer.ondrop = (ev) => this.dropImage(ev);

                canvasContainer.ondblclick = function(e) {
                    console.log(e);
                    (window as any).appEvent.publish('display-dblclick', {canvas: this, object: this.getActiveObject()} );
                }.bind(newCanvas);

                if (json) newCanvas.loadFromJSON(json, function() {
                    newCanvas.renderAll.bind(newCanvas);
                    console.log("loaded json data to canvas - ");
                    //console.log(json);
                });

            });
            
        }
    }

    getCurrentTitle(): string {
        let currentPage = this.gui("getSelected");
        if (currentPage) {
            let currentTab = currentPage.panel('options');
            if (currentTab) {
                return currentTab.title.toString();
            }
        }
        return "";
    }

    getCurrentTitleDisplay(): string {
        let title = this.getCurrentTitle();
        if (title) {
            let titlex = '*' + title;
            let tabHeaders = document.getElementsByClassName("tabs-title tabs-closable");
            if (tabHeaders) {
                let headers = Array.from(tabHeaders);
                for (let header of headers) {
                    if (header.innerHTML == title) return title;
                    if (header.innerHTML == titlex) return titlex;
                }
            }
        }
        return "";
    }

    updateCurrentTitleDisplay(oldText, newText: string) {

        //let currentPage = this.gui("getSelected");
        //if (currentPage) {
        //    this.gui('update', {
        //        tab: currentPage,
        //        options: {
        //            title: newText
        //        }
        //    });
        //}

        //let title = this.getCurrentTitle();
        //console.log(title);
        //let container = title ? this._containerMap.get(title) : null;
        //console.log(container);

        let tabHeaders = document.getElementsByClassName("tabs-title tabs-closable");
        if (tabHeaders) {
            let headers = Array.from(tabHeaders);
            for (let header of headers) {
                if (header.innerHTML == oldText) {
                    header.innerHTML = newText;
                    (header as any).innerText = newText;
                    break;
                }
            }
        }
    }

    saveCurrent() {

        console.log("saveCurrent()");

        if (!this.gui) return;
        let currentPage = this.gui("getSelected");
        if (!currentPage) return;

        let currentTab = currentPage.panel('options');
        if (!currentTab) return;

        let title: string = currentTab.title.toString();
        if (title && title.startsWith('*')) title = title.substr(1);

        //let dtJsonFile = App.getSceneFilepath(title);
        //if (!dtJsonFile) {
        //    console.error("Failed to get design file of the scene");
        //    return;
        //}

        let dtJsonFile = App.projectPath + "/design/explorer/scenes/" + title + ".json";

        let canv = title ? this._canvasMap.get(title) : null;
        if (!canv) {
            console.error("Failed to get design canvas of the scene");
            return;
        }

        this.eventChannel.publish("add-ide-log", "Saving current scene content...");

        let json = canv.toJSON(['name', 'url', 'template', 'enabled']);
        console.log(json);
        
        let output = [];
        let rtJsonFolder = App.projectPath + "/design/template/scenes/" + title;

        let rtSceneJson = RuntimeGenerator.genBasicSceneJson();

        if (json && json.objects) {
            for (let item of json.objects) {
                // then need to change image src url to be a relative url
                if (item.type == 'image' && item.src && item.url) {
                    item.src = item.url;
                }
                // gen runtime json for every object
                if ( /* item.type == 'image' && */ item.name && item.template) {
                    let jsonObj = null, scriptText = null;
                    if (item.template == "plot") {
                        jsonObj = RuntimeGenerator.genBasicPlotObjectJson();
                        // no need to gen script here...
                        //scriptText = RuntimeGenerator.genBasicPlotObjectScript();
                        if (item.enabled != undefined) jsonObj.active = item.enabled == true;
                    } else if (item.template == "panel") {
                        jsonObj = RuntimeGenerator.genBasicPanelObjectJson();
                        if (jsonObj && jsonObj.components && jsonObj.components.display) {
                            jsonObj.components.display.x = item.left;
                            jsonObj.components.display.y = item.top;
                            jsonObj.components.display.angle = item.angle;
                            jsonObj.components.display.width = Math.round(item.width * item.scaleX);
                            jsonObj.components.display.height = Math.round(item.height * item.scaleY);
                        }
                        if (item.enabled != undefined) jsonObj.active = item.enabled == true;
                    } else {
                        jsonObj = RuntimeGenerator.genBasicSpriteObjectJson(item.template);
                        if (jsonObj && jsonObj.components && jsonObj.components.display) {
                            jsonObj.components.display.x = item.left;
                            jsonObj.components.display.y = item.top;
                            jsonObj.components.display.angle = item.angle;
                            jsonObj.components.display.scale.x = item.scaleX;
                            jsonObj.components.display.scale.y = item.scaleY;
                        }
                        if (item.enabled != undefined) jsonObj.active = item.enabled == true;
                    }

                    console.log(item.name , " - enabled - " , item.enabled);
                    
                    output.push({
                        text: JSON.stringify(jsonObj, null, 4),
                        path: rtJsonFolder + "/sprites/" + item.name + ".json"
                    });
                    if (scriptText) {
                        output.push({
                            text: scriptText,
                            path: rtJsonFolder + "/sprites/" + item.name + ".ts"
                        });
                    }
                    rtSceneJson.sprites.push(item.name);
                }
            }
        }

        // need to output runtime scene json
        output.push({
            text: JSON.stringify(rtSceneJson, null, 4),
            path: rtJsonFolder + "/" + title + ".json"
        });

        // need to update design time json file too
        output.push({
            text: JSON.stringify(JSON.stringify(json, null, 4)),
            path: dtJsonFile
        });

        //console.log(output);

        Ipc.saveTextSync(output);

        this.updateCurrentTitleDisplay('*' + title, title);

    }

    async runCurrent() {

        let title = this.getCurrentTitle();
        if (!title || !this._canvasMap.has(title)) return;

        this.eventChannel.publish("ide-run-current-only" , { scene: title });
    }

}
