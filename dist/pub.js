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

define("lib/app", [ "gallery/jquery/1.8.3/jquery", "./util" ], function(require, exports) {
    var $ = require("gallery/jquery/1.8.3/jquery.js");
    var util = require("./util");
    exports.version = "0.1.2";
    // 空函数
    function noop() {}
    exports.noop = noop;
    // 类式继承功能函数
    function argv_run(ag, proto, scope, func, args) {
        if (!func || !(func in proto)) {
            return undefined;
        }
        func = proto[func];
        if (typeof func != "function") {
            return func;
        }
        var v = ag.callee.caller["arguments"];
        if (ag.length == 2) {
            return func.apply(scope, v);
        } else if (args instanceof Array && args.length) {
            return func.apply(scope, args);
        } else {
            return func.call(scope);
        }
    }
    // 模块自有公共属性和方法调用
    function mine_run(scope, func, args) {
        return argv_run(arguments, this.prototype, scope, func, args);
    }
    // 私有对象属性设置
    function self_run(scope, func) {
        var args = [];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return argv_run(arguments, this.p, scope, func, args);
    }
    function extend(sub, sup, proto, priv) {
        function f(scope, func, args) {
            if (scope === 0) {
                return this;
            }
            if (arguments.length === 0) {
                return sup == noop ? null : sup;
            }
            var v = arguments.callee.caller["arguments"];
            if (!func) {
                return sup.call(scope, args || v[0], v[1], v[2]);
            }
            return argv_run(arguments, sup.prototype, scope, func, args);
        }
        f.prototype = sup.prototype;
        var n = 0, o = sub.prototype;
        var c = sub.prototype = new f(0);
        for (n in o) {
            if (o.hasOwnProperty(n)) {
                c[n] = o[n];
            }
        }
        if (typeof proto == "object") {
            for (n in proto) {
                if (proto.hasOwnProperty(n)) {
                    c[n] = proto[n];
                }
            }
        }
        c.constructor = sub;
        sub.master = f;
        sub.self = self_run;
        sub.mine = mine_run;
        sub.p = priv;
        sub.version = exports.version;
        proto = null;
        return sub;
    }
    exports.extend = extend;
    // 系统日志函数
    var con = window.console || {};
    exports.log = function() {
        if (con.log && config("debug") > 0) {
            if (con.log.apply) {
                con.log.apply(con, arguments);
            } else {
                con.log(arguments[0]);
            }
        }
    };
    exports.error = function() {
        if (con.error && config("debug") > 1) {
            if (con.error.apply) {
                con.error.apply(con, arguments);
            } else {
                con.error(arguments[0]);
            }
        }
    };
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
    var has = util.has;
    function isModule(obj) {
        if (obj instanceof Object) {
            var id = obj._ && obj._.guid || 0;
            return id && caches[id] === obj;
        }
        return false;
    }
    util.isModule = isModule;
    function isCreator(func) {
        if (!func || !func.master) {
            return false;
        }
        if (func.self !== self_run) {
            return false;
        }
        if (func.mine !== mine_run) {
            return false;
        }
        if (func.version !== exports.version) {
            return false;
        }
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
        var set = value !== undefined;
        var remove = value === null;
        var data;
        if (name) {
            var ns = name.split("/");
            data = config.data;
            while (ns.length > 1 && data instanceof Object && data.hasOwnProperty(ns[0])) {
                data = data[ns.shift()];
            }
            if (ns.length > 1) {
                if (set) {
                    return false;
                }
                // 设置值, 但是父层配置不存在
                if (remove) {
                    return true;
                }
                // 父层已经删除
                return undefined;
            }
            name = ns[0];
        } else if (remove) {
            return false;
        } else {
            data = config;
            name = "data";
        }
        if (set) {
            //TODO: 加入合并对象值的处理
            data[name] = value;
            return true;
        } else if (remove) {
            data[name] = null;
            delete data[name];
            return true;
        } else {
            return data[name];
        }
    }
    config.data = {};
    exports.config = config;
    exports.config("middlewares_base", "./middlewares/");
    /**
   * 消息交互模块内部实例
   * @type {MessagerObject}
   */
    var messager = null;
    /**
   * 系统消息交互模块
   */
    /**
   * jQuery事件转发路由
   * @param  {Object} evt jQuery事件对象
   * @return {Mix}     返回用户回调函数的值
   */
    function jqRouter(evt) {
        var param = evt.data;
        var mod = caches[param[0]] || null;
        if (!mod) {
            return;
        }
        var cb = param[1];
        if (!isFunc(cb)) {
            cb = mod[cb];
            if (!isFunc(cb)) {
                return;
            }
        }
        evt.data = param[2];
        param = cb.call(mod, evt, this);
        mod = cb = null;
        return param;
    }
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
    function Module(config, parent, id) {
        return this;
    }
    var childs = "childs";
    var childs_name = "childs_name";
    var childs_id = "childs_id";
    extend(Module, noop, {
        /**
     * 空模块判断函数
     * @return {Boolean} 返回TRUE表示当前模块是虚拟空模块, FALSE表示为真实模块
     */
        isNull: function() {
            return false;
        },
        /**
     * 创建子模块实例
     * @param  {String}   name   <可选> 子模块实例名称, 成为模块uri路径的一部分
     * @param  {Function} type   子模块定义函数, 用于生成模块实例的函数
     * @param  {Object}   config <可选> 传入模块创建函数的配置变量
     * @return {Object}          返回创建的子模块实例, 创建失败时返回false
     */
        create: function(name, type, config) {
            if (!isModule(this)) {
                exports.error("Current Module Invalid");
                return false;
            }
            if (!this._.hasOwnProperty(childs)) {
                this._[childs] = [];
                // 子模块缓存列表
                this._[childs_name] = this.$ = {};
                // 子模块命名索引
                this._[childs_id] = 0;
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
                name = "child_" + this._[childs_id];
            } else if (this._[childs_name][name]) {
                exports.error("Module Name Exists");
                return false;
            }
            this._[childs_id]++;
            var id = {
                uri: this._.uri + "/" + name,
                // 模块实例路径
                name: name,
                // 模块实例名称
                pid: this._.guid,
                // 模块父模块实例ID
                guid: caches.id++
            };
            var child = new type(config, this, id);
            child._ = id;
            // 存入全局Cache队列
            caches[id.guid] = child;
            caches.length++;
            // 存入子模块到父模块关系记录中
            this._[childs].push(child);
            this._[childs_name][name] = child;
            if (exports.config("debug") > 1) {
                exports.log("[PubJS] A new module " + name + " created.");
            }
            // 调用初始化方法
            if (isFunc(child.init)) {
                child.init(config);
            }
            return child;
        },
        /**
     * 获取当前模块的父模块对象
     * @return {Object} 父模块对象, 没有则返回NULL
     */
        parent: function() {
            if (!isModule(this) || this._.pid === 0) {
                return null;
            }
            return caches[this._.pid] || null;
        },
        /**
     * 获取指定名称或者索引的子模块实例(仅限于该模块的子模块)
     * @param  {String/Number}  name  子对象名称或数字索引
     * @return {Object}         返回子对象实例 / 没有找到对象时返回NULL
     */
        child: function(name) {
            if (!isModule(this) || !this._[childs]) {
                return null;
            }
            if (!isNaN(name)) {
                name = parseInt(name, 10);
                if (name < 0 || name >= this._[childs].length) {
                    return null;
                }
                return this._[childs][name];
            } else {
                return this._[childs_name][name] || null;
            }
        },
        /**
     * 获取当前对象的所有子对象
     * @param  {Bool} by_name <可选> 是否返回名字索引的对象列表
     * @return {Object}     无子对象时, 返回一个空数组或NULL, 否则返回一个数组或者命名对象
     */
        childs: function(by_name) {
            if (!isModule(this) || !this._[childs]) {
                return by_name ? null : [];
            }
            return by_name ? this._[childs_name] : this._[childs];
        },
        /**
     * 获取指定路径的实例
     * @param  {String} uri 实例URI地址字符串, 使用 / 分隔层次, 每层可以是纯数字的子对象索引或对象名字
     * @return {Object}     返回实例对象, 没有找到对应对象时, 返回NULL
     */
        get: function(uri) {
            if (!isString(uri)) {
                return null;
            }
            if (!uri) {
                return this;
            }
            if (uri.charAt(0) == "/") {
                return exports.core.get(uri);
            }
            var name;
            var obj = this;
            var ns = uri.split("/");
            while (ns.length) {
                name = ns.shift();
                obj = name == ".." ? obj.parent() : obj.child(name);
                if (!obj) {
                    return obj;
                }
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
            if (arguments[2] !== 1 && !isString(uri)) {
                return list;
            }
            // 空字符串, 返回当前对象
            if (!uri) {
                list.push(this);
                return list;
            }
            // 纯数字属性, 返回对应索引的子实例
            if (!isNaN(uri)) {
                name = this.child(uri);
                if (name) {
                    list.push(name);
                }
                return list;
            }
            // 根节点查找
            if (uri.charAt(0) == "/") {
                return exports.core.gets(uri);
            }
            // 分离当前当前模块名称和子模块路径
            var ch = uri.indexOf("/");
            if (ch == -1) {
                name = uri;
                uri = null;
            } else {
                name = uri.substr(0, ch);
                uri = uri.substr(ch + 1);
            }
            if (name.indexOf("*") != -1) {
                // 星号匹配名称
                var childs = isModule(this) && this._[childs_name];
                if (!childs) {
                    return list;
                }
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
                ch = name == ".." ? this.parent() : this.child(name);
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
     * 冒泡方式发送消息
     * @param  {String}   type     消息事件类型
     * @param  {Object}   param    <可选> 消息事件参数, 附加在事件变量的param
     * @param  {Function} callback <可选> 消息发送完成回调函数, 不填默认触发模块的onEventSent事件
     * @param  {Object}   context  <可选> 回调函数运行域
     * @return {Bool}              返回消息是否被立即发送
     */
        fire: function(type, param, callback, context) {
            if (param instanceof Function) {
                context = callback;
                callback = param;
                param = null;
            }
            return messager.fire(this, type, param, callback, context);
        },
        /**
     * 向下层子模块实例广播消息
     * @param  {String}   type     消息事件类型
     * @param  {Object}   param    <可选> 消息事件参数, 附加在事件变量的param
     * @param  {Function} callback <可选> 消息发送完成回调函数, 不填默认触发模块的onEventSent事件
     * @param  {Object}   context  <可选> 回调函数运行域
     * @return {Bool}              返回消息是否被立即发送
     */
        cast: function(type, param, callback, context) {
            if (param instanceof Function) {
                context = callback;
                callback = param;
                param = null;
            }
            return messager.broadcast(this, type, param, callback, context);
        },
        /**
     * 向某个特定的模块实例发送消息
     * @param  {Mix}    target 接受消息的模块实例或URI
     * @param  {String} type   消息事件类型
     * @param  {Object} param  <可选> 消息事件参数, 附加在事件变量的param
     * @return {Object}        返回事件变量对象
     */
        send: function(target, type, param) {
            var mod = isModule(target) ? [ target ] : this.get(target);
            return messager.send(this, mod, type, param);
        },
        /**
     * 绑定监听事件
     * @param  {String}   type     监听事件类型
     * @param  {Object}   data     <可选> 附加的监听数据
     * @param  {Object}   listener <可选> 接收监听事件的模块实例
     * @param  {Function} callback <可选> 事件回调函数(如果有listener时,可为字符串方法名)
     * @param  {Object}   context  <可选> 回调事件执行的命名空间
     * @return {Bool}              返回绑定状态结果
     */
        bind: function(type, data, listener, callback, context) {
            var argv = arguments, args = argv.length, arg;
            var param = new Array(5), i = 1;
            param[0] = argv[0];
            for (var j = 1; j < args; j++) {
                arg = argv[j];
                switch (i) {
                  case 1:
                    if (isModule(arg)) {
                        i = 2;
                        break;
                    }

                  /* falls through */
                    case 2:
                    if (isFunc(arg)) {
                        i = 3;
                    }
                    break;

                  case 3:
                    if (isString(arg)) {
                        arg = param[2] && param[2][arg];
                        break;
                    }

                  /* falls through */
                    case 4:
                    if (!util.isObject(arg)) {
                        i = 0;
                    }
                }
                param[i++] = arg;
                if (i < 1 || i > 4) {
                    break;
                }
            }
            if (!i) {
                exports.error("bind param error!", argv);
                return false;
            }
            return messager.bind(param[2], this, param[0], param[3], param[1], param[4]);
        },
        /**
     * 取消某个消息的处理函数
     * @param  {String}   type     <可选> 取消取消绑定的事件类型
     * @param  {Function} callback <可选> 需要取消绑定函数
     * @return {Number}            返回取消的绑定数量
     */
        unbind: function(type, callback) {
            return messager.unbind(null, this, type, callback);
        },
        /**
     * 监听某个实例对象的某种消息
     * @param  {Mix}      uri      模块实例/URI字符串/数字
     * @param  {String}   type     要监听的事件类型
     * @param  {Object}   data     <可选> 附加的监听数据
     * @param  {Function} callback <可选> 事件回调函数(如果有设置data参数, 可为字符串方法名)
     * @param  {Object}   context  <可选> 回调事件执行的命名空间
     * @return {Number}            返回成功绑定的事件数目(URI字符串时可*匹配实例对象)
     */
        listen: function(uri, type, data, callback, context) {
            //listener, sender, type, callback, data, context
            if (isFunc(data)) {
                context = callback;
                callback = data;
                data = null;
            } else if (isString(callback)) {
                callback = this[callback];
                if (!callback || !isFunc(callback)) {
                    exports.error("listen callback invalid");
                    return false;
                }
            }
            var mods = isModule(uri) ? [ uri ] : this.gets(uri);
            var count = 0;
            while (mods.length) {
                count += messager.bind(this, mods.shift(), type, callback, data, context) ? 1 : 0;
            }
            return count;
        },
        /**
     * 取消监听某个实例对象的消息
     * @param  {Mix}      uri      模块实例/URI字符串/数字
     * @param  {String}   type     <可选> 要取消监听的事件类型
     * @param  {Function} callback <可选> 要取消监听的事件处理函数(可为字符串方法名)
     * @return {Number}            返回成功取消绑定的事件数目
     */
        unlisten: function(uri, type, callback) {
            var mods = !uri || isModule(uri) ? [ uri ] : this.gets(uri);
            if (isString(callback)) {
                callback = this[callback];
            }
            var count = 0;
            while (mods.length) {
                count += messager.unbind(this, mods.shift(), type, callback);
            }
            return count;
        },
        /**
     * 绑定jQuery对象事件
     * @param  {jQuery}   dom      jQuery DOM对象
     * @param  {String}   type     监听的DOM事件名称
     * @param  {Mix}      data     <可选> 回调事件的jQuery事件对象的data值
     * @param  {Function} callback 事件回调的函数
     * @return {Object}            支持链式调用, 返回模块实例
     */
        jq: function(dom, type, data, callback) {
            if (!dom) {
                return this;
            }
            if (!dom.jquery) {
                dom = $(dom);
            }
            if (isFunc(data) || arguments.length == 3) {
                callback = data;
                data = null;
            }
            dom.bind(type, [ this._.guid, callback, data ], jqRouter);
            return this;
        },
        /**
     * 代理jQuery对象事件
     * @param  {jQuery}   dom      jQuery DOM对象
     * @param  {String}   selector 要代理事件的jQuery选择器
     * @param  {String}   type     监听的DOM事件名称
     * @param  {Mix}      data     <可选> 回调事件的jQuery事件对象的data值
     * @param  {Function} callback 事件回调的函数
     * @return {Object}            支持链式调用, 返回模块实例
     */
        dg: function(dom, selector, type, data, callback) {
            if (!dom) {
                return this;
            }
            if (!dom.jquery) {
                dom = $(dom);
            }
            if (isFunc(data) || arguments.length == 4) {
                callback = data;
                data = null;
            }
            dom.delegate(selector, type, [ this._.guid, callback, data ], jqRouter);
            return this;
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
                } catch (err) {
                    exports.error("beforeDestroy() Exception!", err);
                }
            }
            // 由副模块调用销毁时, 默认禁止发送销毁消息
            if (!silent) {
                this.fire("destroy");
            }
            // 销毁子模块
            var childs = this.childs();
            for (var i = 0; i < childs.length; i++) {
                if (childs[i].destroy) {
                    childs[i].destroy(-1);
                }
            }
            // 取消所有绑定的监听事件
            this.unbind();
            this.unlisten();
            // 调用自定义销毁后函数 (可进行必要的界面销毁)
            if (this.afterDestroy) {
                try {
                    this.afterDestroy();
                } catch (err) {
                    exports.error("afterDestroy() Exception!", err);
                }
            }
            // 从父模块中删除 (递归调用时不用删除)
            if (silent !== -1) {
                var parent = this.parent();
                if (parent) {
                    parent.removeChild(this);
                }
            }
            // 销毁全局对象
            var guid = this._ && this._.guid || 0;
            if (caches.hasOwnProperty(guid)) {
                delete caches[guid];
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
                name = "" + child;
                if (list.hasOwnProperty(name)) {
                    guid = list[name]._.guid;
                }
            } else {
                i = parseInt(child, 10);
                if (i < 0 || i >= index.length) {
                    return null;
                }
                guid = index[i]._.guid;
            }
            // 没有找到对应模块GUID
            if (!guid) {
                return null;
            }
            // 删除数组列表
            for (;i < index.length; i++) {
                if (index[i]._.guid == guid) {
                    child = index[i];
                    delete this._[childs_name][child._.name];
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
                for (var i = 0; i < list.length; i++) {
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
                for (var i = 0; i < list.length; i++) {
                    list[i].reset();
                }
            }
        }
    });
    /**
   * 創建一個Module
   * @param  {Object} config 模块初始化配置参数
   * @param  {Object} parent 父模块
   * @param  {Function} custom 自定義模塊初始化過程
   * @param  {Object} extend 模塊擴展
   * @return {Function}      返回创建的模块
   */
    Module.extend = function(config, _super, extend) {
        var custom = function() {
            return false;
        };
        var hasCustom = arguments.length > 3;
        if (hasCustom) {
            custom = arguments[1];
            _super = arguments[2];
            extend = arguments[3];
        }
        var _Module = function(_config, parent, idObject) {
            this.config = {};
            $.extend(true, this.config, config, _config);
            var ret = custom.apply(this, arguments) || true;
            if (!ret) {
                return false;
            }
            _Module.master(this, null, this.config);
        };
        exports.extend(_Module, _super, extend);
        return _Module;
    };
    exports.Module = Module;
    /**
   * 应用核心模块
   */
    var Core = Module.extend({}, function() {
        this._ = {
            uri: "",
            name: "APP",
            parent: 0,
            guid: 1
        };
        caches["1"] = this;
        caches.length++;
    }, Module, {
        get: function(uri) {
            uri = uri.replace(/^[\/]+/, "");
            return Core.master(this, "get", [ uri ]);
        },
        gets: function(uri) {
            uri = uri.replace(/^[\/]+/, "");
            return Core.master(this, "gets", [ uri ]);
        },
        destroy: function() {}
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
        if (exports.config("init")) {
            var initFn = exports.config("init");
            initFn.call(exports, exports);
        }
        exports.core = new Core();
        if (exports.config("debug") > 0) {
            exports.log("[PubJS] PubJS is in debuging environment! Debug Level " + exports.config("debug"));
        }
        return callback();
    };
    /**
   * 路由切换方法
   * @param  {String} uri 路由地址 / 数字表示跳转的历史
   * @return {Undefined}  无返回值
   */
    exports.navigate = function(uri) {
        if (isString(uri)) {
            window.location.hash = "#" + uri;
        } else {
            window.history.go(uri);
        }
    };
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
        var pos = uri.lastIndexOf(".");
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
                exports.error("loadModule Error! - " + uri + (name ? "." + name : ""));
            } else if (isFunc(callback)) {
                callback.call(context || window, mod, param);
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
                _use("/", arguments[i]);
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
            var _tmp1 = middlewares.slice(0, i);
            _tmp1.push(middlewares[i + 1], curr);
            var _tmp2 = middlewares.slice(i + 2);
            [].push.apply(_tmp1, _tmp2);
            middlewares = _tmp1;
        }
        next();
    }
    exports._runMiddlewares = runMiddlewares;
    function getMiddleware(name) {
        return function(app, next, later) {
            require.async(app.config("middlewares_base") + name + ".js", function(middleware) {
                return middleware().call(null, app, next, later);
            });
        };
    }
    var middlewares_list = [ "cookieParser", "datacenter", "drag", "language", "messager", "query" ];
    for (var i = 0, l = middlewares_list.length; i < l; i++) {
        exports[middlewares_list[i]] = function(name) {
            return function() {
                return getMiddleware(name);
            };
        }(middlewares_list[i]);
    }
});

// 启动模块定义(路由模块)
define("lib/boot", [ "./app", "gallery/jquery/1.8.3/jquery", "./util" ], function(require, exports) {
    var app = require("./app");
    // 定义路由操作
    var env = exports.env = {
        login: null,
        handler: null,
        current: null,
        wait_template: false
    };
    function run(handler) {
        env.handler = handler || app.config("router/default_handler") || "default";
        // 加载控制器
        require.async((app.config("handlers_base") || "../handlers/") + env.handler, onRun);
    }
    function onRun(handler) {
        // 已经被运行过, 防止快速点击的时候重复运行
        if (!env.handler) {
            return false;
        }
        // 模块加载完成，检查方法是否有效，有效则调用
        if (!handler) {
            app.error("handler is missing - " + env.handler + ":router()");
        } else if (handler.name != env.handler) {
            app.error("handler is invalid - " + env.handler + ":router()");
        } else {
            var now = {
                name: env.handler
            };
            env.current = [ env.handler ];
            if (handler.router && app.util.isFunc(handler.router)) {
                app._runMiddlewares(window.location.href, function() {
                    if (app.config("debug") > 0) {
                        app.log("[PubJS] Running handler " + env.handler);
                    }
                    if (handler.beforeRun && app.util.isFunc(handler.beforeRun)) {
                        handler.beforeRun(exports, now, app);
                    }
                    handler.router(app);
                    if (handler.afterRun && app.util.isFunc(handler.afterRun)) {
                        handler.afterRun(exports, now, app);
                    }
                });
            } else {
                app.error("Router is invalid - " + env.handler + ":router()");
            }
            if (env.handler == now.handler) {
                env.handler = null;
            }
        }
    }
    exports.run = run;
    // 重新加载当前操作
    exports.reload = function(silent) {
        if (env.current) {
            run.apply(exports, env.current);
        }
        // 发送全局消息
        if (!silent) {
            app.core.cast("reload");
        }
    };
    // 切换页面显示模块
    var lastPage = null;
    /**
   * 切换整体页面
   * @param  {String} name 要切换到当前的页面模块对象URI
   * @return {String}      返回原显示的模块URI
   */
    exports.switchPage = function(name) {
        if (name == lastPage) {
            return;
        }
        var last = lastPage;
        var mod;
        if (lastPage) {
            mod = app.core.get(lastPage);
            if (mod) {
                mod.hide();
            }
        }
        lastPage = name;
        mod = app.core.get(name);
        if (mod) {
            mod.show();
        }
        return last;
    };
    // 监听Hash变化事件
    var oldURL = -1;
    function hashChanged(evt) {
        if (oldURL === -1) {
            return;
        }
        // 应用还没有开始
        oldURL = window.location.href;
        var path = window.location.pathname.substr(1);
        var param = path.split("/");
        var handler = param.shift();
        run(handler);
    }
    if ("onhashchange" in window && (document.documentumentMode === undefined || document.documentumentMode == 8)) {
        if (window.addEventListener) {
            window.addEventListener("hashchange", hashChanged, false);
        } else if (window.attachEvent) {
            window.attachEvent("onhashchange", hashChanged);
        } else {
            window.onhashchange = hashChanged;
        }
    } else {
        setInterval(function() {
            if (oldURL != window.location.href) {
                hashChanged.call(window);
            }
        }, 150);
    }
    // 设置默认配置
    require.async("pub-config", function(config) {
        config = config || {};
        app.init(config, function() {
            // 开始应用
            oldURL = window.location.href;
            hashChanged();
            // 自动登录的请求
            window.app = app;
            if (app.config("debug") > 1) {
                app.log("[PubJS] Environment inited.");
            }
        });
    });
});

define("lib/exports", [ "./app", "gallery/jquery/1.8.3/jquery", "./util", "./view", "./handler", "./router" ], function(require, exports, module) {
    var app = require("./app");
    var view = require("./view");
    var util = require("./util");
    var handler = require("./handler");
    return module.exports = exports = {
        App: app,
        View: view,
        Module: app.Module,
        Util: util,
        Handler: handler
    };
});

/**
 * PubJS Handler Module
 */
define("lib/handler", [ "./router" ], function(require, exports) {
    var Router = require("./router");
    exports.setup = function(_exports, name, options) {
        if (arguments.length < 2) {
            options = name;
            if ("undefined" !== typeof options.name) {
                name = options.name;
            }
        }
        if ("undefined" == typeof options.routes) {
            options.routes = {};
        }
        _exports.name = name;
        _exports.router = Router(options.routes);
    };
});

define("lib/router", [], function(require, exports, module) {
    module.exports = Router;
    function isHashRouter(url) {
        return /^#/.test(url);
    }
    function Router(handlers) {
        var handlerFn = function(app) {
            var path = window.location.pathname + window.location.hash;
            var hit = getHit(path, handlerFn);
            app.currHandler = hit.handler;
            app.params = hit.params;
            hit.handler(app);
        };
        handlerFn.handlers = handlers;
        handlerFn.rules = {};
        for (var key in handlers) {
            if (isHashRouter(key)) {
                handlerFn.rules[key] = new RegExp(key.replace(/:([\w%$.-]*)/g, "([\\w%$.-]*)").replace("(([\\w%$.-]*))", "([\\w%$.-]*)") + "$", "i");
            } else {
                handlerFn.rules[key] = new RegExp("^" + key.replace(/:([\w%$.-]*)/g, "([\\w%$.-]*)").replace("(([\\w%$.-]*))", "([\\w%$.-]*)") + "([#]*)(.*)$", "i");
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
            path = path.replace(/:([\w%$-]*)/i, ":([w%$-]+)");
            args.push(RegExp["$1"]);
            path = path.replace(/\/:\(\.\*\)/i, "\\/(.*)").replace(/\(:\(\.\*\)\)/i, "(.*)");
        }
        reg.test(reqPath);
        var $args = {};
        for (var i = 0; i < 10; i++) if (RegExp["$" + i] !== "") $args[args[i - 1]] = RegExp["$" + i]; else break;
        return $args;
    }
    function noop() {
        return false;
    }
});

define("lib/util", [ "gallery/jquery/1.8.3/jquery" ], function(require, ex) {
    var $ = require("gallery/jquery/1.8.3/jquery.js");
    // 变量类型判断
    function isFunc(func) {
        return func instanceof Function;
    }
    function isString(str) {
        return typeof str === "string";
    }
    function isArray(val) {
        return val instanceof Array;
    }
    function isObject(val) {
        return val instanceof Object;
    }
    function isUndefined(val) {
        return typeof void 0 === typeof val;
    }
    function isNull(val) {
        return null === val;
    }
    function starRegExp(str) {
        str = str.replace(/([\$\.\^\(\)\[\]\{\}])/g, "\\$1");
        str = str.replace(/\*/g, "(?:.+)");
        return new RegExp(str);
    }
    function getCssValue(el, name) {
        var val = $(el).css(name).replace(/[a-z]+/i, "");
        return parseInt(val, 10) || 0;
    }
    function ucFirst(str) {
        if (isString(str)) {
            var c = str.charAt(0).toUpperCase();
            return c + str.substr(1);
        }
        return str;
    }
    function toHex(num, len) {
        var hex = "0123456789ABCDEF";
        var c = "";
        num = parseInt(num, 10);
        while (num > 15) {
            c = hex.charAt(num % 16) + c;
            num = num >> 4;
        }
        c = hex.charAt(num % 16) + c;
        while (len && c.length < len) {
            c = "0" + c;
        }
        return c;
    }
    var _has = Object.prototype.hasOwnProperty;
    function has(obj, key) {
        if (key === undefined) {
            return false;
        }
        return _has.call(obj, key);
    }
    ex.isFunc = isFunc;
    ex.isString = isString;
    ex.isArray = isArray;
    ex.isObject = isObject;
    ex.isUndefined = isUndefined;
    ex.starRegExp = starRegExp;
    ex.getCssValue = getCssValue;
    ex.ucFirst = ucFirst;
    ex.toHex = toHex;
    ex.has = has;
    var ua = navigator.userAgent.toLowerCase();
    var tmp = null;
    ex.isIe = (tmp = ua.match(/msie ([\d.]+)/)) ? tmp[1] : false;
    ex.isFf = (tmp = ua.match(/firefox\/([\d.]+)/)) ? tmp[1] : false;
    ex.isChrome = (tmp = ua.match(/chrome\/([\d.]+)/)) ? tmp[1] : false;
    ex.isOpera = (tmp = ua.match(/opera.([\d.]+)/)) ? tmp[1] : false;
    ex.isSafari = (tmp = ua.match(/version\/([\d.]+).*safari/)) ? tmp[1] : false;
    ua = tmp = null;
    var trim = String.prototype.trim;
    if (!trim) {
        var trim_exp = /(^\s*)|(\s*$)/g;
        trim = function() {
            return this.replace(trim_exp, "");
        };
    }
    ex.trim = function(str) {
        if (isString(str)) {
            return trim.call(str);
        } else {
            return str;
        }
    };
    /**
   * 返回对象自有的属性值
   * @param  {Object} obj  属性所属的对象
   * @param  {String} prop 属性名称
   * @return {Mix}      返回对象的属性, 不存在或属性为继承获得, 返回undefined
   */
    ex.own = function(obj, prop) {
        if (has(obj, prop)) {
            return obj[prop];
        } else {
            return undefined;
        }
    };
    function toRGB(r, g, b) {
        var c = "#";
        c += toHex(r * 255, 2);
        c += toHex(g * 255, 2);
        c += toHex(b * 255, 2);
        return c;
    }
    /**
   * HSL 转 RGB 颜色格式
   * @param  {Number} h 色相 [ 0-360 ]
   * @param  {Number} s 饱和 [ 0-1 ]
   * @param  {Number} l 亮度 [ 0-1 ]
   * @return {String}   CSS颜色字符串
   */
    ex.hsl2rgb = function(h, s, l) {
        if (isObject(h) && "h" in h && "s" in h && "l" in h) {
            l = h.l;
            s = h.s;
            h = h.h;
        }
        // h *= 360;
        var R, G, B, X, C;
        h = h % 360 / 60;
        C = 2 * s * (l < .5 ? l : 1 - l);
        X = C * (1 - Math.abs(h % 2 - 1));
        R = G = B = l - C / 2;
        h = ~~h;
        R += [ C, X, 0, 0, X, C ][h];
        G += [ X, C, C, X, 0, 0 ][h];
        B += [ 0, 0, X, C, C, X ][h];
        return toRGB(R, G, B);
    };
    /**
   * HSB/HSV 转 RGB 颜色格式
   * @param  {Number} h 色相 [ 0-360 ]
   * @param  {Number} s 饱和 [ 0-1 ]
   * @param  {Number} v 明度 [ 0-1 ]
   * @return {String}   CSS颜色字符串
   */
    ex.hsb2rgb = function(h, s, v) {
        if (isObject(h) && "h" in h && "s" in h && "b" in h) {
            v = h.b;
            s = h.s;
            h = h.h;
        }
        // h *= 360;
        var R, G, B, X, C;
        h = h % 360 / 60;
        C = v * s;
        X = C * (1 - Math.abs(h % 2 - 1));
        R = G = B = v - C;
        h = ~~h;
        R += [ C, X, 0, 0, X, C ][h];
        G += [ X, C, C, X, 0, 0 ][h];
        B += [ 0, 0, X, C, C, X ][h];
        return toRGB(R, G, B);
    };
    ex.blockEvent = function(evt) {
        evt.stopPropagation();
        return false;
    };
    ex.stopEvent = function(evt) {
        evt.stopPropagation();
        return true;
    };
    ex.each = function(list, cb, ct) {
        if (!list || !isFunc(cb)) {
            return false;
        }
        if (!ct) {
            ct = window;
        }
        var ret = null;
        var c = null;
        var i = null;
        if (isArray(list)) {
            for (i = 0; i < list.length; i++) {
                ret = cb.call(ct, list[i], i);
                if (ret === false) {
                    break;
                }
                if (ret === null) {
                    list.splice(i, 1);
                    i--;
                } else if (ret !== undefined) {
                    list[i] = ret;
                }
            }
            if (i == list.length) {
                i = null;
            }
        } else if (isObject(list)) {
            for (c in list) {
                if (!_has.call(list, c)) {
                    continue;
                }
                ret = cb.call(ct, list[c], c);
                if (ret === false) {
                    i = c;
                    break;
                }
                if (ret === null) {
                    list[c] = null;
                    delete list[c];
                } else if (ret !== undefined) {
                    list[c] = ret;
                }
            }
        }
        list = cb = ct = null;
        ex.each.result = i;
        return i;
    };
    ex.uniq = ex.unique = function(arr, keep) {
        if (!isArray(arr)) {
            return null;
        }
        var exist = {};
        var result = keep ? [] : arr;
        for (var i = 0; i < arr.length; i++) {
            if (_has.call(exist, arr[i])) {
                if (!keep) {
                    arr.splice(i--, 1);
                }
            } else {
                exist[arr[i]] = 1;
            }
        }
    };
    function Index(list, value, field) {
        var ret, c, i, al = arguments.length >= 3;
        if (isArray(list)) {
            c = list.length;
            for (i = 0; i < c; i++) {
                ret = list[i];
                if (al) {
                    if (ret && ret[field] === value) {
                        return i;
                    }
                } else if (ret === value) {
                    return i;
                }
            }
        } else if (isObject(list)) {
            for (i in list) {
                if (!_has.call(list, i)) {
                    continue;
                }
                ret = list[i];
                if (al) {
                    if (ret && ret[field] === value) {
                        return i;
                    }
                } else if (ret === value) {
                    return i;
                }
            }
        }
        return null;
    }
    ex.index = Index;
    ex.find = function(list) {
        var id = Index.apply(this, arguments);
        if (id !== null) {
            return list[id];
        } else {
            return null;
        }
    };
    ex.remove = function(list) {
        var id = Index.apply(this, arguments);
        if (id === null) {
            return false;
        }
        if (isArray(list)) {
            list.splice(id, 1);
        } else {
            delete list[id];
        }
        return true;
    };
    ex.getViewport = function() {
        var d = document, de = d.documentElement, db = d.body;
        var m = d.compatMode === "CSS1Compat";
        return {
            width: m ? de.clientWidth : db.clientWidth,
            height: m ? de.clientHeight : db.clientHeight
        };
    };
    ex.merge = function(target, source) {
        ex.each(source, function(val, name) {
            if (val === null || val === undefined) {
                if (target) {
                    delete target[name];
                }
            } else {
                if (!target) {
                    target = {};
                }
                target[name] = val;
            }
        });
        return target;
    };
    ex.first = function(list) {
        var ret;
        if (isArray(list)) {
            ret = list.shift();
        } else if (isObject(list)) {
            for (var i in list) {
                if (has(list, i)) {
                    ret = list[i];
                    break;
                }
            }
        }
        return ret;
    };
    var tab = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;"
    };
    var esc_reg = /[&<>"]/g;
    function esc_rp(m) {
        return tab[m];
    }
    ex.html = function(s) {
        return typeof s != "string" ? s : s.replace(esc_reg, esc_rp);
    };
    /**
   * 格式化数字, 自动补0前续
   * @param  {Number} number 要格式化的数字
   * @param  {Number} size   格式化后出来的数字位数
   * @return {String}        格式化结果
   */
    function fix0(number, size) {
        number = number.toString();
        while (number.length < size) {
            number = "0" + number;
        }
        return number;
    }
    ex.fix0 = fix0;
    var timestamp = null;
    var format_exp = /[YymndjNwaAghGHis]/g;
    function format_callback(tag) {
        var t = timestamp;
        switch (tag) {
          case "Y":
            return t.getFullYear();

          case "y":
            return t.getFullYear() % 100;

          case "m":
            return fix0(t.getMonth() + 1, 2);

          case "n":
            return t.getMonth() + 1;

          case "d":
            return fix0(t.getDate(), 2);

          case "j":
            return t.getDate();

          case "N":
            return t.getDay();

          case "w":
            return t.getDay() % 7;

          case "a":
            return t.getHours() < 12 ? "am" : "pm";

          case "A":
            return t.getHours() < 12 ? "AM" : "PM";

          case "g":
            return t.getHours() % 12 + 1;

          case "h":
            return fix0(t.getHours() % 12 + 1, 2);

          case "G":
            return t.getHours();

          case "H":
            return fix0(t.getHours(), 2);

          case "i":
            return fix0(t.getMinutes(), 2);

          case "s":
            return fix0(t.getSeconds(), 2);
        }
        return tag;
    }
    ex.date = function(format, date, offset) {
        if (!format) {
            return "";
        }
        var ts;
        if (isNaN(date)) {
            if (date instanceof Date) {
                ts = date;
                if (!isNaN(offset)) {
                    ts.setTime(ts.getTime() + offset * 1e3);
                }
            } else {
                ts = new Date();
            }
        } else if (date > 5e8) {
            // 时间戳
            ts = new Date().setTime(date * 1e3);
        } else {
            // 时间偏移(秒数)
            ts = new Date();
            ts.setTime(ts.getTime() + date * 1e3);
        }
        timestamp = ts;
        return format.replace(format_exp, format_callback);
    };
});

define("lib/view", [ "./app", "gallery/jquery/1.8.3/jquery", "./util" ], function(require, exports) {
    var App = require("./app");
    var $ = require("gallery/jquery/1.8.3/jquery.js");
    /**
   * 获取容器的html
   * @param {Object}  config  标签的属性配置。可在此函数处理的有标签名(targetName)，class,id。attr-data为属性扩展预留字段
   * @return  {String}      处理完的html字符串
   * @private
   */
    function _getTargetHtm(config) {
        // tag与html为特殊标记
        return "<{tag}{class}{id}{type}{value}{attr-data}>{html}</{tag}>".replace(/(\{\w+\})/g, function(val) {
            val = val.replace(/\{|\}/g, "");
            return (val === "tag" || val === "html") && config[val] || config[val] && " " + val + '="' + config[val] + '"' || "";
        });
    }
    /**
   * 创建dom
   * @param {Object}  config  标签的属性配置。
   * @return  {Object}      jquery对象
   * @private
   */
    function _create(config) {
        var el = _getTargetHtm(config);
        var attr = "";
        var has = 0;
        for (var n in config) {
            if (/data-\w+/.exec(n)) {
                attr += " " + n + '="' + config[n] + '"';
                has = has || !has;
            }
        }
        el = el.replace("{attr-data}", attr);
        if (config.tag === "input") {
            el = el.replace("></input>", "/>");
        }
        if (!config.stringify) {
            el = $(el);
        }
        attr = has = null;
        return el;
    }
    /**
   * 检测指定对象是否归属于某一或多个对象
   * @param  {Object}   tag  指定的jq对象
   * @param  {Mix}      els  归属对象。jq对象或由jq对象组成的数组
   * @return {Boolean}       判断结果
   */
    function _chkClosest(tag, els) {
        var has = false;
        if (App.util.isArray(els)) {
            for (var i = 0; i < els.length; i++) {
                if (tag.closest(els[i]).length) {
                    has = true;
                    break;
                }
            }
        } else {
            has = tag.closest(els).length;
        }
        return has;
    }
    /**
   * 点击界面上任意非指定对象区域时自动执行特定函数
   * @param  {Mix}      el      指定对象
   * @param  {Function} fn      执行函数
   * @param  {Object}   scope   函数作用域
   * @return {Function}         绑定到document上的执行函数
   */
    function _hideOnDocumentClick(el, fn, scope) {
        var closPopTip = function(event) {
            if (!_chkClosest($(event.target), el)) {
                fn.call(scope || this);
                $(document).unbind("click", closPopTip);
            }
        };
        $(document).bind("click", closPopTip);
        return closPopTip;
    }
    /**
   * 容器模块构造函数
   * @param {Object} config   模块配置
   * @param {Object} parent   父层实例<系统自动追加>
   * @param {Object} idObject 当前实例的相关信息<系统自动追加>
   */
    var Container = App.Module.extend({
        html: "",
        // 是否自动添加
        auto: 1,
        // 是否自动执行layout
        autoLayout: 0,
        /*
        是否自动隐藏
        支持参数
        {
        Array。附加的判断区域
            "andSelf":[]
        }
      */
        autoHide: 0
    }, function(config, parent, idObject) {
        $.extend(true, this.config, {
            // 标签名
            tag: config.tagName || "div",
            // ID
            id: config.id || null,
            // 标签添加容器或目标容器的jq选择器
            target: parent
        }, config);
        if (!this.config.el) {
            if (this.config.tag === "body") {
                this.el = $("body:first");
            } else {
                this.el = this.createDom(this.config);
            }
            this.auotHideHandler = null;
            if (App.util.isString(this.config.target)) {
                this.config.target = $(this.config.target);
            }
        } else {
            this.el = this.config.el;
        }
    }, App.Module, {
        init: function() {
            if (this.config.auto) {
                this.render();
            }
        },
        /**
       * 显示容器
       * @param  {Mix}      config   函数执行配置。<String|Number>
       * @return {Object}            Container实例
       */
        show: function(config) {
            config = config || undefined;
            if (this.config.autoHide && !config) {
                config = 0;
            }
            var self = this;
            var callBack = function() {
                self.afterShow();
                if (self.config.autoHide) {
                    var el = [ self.el ];
                    if (self.config.autoHide.andSelf) {
                        el = el.concat(self.config.autoHide.andSelf);
                    }
                    self.auotHideHandler = _hideOnDocumentClick(el, self.hide, self);
                    el = null;
                }
                self.cast("containerShow");
            };
            this.el.show(config, callBack);
            if (config === undefined) {
                self.cast("containerShow");
            }
            return this;
        },
        /**
       * 隐藏容器
       * @param  {Mix}      config   函数执行配置。<String|Number>
       * @param  {Function} callback 回调函数
       * @return {Object}            Container实例
       */
        hide: function(config) {
            config = config || undefined;
            if (this.config.autoHide && !config) {
                config = 0;
            }
            var self = this;
            var callBack = function() {
                self.afterHide();
                if (self.config.autoHide) {
                    self.auotHideHandler = null;
                }
                self.cast("containerHide");
            };
            this.el.hide(config, callBack);
            if (config === undefined) {
                self.cast("containerHide");
            }
            return this;
        },
        afterHide: $.noop,
        afterShow: $.noop,
        /**
       * 把当前容器插入到指定的容器中
       * @param  {Object} target 容器实例或者jQuery对象实例
       * @return {None}        无返回
       */
        appendTo: function(target) {
            if (target.jquery) {
                this.el.appendTo(target);
            } else if (target.el && target.el.jquery) {
                this.el.appendTo(target.el);
            }
        },
        /**
       * 创建html Dom
       * @param  {Object} config dom创建配置
       * @return {Object}        jquery对象
       */
        createDom: function(config) {
            return _create(config);
        },
        /**
       * 容器渲染函数
       * @return {Object} Container实例
       */
        render: function() {
            if (this.el && this.config.tag !== "body") {
                this.appendTo(this.config.target);
            }
            return this;
        },
        /**
       * 删除容器
       * @param  {Boolean} doom 是否彻底销毁
       * @return {Object}       Container实例
       */
        remove: function(doom) {
            this.el.remove();
            if (doom) {
                this.el = null;
            }
            return this;
        },
        /**
       * 框架销毁函数的回调函数
       * @return {Undefined} 无返回值
       */
        afterDestroy: function() {
            this.remove(true);
        },
        /**
       * 销毁函数
       * @return {Undefined} 无返回值
       */
        destroy: function() {
            if (this.doms) {
                for (var key in this.doms) {
                    if (this.doms.hasOwnProperty(key) && this.doms[key] && this.doms[key].jquery) {
                        this.doms[key].remove();
                    }
                }
            }
            if (this.el) {
                this.el.find("*").unbind();
                this.el.empty();
            }
            Container.master(this, "destroy");
        }
    });
    exports.Container = Container;
    /**
   * 创建layout内部区域
   * @param {Array} gird 内部容器切割配置
   * @param {Object} layout Layout实例对象
   * @private
   */
    function _buildLayoutGrid(grid, layout, perfix) {
        var gridCells = [];
        var gridRows = null;
        var hasChild = grid[1] > 1;
        var multiRow = grid[0] > 1;
        var tmp = null;
        if (multiRow) {
            // 多行的时候输出每行的实例对象
            gridRows = [];
        }
        for (var i = 0, l = grid[0]; i < l; i++) {
            if (multiRow) {
                // 多行时每行是一个Container对象。
                // 单元可以指定生成的标签与其余的属性
                tmp = _buildContain(layout, perfix.row + "_" + i, layout.config.target, layout.config.cellSet && layout.config.cellSet[gridCells.length] || {});
                gridRows.push(tmp);
            } else {
                tmp = {
                    el: layout.config.target
                };
            }
            if (hasChild) {
                // 有列的情况
                // 单元可以指定生成的标签与其余的属性，而行只能是div
                for (var j = 0, l = grid[1]; j < l; j++) {
                    gridCells.push(_buildContain(layout, multiRow && perfix.cell + "_" + k + "_" + j || perfix.col + "_" + j, tmp.el, layout.config.cellSet && layout.config.cellSet[gridCells.length] || {}));
                }
            } else if (multiRow) {
                gridCells.push(tmp);
            }
        }
        tmp = hasChild = multiRow = null;
        return {
            rows: gridRows,
            cells: gridCells
        };
    }
    /**
   * 创建container中的内部容器
   * @param  {Object} layout Layut实例对象
   * @param  {String} name   内部容器名
   * @return {Object}        创建后的容器对象
   * @private
   */
    function _buildContain(layout, name, target, conConfig) {
        return layout.create(name, Container, $.extend({
            "class": name,
            target: target
        }, conConfig));
    }
    /**
   * 获取数组中指定位置的元素
   * @param  {Array}  source  待检索的数组
   * @param  {Number} index   元素索引，负数则取倒数第index个
   * @return {Mix}            检索出来的元素
   * @private
   */
    function _getElByIndex(source, index) {
        return index < 0 && Math.abs(index) <= source.length && source.slice(source.length + index, source.length + (index + 1))[0] || source[index];
    }
    /**
   * 布局模块构造函数
   * @param {Object} config   模块配置
   * @param {Object} parent   父层实例<系统自动追加>
   * @param {Object} idObject 当前实例的相关信息<系统自动追加>
   */
    var Layout = App.Module.extend({
        target: null,
        // 行，列
        grid: [ 1, 1 ],
        // 行与列的样式前缀前缀
        perfix: {
            row: "layoutRow",
            col: "layoutCol",
            cell: "layoutCell"
        },
        // 每个单元实例的配置<Array>
        cellSet: null
    }, function(config, parent, idObject) {
        if (!config.target) {
            return false;
        }
        // layout中的单元。依照上->下，左->右的顺序排列
        this.gridCells = null;
        // layout中的行
        this.gridRows = null;
        // 单元数量
        this.cellsLen = 0;
        // layout是否已经建立
        this.hasBuilded = 0;
    }, App.Module, {
        init: function() {
            this.doLayout();
            this.hasBuilded = 1;
        },
        /**
       * 获取指定位置的单元
       * @param  {Number} index   单元索引，负数则取倒数第index个
       * @return {Mix}            检索出来的单元
       */
        get: function(index) {
            index = +index;
            if (!isNaN(index)) {
                return _getElByIndex(this.gridCells, index);
            }
        },
        /**
       * 获取指定行
       * @param  {Number} index   行索引，负数则取倒数第index个
       * @return {Mix}            检索出来的行
       */
        getRow: function(index) {
            index = +index;
            if (!isNaN(index)) {
                return _getElByIndex(this.gridRows, index);
            }
        },
        /**
       * Layout渲染函数
       * @param  {Object} config layout设置<可选>
       * @return {Object}        Layout实例
       */
        doLayout: function(config) {
            if (config) {
                this.config = $.extend(this.config, config);
            }
            if (this.config.grid[0] === 1 && this.config.grid[1] === 1) {
                this.gridCells = this.gridRows = [ this.config.target ];
            } else {
                var grid = _buildLayoutGrid(this.config.grid, this, this.config.perfix);
                this.gridCells = grid.cells;
                this.gridRows = grid.rows || [ this.config.target ];
                grid = null;
            }
            this.cellsLen = this.gridCells.length;
            return this;
        },
        /**
       * 框架销毁函数的回调函数
       * @return {Undefined} 无返回值
       */
        afterDestroy: function() {
            this.config.target.empty();
        }
    });
    Layout.isMaster = true;
    exports.layout = Layout;
    var Page = App.Module.extend({}, Container, {
        init: function() {
            this.config.init.apply(this, arguments);
        }
    });
    exports.Page = Page;
    var Form = App.Module.extend({
        // HTMLFormElement實例
        tagName: "form",
        // 默認設置
        method: "POST",
        type: "multipart/form-data",
        action: "/"
    }, Container, {
        init: function() {
            this.render();
            var $el = $(this.el);
            $el.attr("action", this.config.action);
            $el.attr("method", this.config.method.toUpperCase());
            $el.attr("type", this.config.type);
        },
        append: function(key, value, filename) {},
        submit: function(callback) {}
    });
    exports.Form = Form;
});

/**
 * 多语言功能模块
 * 自动在window域上导出两个函数, LANG() 和 _T()
 * LANG() - 实际翻译方法, 支持参数替换
 * _T()   - 语言定义方法, 为让LANG支持变量方式, 原语言先通过该函数定义为语言字符串
 *
 * @param  {Function} cb 加载完毕回调函数
 * @return {Object}      返回语言管理对象
 */
define("lib/middlewares/language", [], function(require, exports, module) {
    module.exports = function() {
        return function(app, next, later) {
            // Check cookie and datacenter supports
            if (!app.cookie || !app.data) return later();
            app.lang = new Language(app, next);
        };
    };
    function Language(app, cb) {
        var self = this;
        var regx = /\%(\d+)/g;
        var regx_param = null;
        var default_name = app.config("language/default") || "zh_CN";
        var cookie_name = app.config("language/cookie") || "lang";
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
        };
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
                if (cb) return cb(false);
            }
            this.load_name = name;
            app.cookie.set(cookie_name, name, {
                expires: 9999,
                path: "/"
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
                app.data.abort(ajaxId);
            }
            ajaxId = app.data.get("/i18n/" + this.load_name + "/translate.json", onLoad);
        };
        function onLoad(err, data) {
            ajaxId = 0;
            if (!err) {
                self.translate = data;
            }
            callback(err);
        }
        function callback(err) {
            if (!err) {
                // 加载成功, 设置语言名称和附加CSS
                $("body").removeClass("i18n_" + self.name).addClass("i18n_" + self.load_name);
                // 引入CSS文件
                $("#LANGUAGE_STYLE").remove();
                if (self.translate) {
                    $("head").append('<link type="text/css" rel="stylesheet" id="LANGUAGE_STYLE" href="' + app.config("language/style") + self.load_name + '/style.css">');
                }
                self.name = self.load_name;
            }
            if (cb_func) {
                cb_func(!err);
                cb_func = null;
            }
            app.core.cast("switchLanguage", self.name);
        }
        // 先加载语言
        this.load();
    }
});

define("lib/middlewares/query", [], function(require, exports, module) {
    module.exports = function() {
        return function(app, next) {
            var search = window.location.search;
            app.query = queryParser(search.substring(1));
            next();
        };
    };
    function queryParser(quertstring) {
        var _tmp1 = quertstring.split("&");
        var query = {};
        if (_tmp1[0] == "") return query;
        for (var i = 0, l = _tmp1.length; i < l; i++) {
            var _tmp2 = _tmp1[i].split("=");
            query[_tmp2[0]] = typeParser(_tmp2[1]);
        }
        return query;
    }
    function typeParser(value) {
        if (isNaN(parseInt(value))) {
            var rtn = null;
            switch (value) {
              case "true":
                rtn = true;
                break;

              case "false":
                rtn = false;
                break;

              case "null":
                rtn = null;
                break;

              case "undefined":
                rtn = undefined;
                break;

              case "NaN":
                rtn = NaN;
                break;

              default:
                rtn = value;
            }
            return rtn;
        } else {
            return parseFloat(value);
        }
    }
});

/**
 * 拖动控制模块
 * @description 只传入dom参数, 可以取消绑定
 * @param {jQuery}   dom      绑定触发拖拽的jQuery对象
 * @param {Object}   data     <可选> 回调事件参数
 * @param {Function} callback 回调函数
 * @param {Object}   context  <可选> 回调函数调用域
 */
define("lib/middlewares/drag", [ "gallery/jquery/1.8.3/jquery" ], function(require, exports, module) {
    var $ = require("gallery/jquery/1.8.3/jquery.js");
    module.exports = function() {
        return function(app, next) {
            app.drag = Drag;
            next();
        };
    };
    function Drag(dom, data, callback, context) {
        if (!dom) {
            return false;
        }
        if (!dom.jquery) {
            dom = $(dom);
        }
        if (arguments.length == 1) {
            dom.unbind("mousedown.drag", DragEvent);
        } else {
            if (isFunc(data)) {
                context = callback;
                callback = data;
                data = null;
            }
            dom.bind("mousedown.drag", {
                cb: callback,
                ct: context || window,
                data: data
            }, DragEvent);
        }
        return false;
    }
    /**
   * 拖拽DOM事件处理封装函数
   * @param {Event} evt jQuery事件对象
   */
    function DragEvent(evt) {
        var ev = evt.data;
        switch (evt.type) {
          case "mouseup":
            $(document).unbind("mouseup.drag", DragEvent);
            $(document).unbind("mousemove.drag", DragEvent);
            ev.type = "endDrag";

          /* falls through */
            case "mousemove":
            if (evt.type != "mouseup") {
                ev.type = "moveDrag";
            }
            ev.cx = evt.pageX;
            ev.cy = evt.pageY;
            ev.dx = evt.pageX - ev.x;
            ev.dy = evt.pageY - ev.y;
            ev.cb.call(ev.ct, ev);
            break;

          case "mousedown":
            if (evt.button == 2) {
                return false;
            }
            ev.cx = ev.x = evt.pageX;
            ev.cy = ev.y = evt.pageY;
            ev.dx = 0;
            ev.dy = 0;
            ev.type = "startDrag";
            if (ev.cb.call(ev.ct, ev)) {
                $(document).bind("mouseup.drag", ev, DragEvent);
                $(document).bind("mousemove.drag", ev, DragEvent);
            }
            break;
        }
        return false;
    }
});
