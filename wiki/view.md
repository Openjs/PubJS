核心视图 (view.js)
===================


	[*] view.jquery		- jQuery类库
	[*] view.container	- 容器
	[*] view.layout		- 布局
	[*] view.dialog		- 窗口
	[*] view.overlay	- 覆盖层


view.container
------------------------------------------------------------
##### 配置选项 #####

	el:			指定容器元素的DOM对象, 而不自动创建 (默认: null)
	tag:		创建容器的DOM对象标签类型 (默认: div)
	target:		容器插入的目标对象, DOM/jQuery/Container (默认: body)
	text:		设置容器的文字内容
	html:		设置容器的内部HTML内容, 如果指定HTML内容则忽略文字内容
	class:		附加到容器的CSS类, 可以为字符串或字符串数组
	attr:		要设置到容器的属性对象, 为可传递给jQuery.attr方法的对象
	css:		要设置到容器的CSS属性对象, 为可传递给jQuery.css方法的对象

##### 模块属性 #####

	$el:		容器的jQuery主要DOM元素对象

##### 模块方法 #####

	appendTo(target)	把容器插入到指定的DOM对象或者Container对象中
	render()			渲染容器对象, 把容器插入到配置指定的target中
	getDOM()			返回容器对象的主要DOM对象
	show(config)		显示容器内容, config指定jQuery的动画效果
	afterShow()			容器显示完成(动画执行完毕), 回调的处理函数
	hide(config)		隐藏容器内容, config指定jQuery的动画效果
	afterHide()			容器隐藏完成(动画执行完毕), 回调的处理函数
	remove(doom)		把容器从DOM树上移除, 可指定丢弃DOM对象
	destroy()			彻底销毁容器对象及其子容器


view.layout
------------------------------------------------------------
##### 配置选项 #####