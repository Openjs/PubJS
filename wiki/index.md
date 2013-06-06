框架核心
=================

    框架核心代码存放在core目录中, 其中各文件的主要功能如下
    [1] pub.js - 框架核心模块, 包括基础模块Module定义, DataCenter定义,
        全局Config功能函数等最基础功能. 其中模块中的extend()方法是模块
        扩展到功能方法.
    [2] boot.js - 框架启动路由, 封装了最基础的路由功能.
    [3] util.js - 工具函数模块, 实现了常用的功能函数封装.
    [4] template.js - 封装了一个基础的HTML模板引擎, 支持多模块合并单文
        件, 支持异步模板文件加载和事件回调.

基础模块
=================

    基础模块实现了大部分常用的功能模块, 如表格, 选项卡, 图表等. 模块存
    放base目录中.
    [1] view.js - 视图核心模块
    [2] view/*.js - 各类视图扩展模块


模块规范
=================


#### 功能模块Widget:

    {
        init()
        build()
        buildItem()
        setData()
        getData()
        getError()
        onReset()
        load()
        onData()
        setParam()
    }

    功能模块主要处理业务逻辑, 即数据处理, 以及构建布局与创建必要的交互视图模块实例.
        - 构建布局视图
        - 在对应的布局中构建对应的视图模块
        - 转换服务端的数据成为可以交给视图模块使用的数据格式, 并设置给视图模块实例
        - 监听视图模块的事件, 对其他视图实例进行必要的交互调用
        - 获取视图模块中的数据状态, 转换为服务端要求的数据格式提交
        - 向服务器接口获取数据, 处理响应逻辑, 处理服务器接口需求的参数

    功能模块默认要求实现新建和编辑两种状态, 状态的切换无需重新构建不同的功能模块实例.

    功能模块默认构建都是以新建状态构建, 调用setData()接口后, 数据如带有索引ID, 则转为
    编辑状态, 在reset()后, 模块重新转换为新建状态.

        init() -> 新建状态 -> setData() -> 编辑状态 -> reset() -+
                     ^                                          |
                     \-----------------------------------------/

    功能模块数据状态变化必须通过setData()接口变更, 这是模块的唯一数据入口点
        - 创建模块时设置的初始数据, 在init()中先保存到模块 $data 属性中, 在build()
          构建完成后, 调用setData()接口展现数据
        - 模块加载数据返回后, 返回结果数据也需要通过setData()接口展现和保存数据
        - 外部父模块需要展现现有数据, 直接调用模块实例的setData()接口展现数据

    模块数据的输出, 都必须通过getData()接口获取, 无论是模块本身的其他方法需要用到模块
    当前数据还是模块外的其他模块需要用到模块的数据.
        - getData() 调用本身所有的子模块获取到对应的数据
        - 按照规定把所有子模块的数据整合为一个规定好的数据格式
        - 把更新数据保存到模块的 $data 属性中
        - 返回最新的数据
        - 如果模块本身有数据完整性要求检查, 可以在getData()是检查完整性, 并可给出UI提示
        - 数据完整性错误时, 返回结果为 null 表示错误
        - 完整性错误可以通过调用 getError() 接口返回最后一次的错误信息

    UI交互整合
    在复杂的功能模块中, 需要整合创建多个相同或不同的视图模块, 基于模块的划分, 各个视图
    模块间不允许直接发生交互, 视图模块只允许发触发的用户交互通过事件的方式发送到父模块
    由父模块按照业务需求, 对其他模块进行对应的互动调用.

                              Widget模块
                                ^  |
        按钮视图 -- Clicki事件 -/  \-- 调用视图交互方法 -> 输入框视图

    方法调用流程
    init() -> build() -> setData() -> buildItem()
    load() -> onData() -> setData()

#### 视图模块View:

    {
        init()
        build()
        buildItem()
        setData()
        getData()
        onReset()
        onResize()
    }

    视图模块处理所有UI/UE的交互逻辑, 视图模块中所有数据结构都根据视图模块自身的需求确定
    业务逻辑的处理不应该出现在视图模块中, 把业务逻辑从视图模块中抽离, 使得视图模块得以
    增加重用性.

    视图模块的功能需求
        - 构建必要的Layout布局模块
        - 构建UI界面的DOM元素
        - 绑定DOM元素事件, 回调模块的处理方法 (DOM事件处理方法以event开头)
        - 响应用户UI操作事件, 准备好数据触发对应的交互事件(通过fire方法触发)
        - 根据设置的数据, 构建恢复对应的UI界面状态
        - 监听子视图模块的事件, 对其他子视图实例进行必要的交互调用
        - 根据用户UI的操作更新数据属性 $data, 可以让其他模块调用getData()接口获取数据


    视图模块只接受静态的数据设置, 通过调用setData()接口设置视图模块需要呈现的数据, 数据
    格式必须由外部转换成视图模块所需要的数据格式, 而不应该在视图模块中进行数据转换处理

    视图中用户操作的结果, 只能通过getData()接口返回, 返回数据格式需同setData()接口数据格
    式一致, 即getData()返回的数据可以直接用户模块的setData()接口, 呈现的UI效果必须一致

    视图模块初始化并调用构建方法 build() 后即显示一个基础的界面, 根据需要应显示一个占位
    元素或者加载提示信息等. 在调用 setData() 是, 开始构建和呈现对应的内容. 对于列表类型
    的视图, 每个项目的构建都通过 buildItem() 方法来构建.

    视图中的Resize事件
    框架监控浏览器主视窗的resize事件, 然后把resize事件广播给所有实例, 视图模块应当响应
    该事件, 根据配置中的target对象的尺寸变化调整模块界面的布局等.

    视图中绑定DOM元素事件, 要求使用框架的方法, 不要直接使用jQuery的事件绑定方法:
        - this.uiBind(dom, eventName, callback, data)             对应jQuery的bind方法
        - this.uiProxy(dom, selector, eventName, callback, data)  对应jQuery的delegate方法
        - this.uiOuter(dom, eventName, callback, data)            监听元素外的事件

    方法调用流程
    init() -> build() -> setData() -> buildItem()


#### 功能模块与视图模块的关系结构:

    Widget
      +-layout
      +-view1
          +-layout
          +-subView1
          +-subView2
      +-view2
      +- ...


#### 模块扩展方法使用以下格式

    var ClassName = app.extend(
        BaseClass,
        { /* Class Prototype */},
        { /* Class Private Prototype */ }
    );
    exports.className = ClassName

#### 基本模块方法

```JavaScript
    /***
     * 模块初始化方法, 只完成所有有关模块的配置初始化工作,
     * 不允许编写任何模块的具体功能代码
     ***/
    init: function(config, parent){
        this.$config = config = app.conf(
            { /* Default Module Config */ },
            config
        );

        /* 模块私有变量定义初始化, 变量名必须以 $ 开头 */
        this.$privateVar = null;
        this.$privateName = null;

        /* 如果有必要, 调用父类的初始化方法 */
        ClassName.master(this, 'init', [config, parent]);
    }

    /***
     * 模块构建方法, 所有模块的初始化构建代码需放在此方法中执行
     * 本方法一般又init()方法自动调用
     ***/
    build: function(){
        /* 配置资料获取, 需要调用Model实例的get方法 */
        var CONF = this.$config.get();

        /* 针对功能性模块(Widget), 首先构建基础布局子模块 */
        this.create('layout', view.layout, { /* 布局配置 */ });

        /* 构建具体的视图功能模块, 如果功能模块没有复杂的视图结构 */
        /* 可以不构建布局layout, 直接构建具体的视图模块           */
        this.create('viewModule', view.common.input, {
            /* 视图功能模块配置 */
            'target': this.$.layout.get()
        });

        /* 针对非常简单的展示界面, 和没有重用性的界面, 可以直接 */
        /* 构建DOM元素显示界面, 无需单独拆分出视图模块来构建    */
        /* DOM元素缓存在 this.$doms 属性中, 模块销毁时会自动删除*/
        /* 变量中的DOM对象, 就算DOM元素不在模块的主容器中       */
        var doms = this.$doms = {};
        doms.div = $('<div />').appendTo(c.target);

        /* 如果有必要, 调用父类的构造方法 */
        ClassName.master(this, 'build');
    }

    /***
     * 模块构建元素资料项目元素方法
     * 类似列表等有多个项目的模块, 子项目的具体构建处理都应放在该方法中.
     * 本方法一般在build方法中监测到有初始数据时调用模块的setData方法设置
     * 数据, 并有setData方法进行循环调用buildItem来构建具体数据.
     ***/
    buildItem: function(item){
        /* 如果项目界面元素有复杂的交互需求, 则建议创建子视图实例来构建 */
        this.create('viewModule', view.common.input, {
            /* 视图功能模块配置 */
            'target': this.$.layout.get()
        });

        /* 如果界面是较为简单的交互或纯展示界面, 建议直接构建DOM元素 */
        var dom = $('<div />').html('...').appendTo(this.$doms.div);

        /* 绑定DOM元素操作事件, DOM响应事件使用 event开头表示, 如下  */
        // 直接绑定元素事件
        this.uiBind(dom, 'click', 'eventClick');
        // 代理子元素事件
        this.uiProxy(dom, '.itemClass', 'mousedown', 'eventMouseDown');
    }

    // 设置静态数据方法
    setData: function(data){
        // 处理数据格式

        // 保存数据结果到对象属性 $data 中
        this.$data = data;

        // 显示数据, 列表类数据可以循环调用buildItem来新建项目并呈现
        // 需要判断当前模块状态, 决定是使用新建方式还是修改方式呈现数据

    }

    // 获取数据方法
    getData: function(){
        // 获取子模块(视图/其他功能模块)数据
        // 组合整理模块数据, 按照需要的格式返回, 根据情况需要更新 $data 属性
    }

    // 核心Module模块的reset方法发送消息广播 this.cast('reset') 来触发
    // 模块重置响应处理事件
    onReset: function(){
        // 如果模块已经设置过数据, 一般是需要模块重新进入新增记录状态时, 调用
        // 模块的reset()方法, 触发onReset事件, 这里需要把模块重置为刚新建模块
        // 实例时的状体, 可以被用作添加使用

        // 清除模块记录索引ID属性
        // 重置界面元素, 如果只调用了视图模块构建视图, 不拦截本事件可以让视图
        // 模块本身自己进行重置, 不需要专门去调用视图的重置方法
        // 把模块记录的数据 $data 清空, 变回新建状态
    }

    // 加载数据方法
    load: function(){

    }

    // 设置数据请求参数
    // param - 参数对象
    // deep  - 参数合并深度, true:替换, -1(默认):完全合并, >=0:合并的层次深度
    setParam: function(param, deep){

    }
```
