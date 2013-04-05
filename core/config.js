/********************
 *	系统全局配置信息
 ********************/
define(function(){
	var host = window.location.host;
	var BASE = window.BASE;

	return {
		// 调试模式
		debug: 2,
		// 默认路由入口
		router: {
			default_module: 'default',
			default_action: 'main'
		},
		// 控制器所在目录
		app_base: BASE('app/'),
		// 模板文件基础路径
		tpl_base: BASE('tpl/'),
		// 广告资源地址路径
		data:{
			max_query: 10,
			points: {
				'/rest/': '/rest/point/to/',
				'/i18n': BASE('i18n/')
			}
		},
		// 多语言配置
		language:{
			'default': 'zh_CN',
			'cookie': 'lang',
			'style': BASE('i18n/')
		}
	};
});