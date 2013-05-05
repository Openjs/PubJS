define('#pub-router', [], function(require, exports, module) {
  module.exports = Router;

  function isHashRouter(url) {
    return /^#/.test(url);
  }

  function Router(handlers) {

    var handlerFn = function(app) {
      var path = window.location.pathname + window.location.hash;

      var hit = getHit(path, handlerFn);

      app.currHandler = hit.handler;
      app.params      = hit.params;

      hit.handler(app);
    };
    handlerFn.handlers = handlers;
    handlerFn.rules = {};

    for (var key in handlers) {
    if (isHashRouter(key)) {
      handlerFn.rules[key] = new RegExp(
      key.replace(/:([\w%$.-]*)/g, '([\\\w%$.-]*)')
          .replace("(([\\\w%$.-]*))", '([\\\w%$.-]*)') + '$',
      'i');
    } else {
      handlerFn.rules[key] = new RegExp(
      '^' + key.replace(/:([\w%$.-]*)/g, '([\\\w%$.-]*)')
          .replace("(([\\\w%$.-]*))", '([\\\w%$.-]*)') + '([#]*)(.*)$',
      'i');
    }
    }

    function getHit(url, fn) {
    for (var key in fn.rules) {
      if (fn.rules[key].test(url)) {

      var params = paramsParser(key, fn.rules[key], url);

      return {
        handler: handlers[key],
        params: params
      };
      }
    }

    return {
      handler: noop,
      params: {}
    };
    }

    return handlerFn;

  }

  function paramsParser(path, reg, reqPath) {
    var args = [];
    while (/:([\w%$-]+)/g.test(path)) {
      path = path.replace(/:([\w%$-]*)/i, ':([\w%$-]+)');
      args.push(RegExp['$1']);
      path = path.replace(/\/:\(\.\*\)/i, '\\/(.*)')
            .replace(/\(:\(\.\*\)\)/i, '(.*)');
    }
    reg.test(reqPath);
    var $args = {};
    for (var i = 0; i < 10; i++)
      if (RegExp['$' + i] !== '')
        $args[args[i - 1]] = RegExp['$' + i];
      else break;
    return $args;
  }

  function noop() {return false;}
});