define('#pub-exports', ['#pub-app', '#pub-view', '#pub-util', '#pub-handler']function(require, exports, module) {
  var app     = require('#pub-app');
  var view    = require('#pub-view');
  var util    = require('#pub-util');
  var handler = require('#pub-handler');

  return module.exports = exports = {
    App    : app,
    View   : view,
    Module : app.Module,
    Util   : util,
    Handler: handler
  };
});