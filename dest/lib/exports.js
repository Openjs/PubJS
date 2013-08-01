define("lib/exports", [ "./app", "gallery/jquery/1.8.3/jquery", "./util", "./view", "./handler", "./router" ], function(require, exports, module) {
    var app = require("./app");
    var view = require("./view");
    var util = require("./util");
    var handler = require("./handler");
    return module.exports = exports = {
        App: app,
        View: view,
        Module: app.Module,
        Util: util,
        Handler: handler
    };
});