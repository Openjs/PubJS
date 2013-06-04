define(function(require,exports) {
	var $ = require('jquery');
	var app = require('../core/pub.js');
	var util = require('../core/util.js');

	/**
	 * jQuery类库实例对象
	 */
	exports.jquery = $;

	/**
	 * 容器视图类
	 */
	var Container = app.extend(app.Module, {
		init: function(config, parent){
			var me = this;
			me.$config = app.conf(config, {
				// 容器元素 (可指定容器的DOM元素而不创建)
				'el': null,
				// 容器标签
				'tag': 'div',
				// 容器插入目标DOM对象
				'target': 'body',
				// 容器文字内容
				'text': null,
				// 容器HTML内容 (HTML内容如果设置, 将覆盖文字内容)
				'html': null,
				// 对象CSS类
				'class': null,
				// 容器属性对象, 调用jQuery的attr方法直接设置
				'attr': null,
				// 容器Style属性对象, 调用jQuery的css方法直接设置
				'css': null
			});
			me.$el = null;

			// 创建回调函数
			me.cbAfterShow = me.cbAfterShow.bind(me);
			me.cbAfterHide = me.cbAfterHide.bind(me);

			// 构建元素
			me.build();
		},
		build: function(){
			var c = this.$config.get();
			var el = c.el;
			if (!el){
				c.el = el = $('<'+c.tag+'/>');
			}
			// 设置初始属性
			if (c.attr){
				el.attr(c.attr);
			}
			if (c.css){
				el.css(c.css);
			}
			var cls = c['class'];
			if (cls){
				if (util.isArray(cls)){
					cls = cls.join(' ');
				}
				el.addClass(cls);
			}
			if (c.html){
				el.html(c.html)
			}else if (c.text){
				el.text(c.text);
			}
			// 保存元素
			this.$el = el;
			// 插入到布局中
			this.appendTo(c.target);
		},
		/**
		 * 把当前容器插入到指定的容器中
		 * @param  {Object} target 容器实例或者jQuery对象实例
		 * @return {Object}        Container实例
		 */
		appendTo: function(target){
			if (target.$el && target.$el.jquery){
				this.$el.appendTo(target.$el);
			}else {
				this.$el.appendTo(target);
			}
			return this;
		},
		/**
		 * 显示容器
		 * @param  {Mix}      config   jQuery show方法的动画配置值 <String|Number>
		 * @return {Object}            Container实例
		 */
		show: function(config){
			this.$el.stop().show(config, this.cbAfterShow);
			return this;
		},
		cbAfterShow: function(){
			console.log('show ok');
		},
		/**
		 * 隐藏容器
		 * @param  {Mix}      config   jQuery hide方法的动画配置值 <String|Number>
		 * @return {Object}            Container实例
		 */
		hide: function(config){
			this.$el.stop().hide(config, this.cbAfterHide);
			return this;
		},
		cbAfterHide: function(){
			console.log('hide ok');
		}
	});
	exports.container = Container;

});