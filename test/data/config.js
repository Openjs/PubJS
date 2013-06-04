/********************
 *	系统全局配置信息
 ********************/
define(function(){
	var host = window.location.host;
	var ROOT = window.ROOT;

	return {
		// 调试模式
		debug: 2,
		// 默认路由入口
		router: {
			default_module: 'digg',
			default_action: 'main',
			login_module: 'login',
			login_action: 'main',
			publics: ['login', 'privacy']
		},
		// 全局站点ID
		site_id: window.APP_SITEID,
		// 自动登录用户数据
		user_data: window.APP_USERDATA,
		// 系统名称
		app_title: _T('SiteMonitor_专业的行为统计系统'),
		// 控制器所在目录
		app_base: ROOT('controller/'),
		// 模板文件基础路径
		tpl_base: ROOT('tpl/'),
		// 数据中心参数配置
		data:{
			max_query: 10,
			points: {
				'/test/': ROOT('docs/'),
				'/i18n': ROOT('i18n/')
			}
		},
		// 多语言配置
		language:{
			'default': 'zh_CN',
			'cookie': 'lang',
			'style': ROOT('i18n/')
		}
	};
});