define(function(require, exports){
	var common = require('common');
	var view = require('view');
	var $ = require('jquery');

	exports.MODULE_NAME = 'default';

	exports.beforeAction = function(){
	}

	exports.onMain = function(boot, data, app){
		// 这里是应用入口调用方法
		// 可以在core/config.js文件中修改


		// 创建下面定义的页面模块实例
		app.core.create('main-page', Page, {
			target: 'body'
		});
	}

	/**
	 * 简单的页面实例模块, 继承于Container类
	 * @param {Object} config 创建函数传入的变量参数
	 * @param {Module} parent 父模块实例
	 * @param {Object} env    当前实例的标识参数
	 */
	function Page(config, parent, env){
		config = $.extend(true, {
			'target': parent,
			'total': 123,
			'class': 'MainPage'
		}, config);
		Page.master(this, null, config);
	}
	extend(Page, view.container, {
		/**
		 * 初始化函数, 由实例创建函数自动调用
		 * @return {None} 无返回
		 */
		init: function(){
			// 调用父类container的render方法
			this.render();

			// 创建搜索子模块
			this.create('search', common.search);
			// 创建分页模块
			this.create('pager', common.pager,  {
				total: this.config.total
			});

			// 直接用名字访问实例
			this.$.pager.setup({page: 3});
		},
		/**
		 * 响应搜索控件的Search事件
		 * @param  {Object} ev 事件对象
		 * @return {Boolean}   返回false阻止事件继续冒泡
		 */
		onSearch: function(ev){
			alert('你要搜索: ' + ev.param);
			return false;
		},
		/**
		 * 响应分页模块的分页切换事件
		 * @param  {Object} ev 事件对象
		 * @return {Boolean}   返回false阻止事件继续冒泡
		 */
		onChangePage: function(ev){
			alert('跳转页面: ' + ev.param);
			// 如果有需要, 可以重新封装为新的事件继续发送
			this.fire('mainPageChange', {page: ev.param, name: 'main page'});
			return false;
		}
	});
});