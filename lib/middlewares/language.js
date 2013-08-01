/**
 * 多语言功能模块
 * 自动在window域上导出两个函数, LANG() 和 _T()
 * LANG() - 实际翻译方法, 支持参数替换
 * _T()   - 语言定义方法, 为让LANG支持变量方式, 原语言先通过该函数定义为语言字符串
 *
 * @param  {Function} cb 加载完毕回调函数
 * @return {Object}      返回语言管理对象
 */
define(function(require, exports, module) {
  
  module.exports = function() {
    return function(app, next, later) {

      // Check cookie and datacenter supports
      if (!app.cookie || !app.data)
        return later();

      app.lang = new Language(app, next);
    };
  };

  function Language(app, cb) {
    var self = this;
    var regx = /\%(\d+)/g;
    var regx_param = null;
    var default_name = app.config('language/default') || 'zh_CN';
    var cookie_name  = app.config('language/cookie') || 'lang';
    var cookie_value = app.cookie.get(cookie_name);
    var cb_func = cb;

    this.load_name = this.name = cookie_value || default_name;
    this.translate = null;
    this.loaded = true;
    cb = null;

    if (cookie_value != this.name) {
      app.cookie.set(cookie_name, this.name);
    }

    /**
     * 正则参数替换回调函数
     * @private
     * @param  {Object} match 正则匹配对象
     * @return {String}       替换字符串
     */
    function regx_replace(match) {
      if (match[1] > 0 && regx_param[match[1]] !== undefined) {
        return regx_param[match[1]];
      } else {
        return match[0];
      }
    }

    /**
     * 多语言替换函数
     * @param  {String} text   语言文字
     * @param  {Mix}    params <可选多个> 替换语言中文字中的%1,%2..等标记的参数
     * @return {String}        返回翻译后的文字
     */
    this.LANG = function(text) {
      if (self.translate && self.translate.hasOwnProperty(text)) {
        text = self.translate[text];
      }
      if (arguments.length > 1) {
        regx_param = arguments;
        return text.replace(regx, regx_replace);
      }
      return text;
    }

    /**
     * 多语言标记功能函数
     * @param  {String} text 多语言替换的文字字符串
     * @return {String}      原字符串返回
     */
    window._T = function(text) {
      return text;
    };

    /**
     * 设置变更当前语言
     * @param {String} name 语言名称缩写
     * @param {Function} cb <可选>加载完毕回调函数
     */
    this.set = function(name, cb) {
      if (!name) {
        return this.name;
      }
      if (name == this.load_name) {
        if (cb)
          return cb(false);
      }
      this.load_name = name;
      app.cookie.set(cookie_name, name, {
        expires: 9999,
        path:'/'
      });
      cb_func = cb;
      this.load();
    };

    /**
     * 加载语言包
     * @return {None} 无返回
     */
    var ajaxId = 0;
    this.load = function() {
      if (this.load_name == default_name) {
        self.translate = null;
        callback(null);
        return;
      }
      this.loaded = false;
      if (ajaxId) {
        app.data.abort(ajaxId)
      }
      ajaxId = app.data.get('/i18n/' + this.load_name + '/translate.json', onLoad);
    };
    function onLoad(err, data) {
      ajaxId = 0;
      if (!err) {
        self.translate = data;
      }
      callback(err);
    };
    function callback(err) {
      if (!err) {
        // 加载成功, 设置语言名称和附加CSS
        $('body')
          .removeClass('i18n_' + self.name)
          .addClass('i18n_' + self.load_name);
        // 引入CSS文件
        $('#LANGUAGE_STYLE').remove();
        if (self.translate) {
          $('head').append('<link type="text/css" rel="stylesheet" id="LANGUAGE_STYLE" href="' + app.config('language/style') + self.load_name + '/style.css">');
        }
        self.name = self.load_name;
      }

      if (cb_func) {
        cb_func(!err);
        cb_func = null;
      }
      app.core.cast('switchLanguage', self.name);
    };

    // 先加载语言
    this.load();
  }
});