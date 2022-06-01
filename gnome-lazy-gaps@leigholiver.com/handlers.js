const Meta = imports.gi.Meta;
const Mainloop = imports.mainloop;

const ext = imports.misc.extensionUtils.getCurrentExtension();
const windows = ext.imports.windows;
const cache = ext.imports.cache;
const debug = ext.imports.debug;

let inGrabOp = false;


function windowCreated(meta_display, meta_window) {
    if(!meta_window || meta_window.window_type !== Meta.WindowType.NORMAL) return;

    debug.log("windowCreated")

    if(windows.isMaximized(meta_window)) {
        debug.log(`add gaps to maximised window ${meta_window.get_title()}`)
        const window = windows.getWindow(meta_window);
        const position = windows.positions(meta_window)['gaps']['max']
        windows.moveWindow(meta_window, position)

    }
    else if(windows.isTiled(meta_window, 'left')) {
        debug.log(`add gaps to tiled left window ${meta_window.get_title()}`)
        const window = windows.getWindow(meta_window);
        const position = windows.positions(meta_window)['gaps']['left']
        windows.moveWindow(meta_window, position)
    }
    else if(windows.isTiled(meta_window, 'right')) {
        debug.log(`add gaps to tiled right window ${meta_window.get_title()}`)
        const window = windows.getWindow(meta_window);
        const position = windows.positions(meta_window)['gaps']['right']
        windows.moveWindow(meta_window, position)
    }
    else if(windows.hasGaps(meta_window)) {
        debug.log(`ignore already-gapped window ${meta_window.get_title()}`)
    }
    else {
        debug.log(`not maximised, cache position of  ${meta_window.get_title()}`)
        cache.cachePos(meta_window)
    }
}


function grabOpBegin(meta_display, meta_screen, meta_window, meta_grab_op) {
    if(!meta_window || meta_window.window_type !== Meta.WindowType.NORMAL) return;

    debug.log("grabOpBegin")
    inGrabOp = true;

    if(windows.hasGaps(meta_window)) {
        debug.log(`grab op on gapped window - waiting for it to move ${meta_window.get_title()}`)

        const window = windows.getWindow(meta_window);
        restoreIfMoved(meta_window, window)
    }
    else if(windows.isMaximized(meta_window) || windows.isTiled(meta_window, 'left') || windows.isTiled(meta_window, 'right')) {
        debug.log(`ignore grab on maximised/tiled window, nothing to revert ${meta_window.get_title()}`)
    }
    else {
        debug.log(`cache size for ${meta_window.get_title()}`)
        cache.cachePos(meta_window)
    }
}


function grabOpEnd(meta_display, meta_screen, meta_window, meta_grab_op) {
    if(!meta_window || meta_window.window_type !== Meta.WindowType.NORMAL) return;

    debug.log("grabOpEnd")
    inGrabOp = false;

    if(windows.isMaximized(meta_window) || windows.isTiled(meta_window, 'left') ||
            windows.isTiled(meta_window, 'right') || windows.hasGaps(meta_window)) {
        // nothing to do
        debug.log(`ignoring grab on maximized/tiled/gapped window${meta_window.get_title()}`)
    }
    else {
        debug.log(`cache new size window grabopend ${meta_window.get_title()}`)
        cache.cachePos(meta_window)
    }
}


function sizeChange(shellwm, meta_window_actor, change) {
    if (meta_window_actor.meta_window.window_type !== Meta.WindowType.NORMAL) return;

    debug.log("sizeChange")

    const meta_window = meta_window_actor.meta_window;
    const window = windows.getWindow(meta_window);

    // the position to move the window to in order to add gaps
    let position = false;

    // check if the window is bugged
    const buggedPosition = windows.isBugged(meta_window);
    if(buggedPosition) {
        debug.log(`window ${meta_window.get_title()} is bugged in the ${buggedPosition} position - re-positioning window`);
        position = windows.positions(meta_window)['gaps'][buggedPosition]

        // delay this to prevent recursion errors when a new window is opening in the bugged position
        Mainloop.timeout_add(10, () => { windows.moveWindow(meta_window, position); });
        return;
    }

    // check if window was maximised
    if(meta_window.get_maximized() === Meta.MaximizeFlags.BOTH) {
        debug.log(`add gaps to maximized window ${meta_window.get_title()}`);
        position = 'max';
    }
    // window was (probably) tiled
    else if(meta_window.get_maximized() === Meta.MaximizeFlags.VERTICAL) {
        if(windows.isTiled(meta_window, 'left')) {
            debug.log(`add gaps to tiled left window ${meta_window.get_title()}`);
            position = 'left';
        }
        else if(windows.isTiled(meta_window, 'right')) {
            debug.log(`add gaps to tiled right window ${meta_window.get_title()}`);
            position = 'right';
        }
    }

    // reposition the window if necessary
    if(position) {
        position = windows.positions(meta_window)['gaps'][position]
        windows.moveWindow(meta_window, position)
    }
}




/**
 * fix for an issue where clicking on the titlebar of some windows
 * would restore the size,  even though the window hadn't moved...
 * every 10ms we check if the window is still in a grab op and in
 * the same place - when it has moved we restore the size
 */
 function restoreIfMoved(meta_window, starting_position) {
    if(!inGrabOp) return

    let newWindow = windows.getWindow(meta_window);

    if(JSON.stringify(newWindow) !== JSON.stringify(starting_position)) {

        if(!windows.sizeIsChanging(newWindow, starting_position)) {
            debug.log(`restore cached size for window ${meta_window.get_title()}`)
            const position = cache.getPos(meta_window)
            restoreCachedPosition(meta_window, position)
        }
        else {
            debug.log(`ignore moved window as it is resizing ${meta_window.get_title()}`)
        }

        return
    }

    debug.log(`window has not moved - wait another 10ms ${meta_window.get_title()}`)
    Mainloop.timeout_add(10, () => { restoreIfMoved(meta_window, starting_position); })
}


/**
 * an issue where dragging the right hand side of maximised
 * windows does not place the window underneath the mouse cursor
 */
function restoreCachedPosition(metaWindow, cachedWindow, isBugged = null) {

    /**
     * essentially we want to move the window back under the mouse cursor, and you'd
     * think that `window.x = mouse_x - (cachedWindow.width / 2)` would suffice - but
     * as soon as the window moves any further, the position jumps back
     *
     * i've tried to use `MainLoop.timeout_add` to keep it in place, but that is
     * ignored whilst the window is moving, which makes it a bit jumpy even at 1ms
     *
     * the bug lives for now
     */

    if(!inGrabOp || !cachedWindow) return

    let window = windows.getWindow(metaWindow)
    let [mouse_x, mouse_y, mask] = global.get_pointer();


    if(mouse_x > window.x + cachedWindow.width) {
        debug.log("applying fix for window-isnt-under-the-cursor bug")

        debug.log(`old x ${window.x}`)
        debug.log(`mouse x ${mouse_x}`)
        debug.log(`cachedWindow.width / 2 ${cachedWindow.width / 2}`)

        window.x = mouse_x - (cachedWindow.width / 2)
        debug.log(`new x ${window.x}`)
    }

    windows.moveWindow(metaWindow, {
        width: cachedWindow.width,
        height: cachedWindow.height,
        x: window.x,
        y: window.y,
    })

    // tell the window manager that we've changed the window size
    // note this doesnt work either
    // const metaWindowActor = metaWindow.get_compositor_private()
    // global.window_manager.completed_size_change(metaWindowActor);
}
