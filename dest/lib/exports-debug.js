define("lib/exports-debug", [ "./app-debug", "gallery/jquery/1.8.3/jquery-debug", "./util-debug", "./view-debug", "./handler-debug", "./router-debug" ], function(require, exports, module) {
    var app = require("./app-debug");
    var view = require("./view-debug");
    var util = require("./util-debug");
    var handler = require("./handler-debug");
    return module.exports = exports = {
        App: app,
        View: view,
        Module: app.Module,
        Util: util,
        Handler: handler
    };
});