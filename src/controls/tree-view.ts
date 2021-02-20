
import { autoinject, customElement, bindable, observable } from 'aurelia-framework';
import { EventAggregator, Subscription } from 'aurelia-event-aggregator';
import { Router } from 'aurelia-router';

import { DialogService } from 'aurelia-dialog';
import { I18N } from 'aurelia-i18n';

import { App } from "../app";
import { HttpClient } from "../http-client";

@autoinject()
@customElement('tree-view')
export class TreeView {

    gui: any = null;

    @bindable treeId: string = "";
    @bindable rootName: string = "";
    @bindable signalName: string = "";
    @bindable dataSource: string = "";
    @bindable sourcePath: string = "";

    subscribers: Array<Subscription> = [];
    
    constructor(public router: Router, public eventChannel: EventAggregator, public i18n: I18N, public dialogService: DialogService) {
        this.subscribers = [];
    }

    attached(argument) {

        this.subscribers = [];

        if (this.treeId && this.treeId.length > 0) {
            this.gui = ($('#' + this.treeId) as any).tree.bind($('#' + this.treeId));
            if (this.gui) this.gui({
                onDblClick: (node) => {
                    if (node && node.attributes && node.attributes.data) {
                        this.eventChannel.publish("open-canvas", {
                            title: node.text,
                            content: node.attributes.data
                        });
                    }
                }
            });

            //this.updateTreeData();

            if (this.gui && this.rootName && this.dataSource && this.dataSource.length > 0) {
                HttpClient.getJSON(this.dataSource, null, (json) => {
                    //console.log(json);
                    if (json) this.gui("loadData", json[this.rootName]);
                });
            }
            
        }

        let signal = this.signalName ? this.signalName : "";
        if (signal.length > 0) this.eventChannel.publish(signal);
        
	}

	detached(argument) {
		for (let item of this.subscribers) item.dispose();
        this.subscribers = [];
    }

    private dataSourceChanged(newValue, oldValue) {
        console.log("dataSourceChanged: [" + oldValue + "] => [" + newValue + "]");
        if (this.rootName && this.dataSource && this.dataSource.length > 0) {
            HttpClient.getJSON(this.dataSource, null, (json) => {
                //console.log(json);
                if (json) this.gui("loadData", json[this.rootName]);
            });
        }
        
    }

    private sourcePathChanged(newValue, oldValue) {
        console.log("sourcePathChanged: [" + oldValue + "] => [" + newValue + "]");
        //this.updateTreeData();
    }

    /*
    updateTreeData() {
        if (this.gui && this.sourcePath) {
            App.getDirTree(this.sourcePath, (paths) => {
                //console.log(paths);
                let filepaths = [];
                for (let item of paths) {
                    let idx = item.indexOf(this.sourcePath);
                    if (idx < 0) continue;
                    let shortpath = item.substring(idx + this.sourcePath.length + 1);
                    filepaths.push(shortpath);
                }
                //console.log(filepaths);
                let treedata = this.genTreeData(filepaths);
                if (treedata && treedata.length > 0) {
                    this.updateEmptyFolderIcon(treedata[0]);
                    this.gui("loadData", treedata);
                }
                //console.log(treedata);
            });
        }
    }
    private genTreeData(paths: Array<string>): Array<any> {
        let treedata = [];
        let root = {
            id: 1,
            text: App.config.projectName,
            state: "open",
            children:[]
        };
        let nodeMap: Map<string, any> = new Map<string, any>();
        for (let item of paths) {
            let parts = item.split('/');
            let currentPath = "";
            for (let part of parts) {
                if (part.indexOf('.') < 0) {
                    let currentNode = root;
                    if (currentPath.length <= 0) currentPath = part;
                    else {
                        currentNode = nodeMap.get(currentPath);
                        currentPath += "/" + part;
                    }
                    if (!nodeMap.has(currentPath)) {
                        let newNode = {
                            text: part,
                            state: "open",
                            children:[]
                        };
                        nodeMap.set(currentPath, newNode);
                        if (currentNode) currentNode.children.push(newNode);
                    }
                }
                if (part.indexOf('.') > 0) {
                    let currentNode = root;
                    if (currentPath.length <= 0) currentPath = part;
                    else {
                        currentNode = nodeMap.get(currentPath);
                        currentPath += "/" + part;
                    }
                    if (currentNode) {
                        let newNode = {
                            text: part.substring(0, part.lastIndexOf('.')),
                            attributes: {
                                data: this.sourcePath + '/' + currentPath
                            }
                        };
                        currentNode.children.push(newNode);
                        App.setStageFilepath(newNode.text, newNode.attributes.data);
                    }
                }
            }
        }
        treedata.push(root);
        return treedata;
    }
    private updateEmptyFolderIcon(treeNode) {
        let items = treeNode.children;
        let attrs = treeNode.attributes;
        if (attrs) return;
        if (!items || items.length <= 0) {
            if (treeNode.id && treeNode.id == 1) return;
            else treeNode.iconCls = "icon-blank";
        } else {
            for (let item of items) this.updateEmptyFolderIcon(item);
        }
    }
    */

}
