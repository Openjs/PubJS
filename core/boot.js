// 启动模块定义(路由模块)
define(function(require, exports){
	var app = require('app')
		,tpl = require('tpl')
		// ,platform = require("views/platform")
		,Win = window
		,Loc = Win.location
		,Doc = Win.document;

	// 定义路由操作
	var env = exports.env = {
		login: null,
		module: null,
		action: null,
		param: null,
		search: null,
		current: null,
		wait_template: false
	};

	// 定义无需登录检查的模块
	function run(module, action, param, search){
		var router = app.config('router') || {};

		env.module = module || router.default_module || 'default';
		env.action = action || router.default_action || 'main';
		env.param  = param || null;
		env.search = search || null;

		var isPublic = false, publics = router.publics || [];
		for (var i = publics.length - 1; i >= 0; i--) {
			if (env.module === publics[i]){
				isPublic = true;
				break;
			}
		}
		// 判断登录状态
		if (!isPublic && !app.isLogin()){
			env.login = [env.module, env.action, env.param, env.search];
			env.module = router.login_module || 'login';
			env.action = router.login_action || 'main';
			env.param = env.search = '';
		}

		// 加载控制器
		require.async(app.config('app_base')+env.module, onRun);
	}

	/**
	 * 参数格式化
	 * @param  {String} search 附加参数字符串
	 * @return {Object}        格式化完的附加参数对象
	 * @preserve
	 */
	function _formatSearch(search){
		search = search.split("&");
		var p = {};
		for(var i =0;i<search.length;i++){
			search[i] = search[i].split("=");
			p[search[i][0]] = search[i][1];
		}
		search = null;
		return p;
	}

	function onRun(mod){
		// 已经被运行过, 防止快速点击的时候重复运行
		if (!env.module || !env.action) {return false;}

		// 模块加载完成，检查方法是否有效，有效则调用
		var act = 'on' + app.util.ucFirst(env.action);
		if (!mod){
			app.error('Module is missing - ' + env.module + ':' + act + '()');
		}else if (mod.MODULE_NAME != env.module){
			app.error('Module is invalid - ' +  env.module + ':' + act + '()');
		}else {
			var now = {
				name: env.module + app.util.ucFirst(env.action),
				module: env.module,
				action: env.action,
				param: env.param,
				search: env.search,
				method: act
			};

			env.current = [env.module, env.action, env.param, env.search];

			// 检查模版文件依赖
			if (env.wait_template || (mod.TEMPLATE_FILE && !tpl.load(mod.TEMPLATE_FILE))){
				return; // 模板为加载, 等待加载
			}

			if (mod[act] && app.util.isFunc(mod[act])){
				// 模块预处理调用
				if (mod.beforeAction && app.util.isFunc(mod.beforeAction)){
					mod.beforeAction(exports, now, app);
					if (env.wait_template){ return;	}
				}

				if(now.search){
					// 有附加参数的时候
					now.search = _formatSearch(now.search);
				}

				// 调用指定动作
				mod[act](exports, now, app);
				if (env.wait_template){ return;	}

				// 模块后处理调用
				if (mod.afterAction && app.util.isFunc(mod.afterAction)){
					mod.afterAction(exports, now, app);
					if (env.wait_template){ return;	}
				}
			}else {
				app.error('Action is invalid - ' + env.module + ':' + act + '()');
			}
			if (env.module == now.module && env.action == now.action && env.param == now.param){
				env.module = env.action = env.param = null;
			}
		}
	}
	exports.run = run;

	// 登录成功回调功能
	exports.afterLogin = function(){
		if (env.login){
			var argvs = env.login;
			env.login = null;
			run.apply(exports, argvs);
		}
	}
	// 重新加载当前操作
	exports.reload = function(silent){
		if (env.current){
			run.apply(exports, env.current);
		}
		// 发送全局消息
		if (!silent){
			app.core.cast('reload');
		}
	}

	// 监听Hash变化事件
	var oldURL = -1;
	function hashChanged(){
		if (oldURL === -1) {return;} // 应用还没有开始
		oldURL = Loc.href;
		var hash = Loc.hash.replace(/^[#\/\!]+/, '');
		var search = hash.split('?');
		var param = search.shift().split('/');

		var module = param.shift();
		var action = param.shift();
		param  = param.join('/');
		search = search.join('?');

		run(module, action, param, search);
	}
	if (('onhashchange' in Win) && (Doc.documentMode === undefined || Doc.documentMode==8)){
		if (Win.addEventListener){
			Win.addEventListener('hashchange', hashChanged, false);
		}else if (Win.attachEvent){
			Win.attachEvent('onhashchange', hashChanged);
		}else {
			Win.onhashchange = hashChanged;
		}
	} else {
		setInterval(function(){
			if (oldURL != Loc.href){
				hashChanged.call(Win);
			}
		}, 150);
	}

	// 设置默认配置
	app.init(
		require('sys_config')
		, function(){
			var data = app.config('user_data');
			app.setUser(data);

			// 开始应用
			oldURL = Loc.href;
			hashChanged();
		}
	);
});