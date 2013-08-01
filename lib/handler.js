/**
 * PubJS Handler Module
 */
define(function(require, exports) {

  var Router = require('./router');
  
  exports.setup = function(_exports, name, options) {
    if (arguments.length < 2) {
      options = name;

      if ('undefined' !== typeof options.name) {
        name = options.name;
      }
    }
    
    if ('undefined' == typeof options.routes) {
      options.routes = {};
    }
    _exports.name = name;
    _exports.router = Router(options.routes);
  };

});