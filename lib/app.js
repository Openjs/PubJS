define(function(require, exports) {
  var $    = require('jquery');
  var util = require('./util');
  var version = exports.version = '0.2.1';

  var events = require('./events');
  var EventEmitter = events.EventEmitter;
  var Promise = events.Promise;

  // 空函数
  function noop() {}
  exports.noop = noop;

  /**
   * 类系统
   */

  // 类式继承功能函数
  function argv_run(proto, scope, func, args) {
    if (func==='' || !(func in proto)) {return undefined;}
    func = proto[func];
    if (typeof(func) != 'function') {return func;}
    if (args instanceof arguments.constructor || (args instanceof Array && args.length)) {
      return func.apply(scope, args);
    } else {
      return func.call(scope);
    }
  }
  // 模块自有公共属性和方法调用
  function mine_run(scope, func, args) {
    return argv_run(this.prototype, scope, func, args);
  }
  // 私有对象属性设置
  function self_run(scope, func, args) {
    return argv_run(this.priv, scope, func, args);
  }
  function extend(proto, priv) {
    var sup = this;
    function Super(scope, func, args) {
      if (scope === 0) {return this;}
      if (arguments.length === 0 || !func || typeof func !== 'string') {
        args = func;
        func = 'Constructor';
      }
      return argv_run(sup.prototype, scope, func, args);
    }
    Super.prototype = sup.prototype;

    function sub() {
      var ct = this.Constructor;
      if (ct && ct instanceof Function) {
        ct.apply(this, arguments);
      }

      return this;
    }
    var c = sub.prototype = new Super(0);
    if (typeof(proto) == 'object') {
      for (var n in proto) {
        if (proto.hasOwnProperty(n)) {
          c[n] = proto[n];
        }
      }
    }
    c.constructor = sub;
    sub.Super = Super;
    sub.self = self_run;
    sub.mine = mine_run;
    sub.priv = priv;
    sub.version = version;
    sub.extend = extend;
    priv = null;
    return sub;
  }
  exports.extend = extend;


  // 系统日志函数
  var con = window.console || {};
  exports.log = function() {
    if (con.log && config('debug') > 0) {
      if (con.log.apply) {
        con.log.apply(con, arguments);
      } else {
        con.log(arguments[0]);
      }
    }
  }
  exports.error = function() {
    if (con.error && config('debug') > 1) {
      if (con.error.apply) {
        con.error.apply(con, arguments);
      } else {
        con.error(arguments[0]);
      }
    }
  }

  /**
   * 系统实例缓存队列
   * @type {HashList}
   */
  var caches = exports.caches = {
    id: 10,
    length: 0
  };

  // 工具函数导出
  exports.util = util;
  var isString = util.isString;
  var isFunc = util.isFunc;
  var isObject = util.isObject;
  var has = util.has;

  function isModule(obj) {
    if (obj instanceof Object) {
      var id = obj._ && obj._.guid || 0;
      return (id && caches[id] === obj);
    }
    return false;
  }
  util.isModule = isModule;
  function isCreator(func) {
    if (!func || !func.Super) { return false; }
    if (func.self !== self_run) { return false; }
    if (func.mine !== mine_run) { return false; }
    if (func.version !== exports.version) { return false; }
    return true;
  }
  util.isCreator = isCreator;

  /**
   * 系统配置功能函数
   * @param  {String} name    配置名称, 使用 / 分隔层次
   * @param  {Mix}  value   不设为读取配置信息, null为删除配置, 其他为设置值
   * @param  {Bool}   replace <可选> 强制覆盖值
   * @return {Mix}            设置和删除操作是返回Bool表示操作状态, 读取是返回配置值
   */
  function config(name, value, replace) {
    if (name instanceof Object) {
      value = name;
      name = null;
    }
    var set = (value !== undefined);
    var remove = (value === null);
    var data;

    if (name) {
      var ns = name.split('/');
      data = config.data;
      while (ns.length > 1 && (data instanceof Object) && data.hasOwnProperty(ns[0])) {
        data = data[ns.shift()];
      }
      if (ns.length > 1) {
        if (set) {return false;} // 设置值, 但是父层配置不存在
        if (remove) {return true;} // 父层已经删除
        return undefined; // 值不存在, 不能获取
      }
      name = ns[0];
    } else if (remove) {
      return false; // 根节点不能删除
    } else {
      data = config;
      name = 'data';
    }

    if (set) {
      //TODO: 加入合并对象值的处理
      data[name] = value;
      return true;
    } else if (remove) {
      data[name] = null;
      delete(data[name]);
      return true;
    } else {
      return data[name];
    }
  }
  config.data = {};
  exports.config = config;
  exports.config('middlewares_base', './middlewares/');

  var Model = require('./model')(exports);
  exports.Model = Model;
  exports.ds = new Model();

  /**
   * 系统基础模块定义, 实现基础公用功能函数
   * @param  {Object} config 模块初始化配置参数
   * @param  {Object} parent 父模块实例对象
   * @param  {Object} id     当前模块系统实例配置信息
   * @return {Object}        返回创建的模块实例对象
   *
   * id参数具体属性说明
   *   uri   @type {String}  模块实例的路径URI字符串
   *   name  @type {String}  模块实例名称
   *   pid   @type {Number}  父模块实例ID (GUID)
   *   guid  @type {Number}  当前模块的实例ID (GUID)
   */
  var childs      = 'childs';
  var childs_name = 'childs_name';
  var childs_id   = 'childs_id';
  var Module = extend.call(EventEmitter, {
    /**
     * 创建子模块实例
     * @param  {String}   name   <可选> 子模块实例名称, 成为模块uri路径的一部分
     * @param  {Function} type   子模块定义函数, 用于生成模块实例的函数
     * @param  {Object}   config <可选> 传入模块创建函数的配置变量
     * @return {Object}          返回创建的子模块实例, 创建失败时返回false
     */
    create: function(name, type, config) {
      if (!isModule(this)) {
        exports.error('Current Module Invalid');
        return false;
      }

      if (!this._.hasOwnProperty(childs)) {
        this._[childs] = []; // 子模块缓存列表
        this._[childs_name] = this.$ = {}; // 子模块命名索引
        this._[childs_id] = 0; // 子模块计数ID
      }
      if (isFunc(name)) {
        if (isFunc(type)) {
          name = name(this._);
        } else {
          config = type;
          type = name;
          name = null;
        }
      }
      if (!name) {
        name = 'child_' + this._[childs_id];
      } else if (this._[childs_name][name]) {
        exports.error('Module Name Exists');
        return false;
      }
      this._[childs_id]++;
      
      var id = {
        'uri': this._.uri + '/' + name, // 模块实例路径
        'name': name,         // 模块实例名称
        'pid': this._.guid,       // 模块父模块实例ID
        'guid': caches.id++       // 当前子实例ID
      };
      var child = new type(config, this, id);
      child._ = id;
      // 存入全局Cache队列
      caches[id.guid] = child;
      caches.length++;
      // 存入子模块到父模块关系记录中
      this._[childs].push(child);
      this._[childs_name][name] = child;

      if (exports.config('debug') > 1) {
        exports.log('[PubJS] A new module ' + name + ' created.');
      }

      // 调用初始化方法
      if (isFunc(child.init)) {
        child.init(config, this);
      }
      return child;
    },

    config: function(default_value, config, deep) {
      if (isString(default_value)) {

        default_value = '/' + default_value;

        if (!this.$config) {
          this.$config = new Model();
        }

        if (arguments.length == 2) {

          // single set
          this.$config.set(default_value, deep);
        } else {

          // get value
          return this.$config.get(default_value);
        }
      } else {
        if (!config) {
          config = default_value;
          default_value = null;
        }
        if (!this.$config) {
          if (config instanceof Model) {
            this.$config = config;
          } else {
            this.$config = new Model({
              data: config
            });
          }
        }
        if (config) {
          this.$config.merge('/', config, deep);
        }
        if (default_value) {
          this.$config.merge('/', default_value, deep);
        }


      }

      return this.$config;
    },
    /**
     * 获取当前模块的父模块对象
     * @return {Object} 父模块对象, 没有则返回NULL
     */
    parent: function() {
      if (!isModule(this) || this._.pid===0) {return null;}
      return (caches[this._.pid] || null);
    },
    /**
     * 获取指定名称或者索引的子模块实例(仅限于该模块的子模块)
     * @param  {String/Number}  name  子对象名称或数字索引
     * @return {Object}         返回子对象实例 / 没有找到对象时返回NULL
     */
    child: function(name) {
      if (!isModule(this) || !this._[childs]) {return null;}
      if (!isNaN(name)) {
        name = parseInt(name, 10);
        if (name < 0 || name >= this._[childs].length) {return null;}
        return this._[childs][name];
      } else {
        return (this._[childs_name][name] || null);
      }
    },
    /**
     * 获取当前对象的所有子对象
     * @param  {Bool} by_name <可选> 是否返回名字索引的对象列表
     * @return {Object}     无子对象时, 返回一个空数组或NULL, 否则返回一个数组或者命名对象
     */
    childs: function(by_name) {
      if (!isModule(this) || !this._[childs]) {
        return (by_name ? null : []);
      }
      return (by_name ? this._[childs_name] : this._[childs]);
    },
    /**
     * 获取指定路径的实例
     * @param  {String} uri 实例URI地址字符串, 使用 / 分隔层次, 每层可以是纯数字的子对象索引或对象名字
     * @return {Object}     返回实例对象, 没有找到对应对象时, 返回NULL
     */
    get: function(uri) {
      if (!isString(uri)) {return null;}
      if (!uri) {return this;}
      if (uri.charAt(0) == '/') {return exports.core.get(uri);}

      var name;
      var obj = this;
      var ns = uri.split('/');
      while (ns.length) {
        name = ns.shift();
        obj = (name == '..') ? obj.parent() : obj.child(name);
        if (!obj) {return obj;}
      }
      return obj;
    },
    /**
     * 获取指定路径的多个实例, 星号匹配
     * @param  {String} uri 实例URI地址字符串, 用 / 分隔, 可用*匹配部分实例名称
     * @return {Array}      返回找到匹配的对象数组
     */
    gets: function(uri) {
      var name, list = arguments[1] || [];
      if (arguments[2] !== 1 && !isString(uri)) {return list;}

      // 空字符串, 返回当前对象
      if (!uri) {
        list.push(this);
        return list;
      }

      // 纯数字属性, 返回对应索引的子实例
      if (!isNaN(uri)) {
        name = this.child(uri);
        if (name) {list.push(name);}
        return list;
      }

      // 根节点查找
      if (uri.charAt(0) == '/') {return exports.core.gets(uri);}

      // 分离当前当前模块名称和子模块路径
      var ch = uri.indexOf('/');
      if (ch == -1) {
        name = uri;
        uri = null;
      } else {
        name = uri.substr(0, ch);
        uri = uri.substr(ch+1);
      }

      if (name.indexOf('*') != -1) {
        // 星号匹配名称
        var childs = isModule(this) && this._[childs_name];
        if (!childs) {return list;}
        var reg = util.starRegExp(name);
        for (name in childs) {
          if (childs.hasOwnProperty(name) && reg.test(name)) {
            ch = childs[name];
            if (uri) {
              ch.gets(uri, list, 1);
            } else {
              list.push(ch);
            }
          }
        }
      } else {
        ch = (name == '..') ? this.parent() : this.child(name);
        if (ch) {
          if (uri) {
            ch.gets(uri, list, 1);
          } else {
            list.push(ch);
          }
        }
      }
      return list;
    },
    /**
     * 向某个特定的模块实例发送消息
     * @param  {Mix}    target 接受消息的模块实例或URI
     * @param  {String} type   消息事件类型
     * @param  {Object} param  <可选> 消息事件参数, 附加在事件变量的param
     * @return {Object}        返回事件变量对象
     */
    send: function(target, type, param) {
      var mod = isModule(target) ? [target] : this.get(target);
      return messager.send(this, mod, type, param);
    },
    /**
     * 模块销毁函数
     * @param  {Bool} silent <可选> 是否禁止发送销毁事件
     * @return {Undefined}          无返回
     */
    destroy: function(silent) {
      // 调用自定义销毁前函数 (可进行必要的数据保存)
      if (this.beforeDestroy) {
        try {
          this.beforeDestroy();
        } catch(err) {
          exports.error('beforeDestroy() Exception!', err);
        }
      }

      // 由副模块调用销毁时, 默认禁止发送销毁消息
      if (!silent) {
        this.fire('destroy');
      }

      // 销毁子模块
      var childs = this.childs();
      for (var i=0; i<childs.length; i++) {
        if (childs[i].destroy) {childs[i].destroy(-1);}
      }
      
      // 取消所有绑定的监听事件
      this.unbind();
      this.unlisten();
      
      // 调用自定义销毁后函数 (可进行必要的界面销毁)
      if (this.afterDestroy) {
        try {
          this.afterDestroy();
        } catch(err) {
          exports.error('afterDestroy() Exception!', err);
        }
      }

      // 从父模块中删除 (递归调用时不用删除)
      if (silent !== -1) {
        var parent = this.parent();
        if (parent) {parent.removeChild(this);}
      }

      // 销毁全局对象
      var guid = this._ && this._.guid || 0;
      if (caches.hasOwnProperty(guid)) {
        delete(caches[guid]);
        caches.length--;
      }
    },
    /**
     * 移除一个子模块实例
     * @param  {Mix} child    子模块实例/子模块名称/子模块索引数字
     * @return {Object}       返回移除的子模块实例对象 / 没有找到模块时返回NULL
     */
    removeChild: function(child) {
      var name, guid, i = 0;
      var list = this._[childs_name];
      var index = this._[childs];

      if (isModule(child)) {
        guid = child._.guid;
      } else if (isNaN(child)) {
        name = ''+child;
        if (list.hasOwnProperty(name)) {
          guid = list[name]._.guid;
        }
      } else {
        i = parseInt(child, 10);
        if (i < 0 || i >= index.length) {return null;}
        guid = index[i]._.guid;
      }

      // 没有找到对应模块GUID
      if (!guid) {return null;}

      // 删除数组列表
      for (; i<index.length; i++) {
        if (index[i]._.guid == guid) {
          child = index[i];
          delete(this._[childs_name][child._.name]);
          index.splice(i, 1);
          return child;
        }
      }
      return null;
    },
    /**
     * 过去模块数据 (默认直接返回子模块数据)
     * @param  {Bool}   return_array 是否以数组方式整合数据结果
     * @return {Object}              返回结果对象或数字结果
     */
    getData: function(return_array) {
      return this.getChildData(return_array);
    },
    /**
     * 获取所有子模块数据
     * @param  {Bool}   return_array 是否以数组方式整合数据结果
     * @return {Object}              返回结果对象或数字结果
     */
    getChildData: function(return_array) {
      var list = this._[childs];
      if (list) {
        var data = return_array ? [] : {};
        var id, value, empty = 1;
        for (var i=0; i<list.length; i++) {
          id = return_array ? i : list[i]._.name;
          value = list[i].getData(return_array);
          if (value !== undefined) {
            data[id] = value;
            empty = 0;
          }
        }
        return empty ? undefined : data;
      }
    },
    /**
     * 循环调用模块重置(重写本函数建议调用父模块的该函数)
     */
    reset: function() {
      var list = this._[childs];
      if (list) {
        for (var i=0; i<list.length; i++) {
          list[i].reset();
        }
      }
    }

  });
  exports.Module = Module;

  /**
   * 应用核心模块
   */
  var Core = Module.extend({
    Constructor: function() {
      this._ = {
        uri: '',
        name: 'APP',
        parent: 0,
        guid: 1
      };
      caches['1'] = this;
      caches.length++;
    },
    get: function(uri) {
      uri = uri.replace(/^[\/]+/, '');
      return Core.Super(this, 'get', [uri]);
    },
    gets: function(uri) {
      uri = uri.replace(/^[\/]+/, '');
      return Core.Super(this, 'gets', [uri]);
    },
    destroy: function() {
    }
  });


  /**
   * 初始化应用对象, 可设置系统初始配置, 创建系统唯一对象实例
   * @param  {Object}   conf     <可选> 初始化系统配置信息
   * @param  {Function} callback <可选> 资源应用初始化完毕回调函数
   * @return {Bool}              返回初始化状态是否成功
   */
  exports.init = function(conf, callback) {
    if (conf instanceof Object) {
      util.merge(config.data, conf);
    }
    if (exports.config('init')) {
      var initFn = exports.config('init');

      initFn.call(exports, exports);
    }
    exports.core = new Core();
    if (exports.config('debug') > 0) {
      exports.log('[PubJS] PubJS is in debuging environment! Debug Level ' + exports.config('debug'));
    }
    return callback();
  }

  /**
   * 路由切换方法
   * @param  {String} uri 路由地址 / 数字表示跳转的历史
   * @return {Undefined}  无返回值
   */
  exports.navigate = function(uri) {
    if (isString(uri)) {
      window.location.hash = "#"+uri;
    } else {
      window.history.go(uri);
    }
  }

  /**
   * 加载模块并回调
   * @param  {String}   uri      模块地址
   * @param  {Object}   param    <可选> 回调函数参数
   * @param  {Function} callback 回调函数 / 实例模块
   * @param  {Object}   context  <可选> 回调函数执行域 / 实例模块方法名称
   * @return {None}            无返回
   */
  function loadModule(uri, param, callback, context) {
    var name = null;
    var pos = uri.lastIndexOf('.');
    if (pos !== -1) {
      name = uri.substr(pos + 1);
      uri = uri.substr(0, pos);
    }
    if (isFunc(param) || isModule(param)) {
      context = callback;
      callback = param;
      param = null;
    }
    if (isModule(callback)) {
      var cb = callback[context];
      if (isFunc(cb)) {
        context = callback;
        callback = cb;
        cb = null;
      }
    }
    require.async(uri, function(mod) {
      if (name) {
        mod = mod[name];
      }
      if (!mod) {
        // 加载模块失败或者模块属性不存在
        exports.error('loadModule Error! - '+ uri + (name ? '.'+name : ''));
      } else if (isFunc(callback)) {
        callback.call((context || window), mod, param);
      }
      mod = name = pos = uri = param = callback = context = null;
    });
  }
  exports.loadModule = loadModule;

  exports.usingMiddlewares = [];

  function useMiddleware() {
    for (var i = 0, l = arguments.length; i < l; i++) {
      switch (typeof arguments[i]) {
        case "string":
          var route = arguments[i];
          i++;
          var handle = arguments[i];
          _use(route, handle);
          break;
        case "function":
          _use('/', arguments[i]);
          break;
      }
    }

    function _use(route, handler) {
      exports.usingMiddlewares.push({
        route: route,
        handler: handler
      });
    }
  }
  exports.use = useMiddleware;

  function runMiddlewares(uri, out) {
    var index = -1;

    var middlewares = exports.usingMiddlewares;

    function next() {
      index++;
      var layer = middlewares[index];

      if (layer) {
        var reg = new RegExp(layer.route);
        if (reg.test(uri)) {
          layer.handler(exports, next, function() {
            later(index, layer);
            index--;
            next();
          });
        } else {
          next();
        }
      } else {
        out();
      }
    }

    function later(i, curr) {
      middlewares.splice(i, 1);
      middlewares.push(curr);
    }

    next();
  }
  exports._runMiddlewares = runMiddlewares;

  function getMiddleware(name) {
    return function(app, next, later) {
      require.async(app.config('middlewares_base') + name + '.js', function(middleware) {
        return middleware().call(null, app, next, later);
      });
    };
  }

  var middlewares_list = [ 'cookieParser', 'datacenter', 'drag', 'language', 'messager', 'query' ];

  for (var i = 0, l = middlewares_list.length; i < l; i++) {
    exports[middlewares_list[i]] = (function(name) {
      return function() {
        return getMiddleware(name);
      };
    })(middlewares_list[i]);
  }

  return exports;
});