define(function(require, exports, module) {
  var app     = require('./app');
  var view    = require('./view');
  var util    = require('./util');
  var handler = require('./handler');

  return module.exports = exports = {
    App    : app,
    View   : view,
    Module : app.Module,
    Util   : util,
    Handler: handler,
    Model  : app.Model
  };
});