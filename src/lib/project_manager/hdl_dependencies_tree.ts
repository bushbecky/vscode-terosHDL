// Copyright 2020 Teros Technology
//
// Ismael Perez Rojo
// Carlos Alberto Ruiz Naranjo
// Alfredo Saez
//
// This file is part of Colibri.
//
// Colibri is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Colibri is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Colibri.  If not, see <https://www.gnu.org/licenses/>.

/* eslint-disable @typescript-eslint/class-name-casing */
import * as vscode from 'vscode';
import * as path from 'path';
import * as utils from "./utils";
import * as Output_channel_lib from '../utils/output_channel';
const fs = require('fs');

const ERROR_CODE = Output_channel_lib.ERROR_CODE;

export class Hdl_dependencies_tree implements vscode.TreeDataProvider<Dependency> {

    private _onDidChangeTreeData: vscode.EventEmitter<Dependency | undefined | void> = new vscode.EventEmitter<Dependency | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<Dependency | undefined | void> = this._onDidChangeTreeData.event;
    private hdl_tree : any[];
    private toplevel_path : string = '';
    private entity_toplevel: string = '';
    private output_channel : Output_channel_lib.Output_channel;

    constructor(context, output_channel) {
        let hdl_tree = {
            "root": []
        };

        this.output_channel = output_channel;
        this.hdl_tree = hdl_tree.root;
        context.subscriptions.push(
            vscode.commands.registerCommand('teroshdl.go_to_parent', async () => {
                this.go_to_parent_file();
            })
        ); 
    }

    go_to_parent_file() {
        //Get current document
        let active_editor = vscode.window.activeTextEditor;
        if (!active_editor) {
            return;
        }
        let document = active_editor.document;
        if (document === undefined) {
            return;
        }
        let filename = document.uri.fsPath;
        let hdl_tree = this.hdl_tree;
        let parent = undefined;
        for (let i = 0; i < hdl_tree.length; i++) {
            const dependencies = hdl_tree[i].dependencies;
            for (let j = 0; j < dependencies.length; j++) {
                const element = dependencies[j];
                if (element === filename) {
                    if (fs.existsSync(hdl_tree[i].filename)) {
                        parent = hdl_tree[i].filename;
                        break;
                      }
                }
            }
        }
        if (parent === undefined) {
            this.output_channel.show_message(ERROR_CODE.NOT_PARENT, '');
        }
        else {
            utils.open_file(parent, this.output_channel);
        }
    }

    set_hdl_tree(hdl_tree, toplevel_path){
        if (hdl_tree === undefined || hdl_tree.root === undefined || toplevel_path === undefined){
            return;
        }
        this.toplevel_path = toplevel_path;
        this.hdl_tree = hdl_tree.root;
        //Search toplevel
        let entity_toplevel = '';
        for (let i = 0; i < this.hdl_tree.length; i++) {
            const element = this.hdl_tree[i];
            if (element.filename === toplevel_path){
                entity_toplevel = element.entity;
            }
        }
        let speciap_dep = {filename: entity_toplevel, dependencies: [toplevel_path], entity: entity_toplevel};
        this.entity_toplevel = entity_toplevel;
        this.hdl_tree.push(speciap_dep);
        this._onDidChangeTreeData.fire();
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: Dependency): vscode.TreeItem {
        return element;
    }

    getChildren(element?: Dependency): Thenable<Dependency[]> {
        if (element) {
            return Promise.resolve(this.get_deps(<string>element.filename));
        } else {
            return Promise.resolve(this.get_deps(this.entity_toplevel));
        }
    }

    private get_deps(root_element: string): Dependency[] {
        let current_dep;
        for (let i = 0; i < this.hdl_tree.length; i++) {
            const element = this.hdl_tree[i];
            if (element.filename === root_element){
                current_dep = element;
            }
            
        }

        if (current_dep === undefined){
            let empty_dep = [];
            return empty_dep;
        }

        const toDep = (filename: string): Dependency => {
            let entity_name = '';
            for (let i = 0; i < this.hdl_tree.length; i++) {
                const element = this.hdl_tree[i];
                if (element.filename === filename){
                    entity_name = element.entity;
                }
                
            }
            return new Dependency(filename, entity_name, vscode.TreeItemCollapsibleState.Collapsed);
        };

        current_dep.dependencies = current_dep.dependencies.sort();

        const deps = current_dep.dependencies
            ? Object.keys(current_dep.dependencies).map(dep => toDep(current_dep.dependencies[dep]))
            : [];
        return deps;
    }
}

export class Dependency extends vscode.TreeItem {
    path : string;
    constructor(
        public readonly filename: string,
        public readonly entity_name: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(entity_name, collapsibleState);
        this.filename = filename;
        this.tooltip = filename;
        this.path = filename;
        this.description = filename;
        this.command = {
            command: "teroshdl_tree_view.open_file",
            title: "Select Node",
            arguments: [this],
        };
        }

    contextValue = 'dependency';
}