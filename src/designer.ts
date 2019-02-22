
import { autoinject } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "./app";

@autoinject()
export class Designer {

    gui: any = null;

    subscribers: Array<Subscription> = [];

    labelWelcome: string = "welcome";

    private _nextTabId: number = 0;
    private _currentCanvasTitle: string = "";
    private _canvasMap: Map<string, any> = new Map<string, any>();
    private _containerMap: Map<string, any> = new Map<string, any>();
    
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
        this.subscribers.push(this.eventChannel.subscribe("open-canvas", (title) => {
            this.openCanvas(title);
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
                            }
                            //console.log(activeObject[fieldName]);
                        } else {
                            let value = activeObject.get(fieldName);
                            if (value != undefined) {
                                if (typeof value == "number") {
                                    activeObject.set(fieldName, parseFloat(fieldValue));
                                    activeObject.setCoords();
                                }
                            }
                            //console.log(activeObject.get(fieldName));
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
                    url = url.replace("image/small", "image/normal");
                    //console.log(url);
                    fabric.Image.fromURL(url, (oImg) => {
                        let rect = ev.target.getBoundingClientRect();
                        //console.log(rect);
                        oImg.originX = "center";
                        oImg.originY = "center";
                        oImg.centeredRotation = true;
                        oImg.centeredScaling = true;
                        oImg.left = ev.clientX - rect.x;
                        oImg.top = ev.clientY - rect.y;
                        oImg.name = data.name;
                        canvas.add(oImg).renderAll();
                    });
                }
            }
        });
    }

    requestEditorUpdate(obj, editorName) {
        let display = obj.target ? obj.target : obj;
        let json = display.toJSON();
        json.name = display.name;
        this.eventChannel.publish('ui-update-editor', {target: "editor-" + editorName, data: json});
    }
    
    openCanvas(title: string) {
        if (!this.gui) return;
        if (this.gui("getTab", title)) {
            this.gui("select", title);
        } else {
            let fabric = (window as any).fabric;
            if (fabric) {
                let newCanvasId = "fc" + this.getNextTabId();
                this.gui("add", {
                    title: title,
                    content: "<div style='border-right: 2px dashed gainsboro; border-bottom: 2px dashed gainsboro;'><canvas id='" + newCanvasId + "' " 
                            //+ "style='border-right: 2px dashed gainsboro; border-bottom: 2px dashed gainsboro;'"
                            + "></canvas></div>",
                    closable: true
                });
                let originalContainer = document.getElementById(newCanvasId).parentElement;
                let newCanvas = new fabric.Canvas(newCanvasId);
                this._canvasMap.set(title, newCanvas);
                
                //console.log(document.getElementById(newCanvasId));

                newCanvas.on('object:added', (ev) => this.requestEditorUpdate(ev, 'property'));
                newCanvas.on('selection:created', (ev) => this.requestEditorUpdate(ev, 'property'));
                newCanvas.on('selection:updated', (ev) => this.requestEditorUpdate(ev, 'property'));
                //newCanvas.on('selection:cleared', (ev) => this.requestEditorUpdate(ev, 'property'));
                newCanvas.on('object:modified', (ev) => this.requestEditorUpdate(ev, 'property'));
                
                newCanvas.imageSmoothingEnabled = false;
                newCanvas.setWidth(640);
                newCanvas.setHeight(480);
                newCanvas.renderAll();

                originalContainer.style.width = newCanvas.getWidth() + "px";
                originalContainer.style.height = newCanvas.getHeight() + "px";

                let canvasContainer = document.getElementById(newCanvasId).parentElement;
                this._containerMap.set(title, canvasContainer);
                this._currentCanvasTitle = title;
                //console.log(canvasContainer);
                canvasContainer.ondragover = (ev) => ev.preventDefault();
                canvasContainer.ondrop = (ev) => this.dropImage(ev);

                canvasContainer.ondblclick = function(e) {
                    console.log(e);
                    (window as any).appEvent.publish('display-dblclick', {canvas: this, object: this.getActiveObject()} );
                }.bind(newCanvas);

            } else {
                console.error("fabric lib not found");
            }
        }
    }

}
