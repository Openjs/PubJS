/**!
 * PubJS - v0.1.2
 * Simple, awesome and powerful Font-End JavaScript development platform
 *
 * Copyright(c) 2012 Clicki Inc.
 * Copyright(c) 2013 Will Wen Gunn
 * 
 */
define("pub", [ "./lib/boot", "./lib/app", "gallery/jquery/1.8.3/jquery", "./lib/util", "./lib/exports", "./lib/view", "./lib/handler", "./lib/router" ], function(require, exports, module) {
    require("./lib/boot");
    console.log("[PubJS] Boot!");
    return module.exports = exports = require("./lib/exports");
});