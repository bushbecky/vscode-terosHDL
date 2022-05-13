import * as Utils from '../project_manager/utils';


export function get_yosys_read_file(sources, backend, working_directory) {
    let vhdl_files: string[] = [];
    let verilog_files: string[] = [];
    for (let i = 0; i < sources.length; i++) {
        const element = <string>sources[i];
        const path_lib = require('path');

        let relative_path_file = element;
        if (backend !== 'yosys_ghdl' && backend !== 'yosys_ghdl_module') {
            const fs = require('fs');
            let filename = path_lib.basename(element);
            let dest = path_lib.join(working_directory, filename);
            fs.copyFileSync(element, dest);
            relative_path_file = filename;
        }

        let lang = Utils.get_file_lang(relative_path_file);
        if (lang === 'vhdl') {
            vhdl_files.push(relative_path_file);
        }
        else if (lang === 'verilog' || lang === 'systemverilog') {
            verilog_files.push(relative_path_file);
        }

    }
    if (vhdl_files.length > 0 && backend !== 'yosys_ghdl' && backend !== 'yosys_ghdl_module') {
        return undefined;
    }

    let more = '';
    let cmd = '';
    if (vhdl_files.length > 0) {
        cmd += get_yosys_read_file_command_vhdl(vhdl_files);
        more = '; ';
    }
    if (verilog_files.length > 0) {
        cmd += more + get_yosys_read_file_command_verilog(verilog_files);
    }
    return cmd;
}

export function get_yosys_read_file_command_vhdl(sources) {
    let cmd = 'ghdl --std=08 -fsynopsys';
    for (let i = 0; i < sources.length; i++) {
        const element = sources[i];
        cmd += ` ${element}`;
    }
    cmd += ' -e';
    return cmd;
}

export function get_yosys_read_file_command_verilog(sources) {
    let cmd = 'read_verilog -sv';
    for (let i = 0; i < sources.length; i++) {
        const element = sources[i];
        cmd += ` ${element}`;
    }
    return cmd;
}

export function normalize_netlist(netlist) {
    try {
        let norm_netlist = netlist;
        let modules = netlist.modules;

        // Obteniendo todas las claves del JSON
        for (let module in modules) {
            let cells_module = modules[module].cells;
            for (let cell in cells_module) {
                let cell_i = cells_module[cell];
                // if (cell_i.type === '$dff') {
                //     cell_i.type = 'D-Flip Flop';
                // }
                // else if (cell_i.type === '$adff') {
                //     cell_i.type = 'D-Flip Flop areset';
                // }
                // else if (cell_i.type === '$eq') {
                //     cell_i.type = 'equal';
                // }
                // else {
                //     cell_i.type = cell_i.type.replace('$', '');
                // }
                if (cell_i.port_directions === undefined) {
                    let tt = cell_i.connections;
                    cell_i.port_directions = {};
                    for (let port in cell_i.connections) {
                        cell_i.port_directions[port] = 'input';
                    }
                }
            }
        }
        norm_netlist.modules = modules;
        return norm_netlist;
    }
    catch (e) {
        return netlist;
    }
}