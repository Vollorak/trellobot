function Logger(debug) {

    this.debug = debug;

    this.info = function (message) {
        console.log(`[INFO] ${message}`);
    };

    this.debug = function (message) {
        if (debug) console.log(`[DEBUG] ${message}`);
    };

    this.error = function (message) {
        console.log(`[ERROR] ${message}`);
    };

}

module.exports = Logger;