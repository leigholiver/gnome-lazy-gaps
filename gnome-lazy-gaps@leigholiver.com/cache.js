const ext = imports.misc.extensionUtils.getCurrentExtension();
const windows = ext.imports.windows;
const debug = ext.imports.debug;

let windowCache = {}

function getPos(metaWindow) {
    let window = windows.getWindow(metaWindow)
    let cachedWindow = windowCache[window.id]
    if (cachedWindow) {
        debug.log(`restoring window ${window.id} at ${window.width} ${window.height}`)
    }
    return windowCache[window.id]
}

function cachePos(metaWindow) {
    const window = windows.getWindow(metaWindow)
    debug.log(`caching window ${window.id} at ${window.width} ${window.height}`)
    windowCache[window.id] = window
}
