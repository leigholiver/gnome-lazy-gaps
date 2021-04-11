const ext = imports.misc.extensionUtils.getCurrentExtension();
const handlers = ext.imports.handlers;

let _wm_connections = [];
let _display_connections = [];


function enable() {
    // https://developer.gnome.org/shell/stable/shell-shell-wm.html
    _wm_connections.push(global.window_manager.connect('size-changed', handlers.sizeChange));

    // https://developer.gnome.org/meta/stable/MetaDisplay.html
    _display_connections.push(global.display.connect('window-created', handlers.windowCreated));
    _display_connections.push(global.display.connect('grab-op-begin', handlers.grabOpBegin));
    _display_connections.push(global.display.connect('grab-op-end', handlers.grabOpEnd));
}


function disable() {
    _wm_connections.forEach( (conn) => {
        global.window_manager.disconnect(conn);
    })
    _wm_connections = [];


    _display_connections.forEach( (conn) => {
        global.display.disconnect(conn);
    })
    _display_connections = [];
}
