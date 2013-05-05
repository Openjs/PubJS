/**
 * Cookie功能中間件
 * @param {String} name    Cookie变量名称, 留空所有参数获取所有Cookie, 指定一个名称获取指定名称的值
 * @param {String} value   <可选> 有值时, 设置Cookie的的值
 * @param {Object} options <可选> 设置Cookie的选项参数对象
 */
define(function(require, exports, module) {
  var util = require('../util');

  exports.cookie = null;

  var Cookie = {};

  Cookie.get = function(name) {
    var map = exports.cookie;

    if (exports.cookie) {
      return map[name] || null
    } else {
      Cookie.refresh();
      return exports.cookie[name] || null;
    }
  };

  Cookie.set = function(name, value, options) {
    if (!name)
      return false;

    options = options || {};

    var expires = options.expires;
    var domain  = options.domain;
    var path    = options.path || '/';

    if (!options['raw']) {
      value = encodeURIComponent(String(value));
    }

    var date = expires;
    var text = name + '=' + value;

    if (isNaN(date)) {
      date = new Date();
      date.setDate(date.getDate() + expires);
    }
    if (date instanceof Date) {
      text += '; expires=' + date.toUTCString();
    }
    // domain
    if (domain) {
      text += '; domain=' + domain;
    }
    // path
    text += '; path=' + path;

    // secure
    if (options['secure']) {
      text += '; secure';
    }

    document.cookie = text;
    return true;
  };

  Cookie.remove = function(name) {
    return Cookie.set(name, '', { expires: 0 });
  };

  Cookie.refresh = function() {
    var tmp = {};
    var str = document.cookie;
    if (util.isString(str)) {
      var val = str.split('; ');
      var key;
      for (var i = 0, l = val.length; i < l; i++) {
        value = val[i].indexOf('=');
        key = val[i].substr(0, value);
        value = val[i].substr(value+1);
        tmp[key] = decodeURIComponent(value);
      }
    }
    exports.cookie = tmp;
    return tmp;
  };

  module.exports = function() {
    return function(app, next) {
      app.cookie = Cookie;
      app.cookies = app.cookie.refresh();

      next();
    };
  };
});