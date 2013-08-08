(function(Sea, Win, Doc){
	var pubjs = '/';
	var path = Win.location.pathname;
	var root = path;
	if (root.slice(-1) !== '/'){
		root = root.substr(0, root.lastIndexOf('/') + 1);
	}
	var node = Doc.getElementsByTagName('base');
	if (node.length){
		root = node[0].getAttribute('href');
		node[0].setAttribute('href', path);
	}

	// 项目根目录修正
	function ROOT(path){
		if (root && path.charAt(0) != '/'){
			return root + path;
		}
		return path;
	}
	Win.ROOT = ROOT;

	// 框架根目录修正
	function PUBJS(path){
		if (path.charAt(0) != '/'){
			return pubjs + path;
		}
		return path;
	}
	Win._T = function(text){ return text; }

	// SeaJS全局配置
	Sea.config({
		base: ROOT("/modules/"),
		alias: {
			// 全局初始配置
			"sys_config":	ROOT("data/config.js"),

			// 基本模块缩写
			"boot":			"core/boot.js",
			"app":			"core/pub.js",
			"util":			"core/util.js",
			"tpl":			"core/template.js",
			"jquery":		"libs/jquery/jquery-1.8.3.min.js",
			"raphael":		"libs/raphael/raphael.2.1.0.js"
		},
		paths: {
			// 目录缩写
			"core":			PUBJS("core"),
			"base":			PUBJS("base"),
			"libs":			PUBJS("libs"),
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
			Function.prototype.bind ? "" : "libs/es5-safe"
		],
		debug: 0
	});

	Sea.use('boot');

})(seajs, window, document);
