
import { autoinject, BindingEngine } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

//import { ipcRenderer } from "electron";

import { TileListCanvas } from "./controls/tile-list-canvas";
import { CommonConfirmDlg } from './popups/common-confirm';
import { NewTilemapDlg } from "./popups/tilemap/new-tilemap";
import { SaveTilemapDlg } from "./popups/tilemap/save-tilemap";
import { EditTilesetDlg } from "./popups/tileset/edit-tileset";
import { SelectTilesetDlg } from "./popups/tileset/select-tileset";
import { SelectTilemapDlg } from "./popups/tilemap/select-tilemap";
import { ResizeTilemapDlg } from "./popups/tilemap/resize-tilemap";
import { SelectTilemapBgDlg } from './popups/tilemap/select-tilemap-bg';
import { SetCostDlg } from "./popups/tilemap/set-cost";

import { HttpClient } from "./http-client";

import { App } from "./app";


@autoinject()
export class TilemapEditorPage {

    ide: any = null;
    //editor: any = null;

    tileset: any = {};
    tilesets: Array<any> = [];

    tileWidth: number = 0;
    tileHeight: number = 0;
    columnCount: number = 0;
    rowCount: number = 0;

    tilesetImage: HTMLImageElement = null;
    tilesetCanvas: HTMLCanvasElement = null;
    tilesetControl: TileListCanvas = null;

    tilemap: any = {};
    tilemapBg: HTMLCanvasElement = null;
    tilemapGrids: HTMLCanvasElement = null;
    tilemapCanvas: HTMLCanvasElement = null;
    tilemapTileCanvas: HTMLCanvasElement = null;
    cursorCanvas: HTMLCanvasElement = null;

    tilemapBgImages: Array<HTMLImageElement> = [];

    selectedTilesetName: string = "";

    isMouseDown: boolean = false;
    startRect: any = { x: 0, y: 0, w: 0, h: 0 };
    endRect: any = { x: 0, y: 0, w: 0, h: 0 };

    currentRect: any = { x: 0, y: 0, w: 0, h: 0 };

    bgFlags = ["layerBG"];
    layer1Flags = ["layerValue1"];
    layer2Flags = [];
    layer3Flags = [];
    gridFlags = [];
    replacementFlags = [];

    selectedArea: any = null;

    histCursor = -1;
    histRecords = [];

    subscribers: Array<Subscription> = [];

    private _loadingTilesets: Array<string> = [];

    constructor(public dialogService: DialogService, public router: Router, 
        public binding: BindingEngine, public i18n: I18N, public eventChannel: EventAggregator) {
        (window as any).appEvent = this.eventChannel;
        this.subscribers = [];
    }

    private gridFlagsChanged() {
        console.log("gridFlagsChanged");
        this.refreshTilemapGrids();
    }

    private bgFlagsChanged() {
        console.log("bgFlagsChanged");
        this.refreshTilemapBg();
    }

    private layer1FlagsChanged() {
        console.log("layer1FlagsChanged");
        this.refreshTilemapDisplay();
    }
    private layer2FlagsChanged() {
        console.log("layer2FlagsChanged");
        this.refreshTilemapDisplay();
    }
    private layer3FlagsChanged() {
        console.log("layer3FlagsChanged");
        this.refreshTilemapDisplay();
    }

    activate(parameters, routeConfig) {
        console.log("activate");
    }

    deactivate() {
        console.log("deactivate");
    }

    attached() {

        console.log("attached");

        console.log("this is tilemap editor entry...");

        this.ide = window.parent;

        this.isMouseDown = false;
        this.tilesetControl = (this as any).tileListCanvas;
        this.tilesetCanvas = this.tilesetControl.canvas;
        this.tilemapBg = document.getElementById("tilemap-bg") as HTMLCanvasElement;
        this.tilemapGrids = document.getElementById("tilemap-grid") as HTMLCanvasElement;
        this.tilemapCanvas = document.getElementById("tilemap-map") as HTMLCanvasElement;
        this.tilemapTileCanvas = document.getElementById("tilemap-tile") as HTMLCanvasElement;
        this.cursorCanvas = document.getElementById("cursor-rect") as HTMLCanvasElement;
        if (this.cursorCanvas) this.cursorCanvas.style.visibility = "hidden";
        if (this.tilemapCanvas) {
            this.tilemapCanvas.onmousemove = (e) => this.onMouseMove(e);
            this.tilemapCanvas.onmousedown = (e) => this.onMouseDown(e);
            this.tilemapCanvas.onmouseup = (e) => this.onMouseUp(e);
        }

        this.subscribers = [];

        this.subscribers.push(this.binding.collectionObserver(this.gridFlags).subscribe(() => this.gridFlagsChanged()));
        this.subscribers.push(this.binding.collectionObserver(this.bgFlags).subscribe(() => this.bgFlagsChanged()));
        this.subscribers.push(this.binding.collectionObserver(this.layer1Flags).subscribe(() => this.layer1FlagsChanged()));
        this.subscribers.push(this.binding.collectionObserver(this.layer2Flags).subscribe(() => this.layer2FlagsChanged()));
        this.subscribers.push(this.binding.collectionObserver(this.layer3Flags).subscribe(() => this.layer3FlagsChanged()));

        this.subscribers.push(this.eventChannel.subscribe("create-new-tilemap", data => this.openNewTilemapDlg()));
        this.subscribers.push(this.eventChannel.subscribe("open-tilemap", data => this.openSelectTilemapDlg()));
        this.subscribers.push(this.eventChannel.subscribe("save-tilemap", data => this.saveTilemap()));
        this.subscribers.push(this.eventChannel.subscribe("save-tilemap-as", data => this.openSaveTilemapDlg()));

        //this.subscribers.push(this.eventChannel.subscribe("remove-current-tileset", data => this.removeCurrentTileset()));

        this.subscribers.push(this.eventChannel.subscribe("dlg-copy-image-file-return", data => this.loadTilemapBg(data)));

        this.subscribers.push(this.eventChannel.subscribe("dlg-save-tilemap-file-return", data => console.log("Saved to file - " + data)));
        

        // enable bootstrap v4 tooltip
        //($('[data-toggle="tooltip"]') as any).tooltip();

        document.getElementById('top-loading').style.display = 'none';
        document.getElementById('app').style.visibility = 'visible';

        App.busy = false;
    }

    detached() {
        console.log("detached");
        for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    get maxImageCanvasHeight() {
        return window.innerHeight - 60;
    }

    get maxListCanvasHeight() {
        return window.innerHeight - 125;
    }

    getProjectResPath() {
        return this.ide.appConfig.projectPath + "/runtime/project/res";
    }

    getProjectDesignPath() {
        return this.ide.appConfig.projectPath + "/design";
    }

    clearHist() {
        this.histCursor = -1;
        this.histRecords = [];
    }

    record() {
        if (this.tilemap && this.tilemap.cells && this.tilemap.cells.length > 0) {
            this.histRecords.length = this.histCursor + 1;
            this.histRecords[this.histRecords.length] = JSON.parse(JSON.stringify(this.tilemap));
            //console.log(this.tilemap);
            this.histCursor = this.histRecords.length - 1;
        }
    }

    hexToRGBA(hex: string) {
        let r = parseInt(hex.slice(1, 3), 16),
            g = parseInt(hex.slice(3, 5), 16),
            b = parseInt(hex.slice(5, 7), 16),
            a = -1;
        if (hex.length >= 9) a = parseInt(hex.slice(7, 9), 16);
        return a < 0 ? "rgb(" + r + ", " + g + ", " + b + ")"
            : "rgba(" + r + ", " + g + ", " + b + ", " + Math.round((a / 255.0) * 100) / 100 + ")";
    }

    getRect(posX: number, posY: number, isFreeStyleSelection: boolean = false) {

        let rect = { x: 0, y: 0, w: this.tileWidth, h: this.tileHeight };

        if (rect.w <= 0 || rect.h <= 0) return rect;

        if (isFreeStyleSelection) {
            rect.x = posX - Math.round(this.tileWidth / 2);
            rect.y = posY - Math.round(this.tileHeight / 2);
        } else {
            while (rect.x < posX) rect.x += this.tileWidth;
            while (rect.y < posY) rect.y += this.tileHeight;
            if (rect.x > posX) rect.x -= this.tileWidth;
            if (rect.y > posY) rect.y -= this.tileHeight;
        }
        
        if (rect.x < 0) {
            rect.x = 0;
            rect.w = this.tileWidth;
        }

        if (rect.y < 0) {
            rect.y = 0;
            rect.h = this.tileHeight;
        }

        return rect;
    }

    onMouseMove(e) {
        let rect = this.getRect(e.offsetX, e.offsetY);
        if (rect.w <= 0 || rect.h <= 0) return;

        if (rect.x == this.currentRect.x && rect.y == this.currentRect.y
            && rect.w == this.currentRect.w && rect.h == this.currentRect.h) return;
        
        this.currentRect.x = rect.x;
        this.currentRect.y = rect.y;
        this.currentRect.w = rect.w;
        this.currentRect.h = rect.h;

        let going2remove = e.shiftKey === true;
        let showingGrids = this.gridFlags.length > 0;
        if (showingGrids) going2remove = false;

        if (showingGrids) {
            if (this.cursorCanvas) this.cursorCanvas.style.visibility = "hidden";
            if (!this.isMouseDown) return;
        } else {
            if (this.cursorCanvas) {
                this.cursorCanvas.style.left = rect.x + 'px';
                this.cursorCanvas.style.top = rect.y + 'px';
                this.cursorCanvas.style.visibility = "visible";
            }
        }

        let needUpdateAreaRect = this.isMouseDown;
        if (this.tilesetControl && this.tilesetControl.startRect && this.tilesetControl.endRect) {
            if (this.tilesetControl.startRect.x != this.tilesetControl.endRect.x
                || this.tilesetControl.startRect.y != this.tilesetControl.endRect.y) needUpdateAreaRect = false;
        }

        if (this.isMouseDown) {
            if (going2remove || showingGrids) needUpdateAreaRect = true;
        }

        if (needUpdateAreaRect) {
            this.endRect.x = this.currentRect.x;
            this.endRect.y = this.currentRect.y;
            this.endRect.w = this.currentRect.w;
            this.endRect.h = this.currentRect.h;
            this.refreshTilemapTiles(going2remove || showingGrids);
        }

        this.updateCursorImage(going2remove || showingGrids);
    }

    onMouseDown(e) {

        //if (this.gridFlags.length > 0) {
        //    this.isMouseDown = true;
        //    return;
        //}

        let going2remove = e.shiftKey === true;
        let showingGrids = this.gridFlags.length > 0;
        if (showingGrids) going2remove = false;

        let needUpdateAreaRect = true;
        if (this.tilesetControl && this.tilesetControl.startRect && this.tilesetControl.endRect) {
            if (this.tilesetControl.startRect.x != this.tilesetControl.endRect.x
                || this.tilesetControl.startRect.y != this.tilesetControl.endRect.y) needUpdateAreaRect = false;
        }

        if (going2remove || showingGrids) needUpdateAreaRect = true;

        if (needUpdateAreaRect) {

            this.startRect.x = this.currentRect.x;
            this.startRect.y = this.currentRect.y;
            this.startRect.w = this.currentRect.w;
            this.startRect.h = this.currentRect.h;

            this.endRect.x = this.currentRect.x;
            this.endRect.y = this.currentRect.y;
            this.endRect.w = this.currentRect.w;
            this.endRect.h = this.currentRect.h;

            if (this.startRect.w <= 0 || this.startRect.h <= 0) return;
        }

        this.isMouseDown = true;

        this.refreshTilemapTiles(going2remove || showingGrids);
    }

    onMouseUp(e) {

        let going2remove = e.shiftKey === true;
        let showingGrids = this.gridFlags.length > 0;
        if (showingGrids) going2remove = false;

        if (showingGrids) {
            if (this.startRect.x >= 0 && this.startRect.y >= 0 && this.startRect.w > 0 && this.startRect.h > 0
                && this.endRect.x >= 0 && this.endRect.y >= 0 && this.endRect.w > 0 && this.endRect.h > 0
                && (this.startRect.x != this.endRect.x || this.startRect.y != this.endRect.y)) {
                    console.log('Selected multiple tiles');
            } else {
                this.isMouseDown = false;
                if (e.ctrlKey === true && this.currentRect.w > 0 && this.currentRect.h > 0) {
                    if (e.button == 0) this.addTileCost(this.currentRect.x, this.currentRect.y, 1);
                    else if (e.button == 2) this.addTileCost(this.currentRect.x, this.currentRect.y, -1);
                }
                this.refreshTilemapGrids();
                return;
            }
        }

        let needUpdateAreaRect = true;
        if (this.tilesetControl && this.tilesetControl.startRect && this.tilesetControl.endRect) {
            if (this.tilesetControl.startRect.x != this.tilesetControl.endRect.x
                || this.tilesetControl.startRect.y != this.tilesetControl.endRect.y) needUpdateAreaRect = false;
        }

        if (going2remove || showingGrids) needUpdateAreaRect = true;

        if (needUpdateAreaRect) {
            this.endRect.x = this.currentRect.x;
            this.endRect.y = this.currentRect.y;
            this.endRect.w = this.currentRect.w;
            this.endRect.h = this.currentRect.h;
        }

        this.isMouseDown = false;

        if (showingGrids) this.refreshTilemapTiles(showingGrids);
        else {
            this.applyCurrentTiles(e.ctrlKey === true || this.replacementFlags.length > 0, going2remove);
            this.refreshTilemapTiles();
        }
    }

    setBg() {
        console.log("open select bg dialog...");
        this.dialogService.open({viewModel: SelectTilemapBgDlg, model: 0})
            .whenClosed((response) => {
                if (!response.wasCancelled && response.output != undefined) {
                    console.log(response.output);
                    let bgimgpath = response.output.imageFile;
                    if (bgimgpath) (window.parent as any).appEvent.publish('dlg-copy-image-file', response.output);
                    
                } else {
                    console.log('Give up setting bg of current tilemap');
                }
            });
    }

    setCost() {
        let showingGrids = this.gridFlags.length > 0;
        if (showingGrids) {
            if (this.startRect.x >= 0 && this.startRect.y >= 0 && this.startRect.w > 0 && this.startRect.h > 0
                && this.endRect.x >= 0 && this.endRect.y >= 0 && this.endRect.w > 0 && this.endRect.h > 0
                //&& (this.startRect.x != this.endRect.x || this.startRect.y != this.endRect.y)
                ) {
                
                this.dialogService.open({viewModel: SetCostDlg, model: 0})
                .whenClosed((response) => {
                    if (!response.wasCancelled && response.output != undefined) {
                        //console.log(response.output);
                        let cost = response.output;
                        let x= 0, y = 0, pos = 0;
                        for (let row=0; row<this.tilemap.rowCount; row++) {
                            for (let col=0; col<this.tilemap.columnCount; col++) {
                                if (x >= this.startRect.x && x <= this.endRect.x && y >= this.startRect.y && y <= this.endRect.y) {
                                    let cell = this.tilemap.cells[pos];
                                    if (cell) cell.cost = cost;
                                    //console.log('cell.cost = ' + cell.cost);
                                }
                                pos++;
                                x += this.tileWidth;
                            }
                            x = 0;
                            y += this.tileHeight;
                        }
                        this.refreshTilemapGrids();
                    } else {
                        console.log('Give up setting costs of selected tiles');
                    }
                });

            }
        }
        
    }

    resetMapSize() {
        this.dialogService.open({viewModel: ResizeTilemapDlg, model: this.tilemap.rowCount + "," + this.tilemap.columnCount})
            .whenClosed((response) => {
                if (!response.wasCancelled && response.output) {
                    //console.log(response.output);
                    let settings = response.output;
                    this.resizeMap(settings.rowCount, settings.columnCount);
                    console.log(this.tilemap);
                    this.refreshTilemap();
                } else {
                    console.log('Give up setting new size of the map');
                }
            });
    }

    updateTilemapBgSetting(imgUrls: Array<string>, imgObjects: Map<string, any>) {
        if (!this.tilemap) return;
        if (!this.tilemap.extra) this.tilemap.extra = {};
        this.tilemap.extra.background = { images: [], areas: [] };
        this.tilemapBgImages = [];
        imgUrls.sort();
        this.tilemap.extra.background.images.push(...imgUrls);
        let x = 0, y = 0, row = '0', col = '0';
        let lastW = 0, lastH = 0, lastRow = '#', lastCol = '#';
        for (let url of imgUrls) {
            let noext = url.substring(0, url.lastIndexOf('.'));
            let idx = noext.substr(noext.length - 2, 2);
            row = idx.charAt(0); col = idx.charAt(1);
            //console.log(row, col);
            if (row !== lastRow) {
                y += lastH;
                x = 0;
            } else if (col !== lastCol) x += lastW;
            let img = imgObjects.get(url) as HTMLImageElement;
            this.tilemapBgImages.push(img);
            let area = [x, y, img.width, img.height];
            //console.log(area);
            this.tilemap.extra.background.areas.push(...area);
            lastW = img.width;
            lastH = img.height;
            lastRow = row;
            lastCol = col;
        }
        this.record();
        console.log(this.tilemap.extra);
        this.refreshTilemapBg();
    }

    loadTilemapBg(bgfile) {
        //console.log(bgfile);
        this.tilemapBgImages = [];
        let url: string = bgfile.toString();
        if (url.indexOf('.') < 0) url += ".png";
        url = url.replace('\\', '/');
        let items = url.split(',');
        let imgUrls = [], imgAreas = [], count = 0;
        let imgObjects = new Map<string, any>();
        for (let item of items) {
            let fileurl = item.trim();
            let filename = fileurl.substring(fileurl.lastIndexOf('/') + 1);
            let img = new Image();
            img.onload = () => {
                imgUrls.push(filename);
                imgObjects.set(filename, img);
                count++;
                if (count == items.length) this.updateTilemapBgSetting(imgUrls, imgObjects);
            };
            img.src = fileurl;
        }
        
    }

    loadTileset(tilesetName: string, callback: (tileset: any)=>void) {
        let url = this.getProjectResPath() + "/json/tilesets/" + tilesetName + ".json";
        HttpClient.getJSON(url, "", (json) => {
            //console.log(json);
            if (this.tileWidth != json.tileWidth 
                || this.tileHeight != json.tileHeight) {
                console.log("Tileset's tile size is incorrect: " + tilesetName);
                callback(null);
                return;
            }

            let tileset = {name: json.name, tileWidth: json.tileWidth, tileHeight: json.tileHeight, obj: null, img: null};
            let url = this.getProjectResPath() + "/img/" + json.image;
            if (url.indexOf('.') < 0) url += ".png";
            let img = new Image();
            img.onload = () => {
                tileset.obj = json;
                tileset.img = img;
                if (this.tilemap) {
                    if (this.tilemap.tilesetNames) {
                        if (this.tilemap.tilesetNames.indexOf(tileset.name) < 0) this.tilemap.tilesetNames.push(tileset.name);
                    } else {
                        this.tilemap.tilesetNames = [tileset.name];
                    }
                }
                let existing = false;
                for (let item of this.tilesets) {
                    if (item.name == tileset.name) {
                        existing = true;
                        break;
                    }
                }
                if (!existing) this.tilesets.push(tileset);
                callback(tileset);
            };
            img.src = url;

        }, (errmsg) => {
            console.log("Failed to load tileset data from - " + url);
            console.log("Error - " + errmsg);
            callback(null);
        });
    }

    private loadTilesetsOneByOne(callback: ()=>void) {
        if (this._loadingTilesets.length <= 0) {
            callback();
        } else {
            this.loadTileset(this._loadingTilesets.shift(), (tileset) => {
                this.loadTilesetsOneByOne(callback);
            });
        }
    }

    loadTilesets(tilesetNames: Array<string>, callback: ()=>void) {
        this._loadingTilesets = [];
        Array.prototype.push.apply(this._loadingTilesets, tilesetNames);
        this.loadTilesetsOneByOne(callback);
    }

    openTileset(tilesetName: string) {
        let tileset = null;
        if (tilesetName) for (let item of this.tilesets) {
            if (item.name == tilesetName) {
                tileset = item;
                break;
            }
        }
        if (tileset) {
            this.tilesetImage = tileset.img;
            this.tileset = tileset.obj;
            if (this.tileset.columnCount && this.tilesetControl)
                this.tilesetControl.columnCount = this.tileset.columnCount;
        } else {
            this.tilesetImage = null;
            this.tileset = {};
        }
    }

    changeCurrentTileset() {
        this.openTileset(this.selectedTilesetName);
    }

    removeCurrentTileset() {
        console.log("remove current tileset");
        this.dialogService.open({viewModel: CommonConfirmDlg, model: this.i18n.tr("confirm.remove-current-tileset")})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                console.log(response.output);
                if (response.output == 'yes') {
                    console.log("go to remove current tileset");
                    let idx = -1;
                    for (let i=0; i<this.tilesets.length; i++) {
                        let item = this.tilesets[i];
                        if (item.name == this.selectedTilesetName) {
                            idx = i;
                            break;
                        }
                    }
                    if (idx >= 0) {
                        this.tilesets.splice(idx, 1);
                        if (this.tilesets.length == 1) {
                            this.selectedTilesetName = this.tilesets[0].name;
                        } else if (this.tilesets.length > 1) {
                            if (idx == this.tilesets.length) this.selectedTilesetName = this.tilesets[this.tilesets.length - 1].name;
                            else this.selectedTilesetName = this.tilesets[idx].name;
                        } else this.selectedTilesetName = "";
                        this.changeCurrentTileset();
                        this.refreshTilemap();
                    }
                } else console.log("give up removing current tileset");
            } else {
                console.log("give up removing current tileset");
            }
        });
    }

    openSelectTilesetDlg() {
        this.dialogService.open({viewModel: SelectTilesetDlg, model: {multiple: true}})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                //console.log(response.output);
                //if (response.output.length > 0) this.openTileset(response.output[0]);
                let tilesetNames = [];
                for (let item of response.output) {
                    let existing = false;
                    for (let tileset of this.tilesets) {
                        if (tileset.name == item) {
                            existing = true;
                            break;
                        }
                    }
                    if (!existing) tilesetNames.push(item);
                }
                //console.log("new tilesets - ", tilesetNames);
                //console.log("current tileset name - ", this.selectedTilesetName);
                //console.log("current tilesets - ", this.tilesets);
                let needNewSelectedTilesetName = !this.selectedTilesetName;
                if (tilesetNames.length > 0) {
                    this.loadTilesets(tilesetNames, () => {
                        //console.log(this.tilesets);
                        //console.log("current tileset name 2 - ", this.selectedTilesetName);
                        if (needNewSelectedTilesetName && this.tilesets.length > 0) {
                            //console.log(this.tilesets[0].name);
                            this.selectedTilesetName = this.tilesets[0].name;
                            this.changeCurrentTileset();
                        }
                    });
                }
                
            } else {
                console.log('Give up selecting tilesets');
            }
        });
    }

    openNewTilemapDlg() {

        this.dialogService.open({viewModel: NewTilemapDlg, model: '' })
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                //console.log(response.output);
                let tilemap = JSON.parse(JSON.stringify(this.tilemap));
                tilemap.name = response.output.name;
                tilemap.tileWidth = response.output.tileWidth;
                tilemap.tileHeight = response.output.tileHeight;
                tilemap.columnCount = response.output.columnCount;
                tilemap.rowCount = response.output.rowCount;
                tilemap.bgcolor = response.output.bgcolor;
                tilemap.tilesetNames = [];
                tilemap.tilesetNames.push(...response.output.tilesetNames);
                tilemap.cells = [];
                for (let i=0; i<tilemap.columnCount*tilemap.rowCount; i++) {
                    tilemap.cells.push({ids:[-1, -1]});
                }
                console.log(tilemap);
                this.loadTilemap(tilemap, true, () => {
                    this.clearHist();
                    this.record();

                    //this.bgFlags = ["layerBG"];
                    //this.layer1Flags = ["layerValue1"];
                    //this.layer2Flags = [];
                    //this.layer3Flags = [];

                    if (this.bgFlags.length > 0) this.bgFlags.splice(0, 1);
                    this.bgFlags.push("layerBG");
                    if (this.layer1Flags.length > 0) this.layer1Flags.splice(0, 1);
                    this.layer1Flags.push("layerValue1");
                    if (this.layer2Flags.length > 0) this.layer2Flags.splice(0, 1);
                    if (this.layer3Flags.length > 0) this.layer3Flags.splice(0, 1);
                });

            } else {
                console.log('Give up creating a new tilemap');
            }
        });
    }

    refreshTilemapBg() {
        if (this.tilemapBg) {
            let ctx = this.tilemapBg.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, this.tilemapBg.width, this.tilemapBg.height);
                this.tilemapBg.width = this.tileWidth * this.columnCount;
                this.tilemapBg.height = this.tileHeight * this.rowCount;
                //console.log(this.tilemap.bgcolor);
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, this.tilemapBg.width, this.tilemapBg.height);

                if (this.bgFlags.length > 0) {
                    if (this.tilemap.extra && this.tilemap.extra.background 
                        && this.tilemap.extra.background.images && this.tilemap.extra.background.areas
                        && this.tilemapBgImages.length > 0) {
    
                        let posArray = this.tilemap.extra.background.areas;
                        for (let i = 0; i < this.tilemapBgImages.length; i++) {
                            let bgimg = this.tilemapBgImages[i];
                            let x = posArray[4*i + 0];
                            let y = posArray[4*i + 1];
                            let w = posArray[4*i + 2];
                            let h = posArray[4*i + 3];
                            //console.log(x, y, bgimg.width, bgimg.height);
                            ctx.clearRect(x, y, bgimg.width, bgimg.height);
                            ctx.drawImage(bgimg, x, y);
                        }
                        
                    }
                }
                

            }
            ctx = this.tilemapTileCanvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, this.tilemapTileCanvas.width, this.tilemapTileCanvas.height);
            this.tilemapTileCanvas.width = this.tilemapBg.width;
            this.tilemapTileCanvas.height = this.tilemapBg.height;
        }
    }

    refreshTilemapGrids() {
        if (this.tilemapGrids) {
            let ctx = this.tilemapGrids.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, this.tilemapGrids.width, this.tilemapGrids.height);
                this.tilemapGrids.width = this.tileWidth * this.columnCount;
                this.tilemapGrids.height = this.tileHeight * this.rowCount;
                /*
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(0,0,0,0.1)';
                for (let i=0; i < this.tilemapGrids.height; i += this.tileHeight) {
                    ctx.moveTo(0,i);
                    ctx.lineTo(this.tilemapGrids.width, i);
                    ctx.stroke();
                }
                for (let i=0; i < this.tilemapGrids.width; i += this.tileWidth) {
                    ctx.moveTo(i,0);
                    ctx.lineTo(i,this.tilemapGrids.height);
                    ctx.stroke();
                }
                */

                ctx.font = 'bold ' + (this.tileWidth / 2) + 'px arial, serif';
                ctx.fillStyle = 'white';

                //console.log(this.tilemap);

                let x= 0, y = 0, pos = 0;
                for (let row=0; row<this.tilemap.rowCount; row++) {
                    for (let col=0; col<this.tilemap.columnCount; col++) {
                        let cell = this.tilemap.cells[pos];
                        if (cell.cost != undefined) {
                            if (cell.cost >= 0) {
                                ctx.fillStyle = 'white';
                                ctx.fillRect(x+2, y+2, this.tileWidth - 4, this.tileHeight - 4);
                                ctx.fillStyle = 'black';
                            } else {
                                ctx.fillStyle = 'red';
                                ctx.fillRect(x+2, y+2, this.tileWidth - 4, this.tileHeight - 4);
                                ctx.fillStyle = 'white';
                            }
                            //ctx.fillStyle = cell.cost >= 0 ? 'green' : 'red';
                            let cost = cell.cost.toString();
                            let text = ctx.measureText(cost);
                            //let textHeight = (text as any).actualBoundingBoxDescent - (text as any).actualBoundingBoxAscent;
                            let textHeight = 0 - (this.tileHeight / 4);
                            ctx.fillText(cost, x+(this.tileWidth-text.width)/2, y+(this.tileHeight-textHeight)/2);
                        } else {
                            ctx.fillStyle = 'white';
                            ctx.fillRect(x+2, y+2, this.tileWidth - 4, this.tileHeight - 4);
                        }
                        pos++;
                        x += this.tileWidth;
                    }
                    x = 0;
                    y += this.tileHeight;
                }
            }
        }
    }

    refreshTilemapTiles(showAreaRect?: boolean) {
        let ctx = this.tilemapTileCanvas ? this.tilemapTileCanvas.getContext('2d') : null;
        if (ctx) {
            this.tilemapTileCanvas.style.opacity = this.gridFlags.length > 0 ? '1.0' : '0.5';
            ctx.clearRect(0, 0, this.tilemapTileCanvas.width, this.tilemapTileCanvas.height);
            if (showAreaRect === true) {
                ctx.strokeStyle = "red";
                ctx.strokeRect(this.startRect.x, this.startRect.y, 
                    this.endRect.x + this.endRect.w - this.startRect.x, this.endRect.y + this.endRect.h - this.startRect.y);
            } else if (this.startRect.w > 0 && this.endRect.w > 0) {
                let tileRect = this.isMouseDown && this.tilesetControl ? this.tilesetControl.currentTileRect : null;
                if (tileRect && this.isMouseDown && this.tilesetControl.tileset && this.tilesetControl.image) {
                    for (let x = this.startRect.x; x <= this.endRect.x; x += tileRect.w) {
                        for (let y = this.startRect.y; y <= this.endRect.y; y += tileRect.h) {
                            ctx.drawImage(this.tilesetControl.image, tileRect.x, tileRect.y, tileRect.w, tileRect.h,
                                x, y, this.tileset.tileWidth, this.tileset.tileHeight);
                        }
                    }
                }
            }
        }
        
    }

    applyCurrentTiles(replacement: boolean, remove?: boolean) {

        let tilesetIndex = -1;
        let currentTilesetName = this.tilesetControl.tileset ? this.tilesetControl.tileset.name : null;
        if (currentTilesetName == null) return;
        for (let i=0; i<this.tilesets.length; i++) {
            if (this.tilesets[i].name == currentTilesetName) {
                tilesetIndex = i;
                break;
            }
        }
        if (tilesetIndex < 0 && remove !== true) return;

        let onlyOneTile = this.cursorCanvas.width == this.tileWidth && this.cursorCanvas.height == this.tileHeight;

        if (onlyOneTile) {

            let tileIndex = this.tilesetControl.currentTileIndex;
            if (tileIndex < 0  && remove !== true) return;

            //console.log("tilesetIndex: " + tilesetIndex + " , tileIndex: " + tileIndex);

            let x= 0, y = 0, pos = 0;
            for (let row=0; row<this.tilemap.rowCount; row++) {
                for (let col=0; col<this.tilemap.columnCount; col++) {
                    if (x >= this.startRect.x && x <= this.endRect.x && y >= this.startRect.y && y <= this.endRect.y) {
                        let applied = false;
                        let cell = this.tilemap.cells[pos];
                        if (remove === true) {
                            //if (cell.ids.length >= 4) {
                            //    cell.ids.length = cell.ids.length - 2;
                            //} else {
                            //    cell.ids = [-1, -1];
                            //}
                            if (this.layer3Flags.length > 0) {
                                if (cell.ids.length < 2) {
                                    cell.ids = [-1, -1, -1, -1, -1, -1];
                                } else if (cell.ids.length < 4) {
                                    cell.ids[2] = -1;
                                    cell.ids[3] = -1;
                                    cell.ids[4] = -1;
                                    cell.ids[5] = -1;
                                } else {
                                    cell.ids[4] = -1;
                                    cell.ids[5] = -1;
                                }
                                //applied = true;
                            } else if (this.layer2Flags.length > 0) {
                                if (cell.ids.length < 2) {
                                    cell.ids = [-1, -1, -1, -1];
                                } else {
                                    cell.ids[2] = -1;
                                    cell.ids[3] = -1;
                                }
                                //applied = true;
                            } else if (this.layer1Flags.length > 0) {
                                cell.ids[0] = -1;
                                cell.ids[1] = -1;
                                //applied = true;
                            }
                        } else {
                            //if (replacement || cell.ids[0] == -1) {
                            //    cell.ids = [tilesetIndex, tileIndex];
                            //} else {
                            //    cell.ids.push(tilesetIndex);
                            //    cell.ids.push(tileIndex);
                            //}
                            if (this.layer3Flags.length > 0) {
                                if (cell.ids.length < 2) {
                                    cell.ids = [-1, -1, -1, -1, tilesetIndex, tileIndex];
                                } else if (cell.ids.length < 4) {
                                    cell.ids[2] = -1;
                                    cell.ids[3] = -1;
                                    cell.ids[4] = tilesetIndex;
                                    cell.ids[5] = tileIndex;
                                } else {
                                    cell.ids[4] = tilesetIndex;
                                    cell.ids[5] = tileIndex;
                                }
                                applied = true;
                            } else if (this.layer2Flags.length > 0) {
                                if (cell.ids.length < 2) {
                                    cell.ids = [-1, -1, tilesetIndex, tileIndex];
                                } else {
                                    cell.ids[2] = tilesetIndex;
                                    cell.ids[3] = tileIndex;
                                }
                                applied = true;
                            } else if (this.layer1Flags.length > 0) {
                                cell.ids[0] = tilesetIndex;
                                cell.ids[1] = tileIndex;
                                applied = true;
                            }
                        }
                        //console.log(cell);
                        if (applied && cell.ids.length >= 2) {
                            let currentTileIndex = cell.ids[cell.ids.length - 1];
                            let currentTilesetIndex = cell.ids[cell.ids.length - 2];
                            if (currentTilesetIndex >= 0 && currentTileIndex >= 0) {
                                let tileset = this.tilesets[currentTilesetIndex];
                                let tile = tileset.obj.tiles[currentTileIndex];
                                //console.log('tile.cost = ' + tile.cost);
                                cell.cost = tile.cost == undefined ? 0 : tile.cost;
                            } else {
                                cell.cost = 0;
                            }
                        }
                        //console.log('cell.cost = ' + cell.cost);
                        //console.log("added: [" + tilesetIndex + ", " + tileIndex + "] => [" + row + ", " + col + "]");
                    }
                    pos++;
                    x += this.tileWidth;
                }
                x = 0;
                y += this.tileHeight;
            }

        } else {

            if (remove === true) return;

            let tileIndexes = this.tilesetControl.getCurrentTileIndexes();
            if (tileIndexes.length <= 0) return;

            let startRect = { x: this.currentRect.x, y: this.currentRect.y, w: this.tileWidth, h: this.tileHeight };
            let endRect = { x: this.currentRect.x + this.cursorCanvas.width - this.tileWidth, 
                y: this.currentRect.y + this.cursorCanvas.height - this.tileHeight, w: this.tileWidth, h: this.tileHeight };

            let x= 0, y = 0, pos = 0, idx = -1;
            for (let row=0; row<this.tilemap.rowCount; row++) {
                for (let col=0; col<this.tilemap.columnCount; col++) {
                    if (x >= startRect.x && x <= endRect.x && y >= startRect.y && y <= endRect.y) {
                        idx++;
                        let applied = false;
                        let tileIndex = tileIndexes[idx];
                        let cell = this.tilemap.cells[pos];
                        //if (replacement || cell.ids[0] == -1) {
                        //    cell.ids = [tilesetIndex, tileIndex];
                        //} else {
                        //    cell.ids.push(tilesetIndex);
                        //    cell.ids.push(tileIndex);
                        //}
                        if (this.layer3Flags.length > 0) {
                            if (cell.ids.length < 2) {
                                cell.ids = [-1, -1, -1, -1, tilesetIndex, tileIndex];
                            } else if (cell.ids.length < 4) {
                                cell.ids[2] = -1;
                                cell.ids[3] = -1;
                                cell.ids[4] = tilesetIndex;
                                cell.ids[5] = tileIndex;
                            } else {
                                cell.ids[4] = tilesetIndex;
                                cell.ids[5] = tileIndex;
                            }
                            applied = true;
                        } else if (this.layer2Flags.length > 0) {
                            if (cell.ids.length < 2) {
                                cell.ids = [-1, -1, tilesetIndex, tileIndex];
                            } else {
                                cell.ids[2] = tilesetIndex;
                                cell.ids[3] = tileIndex;
                            }
                            applied = true;
                        } else if (this.layer1Flags.length > 0) {
                            cell.ids[0] = tilesetIndex;
                            cell.ids[1] = tileIndex;
                            applied = true;
                        }
                        //console.log(cell);
                        if (applied && cell.ids.length >= 2) {
                            let currentTileIndex = cell.ids[cell.ids.length - 1];
                            let currentTilesetIndex = cell.ids[cell.ids.length - 2];
                            if (currentTilesetIndex >= 0 && currentTileIndex >= 0) {
                                let tileset = this.tilesets[currentTilesetIndex];
                                let tile = tileset.obj.tiles[currentTileIndex];
                                //console.log('tile.cost = ' + tile.cost);
                                cell.cost = tile.cost == undefined ? 0 : tile.cost;
                            } else {
                                cell.cost = 0;
                            }
                        }
                        //console.log('cell.cost = ' + cell.cost);
                    }
                    pos++;
                    x += this.tileWidth;
                }
                x = 0;
                y += this.tileHeight;
            }

        }

        this.record();

        this.refreshTilemapDisplay();

        this.startRect = { x: 0, y: 0, w: 0, h: 0 };
        this.endRect = { x: 0, y: 0, w: 0, h: 0 };
        
    }

    refreshTilemapDisplay() {
        //console.log(this.layer1Flags, this.layer2Flags, this.layer3Flags);
        //console.log(this.layer1Flags.length, this.layer2Flags.length, this.layer3Flags.length);
        let ctx = this.tilemapCanvas ? this.tilemapCanvas.getContext('2d') : null;
        if (ctx) {
            ctx.clearRect(0, 0, this.tilemapCanvas.width, this.tilemapCanvas.height);
            //ctx.fillStyle = "rgba(128, 128, 128, 0.5)";
            ctx.fillStyle = this.hexToRGBA(this.tilemap.bgcolor ? this.tilemap.bgcolor : "#00000000");
            let x= 0, y = 0, pos = 0;
            for (let row=0; row<this.tilemap.rowCount; row++) {
                for (let col=0; col<this.tilemap.columnCount; col++) {
                    let cell = this.tilemap.cells[pos], layer = 0;
                    for (let idx=0; idx<cell.ids.length; idx+=2) {
                        layer++;
                        if (this.layer1Flags.length <= 0 && layer == 1) {
                            ctx.fillRect(x, y, this.tileWidth, this.tileHeight);
                            continue;
                        }
                        if (this.layer2Flags.length <= 0 && layer == 2) {
                            ctx.fillRect(x, y, this.tileWidth, this.tileHeight);
                            continue;
                        }
                        if (this.layer3Flags.length <= 0 && layer == 3) {
                            ctx.fillRect(x, y, this.tileWidth, this.tileHeight);
                            continue;
                        }
                        let tilesetIndex = cell.ids[idx];
                        let tileIndex = cell.ids[idx+1];
                        if (tilesetIndex >= 0 && tilesetIndex < this.tilesets.length && tileIndex >= 0) {
                            let tileset = this.tilesets[tilesetIndex];
                            let tile = tileset ? tileset.obj.tiles[tileIndex] : null;
                            if (tileset && tile) 
                                ctx.drawImage(tileset.img, tile.offsets[0], tile.offsets[1], this.tileWidth, this.tileHeight, 
                                            x, y, this.tileWidth, this.tileHeight);
                        } else {
                            ctx.fillRect(x, y, this.tileWidth, this.tileHeight);
                        }
                    }
                    pos++;
                    x += this.tileWidth;
                }
                x = 0;
                y += this.tileHeight;
            }
        }
    }

    saveTilemap() {

        /*
        if (this.tilemap && this.tilemap.name && this.tilemap.cells.length > 0) {
            ipcRenderer.once("save-tilemap-return", (event, result) => {
                if (result.err) alert(result.err);
                else alert(this.i18n.tr("app.save-file-ok") + "\n\n" + result.url + "\n");
            });
            ipcRenderer.send("save-tilemap", this.tilemap);
        }
        */

        if (!this.tilemap || !this.tilemap.name) return;

        let canv = document.createElement("canvas");
        canv.width = this.tilemapCanvas.width;
        canv.height = this.tilemapCanvas.height;

        let ctx = canv.getContext("2d");
        ctx.drawImage(this.tilemapBg, 0, 0);
        ctx.drawImage(this.tilemapCanvas, 0, 0);

        console.log("Going to save tilemap - " , this.tilemap.name);
        let tilemapFileSetting = {
            tilemapData: this.tilemap,
            tilemapFile: this.getProjectResPath() + "/json/tilemaps/" + this.tilemap.name + ".json",
            tilemapPreview: this.getProjectDesignPath() + "/collector/tilemaps/" + this.tilemap.name + ".pv.jpg",
            tilemapPicture: canv.toDataURL(),
        };

        

        (window.parent as any).appEvent.publish('dlg-save-tilemap-file', tilemapFileSetting);
    }

    fillUp() {
        this.startRect.x = 0;
        this.startRect.y = 0;
        this.startRect.w = this.tileWidth;
        this.startRect.h = this.tileHeight;

        this.endRect.x = this.tilemapCanvas.width - this.tileWidth;
        this.endRect.y = this.tilemapCanvas.height - this.tileHeight;
        this.endRect.w = this.tileWidth;
        this.endRect.h = this.tileHeight;

        this.applyCurrentTiles(true);
    }

    updateCursorImage(showingAreaRect?: boolean) {

        let canvasWidth = this.tileWidth;
        let canvasHeight = this.tileHeight;
        let tileRects = this.tilesetControl ? this.tilesetControl.getCurrentTileRects() : null;
        if (showingAreaRect === true) tileRects = null;
        if (this.cursorCanvas && tileRects && tileRects.length > 0 && this.tilesetControl.tileset && this.tilesetControl.image) {
            
            if (this.tilesetControl.startRect && this.tilesetControl.endRect) {

                canvasWidth = this.tilesetControl.endRect.x + this.tilesetControl.endRect.w - this.tilesetControl.startRect.x;
                canvasHeight = this.tilesetControl.endRect.y + this.tilesetControl.endRect.h - this.tilesetControl.startRect.y;

                this.cursorCanvas.style.visibility = "visible";
                this.cursorCanvas.width = canvasWidth;
                this.cursorCanvas.height = canvasHeight;
                let ctx = this.cursorCanvas.getContext('2d');

                let x = 0, y = 0, idx = 0;
                while (ctx && idx < tileRects.length && y < canvasHeight) {
                    let tile = tileRects[idx];
                    ctx.drawImage(this.tilesetControl.image, tile.x, tile.y, tile.w, tile.h, x, y, tile.w, tile.h);
                    x += this.tileWidth;
                    if (x >= canvasWidth) {
                        x = 0;
                        y += this.tileHeight;
                    }
                    idx++;
                }

            } else {

                this.cursorCanvas.style.visibility = "visible";
                this.cursorCanvas.width = canvasWidth;
                this.cursorCanvas.height = canvasHeight;
                let ctx = this.cursorCanvas.getContext('2d');

                let tile = tileRects[0];
                ctx.drawImage(this.tilesetControl.image, tile.x, tile.y, tile.w, tile.h, 0, 0, tile.w, tile.h);

            }

        } else {

            if (this.gridFlags.length == 0 && this.cursorCanvas) {
                this.cursorCanvas.style.visibility = "visible";
                this.cursorCanvas.width = canvasWidth;
                this.cursorCanvas.height = canvasHeight;
                let ctx = this.cursorCanvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
                    ctx.lineWidth = 4;
                    ctx.strokeStyle = 'rgba(255,0,255,0.8)'; // fuchsia
                    ctx.strokeRect(0, 0, this.cursorCanvas.width, this.cursorCanvas.height);
                }
            }
        }

        
    }

    refreshTilemap() {
        //console.log("refreshing tilemap...");

        this.updateCursorImage();
        
        if (this.tilemapCanvas) {
            this.tilemapCanvas.width = this.tileWidth * this.columnCount;
            this.tilemapCanvas.height = this.tileHeight * this.rowCount;
        }
        this.tilemap.tilesetNames = [];
        for (let item of this.tilesets) this.tilemap.tilesetNames.push(item.name);
        if (!this.selectedTilesetName || this.tilemap.tilesetNames.indexOf(this.selectedTilesetName) < 0) {
            this.selectedTilesetName = this.tilemap.tilesetNames[0];
        }
        this.refreshTilemapBg();
        this.refreshTilemapDisplay();
        this.refreshTilemapGrids();

        this.changeCurrentTileset();
    }

    loadTilemap(tilemap: any, needReloadTilesets: boolean, callback?: ()=>void) {

        //console.log("loading tilemap - " + needReloadTilesets);

        this.tileWidth = tilemap.tileWidth;
        this.tileHeight = tilemap.tileHeight;
        this.columnCount = tilemap.columnCount;
        this.rowCount = tilemap.rowCount;

        if (needReloadTilesets) {
            this.tilesets = [];
            let tilesetNames = [];
            if (tilemap.tilesetNames == undefined) tilemap.tilesetNames = [];
            for (let item of tilemap.tilesetNames) {
                let existing = false;
                for (let tileset of this.tilesets) {
                    if (tileset.name == item) {
                        existing = true;
                        break;
                    }
                }
                if (!existing) tilesetNames.push(item);
                if (tilemap.tilesetNames.indexOf(item) < 0) tilemap.tilesetNames.push(item);
            }
            if (tilesetNames.length > 0) {
                this.loadTilesets(tilesetNames, () => {
                    this.reloadTilemap(tilemap);
                    if (callback) callback();
                });
            } else {
                this.reloadTilemap(tilemap);
                if (callback) callback();
            }
        } else {
            this.reloadTilemap(tilemap);
            if (callback) callback();
        }
        
    }

    addTileCost(posx, posy, value) {
        let x= 0, y = 0, pos = 0;
        for (let row=0; row<this.tilemap.rowCount; row++) {
            for (let col=0; col<this.tilemap.columnCount; col++) {
                if (x == posx && y == posy) {
                    let cell = this.tilemap.cells[pos];
                    if (cell.cost == undefined) cell.cost = 0;
                    cell.cost += value;
                    return;
                }
                pos++;
                x += this.tileWidth;
            }
            x = 0;
            y += this.tileHeight;
        }
    }

    resizeMap(newRowCount: number, newColCount: number) {
        
        let minRow = this.tilemap.rowCount >  newRowCount ? newRowCount : this.tilemap.rowCount;
        let minCol = this.tilemap.columnCount >  newColCount ? newColCount : this.tilemap.columnCount;

        let newCells = [];
        let oldCells = this.tilemap.cells;
        let x= 0, y = 0, pos = 0;
        for (let row=0; row<newRowCount; row++) {
            for (let col=0; col<newColCount; col++) {
                let newCell = { cost: -1, ids: [-1, -1] };
                if (row < this.tilemap.rowCount && col < this.tilemap.columnCount) {
                    let oldCell = oldCells[row * this.tilemap.columnCount + col];
                    if (oldCell.cost != undefined) newCell.cost = oldCell.cost;
                    if (oldCell.ids != undefined) newCell.ids = oldCell.ids;
                }
                newCells[pos] = newCell;
                pos++;
                x += this.tileWidth;
            }
            x = 0;
            y += this.tileHeight;
        }

        oldCells = [];

        this.tilemap.cells = newCells;
        this.tilemap.rowCount = newRowCount;
        this.tilemap.columnCount = newColCount;

        this.rowCount = this.tilemap.rowCount;
        this.columnCount = this.tilemap.columnCount;
        
    }

    reloadTilemap(tilemap) {
        this.tilemap = JSON.parse(JSON.stringify(tilemap));
        if (this.tilemap.bgcolor == undefined) this.tilemap.bgcolor = "#00000000";

        let x= 0, y = 0, pos = 0;
        for (let row=0; row<this.tilemap.rowCount; row++) {
            for (let col=0; col<this.tilemap.columnCount; col++) {
                let cell = this.tilemap.cells[pos];
                if (cell.cost == undefined && cell.ids.length >= 2) {
                    let tilesetIndex = cell.ids[cell.ids.length - 2];
                    let tileIndex = cell.ids[cell.ids.length - 1];
                    if (tilesetIndex >= 0 && tileIndex >= 0) {
                        let tileset = this.tilesets[tilesetIndex];
                        let tile = tileset.obj.tiles[tileIndex];
                        cell.cost = tile.cost == undefined ? 0 : tile.cost;
                    } else {
                        cell.cost = 0;
                    }
                }
                pos++;
                x += this.tileWidth;
            }
            x = 0;
            y += this.tileHeight;
        }

        this.refreshTilemap();
    }

    openTilemap(tilemapName: string) {
        let url = this.getProjectResPath() + "/json/tilemaps/" + tilemapName + ".json";
        HttpClient.getJSON(url, "", (json) => {
            let tilemap = json;
            //console.log(tilemap);
            this.loadTilemap(tilemap, true, () => {
                this.clearHist();
                this.record();

                //this.bgFlags = ["layerBG"];
                //this.layer1Flags = ["layerValue1"];
                //this.layer2Flags = ["layerValue2"];
                //this.layer3Flags = ["layerValue3"];

                if (this.bgFlags.length > 0) this.bgFlags.splice(0, 1);
                this.bgFlags.push("layerBG");
                if (this.layer1Flags.length > 0) this.layer1Flags.splice(0, 1);
                this.layer1Flags.push("layerValue1");
                if (this.layer2Flags.length > 0) this.layer2Flags.splice(0, 1);
                this.layer2Flags.push("layerValue2");
                if (this.layer3Flags.length > 0) this.layer3Flags.splice(0, 1);
                this.layer3Flags.push("layerValue3");
            });
        }, (errmsg) => {
            alert("Failed to load tilemap data from - " + url);
            alert("Error - " + errmsg);
        });
    }

    openSelectTilemapDlg() {
        this.dialogService.open({viewModel: SelectTilemapDlg})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                //console.log(response.output);
                if (response.output.length > 0) this.openTilemap(response.output[0]);
            } else {
                console.log('Give up selecting tilemap');
            }
        });
    }

    openSaveTilemapDlg() {
        this.dialogService.open({viewModel: SaveTilemapDlg, model: this.tilemap.name})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                //console.log(response.output);
                if (response.output.length > 0) this.tilemap.name = response.output;
                this.saveTilemap();
            } else {
                console.log('Give up saving tilemap');
            }
        });
    }

    openCreateTilesetDlg() {
        console.log("openCreateTilesetDlg...");
        //(window.parent as any).appEvent.publish('ide-edit-tileset');
        //let tileset = tilesetName ? tilesetName : "tileset1";
        
    }

    openEditTilesetDlg() {
        console.log("openEditTilesetDlg...");

        this.dialogService.open({viewModel: SelectTilesetDlg, model: {multiple: false}})
        .whenClosed((response) => {
            if (!response.wasCancelled && response.output) {
                //console.log(response.output);
                //if (response.output.length > 0) this.openTileset(response.output[0]);
                let tilesetName = "";
                let tilesetNames = [];
                for (let item of response.output) {
                    tilesetName = item;
                    if (tilesetName) break;
                }
                if (!tilesetName) return;
                let tileset = tilesetName;
                this.dialogService.open({viewModel: EditTilesetDlg, model: tileset})
                .whenClosed((response) => {
                    if (!response.wasCancelled && response.output) {
                        console.log(response.output);
                    } else {
                        console.log('Give up updating tileset');
                    }
                });
                
            } else {
                console.log('Give up selecting tilesets');
            }
        });

        
    }

    undo() {
        if (this.histRecords.length > 0 && this.histCursor > 0) {
            this.histCursor--;
            this.loadTilemap(this.histRecords[this.histCursor], false);
        }
    }

    redo() {
        if (this.histRecords.length > 0 && this.histCursor < this.histRecords.length - 1) {
            this.histCursor++;
            this.loadTilemap(this.histRecords[this.histCursor], false);
        }
    }

    createNewFile() {
        console.log("createNewFile...");
    }
    openFile() {
        console.log("openFile...");
        this.openSelectTilemapDlg();
    }
    saveFile() {
        console.log("saveFile...");
        this.saveTilemap();
    }
    saveFileAs() {
        console.log("saveFileAs...");
    }

}
