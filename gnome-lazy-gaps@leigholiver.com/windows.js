const Meta = imports.gi.Meta;

const ext = imports.misc.extensionUtils.getCurrentExtension();
const debug = ext.imports.debug;

// todo: expose as a setting
const gap = 20


function moveWindow(metaWindow, pos) {
    if(metaWindow.get_maximized()) {
        metaWindow.unmaximize(metaWindow.get_maximized())
    }
    metaWindow.move_resize_frame(true, pos.x, pos.y, pos.width, pos.height)
}


function getWindow(metaWindow) {
    return {
        id: metaWindow.get_gtk_window_object_path(),
        title: metaWindow.get_title(),
        width: metaWindow.get_frame_rect().width,
        height: metaWindow.get_frame_rect().height,
        x: metaWindow.get_frame_rect().x,
        y: metaWindow.get_frame_rect().y,
    }
}


function getMonitor(metaWindow) {
    return {
        width: metaWindow.get_work_area_current_monitor().width,
        height: metaWindow.get_work_area_current_monitor().height,
        x: metaWindow.get_work_area_current_monitor().x,
        y: metaWindow.get_work_area_current_monitor().y,
    }
}


function sizeIsChanging(newWindow, startingWindow) {
    return newWindow.width !== startingWindow.width || newWindow.height !== startingWindow.height
}


function isTiled(meta_window, side) {
    const window = getWindow(meta_window);
    let pos = positions(meta_window)['nogaps']

    const windowSizePos = {
        width: window.width,
        height: window.height,
        x: window.x,
        y: window.y,
    }

    if(JSON.stringify(windowSizePos) === JSON.stringify(pos[side])) {
        return true;
    }

    return false;
}


function isMaximized(meta_window) {
    const monitor = getMonitor(meta_window)
    const window = getWindow(meta_window);

    if(meta_window.get_maximized() === Meta.MaximizeFlags.BOTH ||
        (window.width == monitor.width && window.height == monitor.height)
    ) {
        return true;
    }

    return false;
}


function hasGaps(meta_window) {
    const window = getWindow(meta_window);
    let gapOptions = positions(meta_window)['gaps']

    const windowSizePos = {
        width: window.width,
        height: window.height,
        x: window.x,
        y: window.y,
    }

    let keys = Object.keys(gapOptions)
    for (var index in keys) {
        if(JSON.stringify(windowSizePos) === JSON.stringify(gapOptions[keys[index]])) {
            return true;
        }
    }

    return false;
}

function isBugged(meta_window) {
    const window = getWindow(meta_window);
    let gapOptions = positions(meta_window)['bugged']

    const windowSizePos = {
        width: window.width,
        height: window.height,
        x: window.x,
        y: window.y,
    }

    let keys = Object.keys(gapOptions)
    for (var index in keys) {
        if(JSON.stringify(windowSizePos) === JSON.stringify(gapOptions[keys[index]])) {
            return keys[index];
        }
    }

    return false;
}

function positions(meta_window) {
    const monitor = getMonitor(meta_window)
    let midPoint = monitor.x + (monitor.width/2)

    return {
        nogaps: {
            max: {
                width: monitor.width,
                height: monitor.height,
                x: monitor.x,
                y: monitor.y,
            },

            left: {
                width: monitor.width/2,
                height: monitor.height,
                x: monitor.x,
                y: monitor.y,
            },

            right: {
                width: monitor.width/2,
                height: monitor.height,
                x: midPoint,
                y: monitor.y,
            }
        },
        gaps: {
            max: {
                width: monitor.width - (gap*2),
                height: monitor.height - (gap*2),
                x: monitor.x + gap,
                y: monitor.y + gap,
            },

            left: {
                width: (monitor.width/2) - (gap*2),
                height: monitor.height - (gap*2),
                x: monitor.x + gap,
                y: monitor.y + gap,
            },

            right: {
                width: (monitor.width/2) - (gap*2),
                height: monitor.height - (gap*2),
                x: midPoint  + (gap / 2),
                y: monitor.y + gap,
            }
        },
        bugged: {
            max: {
                width: monitor.width - (gap*2),
                height: monitor.height - (gap*2),
                x: monitor.x,
                y: monitor.y,
            },

            left: {
                width: (monitor.width/2) - (gap*2),
                height: monitor.height - (gap*2),
                x: monitor.x + gap,
                y: monitor.y + (gap*2),
            },

            right: {
                width: (monitor.width/2) - (gap*2),
                height: monitor.height - (gap*2),
                x: midPoint,
                y: monitor.y,
            }
        }
    }
}
