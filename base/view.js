define(function(require,exports) {
	var $ = require('jquery');
	var pubjs = require('../core/pub.js');
	var util = require('../core/util.js');

	/**
	 * jQuery类库实例对象
	 */
	exports.jquery = $;

	/**
	 * 容器视图类
	 */
	var Container = pubjs.Module.extend({
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

			me.$ready = 0;
			// 构建元素
			me.build();
		},
		build: function(){
			var c = this.$config.get();
			var el = c.el;
			if (!el){
				if (c.tag === 'body'){
					el = $('body:first');
				}else {
					el = $('<'+c.tag+'/>');
				}
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
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}
			if (c.html){
				el.html(c.html);
			}else if (c.text){
				el.text(c.text);
			}
			// 保存元素
			this.$el = el;
			// 渲染元素
			this.render();
			this.$ready = 1;
			return this;
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
		 * 容器渲染函数
		 * @return {Object} Container实例
		 */
		render: function(){
			var c = this.$config.get();
			// 插入到布局中
			if (this.$el && c.tag !== 'body' && c.target){
				this.appendTo(c.target);
			}
			return this;
		},
		/**
		 * 获取容器的主要DOM对象
		 * @return {Element} 返回jQuery的对象
		 */
		getDOM: function(){
			return this.$el;
		},
		/**
		 * 显示容器
		 * @param  {Mix}      config   jQuery show方法的动画配置值
		 * @return {Object}            Container实例
		 */
		show: function(config){
			this.$el.stop(true, true)
				.show(config, this.cbAfterShow);

			if (config === undefined){
				this.cbAfterShow();
			}
			return this;
		},
		cbAfterShow: function(){
			if (this.afterShow){
				this.afterShow();
			}
			this.cast('containerShow');
		},
		/**
		 * 隐藏容器
		 * @param  {Mix}      config   jQuery hide方法的动画配置值
		 * @return {Object}            Container实例
		 */
		hide: function(config){
			this.$el.stop(true, true)
				.hide(config, this.cbAfterHide);

			if (config === undefined){
				this.cbAfterHide();
			}
			return this;
		},
		cbAfterHide: function(){
			if (this.afterHide){
				this.afterHide();
			}
			this.cast('containerHide');
		},
		/**
		 * 删除容器
		 * @param  {Boolean} doom 是否彻底销毁
		 * @return {Object}       Container实例
		 */
		remove: function(doom){
			if (this.$el){
				this.$el.remove();
				if(doom){
					this.$el = null;
				}
			}
			return this;
		},
		/**
		 * 框架销毁函数的回调函数
		 * @return {Undefined} 无返回值
		 */
		afterDestroy:function(){
			this.remove(true);
		},
		/**
		 * 销毁函数
		 * @return {Undefined} 无返回值
		 */
		destroy:function(){
			util.each(this.doms, this.cbRemoveDoms);
			var el = this.$el;
			if(el){
				el.find("*").unbind();
				el.empty();
			}
			this.doms = this.$el = null;
			Container.master(this,"destroy");
		},
		/**
		 * 删除doms元素循环回调函数
		 * @param  {Element} dom jQuery元素对象
		 * @return {None}
		 */
		cbRemoveDoms: function(dom){
			if (dom.jquery){
				dom.remove();
			}
		}
	});
	exports.container = Container;

	/**
	 * 布局视图
	 */
	var Layout = Container.extend({
		init: function(config, parent){
			config = app.conf(config, {
				// 对象CSS类
				'class': 'G-viewLayout',
				// 布局类型: horizontal, vertical, grid
				'type': 'horizontal',
				// 初始化布局项目
				'items': null,
				// 项目默认CSS类
				'item_class': null
			});

			var me = this;
			me.$items = [];
			me.$itemClass = null;
			// 调用Container.init()方法
			Layout.master(me, 'init', arguments);
		},
		/**
		 * 构建Layout主要容器和配置预设项目
		 * @return {Module} 返回模块实例本身(链式调用)
		 */
		build: function(){
			var c = this.$config.get();
			Layout.master(this, 'build');

			// 设置默认项目CSS类
			var cls = c.item_class;
			if (!cls){
				switch (c.type){
					case 'horizontal':
						cls = 'G-viewLayoutCol';
					break;
					case 'vertical':
						cls = 'G-viewLayoutRow';
					break;
					case 'grid':
						cls = 'G-viewLayoutGrid';
					break;
				}
			}
			this.$itemClass = cls;

			var items = c.items;
			if (items){
				if (util.isArray(items)){
					for (var i=0; i<items.length; i++){
						this.add(items[i], false);
					}
					this.redraw();
				}else {
					this.add(items);
				}
			}
			return this;
		},
		/**
		 * 建立Layout的子项目对象
		 * @param  {Object} item 项目配置对象
		 * @return {Moudle}      返回模块实例本身(链式调用)
		 */
		buildItem: function(item){
			var el = item.el;
			if (!el || !el.jquery){
				el = $('<'+item.tag+'/>');
			}
			// 设置初始属性
			if (item.attr){
				el.attr(item.attr);
			}
			if (item.css){
				el.css(item.css);
			}
			var cls = item['class'];
			if (cls){
				el.addClass(
					util.isArray(cls) ? cls.join(' ') : cls
				);
			}
			if (item.html){
				el.html(item.html);
			}else if (item.text){
				el.text(item.text);
			}
			item.el = el.appendTo(this.$el);

			this.$items.push(item);
			return this;
		},
		/**
		 * 重新计算布局位置
		 * @return {Module} 返回模块实例本身(链式调用)
		 */
		redraw: function(){
			// todo: 针对不同的布局类型计算布局位置和大小
			return this;
		},
		/**
		 * 添加Layout的子项目对象
		 * @param  {Object}  item   项目配置对象, 或者项目id名称字符串
		 * @param  {Boolean} redraw <可选> 是否重新计算布局 (默认重算)
		 * @return {Moudle}         返回模块实例本身(链式调用)
		 */
		add: function(config, redraw){
			if (util.isString(config)){
				config = {'id': config};
			}
			config = util.extend({
				'el': null,
				'tag': 'div',
				'class': this.$itemClass
			}, config);
			this.buildItem(config);
			if (arguments.length === 1 || redraw){
				this.redraw();
			}
			return this;
		},
		/**
		 * 删除指定索引的Layout布局容器
		 * @param  {Number}  index  容器索引号码 (负数表示从后查找)
		 * @param  {Boolean} redraw <可选> 是否重新计算布局 (默认重算)
		 * @return {Module}         返回模块实例本身(链式调用)
		 */
		remove: function(index, redraw){
			if (index < 0){
				index += this.$items.length;
			}
			var item = this.$items[index];
			if (item){
				item.el.remove();
				this.$items.splice(index, 1);
			}
			return this;
		},
		/**
		 * 获取指定索引编号的布局容器
		 * @param  {Number}  index  容器索引号码 (负数表示从后查找)
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		get: function(index, detail){
			if (index < 0){
				index += this.$items.length;
			}
			var item = this.$items[index];
			if (item){
				return (detail ? item : item.el);
			}
			return null;
		},
		/**
		 * 查找第一个满足某个属性值的布局容器
		 * @param  {Mix}     val    要查找的值
		 * @param  {String}  field  要匹配属性名称
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		getBy: function(val, field, detail){
			var item = util.find(this.$items, id, field);
			if (item){
				return (detail ? item : item.el);
			}
			return null;
		},
		/**
		 * 按照id查找指定的布局容器
		 * @param  {String}  id     布局项目id值
		 * @param  {Boolean} detail <可选>是否返回完整的项目配置对象
		 * @return {Object}         返回容器jQuery或者项目配置对象, 或者NULL表示没有找到
		 */
		getByID: function(id, detail){
			return this.getBy(id, 'id', detail);
		}
	});
	exports.layout = Layout;
});