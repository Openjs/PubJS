define(function(require, exports){
	var App = require('app');
	exports.MODULE_NAME = 'login';

	exports.beforeAction = function(){

	}

	exports.onMain = function(boot, data){
		// 这里应该显示登录界面
		// 现在默认设置系统用户资料
		App.setUser({id: 123, name: 'Katana'});
		boot.afterLogin();
	}
	exports.onDoLogin = function(boot, data){
		console.log(boot, data);
	}
});