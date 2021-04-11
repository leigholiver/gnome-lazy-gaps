
// set to `true` to enable debug logging
const debug = false;

function log(message) {
    if(debug) {
        global.log(`[gnome-lazy-gaps] ${message}`)
    }
}
