define("lib/middlewares/messager", [], function(require, exports, module) {
    var messager = null;
    module.exports = function() {
        return function(app, next) {
            messager = app.messager = new Messager();
            next();
        };
    };
    function Messager() {
        /**
     * 系统事件绑定缓存列表
     * @type {Array}
     */
        this.binds = [];
        /**
     * 事件系统是否正在发送消息
     * @type {Number} 0 - 空闲, 1 - 正在发送
     */
        this.busy = 0;
        /**
     * 消息处理队列, 缓存准备发送的消息队列
     * @type {Array}
     */
        this.queue = [];
    }
    var msg = {
        listener: 0,
        sender: 1,
        type: 2,
        func: 3,
        data: 4,
        context: 5
    };
    Messager.prototype = {
        /**
     * 创建事件消息变量对象
     * @private
     * @param  {Object} sender 发送事件的模块实例
     * @param  {String} type   发送的事件名称
     * @param  {Object} param  <可选> 附加在事件变量param中的事件参数
     * @return {Object}        返回事件消息变量对象
     */
        createEvent: function(sender, type, param) {
            return {
                from: sender,
                type: type,
                param: param,
                data: null,
                target: null,
                count: 0,
                method: "on" + util.ucFirst(type),
                returnValue: null
            };
        },
        /**
     * 触发模块实例的事件处理方法
     * @private
     * @param  {Object} target 触发事件的模块实例
     * @param  {Object} evt    事件变量对象
     * @param  {Mix} def       默认返回值(没有对应的处理方法时)
     * @return {Mix}           返回处理函数的返回结果或设置的默认返回值
     */
        triggerEvent: function(target, evt, def) {
            evt.target = target;
            evt.data = null;
            // TODO: 正式版时拦截异常
            // try {
            if (target[evt.method] && target[evt.method] instanceof Function) {
                def = target[evt.method].call(target, evt);
                evt.count++;
            } else if (target.onEvent) {
                def = target.onEvent.call(target, evt);
                evt.count++;
            }
            // ) catch(err) {
            // exports.error(err);
            // }
            return def;
        },
        /**
     * 通知模块实例事件通知已发送, 传入事件变量对象
     * @private
     * @param  {Object}   evt      事件变量对象
     * @param  {Function} callback 自定义回调函数
     * @param  {Object}   context  自定义回调函数运行域
     * @return {Bool}              固定返回true, 匹配事件函数的执行状态
     */
        notifySent: function(evt, callback, context) {
            if (!callback) {
                callback = evt.from.onEventSent;
            } else if (isString(callback)) {
                callback = evt.from[callback];
            } else if (!isFunc(callback)) {
                callback = null;
            }
            if (callback) {
                try {
                    callback.call(context || evt.from, evt);
                } catch (err) {}
            }
            if (this.queue.length > 0) {
                setTimeout(this.sendQueue, 0);
            } else {
                messager.busy = 0;
            }
            return true;
        },
        /**
     * 继续发送消息队列中的消息
     * @private
     * @return {Undefined} 无返回
     */
        sendQueue: function() {
            messager.busy = 0;
            var msg = messager.queue.shift();
            if (!msg) {
                return;
            }
            var func = 1 == msg.shift() ? messager.broadcast : messager.fire;
            func.apply(messager, msg);
        },
        /**
     * 添加事件绑定关系
     * @param  {Object}   listener 监听事件的对象实例
     * @param  {Object}   sender   被监听事件的发起对象实例
     * @param  {String}   type     监听的事件名
     * @param  {Function} callback 事件回调函数
     * @param  {Mix}      data     事件回调附加数据
     * @param  {Object}   context  回调函数执行的命名空间
     * @return {Bool}              绑定是否成功的状态
     */
        bind: function(listener, sender, type, callback, data, context) {
            if (!callback) {
                if (!listener || !listener.onEvent) {
                    return false;
                }
                callback = listener.onEvent;
            }
            // TODO: 去重
            this.binds.push([ listener && listener._.guid || 0, sender._.guid, type, callback, data || null, context || null ]);
            return true;
        },
        /**
     * 取消监听事件
     * @param  {Object}   listener 监听事件的模块实例
     * @param  {Object}   sender   要取消监听的发送实例
     * @param  {String}   type     <可选> 要取消监听的事件名称
     * @param  {Function} callback <可选> 要取消监听的事件回调函数
     * @return {Number}            返回解除绑定的记录数目
     */
        unbind: function(listener, sender, type, callback) {
            var lid = listener && listener._.guid || 0;
            var sid = sender && sender._.guid || 0;
            var count = 0;
            var bind;
            for (var i = this.binds.length; i > 0; ) {
                bind = this.binds[--i];
                if (lid && lid != bind[msg.listener]) {
                    continue;
                }
                if (sid && sid != bind[msg.sender]) {
                    continue;
                }
                if (type && type != bind[msg.type]) {
                    continue;
                }
                if (callback && callback != bind[msg.func]) {
                    continue;
                }
                this.binds.splice(i, 1);
                count++;
            }
            return count;
        },
        /**
     * 触发冒泡事件, 优先触发监听的处理, 再进行冒泡过程
     * @param  {Object}   sender   发送事件的模块实例
     * @param  {String}   type     发送的事件名称
     * @param  {Object}   param    <可选> 附加在事件变量param中的事件参数
     * @param  {Function} callback <可选> 事件完成回调函数, 参数为事件变量对象, 可让事件处理函数返回值给触发函数
     * @param  {Object}   context  <可选> 回调函数的运行域
     * @return {Bool}              返回事件是否被立即发送的状态
     */
        fire: function(sender, type, param, callback, context) {
            if (this.busy) {
                this.queue.push([ 0, sender, type, param, callback, context ]);
                return false;
            }
            this.busy = 1;
            var guid = sender._.guid;
            var bind, listener, ret;
            var evt = this.createEvent(sender, type, param);
            // 先触发绑定事件
            for (var i = 0; i < this.binds.length; i++) {
                bind = this.binds[i];
                if (bind[msg.sender] == guid && bind[msg.type] == type) {
                    listener = caches[bind[msg.listener]];
                    // 监听模块不存在, 移除监听记录
                    if (!listener) {
                        this.binds.splice(i--, 1);
                        continue;
                    }
                    // 设置参数
                    evt.data = bind[msg.data];
                    evt.target = listener;
                    // 调用回调参数
                    ret = bind[msg.func].call(bind[msg.context] || listener, evt);
                    // TODO: 约定返回值的处理规则
                    if (ret === false) {
                        return this.notifySent(evt, callback, context);
                    }
                }
            }
            // 事件冒泡
            listener = sender;
            // 优先从本对象内广播
            evt.data = null;
            while (listener) {
                if (this.triggerEvent(listener, evt) === false) {
                    return this.notifySent(evt, callback, context);
                }
                listener = listener.parent();
            }
            return this.notifySent(evt, callback, context);
        },
        /**
     * 向子模块广播事件, 逐层下发, 没层先触发绑定处理函数, 再下发到下一层
     * @param  {Object}   sender   发送事件的模块实例
     * @param  {String}   type     发送的事件名称
     * @param  {Object}   param    <可选> 附加在事件变量param中的事件参数
     * @param  {Function} callback <可选> 事件完成回调函数, 参数为事件变量对象, 可让事件处理函数返回值给触发函数
     * @param  {Object}   context  <可选> 回调函数的运行域
     * @return {Bool}              返回事件是否被立即发送的状态
     */
        broadcast: function(sender, type, param, callback, context) {
            if (this.busy) {
                this.queue.push([ 1, sender, type, param, callback ]);
                return false;
            }
            this.busy = 1;
            var pend = [ sender ];
            var target, ret;
            var evt = this.createEvent(sender, type, param);
            while (pend.length) {
                target = pend.shift();
                if (this.triggerEvent(target, evt, 0) !== false) {
                    // 处理函数没有拦截广播, 继续推送到对象的子实例中
                    pend.push.apply(pend, target.childs());
                }
            }
            return this.notifySent(evt, callback, context);
        },
        /**
     * 直接向指定模块实例发送消息
     * @param  {Object} sender 发送事件的模块实例
     * @param  {Object} target 接收事件的模块实例
     * @param  {String} type   发送事件的名称
     * @param  {Object} param  <可选> 附加在事件变量param中的事件参数
     * @return {Object}        返回事件变量对象, 可让事件处理函数返回值给触发函数
     */
        send: function(sender, target, type, param) {
            if (isString(target)) {
                target = sender.gets(target);
            } else if (isModule(target)) {
                target = [ target ];
            }
            if (!util.isArray(target)) {
                return false;
            }
            var ret;
            var evt = this.createEvent(sender, type, param);
            while (target.length) {
                if (this.triggerEvent(target.shift(), evt) === false) {
                    return evt;
                }
            }
            return evt;
        }
    };
});