/**!
 * PubJS - v0.1.2
 * Simple, awesome and powerful Font-End JavaScript development platform
 *
 * Copyright(c) 2012 Clicki Inc.
 * Copyright(c) 2013 Will Wen Gunn
 * 
 */
define("pub-debug", [ "./lib/boot-debug", "./lib/app-debug", "gallery/jquery/1.8.3/jquery-debug", "./lib/util-debug", "./lib/exports-debug", "./lib/view-debug", "./lib/handler-debug", "./lib/router-debug" ], function(require, exports, module) {
    require("./lib/boot-debug");
    console.log("[PubJS] Boot!");
    return module.exports = exports = require("./lib/exports-debug");
});