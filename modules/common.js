define(function(require, exports){
	var $ = require('jquery');
	var app = require('app');
	var view = require('view');
	var util = require('util');

	/**
	 * 搜索列表框
	 * @param {Object} config 自定义配置信息
	 * @param {Module} parent 父模块实例
	 */
	function Search(config, parent){
		this.config = $.extend(
			true, 
			{
				'class':'M-commonSearch clear',
				'target': parent,
				'inputClass': 'M-commonSearchInput',
				'searchTip': LANG('请输入搜索内容'),
				'searchText': '',
				'buttonClass': 'M-commonSearchButton btn primary',
				'buttonText': LANG('搜索'),
				'undoClass': 'M-commonSearchUndo btn',
				'undoText': LANG('取消')
			},
			config
		);
		Search.master(this, null, this.config);
	}
	extend(Search, view.container, {
		/**
		 * 模块初始化
		 * @return {None} 无返回
		 */
		init: function(){
			var cfg = this.config;
			// 创建输入框
			this.input = $('<input type="input" />').appendTo(this.el);
			this.input.attr({
				'class': cfg.inputClass,
				'placeholder': cfg.searchTip,
				'value': cfg.searchText
			});
			this.input.bind('keypress', this, this.keyPress);

			// 创建搜索按钮
			this.button = $('<input type="button" />').appendTo(this.el);
			this.button.attr({
				'class': cfg.buttonClass,
				'value': cfg.buttonText
			});
			this.button.bind('click', this, this.buttonClick);

			// 创建取消按钮
			this.undo = $('<input type="button" />').appendTo(this.el);
			this.undo.attr({
				'class': cfg.undoClass,
				'value': cfg.undoText
			});
			this.undo.bind('click', this, this.undoClick);
			this.undo.toggle(cfg.searchText.length > 0);

			// 渲染界面
			this.render();
		},
		/**
		 * 输入框监控回车的输入自动搜索
		 * @param  {Object} evt jquery
		 * @return {None}       无返回
		 */
		keyPress: function(evt){
			if (evt.keyCode == 13){
				evt.data.button.click();
			}
		},
		/**
		 * 搜索按钮点击回调函数
		 * @param  {Object} evt jquery
		 * @return {Bool}       返回FALSE, 禁止DOM事件冒泡
		 */
		buttonClick: function(evt){
			var me = evt.data;
			var text = me.input.val();
			if (text != me.config.searchText){
				me.config.searchText = text;
				me.fire('search', text);
			}
			me.undo.toggle(text.length > 0);
			return false;
		},
		/**
		 * 取消按钮点击回调函数
		 * @param  {Object} evt jquery
		 * @return {Bool}       返回FALSE, 禁止DOM事件冒泡
		 */
		undoClick: function(evt){
			var me = evt.data;
			me.input.val('');
			if ('' !== me.config.searchText){
				me.config.searchText = '';
				me.fire('search', '');
			}
			me.undo.hide();
			return false;
		},
		/**
		 * 复位查询参数
		 * @return {None} 无返回
		 */
		reset: function(){
			this.input.val('');
			if ('' !== this.config.searchText){
				this.config.searchText = '';
				this.fire('search', '');
			}
		}
	});
	exports.search = Search;

	/**
	 * 分页控制模块
	 * @param {Objcet} config 模块初始化配置
	 * @param {Module} parent 父模块实例
	 */
	function Pager(config, parent){
		this.config = $.extend(
			true,
			{
				'class': 'M-commonPager', // 容器类名称
				'target': parent,
				'subClass': {
					'list': 'M-commonPagerList',
					'prev': 'M-commonPagerAction',
					'next': 'M-commonPagerAction',
					'first':'M-commonPagerAction',
					'last': 'M-commonPagerAction',
					'info': 'M-commonPagerInfo',
					'page': 'M-commonPagerPage',
					'active': 'M-commonPagerActive',
					'disable': 'M-commonPagerDisable'
				},
				'subText': {
					'prev': _T('上一页'),
					'next': _T('下一页'),
					'first': _T('首页'),
					'last': _T('末页'),
					'info': _T('总共 %1 条记录, 共 %2 页, 当前第 %3 页')
				},
				'size': 20, // 分页大小
				'page': 1, // 初始页码
				'count': 0, // 分页总数 <一般自动计算>
				'total': 0, // 记录总数
				'bounds': 10, // 最多显示分页数
				'stepButton': true, // 是否显示上一页和下一页
				'firstLast': true, // 是否显示第一页和最后一页
				'pageInfo': true // 是否显示页数信息
			},
			config
		);
		Pager.master(this, null, this.config);
	}
	extend(Pager, view.container, {
		init: function(){
			// 建立DOM元素
			this.build();
			
			// 调用父类的初始化方法
			Pager.master(this,'init');
		},
		setup: function(config){
			this.config = $.extend(true,this.config, config);
			this.build();
		},
		getParam: function(){
			return {
				page: this.page,
				limit: this.size
			};
		},
		countPage: function(init){
			var cfg = this.config;
			// 计算分页参数
			if (init){
				this.size  = Math.max(1, cfg.size);
				this.total = cfg.total;
				this.count = cfg.count = Math.ceil(cfg.total / this.size);
				this.page  = Math.max(1, Math.min(cfg.page, this.count));
			}
			var bound  = cfg.bounds - 1;
			this.start = Math.max(1, this.page - Math.floor(bound / 2));
			this.end   = this.start + bound;
			if (this.end > this.count){
				this.end = this.count;
				this.start = Math.max(1, this.end - bound);
			}
		},
		build: function(){
			if (!this.doms){
				this.doms = {};
			}
			var doms = this.doms;
			var cfg = this.config;

			// 计算分页参数
			this.countPage(true);

			// 建立页码按钮
			if (!doms.list){
				doms.list = $('<span/>').addClass(cfg.subClass.list).appendTo(this.el);
				this.pageBtns = [];
			}
			for (var i=this.start + this.pageBtns.length; i<=this.end; i++){
				var btn = $('<input type="button"/>').addClass(cfg.subClass.page).appendTo(doms.list);
				this.pageBtns.push(btn);
				btn.bind('click', this, this.clickPage);
			}
			// 建立步进按钮
			if (cfg.stepButton && this.count > cfg.bounds && !doms.prev){
				doms.prev = $('<input type="button"/>').addClass(cfg.subClass.prev).insertBefore(doms.list);
				doms.prev.bind('click', this, this.clickPrev);
				doms.next = $('<input type="button"/>').addClass(cfg.subClass.next).insertAfter(doms.list);
				doms.next.bind('click', this, this.clickNext);
			}
			// 建立首页和末页按钮
			if (cfg.firstLast && this.count > cfg.bounds && !doms.first){
				doms.first = $('<input type="button"/>').addClass(cfg.subClass.first).insertBefore(doms.prev || doms.list);
				doms.first.bind('click', this, this.clickFirst);
				doms.last = $('<input type="button"/>').addClass(cfg.subClass.last).insertAfter(doms.next || doms.list);
				doms.last.bind('click', this, this.clickLast);
			}
			// 建立页面信息
			if (cfg.pageInfo && !doms.info){
				doms.info = $('<span/>').addClass(cfg.pageInfo).prependTo(this.el);
			}

			// 更新状态
			this.update(true);

			// 设置按钮语言文字
			this.setText();
		},
		update: function(skip_count){
			if (!skip_count){
				this.countPage();
			}
			var cfg = this.config.subClass;
			var doms = this.doms;
			var btn, page;
			// 处理分页状态和显示
			for (var i=0; i<this.pageBtns.length; i++){
				btn = this.pageBtns[i];
				page = i + this.start;
				if (page > this.end){
					btn.hide();
				}else {
					btn.attr({
						'data-page': page,
						'value': page,
						'display': 'inline-block'
					}).toggleClass(cfg.active, page==this.page);
				}
			}

			// 更新分页状态
			if (doms.prev) {doms.prev.toggleClass(cfg.disable, this.page <= 1);}
			if (doms.first) {doms.first.toggleClass(cfg.disable, this.page <= 1);}
			if (doms.next) {doms.next.toggleClass(cfg.disable, this.page >= this.count);}
			if (doms.last) {doms.last.toggleClass(cfg.disable, this.page >= this.count);}
			this.updateInfo();

			this.config.page = this.page;
		},
		setText: function(){
			var text = this.config.subText;
			var doms = this.doms;
			if (doms.prev) {doms.prev.val(LANG(text.prev));}
			if (doms.next) {doms.next.val(LANG(text.next));}
			if (doms.first) {doms.first.val(LANG(text.first));}
			if (doms.last) {doms.last.val(LANG(text.last));}
			this.updateInfo();
		},
		updateInfo: function(){
			var text = this.config.subText;
			var doms = this.doms;
			if (doms.info) {doms.info.text(LANG(text.info, this.total, this.count, this.page, this.config.size));}
		},

		onSwitchLanguage: function(evt){
			this.setText();
		},

		clickPage: function(evt){
			var me = evt.data;
			var page = parseInt($(this).attr('data-page'), 10) || 0;
			if (page && page != me.page){
				me.page = page;
				me.update();
				me.fire('changePage', page);
			}
		},
		clickPrev: function(evt){
			var me = evt.data;
			if (me.page > 1){
				me.page--;
				me.update();
				me.fire('changePage', me.page);
			}
		},
		clickNext: function(evt){
			var me = evt.data;
			if (me.page < me.count){
				me.page++;
				me.update();
				me.fire('changePage', me.page);
			}
		},
		clickFirst: function(evt){
			var me = evt.data;
			if (me.page > 1){
				me.page = 1;
				me.update();
				me.fire('changePage', me.page);
			}
		},
		clickLast: function(evt){
			var me = evt.data;
			if (me.page < me.count){
				me.page = me.count;
				me.update();
				me.fire('changePage', me.page);
			}
		}
	});
	exports.pager = Pager;


	/**
	 * 滚动条控制模块
	 * @param {Object} config 模块配置对象
	 */
	function Scroller(config, parent){
		this.config = $.extend({
			'class': 'M-commonScroller',
			'target': parent, // 要滚动的容器
			'content': null, // 要滚动的内容
			'type': 'linear', // 滚动方式
			'dir': 'H', // 滚动方向 H-横向, V-纵向
			'size': 8, // 滚动条大小
			'pad': true, // 插入滚动条间隔
			'side': false, // 是否反方向放置滚动条
			'x': 2, // 显示位置水平方向调整
			'y': 2, // 显示位置垂直方向调整
			'width': 0, // 指定滚动容器宽度
			'height': 0, // 指定滚动容器高度
			'auto': true, // 自动隐藏
			'wrap': false, // 自动包含子元素
			'wheel': true // 绑定鼠标滚轮事件
		}, config);

		if (this.config.wrap === true){
			this.config.wrap = 'div';
		}
		this.pad = 0;

		this.info = {};
	}
	extend(Scroller, app.Module, {
		init: function(){
			var c = this.config;
			this.bar = $('<div/>').addClass(c['class']);
			this.ctr = $('<div/>').appendTo(this.bar);
			this.bar.css(c.side?'left':'right', c.x);
			this.bar.css(c.side?'top':'bottom', c.y);

			var tar, bar = this.bar.get(0);
			if (c.target.el){
				c.target = c.target.el;
			}
			tar = c.target.get(0);
			this.bar.appendTo(tar);
			if (bar.offsetParent != tar){
				tar.style.position = 'relative';
			}

			if (c.wrap){
				if (c.content){
					c.content.wrap('<'+c.wrap+'/>');
					c.content = c.content.parent();
				}else {
					c.target.wrapInner('<'+c.wrap+'/>');
					c.content = c.target.children(':first');
				}
			}else if (!c.content) {
				c.content = c.target.children(':first');
			}

			// 初始化获取原margin
			var i = this.info;
			if (c.dir == 'H'){
				i.init = app.util.getCssValue(c.content, 'marginLeft');
				i.margin = app.util.getCssValue(c.content, 'marginRight') + i.init;
				i.type = 'horizontal';
				c.target.css('overflow-x', 'hidden');
			}else {
				i.init = app.util.getCssValue(c.content, 'marginTop');
				i.margin = app.util.getCssValue(c.content, 'marginBottom') + i.init;
				i.type = 'vertical';
				c.target.css('overflow-y', 'hidden');
			}

			// 绑定事件
			this.bindEvent();

			// 计算滚动条数据
			this.measure();
		},
		bindEvent: function(){
			var c = this.config;
			var el = c.target.get(0);
			var ctr = this.ctr.get(0);

			if (el.attachEvent){
				var me = this;
				this.IEcb = function(evt){
					return me.handleEvent(evt);
				}
				if (c.wheel){
					el.attachEvent('onmousewheel', this.IEcb);
				}
				ctr.attachEvent('onmousedown', this.IEcb);
			}else {
				if (c.wheel){
					el.addEventListener('DOMMouseScroll', this, false);
					el.addEventListener('mousewheel', this, false);
				}
				ctr.addEventListener('mousedown', this, false);
			}
			ctr = el = null;
		},
		handleEvent: function(evt){
			switch (evt.type){
				case 'onmousemove':
				case 'mousemove':
					this.eventMouseMove(evt);
				break;

				case 'onmousewheel':
				case 'DOMMouseScroll':
				case 'mousewheel':
					this.eventWheel(evt);
				break;

				case 'onmousedown':
				case 'mousedown':
					this.eventMouseDown(evt);
				break;

				case 'onmouseup':
				case 'mouseup':
					this.eventMouseUp(evt);
				break;
			}
			evt.cancelBubble = true;
			evt.returnValue = false;
			if (evt.preventDefault) {evt.preventDefault();}
			if (evt.stopPropagation) {evt.stopPropagation();}
		},
		eventWheel: function(evt){
			var dir = ('wheelDelta' in evt ? (evt.wheelDelta<0) : (evt.detail>0));
			var txtPage, txtPos, txtMargin, i = this.info;
			if (this.config.dir == 'H'){
				txtPage='pageX', txtPos='left', txtMargin='marginLeft';
			}else {
				txtPage='pageY', txtPos='top', txtMargin='marginTop';
			}
			var pos = i.pos + (dir ? -100 : 100);
			pos = Math.min(0, Math.max(i.max, pos));
			if (pos == i.pos) {return;} // 位置没有变化, 不触发事件

			i.pos = pos;
			i.bPos = Math.floor(i.bMax * pos / i.max);

			this.ctr.css(txtPos, i.bPos);
			this.config.content.css(txtMargin, pos + i.init);

			this.fire('scroll', i);
		},
		/**
		 * 鼠标按下拖动事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseDown: function(evt){
			if (!this.mouse){
				if (document.attachEvent){
					document.attachEvent('onmousemove', this.IEcb);
					document.attachEvent('onmouseup', this.IEcb);
				}else {
					document.addEventListener('mousemove', this, false);
					document.addEventListener('mouseup', this, false);
				}
			}
			this.mouse = {
				pageX: evt.pageX,
				pageY: evt.pageY,
				pos: this.info.bPos
			};
			this.bar.addClass('act');
		},
		/**
		 * 鼠标移动事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseMove: function(evt){
			var i = this.info;
			var m = this.mouse;
			var c = this.config;
			var txtPage, txtPos, txtMargin;

			if (c.dir == 'H'){
				txtPage='pageX', txtPos='left', txtMargin='marginLeft';
			}else {
				txtPage='pageY', txtPos='top', txtMargin='marginTop';
			}

			i.bPos = Math.max(0, Math.min(i.bMax, m.pos + evt[txtPage] - m[txtPage]));
			this.ctr.css(txtPos, i.bPos);

			i.pos = Math.floor(i.max * i.bPos / i.bMax);
			c.content.css(txtMargin, i.pos + i.init);

			this.fire('scroll', i);
		},
		/**
		 * 鼠标按键放开事件
		 * @param  {Object} evt 系统事件变量
		 * @return {None}     无返回
		 */
		eventMouseUp: function(evt){
			if (document.detachEvent){
				document.detachEvent('onmouseup', this.IEcb);
				document.detachEvent('onmousemove', this.IEcb);
			}else {
				document.removeEventListener('mouseup', this, false);
				document.removeEventListener('mousemove', this, false);
			}
			this.eventMouseMove(evt);
			this.bar.removeClass('act');
			this.mouse = null;
		},
		/**
		 * 计算系统数据
		 * @return {None} 无返回
		 */
		measure: function(){
			var c = this.config;
			var i = this.info;
			var txtMargin, txtPos, txtPadding, txtOuter, txtProp, txtProp2, txtCfg, txtCfg2;
			if (c.dir == 'H'){
				txtMargin='marginLeft', txtPos='left', txtPadding=c.side?'paddingTop':'paddingBottom',
				txtOuter='outerWidth', txtProp='width', txtProp2='height', txtCfg='x', txtCfg2='y';
			}else {
				txtMargin='marginTop', txtPos='top', txtPadding=c.side?'paddingLeft':'paddingRight',
				txtOuter='outerHeight', txtProp='height', txtProp2='width', txtCfg='y', txtCfg2='x';			
			}

			var now = app.util.getCssValue(c.content, txtMargin) - i.init,
				conSize = c.content[txtOuter](false) + i.margin,
				winSize = (c[txtProp] || c.target[txtProp]()),
				barSize = winSize - c[txtCfg] * 2,
				ctrSize = Math.max(15, Math.floor(barSize * winSize / conSize));

			i.win = winSize;	// 视口大小
			i.con = conSize;	// 内容大小
			i.max = Math.min(0, winSize - conSize);	// 内容移动限制
			i.pos = Math.max(now, i.max); // 内容当前位置
			i.bMax = barSize - ctrSize; // 拖块最大位置
			i.bPos = i.max ? Math.floor(i.bMax * i.pos / i.max) : 0; // 拖块当前位置
			i.show = (i.max !== 0 || !c.auto); // 滚动条是否显示

			this.bar[txtProp2](c.size)[txtProp](barSize).toggle(i.show);
			this.ctr[txtProp2](c.size)[txtProp](ctrSize).css(txtPos, i.bPos);
			c.content.css(txtMargin, i.pos + i.init);

			if (c.pad){
				var pad = app.util.getCssValue(c.target, txtPadding);
				if (i.show){
					pad += (c.size + 2 * c[txtCfg2] - this.pad);
					this.pad = c.size + 2 * c[txtCfg2];
				}else {
					pad -= this.pad;
					this.pad = 0;
				}
				c.target.css(txtPadding, pad);
			}
		}
	});
	exports.scroller = Scroller;

	/**
	 * Input类
	 */
	function Input(config,parent,idObject){
		this.config = $.extend(
			true
			,{
				"target":"body"
				,"class":""
				,"type":"text"
				,"value":""
				,"placeholder":null
				,"label":null
			}
			,config||{}
		);
		// 只能是input
		this.config.tag = "input";
		this.el = this.createDom(this.config);
		if(this.config.placeholder){
			this.el.attr("placeholder",this.config.placeholder);
		}
		this.config.target = $(this.config.target);
	}
	/**
	 * 执行事件冒泡
	 * @param  {String}    type   事件类型
	 * @param  {Object}    me     Input实例
	 * @param  {Object}    target 事件触发的Jq对象
	 * @return {Undefined}        无返回值
	 */
	function _fireInTheHole(type,me,target){
		me.fire(type,{
			"value":target.val()
			,"target":target
		});
	}
	extend(
		Input
		,view.container
		,{
			init:function(){
				this.config.target.append(this.el);
				if(this.config.label && this.config.label.html){
					this.label = this.create(
						"label"
						,Label
						,$.extend({target: this.el}, this.config.label)
					)
				}
				this.bindEvent();
			}
			/**
			 * 事件绑定方法
			 * @return {Object}        Input实例对象
			 */
			,bindEvent:function(){
				this.el.bind("click",this,this.click);
				this.el.bind("blur",this,this.blur);
				this.el.bind("focus",this,this.focus);
				return this;
			}
			/**
			 * 点击方法
			 * @param  {Object}    ev 事件对象
			 * @return {Undefined}    无返回值
			 */
			,click:function(ev){
				_fireInTheHole("click",ev.data,$(ev.target));
			}
			/**
			 * 失去焦点方法
			 * @param  {Object}    ev 事件对象
			 * @return {Undefined}    无返回值
			 */
			,blur:function(ev){
				_fireInTheHole("blur",ev.data,$(ev.target));
			}
			/**
			 * 获得焦点方法
			 * @param  {Object}    ev 事件对象
			 * @return {Undefined}    无返回值
			 */
			,focus:function(ev){
				_fireInTheHole("focus",ev.data,$(ev.target));
			}
		}
	);
	exports.input = Input;

	function Label(config,parent,idObject){
		this.config = $.extend(
			{
				"target":"body"
				,"html":"Label"
				,"pos":1
			}
			,config||{}
		);
		this.config.tag = "label";
		this.el = this.createDom(this.config);
		var id =this.config.target.attr("id");
		if(!id){
			id = parent._.name+"_"+parent._.guid+"_"+idObject.guid;
			this.config.target.attr("id",id);
		}
		this.el.attr("for",id);
	}
	extend(
		Label
		,view.container
		,{
			init:function(){
				this.config.target[
					this.config.pos && "before" || "after"
				](this.el);
			}
		}
	);
	exports.label = Label;


	/**
	 * 按钮模块
	 */
	function Button(config, parent){
		var c = config || {};
		this.target = $(c.target || parent.el || 'body');
		this.text = c.text || '按钮';
		this.data = c.data || null;
		delete(c.target);
		delete(c.text);
		delete(c.data);
		c.type = 'button';
		this.attr = c;
	}
	extend(Button, app.Module, {
		init: function(){
			this.el = $('<input/>').attr(this.attr).val(this.text);
			this.el.appendTo(this.target);

			this.el.bind('click', this, this.eventClick);
		},
		eventClick: function(evt){
			var me = evt.data;
			me.fire('buttonClick', me.data);
		},
		hide: function(){
			this.el.hide();
		},
		show: function(){
			this.el.show();
		}
	});
	exports.button = Button;

	/**
	 * 下拉选择模块
	 */
	function DropdownList(config, parent){
		// 搜索过滤可选
		// 滚动条
		// 高度, 宽度
		// 默认提示信息
		config = $.extend(true,{
			'class': 'M-commonDropdown',
			'target': parent,
			'scroll': true, // 是否有滚动条
			'search': true, // 是否有过滤框
			'search_callback': null, // 过滤回调函数
			'height': 30, // 显示框高度
			'width': 200, // 显示框框度
			'option_height': 200, // 弹出选项窗口高度
			'option_width': 0,  // 弹出选项窗口宽度
			'render': null, // 显示渲染回调函数
			'option_render': null, // 选项内容渲染函数
			'options': null,  // 选项对象<数组>
			'data': null, // 选中的选项
			'key': '_id', // 选项记录关键字字段名
			'url': null,  // 列表数据拉取地址, 留空不拉取
			'param': null, // 拉取数据时请求的参数
			'auto_load': true, // 初始化时自动拉取数据
			'all': null, // 默认全选项
			'def': null
		}, config);
		DropdownList.master(this, null, config);

		delete this.config.options;
		delete this.config.data;
		this.$options = config.options;
		this.$data = config.data;
		this.$selected_index = null;
		this.$show_option = false;
		this.$dirty_option = false;
	}
	extend(DropdownList, view.container, {
		init: function(){
			DropdownList.master(this, 'init');
			var c = this.config;
			var doms = this.doms = {};
			doms.result = $('<div class="result"/>').css('line-height', c.height + 'px').appendTo(this.el);
			doms.arrow = $('<div class="arrow"/>').appendTo(this.el);
			this.el.width(c.width).height(c.height);

			this.jq(this.el, 'click', 'eventTrigger');
			this.jq(this.el, 'mousedown', 'eventTrackMe');

			if (c.url && c.auto_load){
				//todo: 显示加载状态
				app.data.get(c.url, c.param, this);
			}else {
				this.showResult();
			}
		},
		// 重置选择
		reset: function(){
			this.$data = null;
			this.showResult();
		},
		// 获取选中的数据ID
		getData: function(detail){
			if (detail){
				if (detail === true) {detail = this.$data;}
				return util.find(this.$options, detail, this.config.key);
			}else {
				return this.$data;
			}
		},
		// 设置显示数据
		setData: function(select, options){
			if (util.isArray(select)){
				options = select;
				select = this.$data;
			}
			this.$data = select;
			this.$options = options;
			if (this.$show_option){
				this.buildOptions();
			}else {
				this.$dirty_option = true;
			}
			this.showResult();
		},
		// 加载显示数据
		load: function(param){
			var c = this.config;
			if (param){
				c.param = util.merge(c.param, param);
			}
			app.data.get(c.url, c.param, this);
		},
		// 拉取数据回调
		onData: function(err, data){
			//todo: 移除加载状态
			if (err){
				alert(err.message);
				return false;
			}
			this.setData(this.$data, data.items);
		},
		// 显示选中的选项信息
		showResult: function(option){
			var c = this.config;
			var dom = this.doms.result;
			if (!option){
				option = util.find(this.$options, this.$data, c.key);
				if (!option){
					this.$data = null;
					if (c.def){
						dom.html(c.def);
						return false;
					}else if (c.all){
						option = c.all
					}else {
						option = util.first(this.$options);
						if (!option){
							dom.empty();
							return false;
						}
						this.$data = option[c.key];
					}
				}
			}
			if (c.render){
				var html = c.render(option, dom);
				if (html){ dom.html(html); }
			}else {
				dom.text(option.Name);
			}
		},
		// 监控鼠标是否点击到控件上, 防止选项被隐藏
		eventTrackMe: function(){
			this.$mouse_inside = true;
		},
		// 隐藏选项
		hideOption: function(){
			if (this.$mouse_inside){
				this.$mouse_inside = false;
				return;
			}
			this.doms.list.hide();
			this.$show_option = false;
			$(document.body).unbind('mousedown.dropdown');
		},
		// 显示选项
		showOption: function(){
			this.$mouse_inside = false;
			this.$show_option = true;
			this.doms.list.show();
			this.jq(document.body, 'mousedown.dropdown', 'hideOption');
		},
		// 显示选项界面触发
		eventTrigger: function(evt){
			var doms = this.doms;
			if (!doms.list){
				this.buildList();
			}
			if (this.$show_option){
				this.hideOption();
			}else {
				this.showOption();
				if (this.$dirty_option){
					this.buildOptions();
				}
			}
		},
		// 选项过滤
		eventSearch: function(evt, input){
			var key = input.value;
			var doms = this.doms;
			var opts = doms.options.children('.option');
			if (key){
				var cb = this.config.search_callback;
				var elm, text;
				for (var i=0; i<opts.length; i++){
					elm = opts.eq(i);
					if (elm.attr('data-all') == '1'){continue;}
					if (cb){
						text = elm.attr('data-id');
						text = this.$options[text];
						if (text){
							elm.toggle(cb(key, text));
						}
					}else {
						text = elm.text();
						elm.toggle(text.indexOf(key) !== -1);
					}
				}
			}else {
				opts.show();
			}
			this.updateScroll();
		},
		// 选中某个选项
		eventSelect: function(evt, elm){
			var id, opt, dom = $(elm);
			if (dom.attr('data-all') == '1'){
				id = null;
				opt = this.config.all;
			}else {
				id = dom.attr('data-id');
				opt = this.$options[id];
				if (!opt) {return false;}
				id = opt[this.config.key];
			}
			if (id === this.$data) { return false; }
			this.$data = id;

			this.doms.options.find('.act').removeClass('act');
			dom.addClass('act');

			this.showResult(opt);
			this.fire('optionChange', opt);

			this.hideOption();
			return false;
		},
		// 生成选项列表
		buildList: function(){
			var doms = this.doms;
			var c = this.config;
			doms.list = $('<div class="list"/>').appendTo(this.el);
			doms.list.width(c.option_width || c.width);
			doms.list.css('top', this.el.outerHeight());

			if (c.search){
				doms.search = $('<div class="search" />').appendTo(doms.list);
				doms.search_key = $('<input type="text" />').appendTo(doms.search);
				this.jq(doms.search_key, 'change', 'eventSearch');
				this.jq(doms.list, 'click', util.stopEvent);
			}
			doms.options = $('<div class="options"/>').appendTo(doms.list);
			this.dg(doms.options, '.option', 'click', 'eventSelect');

			if (c.scroll){
				doms.scroll = $('<div/>').appendTo(doms.list);
				doms.options.appendTo(doms.scroll);
				this.create('scroll', Scroller, {
					target: doms.scroll,
					content: doms.options,
					dir: 'V'
				});
			}
			this.buildOptions();
		},
		// 生成选项
		buildOptions: function(){
			var c = this.config;
			var doms = this.doms;
			doms.options.empty();
			this.$dirty_option = false;
			this.$selected_index = null;

			if (c.all){ this.buildOption(c.all, null); }
			util.each(this.$options, this.buildOption, this);

			// 初始化选中项目
			if (this.$selected_index === null){
				doms.options.children('[data-all]:first').addClass('act');
			}else {
				doms.options.children('[data-id='+this.$selected_index+']:first').addClass('act');
			}

			if (c.search){
				var w = doms.search_key.outerWidth(true) - doms.search_key.width();
				doms.search_key.hide();
				w = doms.search.width() - w;
				doms.search_key.show().width(w);
			}
			this.updateScroll();
		},
		// 生成选项DOM对象
		buildOption: function(opt, id){
			var c = this.config;
			var dom = $('<a class="option" href="#"/>').appendTo(this.doms.options);
			if (id === null){
				dom.attr('data-all', 1);
			}else {
				dom.attr('data-id', id);
				if (opt[c.key] == this.$data){
					this.$selected_index = id;
				}
			}
			if (c.option_render){
				var html = c.option_render(id, opt, dom);
				if (html){ dom.html(html); }
			}else {
				dom.text(opt.Name);
			}
		},
		// 更新滚动条状态
		updateScroll: function(){
			var c = this.config;
			if (!c.scroll) { return; }
			var doms = this.doms;
			if (c.option_height){
				var h = c.option_height;
				if (doms.search){
					h -= doms.search.outerHeight(true);
				}
				doms.options.css('marginTop', '');
				if (h > doms.options.outerHeight(true)){
					doms.scroll.css('height', 'auto');
				}else {
					doms.scroll.height(h);
				}
			}
			this.$.scroll.measure();
		}
	});
	exports.dropdown = DropdownList;
});