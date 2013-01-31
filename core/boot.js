(function(Sea, Win, Doc){
var base_path = Win.location.pathname;
base_path = base_path.substr(0, base_path.lastIndexOf('/') + 1);

function BASE(path){
	if (path.charAt(0) != '/'){
		path = base_path + path;
	}
	return path;
}

// SeaJS全局配置
Sea.config({
	base: BASE("modules/"),
	alias: {
		// 目录缩写
		"core":			BASE("core"),
		"libs":			BASE("libs"),

		// 基本模块缩写
		"boot":			BASE("core/boot.js"),
		"app":			BASE("core/app.js"),
		"util":			BASE("core/util.js"),
		"tpl":			BASE("core/template.js"),
		"underscore":	BASE("libs/underscore/underscore.js"),
		"less":			BASE("libs/less/less-1.3.1.js"),
		"jquery":		BASE("libs/jquery/jquery-1.8.3.min.js"),
		"jquery-ui":	BASE("libs/jquery/jquery-ui-1.9.2.custom.min.js"),
		"raphael":		BASE("libs/raphael/raphael.2.1.0.js")
	},
	map: [
		[/^.*$/, function(url){
			/* 加入版本号码 */
			if (Win.VERSION){
				url += (url.indexOf('?') == -1 ? '?v=' : '&v=') + Win.VERSION;
			}
			return url;
		}]
	],
	preload:[
		Win.JSON ? "" : "libs/json",
		Function.prototype.bind ? "" : "libs/es5-safe",
		"less"
	],
	debug: 0
});

// LESS 开发者模式
Win.less = {env: 'development', rawURL: false, baseURL:BASE('resources/css/')};

// 启动模块定义(路由模块)
define(function(require, exports){
	var app = require('app')
		,tpl = require('tpl')
		,platform = require("views/platform");

	// 定义路由操作
	var env = exports.env = {
		login: null,
		module: null,
		action: null,
		param: null,
		current: null,
		wait_template: false
	};

	function run(module, action, param){
		env.module = module || 'default';
		env.action = action || 'main';
		env.param  = param || null;

		// 判断登录状态
		if (env.module != 'login' && !app.isLogin()){
			env.login = [env.module, env.action, env.param];
			env.module = 'login';
			env.action = 'main';
			env.param = '';
		}

		// 加载控制器
		require.async(app.config('app_base')+env.module, onRun);
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
				method: act
			};
			env.current = [env.module, env.action, env.param];

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
		// 发送全局消息
		app.core.cast('userLogin', app.getUser());
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
	// 切换页面显示模块
	var lastPage = null;
	/**
	 * 切换整体页面
	 * @param  {String} name 要切换到当前的页面模块对象URI
	 * @return {String}      返回原显示的模块URI
	 */
	exports.switchPage = function(name){
		if (name == lastPage){
			return;
		}
		var last = lastPage;
		var mod;
		if (lastPage){
			mod = app.core.get(lastPage);
			if (mod){
				mod.hide();
			}
		}
		lastPage = name;
		mod = app.core.get(name);
		if (mod){
			mod.show();
		}
		return last;
	}

	// 监听Hash变化事件
	var oldURL = -1;
	function hashChanged(evt){
		if (oldURL === -1) {return;} // 应用还没有开始
		oldURL = Win.location.href;
		var hash = Win.location.hash.replace(/^[#\/\!]+/, '');
		var param = hash.split('/');

		var module = param.shift() || 'default';
		var action = param.shift() || 'main';
		param  = param.join('/');

		run(module, action, param);
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
			if (oldURL != Win.location.href){
				hashChanged.call(Win);
			}
		}, 150);
	}

	// 设置默认配置
	app.init({
		// 调试模式
		debug: 2,
		// 控制器所在目录
		app_base: BASE('app/'),
		// 广告资源地址路径
		front_base: 'http://dsp_web.jin/',
		// 数据中心参数配置
		data:{
			max_query: 10,
			points: {
				// '/': '/rest/',
				'/rest/': (Win.location.host == 'dsp.server' ? '/sweety/' : BASE('test/port.php/sweety/')),
				'/i18n': BASE('i18n/')
				// '/rest/listcountry': '/test/country.php'
			}
		},
		// 多语言配置
		language:{
			'default': 'zh_CN',
			'cookie': 'lang',
			'style': BASE('i18n/')
		}
	}, function(){
		// 开始应用
		oldURL = Win.location.href;
		hashChanged();
		app.core.create("platform",platform.mainView);
		tpl.set('FRONT_BASE', app.config('front_base'));
	});

	exports.getMainView = function(){
		return app.core.get("platform").getShowarea();
	}
});

})(seajs, window, document);
