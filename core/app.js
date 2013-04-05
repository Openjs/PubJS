define(function(require, exports){
	var $ = require('jquery');
	var util = require('util');
	exports.version = '0.1.0';

	// 空函数
	function noop(){}
	exports.noop = noop;

	// 类式继承功能函数
	function argv_run(ag, proto, scope, func, args){
		if (!func || !(func in proto)) {return undefined;}
		func = proto[func];
		if (typeof(func) != 'function') {return func;}
		var v = ag.callee.caller['arguments'];
		if (ag.length == 2){
			return func.apply(scope, v);
		}else if (args instanceof Array && args.length){
			return func.apply(scope, args);
		}else {
			return func.call(scope);
		}
	}
	// 模块自有公共属性和方法调用
	function mine_run(scope, func, args){
		return argv_run(arguments, this.prototype, scope, func, args);
	}
	// 私有对象属性设置
	function self_run(scope, func){
		var args = [];
		for (var i=2; i<arguments.length; i++){
			args.push(arguments[i]);
		}
		return argv_run(arguments, this.p, scope, func, args);
	}
	function extend(sub,sup,proto,priv){
		function f(scope, func, args){
			if (scope === 0) {return this;}
			if (arguments.length === 0){
				return (sup == noop ? null : sup);
			}
			var v = arguments.callee.caller['arguments'];
			if (!func){
				return sup.call(scope, (args || v[0]), v[1], v[2]);
			}
			return argv_run(arguments, sup.prototype, scope, func, args);
		}
		f.prototype = sup.prototype;

		var n=0, o=sub.prototype;
		var c = sub.prototype = new f(0);

		for (n in o){
			if (o.hasOwnProperty(n)) {c[n] = o[n];}
		}
		if (typeof(proto) == 'object') {for (n in proto){
			if (proto.hasOwnProperty(n)) {c[n] = proto[n];}
		}}
		c.constructor = sub;
		sub.master = f;
		sub.self = self_run;
		sub.mine = mine_run;
		sub.p = priv;
		sub.version = exports.version;
		proto = null;
		return sub;
	}
	window.extend = exports.extend = extend;


	// 系统日志函数
	var con = window.console || {};
	exports.log = function(){
		if (con.error && config('debug') > 0){
			if (con.error.apply){
				con.error.apply(con, arguments);
			}else {
				con.error(arguments[0]);
			}
		}
	}
	exports.error = function(){
		if (con.error && config('debug') > 1){
			if (con.error.apply){
				con.error.apply(con, arguments);
			}else {
				con.error(arguments[0]);
			}
		}
	}

	/**
	 * 系统实例缓存队列
	 * @type {HashList}
	 */
	var caches = exports.caches = {id:10, length:0};

	// 工具函数导出
	exports.util = util;
	var isString = util.isString;
	var isFunc = util.isFunc;
	var has = util.has;

	function isModule(obj){
		if (obj instanceof Object){
			var id = obj._ && obj._.guid || 0;
			return (id && caches[id] === obj);
		}
		return false;
	}
	util.isModule = isModule;
	function isCreator(func){
		if (!func || !func.master) { return false; }
		if (func.self !== self_run) { return false; }
		if (func.mine !== mine_run) { return false; }
		if (func.version !== exports.version) { return false; }
		return true;
	}
	util.isCreator = isCreator;

	// 用户登录检查
	var user_data = null;
	exports.isLogin = function(){
		return !!user_data;
	}
	exports.setUser = function(user){
		user_data = user;
	}
	exports.getUser = function(){
		return user_data;
	}

	/**
	 * 系统配置功能函数
	 * @param  {String} name    配置名称, 使用 / 分隔层次
	 * @param  {Mix}	value   不设为读取配置信息, null为删除配置, 其他为设置值
	 * @param  {Bool}   replace <可选> 强制覆盖值
	 * @return {Mix}            设置和删除操作是返回Bool表示操作状态, 读取是返回配置值
	 */
	function config(name, value, replace){
		if (name instanceof Object){
			value = name;
			name = null;
		}
		var set = (value !== undefined);
		var remove = (value === null);
		var data;

		if (name){
			var ns = name.split('/');
			data = config.data;
			while (ns.length > 1 && (data instanceof Object) && data.hasOwnProperty(ns[0])){
				data = data[ns.shift()];
			}
			if (ns.length > 1){
				if (set) {return false;} // 设置值, 但是父层配置不存在
				if (remove)	{return true;} // 父层已经删除
				return undefined; // 值不存在, 不能获取
			}
			name = ns[0];
		}else if (remove){
			return false; // 根节点不能删除
		}else {
			data = config;
			name = 'data';
		}

		if (set){
			//TODO: 加入合并对象值的处理
			data[name] = value;
			return true;
		}else if (remove) {
			data[name] = null;
			delete(data[name]);
			return true;
		}else {
			return data[name];
		}
	}
	config.data = {};
	exports.config = config;

	/**
	 * Cookie功能函数
	 * @param {String} name    Cookie变量名称, 留空所有参数获取所有Cookie, 指定一个名称获取指定名称的值
	 * @param {String} value   <可选> 有值时, 设置Cookie的的值
	 * @param {Object} options <可选> 设置Cookie的选项参数对象
	 */
	function Cookie(name, value, options){
		if (arguments.length <= 1){
			// 获取Cookie
			var map = {};
			var str = document.cookie;
			if (isString(str)){
				var val = str.split('; ');
				var key;
				for (var i=0; i<val.length; i++){
					value = val[i].indexOf('=');
					key = val[i].substr(0, value);
					value = val[i].substr(value+1);
					map[key] = decodeURIComponent(value);
				}
			}
			if (arguments.length == 1){
				return map[name] || null;
			}else {
				return map;
			}
		}else {
			if (!name) {return false;}
			options = options || {};
			var expires = options['expires'];
			var domain = options['domain'];
			var path = options['path'] || '/';

			if (!options['raw']) {
				value = encodeURIComponent(String(value));
			}

			var text = name + '=' + value;

			// expires
			var date = expires;
			if (!isNaN(date)) {
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
		}
	}
	exports.cookie = Cookie;

	/**
	 * 消息交互模块内部实例
	 * @type {MessagerObject}
	 */
	var messager = null;
	/**
	 * 系统消息交互模块
	 */
	function Messager(){
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
	var msgListener=0,msgSender=1,msgType=2,msgFunc=3,msgData=4,msgContext=5;
	Messager.prototype = {
		/**
		 * 创建事件消息变量对象
		 * @private
		 * @param  {Object} sender 发送事件的模块实例
		 * @param  {String} type   发送的事件名称
		 * @param  {Object} param  <可选> 附加在事件变量param中的事件参数
		 * @return {Object}        返回事件消息变量对象
		 */
		createEvent: function(sender, type, param){
			return {
				'from': sender,
				'type': type,
				'param': param,
				'data': null,
				'target': null,
				'count': 0,
				'method': 'on' + util.ucFirst(type),
				'returnValue': null
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
		triggerEvent: function(target, evt, def){
			evt.target = target;
			evt.data = null;
			// TODO: 正式版时拦截异常
			// try {
				if (target[evt.method] && (target[evt.method] instanceof Function)){
					def = target[evt.method].call(target, evt);
					evt.count++;
				}else if (target.onEvent){
					def = target.onEvent.call(target, evt);
					evt.count++;
				}
			// }catch (err){
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
		notifySent: function(evt, callback, context){
			if (!callback){
				callback = evt.from.onEventSent;
			}else if (isString(callback)){
				callback = evt.from[callback];
			}else if (!isFunc(callback)){
				callback = null;
			}
			if (callback){
				try {
					callback.call((context || evt.from), evt);
				}catch (err){}
			}
			if (this.queue.length > 0){
				setTimeout(this.sendQueue, 0);
			}else {
				messager.busy = 0;
			}
			return true;
		},
		/**
		 * 继续发送消息队列中的消息
		 * @private
		 * @return {Undefined} 无返回
		 */
		sendQueue: function(){
			messager.busy = 0;
			var msg = messager.queue.shift();
			if (!msg) {return;}
			var func = (1 == msg.shift()) ? messager.broadcast : messager.fire;
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
		bind: function(listener, sender, type, callback, data, context){
			if (!callback){
				if (!listener || !listener.onEvent) {return false;}
				callback = listener.onEvent;
			}

			// TODO: 去重
			this.binds.push([
				(listener && listener._.guid || 0),
				sender._.guid,
				type,
				callback,
				(data || null),
				(context || null)
			]);
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
		unbind: function(listener, sender, type, callback){
			var lid = (listener && listener._.guid || 0);
			var sid  = (sender && sender._.guid || 0);
			var count = 0;
			var bind;
			for (var i=this.binds.length; i>0;){
				bind = this.binds[--i];
				if (lid && lid != bind[msgListener]) {continue;}
				if (sid && sid != bind[msgSender]) {continue;}
				if (type && type != bind[msgType]) {continue;}
				if (callback && callback != bind[msgFunc]) {continue;}
				this.binds.splice(i,1);
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
		fire: function(sender, type, param, callback, context){
			if (this.busy){
				this.queue.push([0, sender, type, param, callback, context]);
				return false;
			}
			this.busy = 1;
			var guid = sender._.guid;
			var bind, listener, ret;
			var evt = this.createEvent(sender, type, param);

			// 先触发绑定事件
			for (var i=0; i<this.binds.length; i++){
				bind = this.binds[i];
				if (bind[msgSender] == guid && bind[msgType] == type){
					listener = caches[bind[msgListener]];
					// 监听模块不存在, 移除监听记录
					if (!listener){
						this.binds.splice(i--,1);
						continue;
					}
					// 设置参数
					evt.data = bind[msgData];
					evt.target = listener;
					// 调用回调参数
					ret = bind[msgFunc].call(bind[msgContext] || listener, evt);
					// TODO: 约定返回值的处理规则
					if (ret === false){
						return this.notifySent(evt, callback, context);
					}
				}
			}

			// 事件冒泡
			listener = sender; // 优先从本对象内广播
			evt.data = null;
			while (listener){
				if (this.triggerEvent(listener, evt) === false){
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
		broadcast: function(sender, type, param, callback, context){
			if (this.busy){
				this.queue.push([1, sender, type, param, callback]);
				return false;
			}
			this.busy = 1;
			var pend = [sender];
			var target, ret;
			var evt = this.createEvent(sender, type, param);

			while (pend.length){
				target = pend.shift();
				if (this.triggerEvent(target, evt, 0) !== false){
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
		send: function(sender, target, type, param){
			if (isString(target)){
				target = sender.gets(target);
			}else if (isModule(target)){
				target = [target];
			}
			if (!util.isArray(target)) {return false;}

			var ret;
			var evt = this.createEvent(sender, type, param);

			while (target.length){
				if (this.triggerEvent(target.shift(), evt) === false) {return evt;}
			}
			return evt;
		}
	};


	/**
	 * 数据中心内部实例
	 * @type {DataCenterObject}
	 */
	var datacenter = null;
	/**
	 * 数据中心处理实例定义
	 */
	function DataCenter(){
		this.entries = [];
		// 读取系统配置数据节点
		var list = config('data/points');
		if (list){
			var key, val, kf, vf;
			for (key in list){
				val = list[key];
				if (key.charAt(0) != '/'){
					key = '/' + key;
				}
				kf = (key.substr(-1) == '/');
				vf = (val.substr(-1) == '/');
				if (!kf && vf){
					key += '/';
				}
				if (!vf && kf){
					val += '/';
				}
				this.entries.push({
					'point': key,
					'url': val
				});
			}
			// 排序节点
			this.entries.sort(function(a,b){
				if (a.point.length == b.point.length){
					return (a.point > b.point);
				}else {
					return (a.point.length <= b.point.length);
				}
			});
		}

		// 请求队列
		this.queue = {};
		// 同时请求数
		this.max = config('data/max_query') || 5;
		// 当前请求数
		this.current = 0;
		// 请求序号
		this.id = 1;
	}

	var dcID=0, dcMode=1, dcURI=2, dcData=3, dcParam=4, dcCallback=5, dcContext=6, dcAjax=7, dcAbort=8, dcEvtDat=9;
	DataCenter.prototype = {
		/**
		 * ajax回调函数 / 错误处理用作输出回调(type设为'error')
		 * @param  {Mix}    data ajax返回对象 / 错误对象
		 * @return {None}        无返回
		 */
		onSuccess: function(data){
			datacenter.next(this);

			// 回调通知方法
			var cb = this[dcCallback], ctx = this[dcContext];
			if (cb){
				// 处理数据结构
				var error = null;
				if (data && data.success) {
					data = data.result;
				}else {
					error = data || {success:false, message:LANG('服务器返回信息无效'), code:-10};
					data = null;
				}

				// 回调数据接口
				if (isModule(cb)){
					if (!ctx || !isFunc(cb[ctx])){
						ctx = cb.onData || null;
					}else {
						ctx = cb[ctx];
					}
					if (ctx){
						ctx.call(cb, error, data, this[dcEvtDat]);
					}
				}else if (isFunc(cb)){
					cb.call(ctx || window, error, data, this[dcEvtDat]);
				}
			}
		},
		/**
		 * Ajax错误回调函数
		 * @param  {Object} xhr  jQuery XmlRequest对象
		 * @param  {String} text 错误信息
		 * @param  {String} err  错误描述
		 * @return {None}        无返回
		 */
		onError: function(xhr, text, err){
			if (this[dcAbort]) {return;}
			var error = {
				success: false,
				message: err,
				code: xhr.status
			};
			datacenter.onSuccess.call(this, error);
		},
		/**
		 * 完成一个请求, 并继续发起一个新的请求
		 * @param  {Object}   request 当前要完成的请求对象
		 * @return {None}             无返回
		 */
		next: function(request){
			// 从请求队列中移除当前请求
			var list = this.queue;
			var id = request[dcID];
			this.current--;
			delete(list[id]);

			// 检索出最先进入等待的请求并发起
			for (id in list){
				if (!list.hasOwnProperty(id)) {continue;}
				if (list[id][dcAjax]) {continue;}
				this.execute(list[id]);
				break;
			}
		},
		/**
		 * 执行一个请求
		 * @param  {Object} request 请求对象
		 * @return {None}           无返回
		 */
		execute: function(request){
			// 转换uri节点
			var uri = this.resolve(request[dcURI], request[dcParam]);

			request[dcAjax] = $.ajax({
				type: request[dcMode],
				url: uri,
				data: request[dcData] && JSON.stringify(request[dcData]),
				dataType: 'json',
				success: this.onSuccess,
				error: this.onError,
				// complete: this.onComplete,
				context: request
			});

			this.current++;
		},
		/**
		 * 建立一个请求
		 * @param  {String}   mode     请求方法
		 * @param  {String}   uri      请求URL地址(会被系统绑定节点替换为正确地址)
		 * @param  {Mix}      data     字符串或对象, 需要POST到服务器端的内容
		 * @param  {Object}   param    GET方式的URL请求参数
		 * @param  {Mix}      callback 回调函数 / 模块实例对象
		 * @param  {Mix}      context  回调函数的运行域 / 模块实例对象的回调函数名字符串
		 * @param  {Mix}      evt_data 回调函数附带参数
		 * @return {Number}            返回请求记录ID
		 */
		run: function(mode, uri, data, param, callback, context, evt_data){
			if (isFunc(param) || isModule(param)){
				evt_data = context;
				context = callback;
				callback = param;
				param = null;
			}

			// 放入请求队列
			var id = this.id++;
			var req = [
				id, mode, uri,
				(data || null),
				(param || null),
				(callback || null),
				(context || null),
				null,
				false,
				evt_data
			];
			this.queue[id] = req;

			// 判断是否有空余请求数运行请求
			if (this.current < this.max){
				this.execute(req);
			}
			return id;
		},

		/**
		 * 解析数据节点地址
		 * @param  {String} uri 要解析的URI地址字符串
		 * @param  {Object} param <可选> 附加的GET参数对象
		 * @return {String}     返回解析后的URI字符串
		 */
		resolve: function(uri, param){
			var list = this.entries;
			for (var i=0; i<list.length; i++){
				if (uri.indexOf(list[i].point) === 0){
					uri = list[i].url + uri.substr(list[i].point.length);
					break;
				}
			}
			// 合并param参数到URI中
			if (param){
				uri += (uri.indexOf('?') > 0 ? '&' : '?');
				if (util.isObject(param)){
					uri += $.param(param)
				}else {
					uri += param;
				}
			}
			return uri;
		},
		/**
		 * 请求获取服务器资源
		 * @param  {String}   uri      请求URL地址(会被系统绑定节点替换为正确地址)
		 * @param  {Object}   param    GET方式的URL请求参数
		 * @param  {Mix}      callback 回调函数 / 模块实例对象
		 * @param  {Mix}      context  回调函数的运行域 / 模块实例对象的回调函数名字符串
		 * @param  {Mix}      evt_data 回调函数附带参数
		 * @return {Number}            返回请求记录ID
		 */
		get: function(uri, param, callback, context, evt_data){
			return this.run('GET', uri, null, param, callback, context, evt_data);
		},
		/**
		 * 提交数据到服务器
		 * @param  {String}   uri      请求URL地址(会被系统绑定节点替换为正确地址)
		 * @param  {Mix}      data     字符串或对象, 需要POST到服务器端的内容
		 * @param  {Object}   param    GET方式的URL请求参数
		 * @param  {Mix}      callback 回调函数 / 模块实例对象
		 * @param  {Mix}      context  回调函数的运行域 / 模块实例对象的回调函数名字符串
		 * @param  {Mix}      evt_data 回调函数附带参数
		 * @return {Number}            返回请求记录ID
		 */
		put: function(uri, data, param, callback, context, evt_data){
			return this.run('POST', uri, data, param, callback, context, evt_data);
		},
		/**
		 * 请求删除服务器资源
		 * @param  {String}   uri      请求URL地址(会被系统绑定节点替换为正确地址)
		 * @param  {Object}   param    GET方式的URL请求参数
		 * @param  {Mix}      callback 回调函数 / 模块实例对象
		 * @param  {Mix}      context  回调函数的运行域 / 模块实例对象的回调函数名字符串
		 * @param  {Mix}      evt_data 回调函数附带参数
		 * @return {Number}            返回请求记录ID
		 */
		del: function(uri, param, callback, context, evt_data){
			return this.run('DELETE', uri, null, param, callback, context, evt_data);
		},
		/**
		 * 终止一个请求或所有请求
		 * @param  {Number} id <可选> 要终止的请求ID
		 * @return {Number}    返回终止的请求数目
		 */
		abort: function(id){
			var request;
			if (id){
				request = this.queue[id];
				if (!request) {return 0;}
				if (request[dcAjax]){
					request[dcAbort] = true;
					request[dcAjax].abort();
					this.current--;
				}
				delete(this.queue[id]);
				return 1;
			}else {
				var count = 0;
				for (id in this.queue){
					if (!this.queue.hasOwnProperty(id)) {continue;}
					this.abort(id);
					count++;
				}
				return count;
			}
		}
	};


	/**
	 * 多语言功能模块
	 * 自动在window域上导出两个函数, LANG() 和 _T()
	 * LANG() - 实际翻译方法, 支持参数替换
	 * _T()   - 语言定义方法, 为让LANG支持变量方式, 原语言先通过该函数定义为语言字符串
	 *
	 * @param  {Function} cb 加载完毕回调函数
	 * @return {Object}      返回语言管理对象
	 */
	function Language(cb){
		var me = this;
		var regx = /\%(\d+)/g;
		var regx_param = null;
		var default_name = config('language/default') || 'zh_CN';
		var cookie_name  = config('language/cookie') || 'lang';
		var cookie_value = Cookie(cookie_name);
		var cb_func = cb;

		this.load_name = this.name = cookie_value || default_name;
		this.translate = null;
		this.loaded = true;
		cb = null;

		if (cookie_value != this.name){
			Cookie(cookie_name, this.name);
		}

		/**
		 * 正则参数替换回调函数
		 * @private
		 * @param  {Object} match 正则匹配对象
		 * @return {String}       替换字符串
		 */
		function regx_replace(match){
			if (match[1] > 0 && regx_param[match[1]] !== undefined){
				return regx_param[match[1]];
			}else {
				return match[0];
			}
		}

		/**
		 * 多语言替换函数
		 * @param  {String} text   语言文字
		 * @param  {Mix}    params <可选多个> 替换语言中文字中的%1,%2..等标记的参数
		 * @return {String}        返回翻译后的文字
		 */
		window.LANG = this.LANG = function(text){
			if (me.translate && me.translate.hasOwnProperty(text)){
				text = me.translate[text];
			}
			if (arguments.length > 1){
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
		window._T = function(text){
			return text;
		}

		/**
		 * 设置变更当前语言
		 * @param {String} name 语言名称缩写
		 * @param {Function} cb <可选>加载完毕回调函数
		 */
		this.set = function(name, cb){
			if (!name){
				return this.name;
			}
			if (name == this.load_name){
				if (cb) {cb(false);}
				return;
			}
			this.load_name = name;
			Cookie(cookie_name, name, {expires: 9999, path:'/'});
			cb_func = cb;
			this.load();
		}

		/**
		 * 加载语言包
		 * @return {None} 无返回
		 */
		var ajaxId = 0;
		this.load = function(){
			if (this.load_name == default_name){
				me.translate = null;
				callback(null);
				return;
			}
			this.loaded = false;
			if (ajaxId){
				datacenter.abort(ajaxId)
			}
			ajaxId = datacenter.get('/i18n/'+this.load_name+'/translate.json', onLoad);
		}
		function onLoad(err, data){
			ajaxId = 0;
			if (!err){
				me.translate = data;
			}
			callback(err);
		}
		function callback(err){
			if (!err){
				// 加载成功, 设置语言名称和附加CSS
				$('body').removeClass('i18n_'+me.name).addClass('i18n_'+me.load_name);
				// 引入CSS文件
				$('#LANGUAGE_STYLE').remove();
				if (me.translate){
					$('head').append('<link type="text/css" rel="stylesheet" id="LANGUAGE_STYLE" href="'+config('language/style')+me.load_name+'/style.css">');
				}
				me.name = me.load_name;
			}

			if (cb_func){
				cb_func(!err);
				cb_func = null;
			}
			exports.core.cast('switchLanguage', me.name);
		}

		// 先加载语言
		this.load();
	}


	/**
	 * jQuery事件转发路由
	 * @param  {Object} evt jQuery事件对象
	 * @return {Mix}     返回用户回调函数的值
	 */
	function jqRouter(evt){
		var param = evt.data;
		var mod = caches[param[0]] || null;
		if (!mod) {return;}

		var cb = param[1];
		if (!isFunc(cb)){
			cb = mod[cb];
			if (!isFunc(cb)){
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
	function Module(config, parent, id){
		return this;
	}
	var childs='childs',childs_name='childs_name',childs_id='childs_id';
	extend(Module, noop, {
		/**
		 * 空模块判断函数
		 * @return {Boolean} 返回TRUE表示当前模块是虚拟空模块, FALSE表示为真实模块
		 */
		isNull: function(){
			return false;
		},
		/**
		 * 创建子模块实例
		 * @param  {String}   name   <可选> 子模块实例名称, 成为模块uri路径的一部分
		 * @param  {Function} type   子模块定义函数, 用于生成模块实例的函数
		 * @param  {Object}   config <可选> 传入模块创建函数的配置变量
		 * @return {Object}          返回创建的子模块实例, 创建失败时返回false
		 */
		create: function(name, type, config){
			if (!isModule(this)){
				exports.error('Current Module Invalid');
				return false;
			}

			if (!this._.hasOwnProperty(childs)){
				this._[childs] = []; // 子模块缓存列表
				this._[childs_name] = this.$ = {}; // 子模块命名索引
				this._[childs_id] = 0; // 子模块计数ID
			}
			if (isFunc(name)){
				if (isFunc(type)){
					name = name(this._);
				}else {
					config = type;
					type = name;
					name = null;
				}
			}
			if (!name){
				name = 'child_' + this._[childs_id];
			}else if (this._[childs_name][name]){
				exports.error('Module Name Exists');
				return false;
			}
			this._[childs_id]++;
			
			var id = {
				'uri': this._.uri + '/' + name,	// 模块实例路径
				'name': name,					// 模块实例名称
				'pid': this._.guid,				// 模块父模块实例ID
				'guid': caches.id++				// 当前子实例ID
			};
			var child = new type(config, this, id);
			child._ = id;
			// 存入全局Cache队列
			caches[id.guid] = child;
			caches.length++;
			// 存入子模块到父模块关系记录中
			this._[childs].push(child);
			this._[childs_name][name] = child;

			// 调用初始化方法
			if (isFunc(child.init)){
				child.init(config);
			}
			return child;
		},
		/**
		 * 获取当前模块的父模块对象
		 * @return {Object} 父模块对象, 没有则返回NULL
		 */
		parent: function(){
			if (!isModule(this) || this._.pid===0) {return null;}
			return (caches[this._.pid] || null);
		},
		/**
		 * 获取指定名称或者索引的子模块实例(仅限于该模块的子模块)
		 * @param  {String/Number}	name	子对象名称或数字索引
		 * @return {Object}					返回子对象实例 / 没有找到对象时返回NULL
		 */
		child: function(name){
			if (!isModule(this) || !this._[childs]) {return null;}
			if (!isNaN(name)){
				name = parseInt(name, 10);
				if (name < 0 || name >= this._[childs].length) {return null;}
				return this._[childs][name];
			}else {
				return (this._[childs_name][name] || null);
			}
		},
		/**
		 * 获取当前对象的所有子对象
		 * @param  {Bool}	by_name	<可选> 是否返回名字索引的对象列表
		 * @return {Object}			无子对象时, 返回一个空数组或NULL, 否则返回一个数组或者命名对象
		 */
		childs: function(by_name){
			if (!isModule(this) || !this._[childs]){
				return (by_name ? null : []);
			}
			return (by_name ? this._[childs_name] : this._[childs]);
		},
		/**
		 * 获取指定路径的实例
		 * @param  {String} uri 实例URI地址字符串, 使用 / 分隔层次, 每层可以是纯数字的子对象索引或对象名字
		 * @return {Object}     返回实例对象, 没有找到对应对象时, 返回NULL
		 */
		get: function(uri){
			if (!isString(uri)) {return null;}
			if (!uri) {return this;}
			if (uri.charAt(0) == '/') {return exports.core.get(uri);}

			var name;
			var obj = this;
			var ns = uri.split('/');
			while (ns.length){
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
		gets: function(uri){
			var name, list = arguments[1] || [];
			if (arguments[2] !== 1 && !isString(uri)) {return list;}

			// 空字符串, 返回当前对象
			if (!uri){
				list.push(this);
				return list;
			}

			// 纯数字属性, 返回对应索引的子实例
			if (!isNaN(uri)){
				name = this.child(uri);
				if (name) {list.push(name);}
				return list;
			}

			// 根节点查找
			if (uri.charAt(0) == '/') {return exports.core.gets(uri);}

			// 分离当前当前模块名称和子模块路径
			var ch = uri.indexOf('/');
			if (ch == -1){
				name = uri;
				uri = null;
			}else {
				name = uri.substr(0, ch);
				uri = uri.substr(ch+1);
			}

			if (name.indexOf('*') != -1){
				// 星号匹配名称
				var childs = isModule(this) && this._[childs_name];
				if (!childs) {return list;}
				var reg = util.starRegExp(name);
				for (name in childs){
					if (childs.hasOwnProperty(name) && reg.test(name)){
						ch = childs[name];
						if (uri){
							ch.gets(uri, list, 1);
						}else {
							list.push(ch);
						}
					}
				}
			}else {
				ch = (name == '..') ? this.parent() : this.child(name);
				if (ch){
					if (uri){
						ch.gets(uri, list, 1);
					}else {
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
		fire: function(type, param, callback, context){
			if (param instanceof Function){
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
		cast: function(type, param, callback, context){
			if (param instanceof Function){
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
		send: function(target, type, param){
			var mod = isModule(target) ? [target] : this.get(target);
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
		bind: function(type, data, listener, callback, context){
			var argv = arguments, args = argv.length, arg;
			var param = new Array(5), i = 1;
			param[0] = argv[0];

			for (var j=1; j<args; j++){
				arg = argv[j];
				switch (i){
					case 1:
						if (isModule(arg)) {i=2; break;}
					/* falls through */
					case 2:
						if (isFunc(arg)) {i=3;}
					break;
					case 3:
						if (isString(arg)){
							arg = param[2] && param[2][arg];
							break;
						}
					/* falls through */
					case 4:
						if (!util.isObject(arg)) {i = 0;}
				}
				param[i++] = arg;
				if (i<1 || i>4) {break;}
			}
			if (!i){
				exports.error('bind param error!', argv);
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
		unbind: function(type, callback){
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
		listen: function(uri, type, data, callback, context){
			//listener, sender, type, callback, data, context
			if (isFunc(data)){
				context = callback;
				callback = data;
				data = null;
			}else if (isString(callback)){
				callback = this[callback];
				if (!callback || !isFunc(callback)){
					exports.error('listen callback invalid');
					return false;
				}
			}
			var mods = isModule(uri) ? [uri] : this.gets(uri);
			var count = 0;
			while (mods.length){
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
		unlisten: function(uri, type, callback){
			var mods = (!uri || isModule(uri)) ? [uri] : this.gets(uri);
			if (isString(callback)){
				callback = this[callback];
			}
			var count = 0;
			while (mods.length){
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
		jq: function(dom, type, data, callback){
			if (!dom){
				return this;
			}
			if (!dom.jquery){
				dom = $(dom);
			}
			if (isFunc(data) || arguments.length == 3){
				callback = data;
				data = null;
			}
			dom.bind(type, [this._.guid, callback, data], jqRouter);
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
		dg: function(dom, selector, type, data, callback){
			if (!dom){
				return this;
			}
			if (!dom.jquery){
				dom = $(dom);
			}
			if (isFunc(data) || arguments.length == 4){
				callback = data;
				data = null;
			}
			dom.delegate(selector, type, [this._.guid, callback, data], jqRouter);
			return this;
		},

		/**
		 * 模块销毁函数
		 * @param  {Bool} silent <可选> 是否禁止发送销毁事件
		 * @return {Undefined}          无返回
		 */
		destroy: function(silent){
			// 调用自定义销毁前函数 (可进行必要的数据保存)
			if (this.beforeDestroy){
				try {
					this.beforeDestroy();
				}catch (err){
					exports.error('beforeDestroy() Exception!', err);
				}
			}

			// 由副模块调用销毁时, 默认禁止发送销毁消息
			if (!silent){
				this.fire('destroy');
			}

			// 销毁子模块
			var childs = this.childs();
			for (var i=0; i<childs.length; i++){
				if (childs[i].destroy) {childs[i].destroy(-1);}
			}
			
			// 取消所有绑定的监听事件
			this.unbind();
			this.unlisten();
			
			// 调用自定义销毁后函数 (可进行必要的界面销毁)
			if (this.afterDestroy){
				try {
					this.afterDestroy();
				}catch (err){
					exports.error('afterDestroy() Exception!', err);
				}
			}

			// 从父模块中删除 (递归调用时不用删除)
			if (silent !== -1){
				var parent = this.parent();
				if (parent) {parent.removeChild(this);}
			}

			// 销毁全局对象
			var guid = this._ && this._.guid || 0;
			if (caches.hasOwnProperty(guid)){
				delete(caches[guid]);
				caches.length--;
			}
		},
		/**
		 * 移除一个子模块实例
		 * @param  {Mix} child    子模块实例/子模块名称/子模块索引数字
		 * @return {Object}       返回移除的子模块实例对象 / 没有找到模块时返回NULL
		 */
		removeChild: function(child){
			var name, guid, i = 0;
			var list = this._[childs_name];
			var index = this._[childs];

			if (isModule(child)){
				guid = child._.guid;
			}else if (isNaN(child)){
				name = ''+child;
				if (list.hasOwnProperty(name)){
					guid = list[name]._.guid;
				}
			}else {
				i = parseInt(child, 10);
				if (i < 0 || i >= index.length) {return null;}
				guid = index[i]._.guid;
			}

			// 没有找到对应模块GUID
			if (!guid) {return null;}

			// 删除数组列表
			for (; i<index.length; i++){
				if (index[i]._.guid == guid){
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
		getData: function(return_array){
			return this.getChildData(return_array);
		},
		/**
		 * 获取所有子模块数据
		 * @param  {Bool}   return_array 是否以数组方式整合数据结果
		 * @return {Object}              返回结果对象或数字结果
		 */
		getChildData: function(return_array){
			var list = this._[childs];
			if (list){
				var data = return_array ? [] : {};
				var id, value, empty = 1;
				for (var i=0; i<list.length; i++){
					id = return_array ? i : list[i]._.name;
					value = list[i].getData(return_array);
					if (value !== undefined){
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
		reset: function(){
			var list = this._[childs];
			if (list){
				for (var i=0; i<list.length; i++){
					list[i].reset();
				}
			}
		}
	});
	exports.Module = Module;

	/**
	 * 应用核心模块
	 */
	function Core(){
		this._ = {
			uri: '',
			name: 'APP',
			parent: 0,
			guid: 1
		};
		caches['1'] = this;
		caches.length++;
	}
	extend(Core, Module, {
		get: function(uri){
			uri = uri.replace(/^[\/]+/, '');
			return Core.master(this, 'get', [uri]);
		},
		gets: function(uri){
			uri = uri.replace(/^[\/]+/, '');
			return Core.master(this, 'gets', [uri]);
		},
		destroy: function(){
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
	function Drag(dom, data, callback, context){
		if (!dom){
			return false;
		}
		if (!dom.jquery){
			dom = $(dom);
		}
		if (arguments.length == 1){
			dom.unbind('mousedown.drag', DragEvent);
		}else {
			if (isFunc(data)){
				context = callback;
				callback = data;
				data = null;
			}
			dom.bind('mousedown.drag', {
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
	function DragEvent(evt){
		var ev = evt.data;
		switch (evt.type){
			case 'mouseup':
				$(document).unbind('mouseup.drag', DragEvent);
				$(document).unbind('mousemove.drag', DragEvent);
				ev.type = 'endDrag';
			/* falls through */
			case 'mousemove':
				if (evt.type != 'mouseup'){
					ev.type = 'moveDrag';
				}
				ev.cx = evt.pageX;
				ev.cy = evt.pageY;
				ev.dx = evt.pageX - ev.x;
				ev.dy = evt.pageY - ev.y;
				ev.cb.call(ev.ct, ev);
			break;
			case 'mousedown':
				if (evt.button == 2){
					return false;
				}
				ev.cx = ev.x = evt.pageX;
				ev.cy = ev.y = evt.pageY;
				ev.dx = 0;
				ev.dy = 0;
				ev.type = 'startDrag';
				if (ev.cb.call(ev.ct, ev)){
					$(document).bind('mouseup.drag', ev, DragEvent);
					$(document).bind('mousemove.drag', ev, DragEvent);
				}
			break;
		}
		return false;
	}
	exports.drag = Drag;

	/**
	 * 初始化应用对象, 可设置系统初始配置, 创建系统唯一对象实例
	 * @param  {Object}   conf     <可选> 初始化系统配置信息
	 * @param  {Function} callback <可选> 资源应用初始化完毕回调函数
	 * @return {Bool}              返回初始化状态是否成功
	 */
	exports.init = function(conf, callback){
		if (conf instanceof Object){
			config.data = conf;
		}
		messager = exports.messager = new Messager();
		datacenter = exports.data = new DataCenter();
		exports.core = new Core();
		exports.lang = new Language(callback);
		return true;
	}

	/**
	 * 路由切换方法
	 * @param  {String} uri 路由地址 / 数字表示跳转的历史
	 * @return {Undefined}  无返回值
	 */
	exports.navigate = function(uri){
		if (isString(uri)){
			window.location.hash = "#"+uri;
		}else {
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
	function loadModule(uri, param, callback, context){
		var name, pos = uri.lastIndexOf('.');
		if (pos !== -1){
			name = uri.substr(pos + 1);
			uri = uri.substr(0, pos);
		}
		if (isFunc(param) || isModule(param)){
			context = callback;
			callback = param;
			param = null;
		}
		if (isModule(callback)){
			var cb = callback[context];
			if (isFunc(cb)){
				context = callback;
				callback = cb;
				cb = null;
			}
		}
		require.async(uri, function(mod){
			if (name){
				mod = mod[name];
			}
			if (!mod){
				// 加载模块失败或者模块属性不存在
				exports.error('loadModule Error! - '+ uri + (name ? '.'+name : ''));
			}else if (isFunc(callback)){
				callback.call((context || window), mod, param);
			}
			mod = name = pos = uri = param = callback = context = null;
		});
	}
	exports.loadModule = loadModule;
});
