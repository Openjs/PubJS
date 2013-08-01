/**!
 * PubJS - v0.1.2
 * Simple, awesome and powerful Font-End JavaScript development platform
 *
 * Copyright(c) 2012 Clicki Inc.
 * Copyright(c) 2013 Will Wen Gunn
 * 
 */
define(function(require, exports, module) {

  require('./lib/boot.js');
  console.log('[PubJS] Boot!');

  return module.exports = exports = require('./lib/exports.js');

});