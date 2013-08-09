define(function(require, exports) {
  var App = require("./app");
  var util = require('./util');
  var $   = require("jquery");

  /**
   * 获取容器的html
   * @param {Object}  config  标签的属性配置。可在此函数处理的有标签名(targetName)，class,id。attr-data为属性扩展预留字段
   * @return  {String}      处理完的html字符串
   * @private
   */
  function _getTargetHtm(config) {
    // tag与html为特殊标记
    return '<{tag}{class}{id}{type}{value}{attr-data}>{html}</{tag}>'.replace(
      /(\{\w+\})/g,
      function(val) {
        val = val.replace(/\{|\}/g,"");
        return (val === "tag" || val === "html") && config[val] || config[val] && (' '+val+'="'+config[val]+'"') || "";
      }
    );
  }

  /**
   * 创建dom
   * @param {Object}  config  标签的属性配置。
   * @return  {Object}      jquery对象
   * @private
   */
  function _create(config) {
    var el   = _getTargetHtm(config);
    var attr = '';
    var has  = 0;
    for (var n in config) {
      if (/data-\w+/.exec(n)) {
        attr += (' ' + n + '="' + config[n] + '"');
        has = has || !has;
      }
    }
    el = el.replace("{attr-data}", attr);
    if (config.tag === "input") {
      el = el.replace("></input>", "/>");
    }
    if (!config.stringify) {
      el = $(el);
    }
    attr = has = null;
    return el;
  }

  /**
   * 检测指定对象是否归属于某一或多个对象
   * @param  {Object}   tag  指定的jq对象
   * @param  {Mix}      els  归属对象。jq对象或由jq对象组成的数组
   * @return {Boolean}       判断结果
   */
  function _chkClosest(tag, els) {
    var has = false;
    if (App.util.isArray(els)) {
      for (var i =0;i < els.length;i++) {
        if (tag.closest(els[i]).length) {
          has = true;
          break;
        }
      }
    } else {
      has = tag.closest(els).length;
    }
    return has;
  }

  /**
   * 点击界面上任意非指定对象区域时自动执行特定函数
   * @param  {Mix}      el      指定对象
   * @param  {Function} fn      执行函数
   * @param  {Object}   scope   函数作用域
   * @return {Function}         绑定到document上的执行函数
   */
  function _hideOnDocumentClick(el, fn, scope) {
    var closPopTip = function(event) {
      if(!_chkClosest($(event.target), el)) {
        fn.call((scope || this));
        $(document).unbind("click", closPopTip);
      }
    }
    $(document).bind("click", closPopTip);
    return closPopTip;
  }
  
  /**
   * 容器模块构造函数
   * @param {Object} config   模块配置
   * @param {Object} parent   父层实例<系统自动追加>
   * @param {Object} idObject 当前实例的相关信息<系统自动追加>
   */
  
  var Container = App.Module.extend({
    Constructor: function(config) {
      this.config({
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
      }, config);
      this.$el = null;

      // 创建回调函数
      this.cbAfterShow = this.cbAfterShow.bind(this);
      this.cbAfterHide = this.cbAfterHide.bind(this);

      this.$ready = 0;
    },
    init: function() {
      // 构建元素
      this.build();
    },
    build: function() {
      var c = this.$config.get();
      var el = c.el;
      if (!el) {
        if (c.tag === 'body') {
          el = $('body:first');
        } else {
          el = $('<'+c.tag+'/>');
        }
      }
      // 设置初始属性
      if (c.attr) {
        el.attr(c.attr);
      }
      if (c.css) {
        el.css(c.css);
      }
      var cls = c['class'];
      if (cls) {
        el.addClass(
          util.isArray(cls) ? cls.join(' ') : cls
        );
      }
      if (c.html) {
        el.html(c.html);
      } else if (c.text) {
        el.text(c.text);
      }
      // 保存元素
      this.$el = $(el);
      this.$ready = 1;
      return this;
    },
    /**
     * 把当前容器插入到指定的容器中
     * @param  {Object} target 容器实例或者jQuery对象实例
     * @return {Object}        Container实例
     */
    appendTo: function(target) {
      if (target.$el) {
        this.$el.appendTo(target.$el);
      } else {
        this.$el.appendTo(target);
      }
      return this;
    },
    /**
     * 容器渲染函数
     * @return {Object} Container实例
     */
    render: function() {
      var c = this.$config.get();
      // 插入到布局中
      if (this.$el && c.tag !== 'body' && c.target && !c.el) {
        this.appendTo(c.target);
      }
      return this;
    },
    /**
     * 获取容器的主要DOM对象
     * @return {Element} 返回jQuery的对象
     */
    getDOM: function() {
      return this.$el;
    },
    /**
     * 显示容器
     * @param  {Mix}      config   jQuery show方法的动画配置值
     * @return {Object}            Container实例
     */
    show: function(config) {
      this.$el.stop(true, true)
        .show(config, this.cbAfterShow);

      if (config === undefined) {
        this.cbAfterShow();
      }
      return this;
    },
    cbAfterShow: function() {
      if (this.afterShow) {
        this.afterShow();
      }
      this.cast('containerShow');
    },
    /**
     * 隐藏容器
     * @param  {Mix}      config   jQuery hide方法的动画配置值
     * @return {Object}            Container实例
     */
    hide: function(config) {
      this.$el.stop(true, true)
        .hide(config, this.cbAfterHide);

      if (config === undefined) {
        this.cbAfterHide();
      }
      return this;
    },
    cbAfterHide: function() {
      if (this.afterHide) {
        this.afterHide();
      }
      this.cast('containerHide');
    },
    /**
     * 删除容器
     * @param  {Boolean} doom 是否彻底销毁
     * @return {Object}       Container实例
     */
    remove: function(doom) {
      if (this.$el) {
        this.$el.remove();
        if(doom) {
          this.$el = null;
        }
      }
      return this;
    },
    /**
     * 框架销毁函数的回调函数
     * @return {Undefined} 无返回值
     */
    afterDestroy:function() {
      this.remove(true);
    },
    /**
     * 销毁函数
     * @return {Undefined} 无返回值
     */
    destroy:function() {
      util.each(this.doms, this.cbRemoveDoms);
      var el = this.$el;
      if(el) {
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
    cbRemoveDoms: function(dom) {
      if (dom.jquery) {
        dom.remove();
      }
    }
  });
  exports.Container = Container;
  /**
   * 创建layout内部区域
   * @param {Array} gird 内部容器切割配置
   * @param {Object} layout Layout实例对象
   * @private
   */
  function _buildLayoutGrid(grid, layout, perfix) {
    var gridCells = [];
    var gridRows  = null;
    var hasChild  = grid[1] > 1;
    var multiRow  = grid[0] > 1;
    var tmp       = null;

    if (multiRow) {
      // 多行的时候输出每行的实例对象
      gridRows = [];
    }

    for (var i = 0, l = grid[0];i < l;i++) {
      if (multiRow) {
        // 多行时每行是一个Container对象。
        // 单元可以指定生成的标签与其余的属性
        tmp = _buildContain(
          layout,
          perfix.row + "_" + i,
          layout.config.target,
          layout.config.cellSet && layout.config.cellSet[gridCells.length] || {}
        );
        gridRows.push(tmp);
      } else {
        tmp = {
          "el": layout.config.target
        };
      }
      
      if (hasChild) {
        // 有列的情况
        // 单元可以指定生成的标签与其余的属性，而行只能是div
        for (var j = 0, l = grid[1];j < l;j++) {
          gridCells.push(
            _buildContain(
              layout,
              multiRow && (perfix.cell + "_" + k + "_" + j) || (perfix.col + "_" + j),
              tmp.el,
              layout.config.cellSet && layout.config.cellSet[gridCells.length] || {}
            )
          );
        }
      } else if (multiRow) {
        gridCells.push(tmp);
      }
    }

    tmp = hasChild = multiRow = null;
    return {
      "rows" : gridRows,
      "cells": gridCells
    };
  }

  /**
   * 创建container中的内部容器
   * @param  {Object} layout Layut实例对象
   * @param  {String} name   内部容器名
   * @return {Object}        创建后的容器对象
   * @private
   */
  function _buildContain(layout, name, target, conConfig) {
    return layout.create(
      name,
      Container,
      $.extend({
        "class" : name,
        "target": target
      }, conConfig)
    );
  }

  /**
   * 获取数组中指定位置的元素
   * @param  {Array}  source  待检索的数组
   * @param  {Number} index   元素索引，负数则取倒数第index个
   * @return {Mix}            检索出来的元素
   * @private
   */
  function _getElByIndex(source, index) {
    return index < 0 && Math.abs(index) <= source.length && 
        source.slice(source.length + (index), source.length + (index + 1))[0] || 
        source[index];
  }

  /**
   * 布局模块构造函数
   * @param {Object} config   模块配置
   * @param {Object} parent   父层实例<系统自动追加>
   * @param {Object} idObject 当前实例的相关信息<系统自动追加>
   */
  
  var Layout = App.Module.extend({
    $constructor: function(config, parent) {
      this
        .config({
          // 对象CSS类
          'class': 'G-viewLayout',
          // 布局类型: horizontal, vertical, grid
          'type': 'horizontal',
          // 初始化布局项目
          'items': null,
          // 项目默认CSS类
          'item_class': null
        })
        .config(config);

      this.$items = [];
      this.$itemClass = null;
    },
    /**
     * 获取指定位置的单元
     * @param  {Number} index   单元索引，负数则取倒数第index个
     * @return {Mix}            检索出来的单元
     */
    get: function(index) {
      index = +index;
      if (!isNaN(index)) {
        return _getElByIndex(this.gridCells, index);
      }
    },
    /**
     * 获取指定行
     * @param  {Number} index   行索引，负数则取倒数第index个
     * @return {Mix}            检索出来的行
     */
    getRow: function(index) {
      index = +index;
      if(!isNaN(index)) {
        return _getElByIndex(this.gridRows,index);
      }
    },
    /**
     * Layout渲染函数
     * @param  {Object} config layout设置<可选>
     * @return {Object}        Layout实例
     */
    doLayout: function(config) {
      if (config) {
        this.config = $.extend(this.config, config);
      }
      if (this.config.grid[0] === 1 && this.config.grid[1] === 1) {
        this.gridCells = this.gridRows = [this.config.target];
      } else {
        var grid = _buildLayoutGrid(this.config.grid, this, this.config.perfix);
        this.gridCells = grid.cells;
        this.gridRows = grid.rows || [this.config.target];
        grid = null;
      }
      this.cellsLen = this.gridCells.length;
      return this;
    },
    /**
     * 框架销毁函数的回调函数
     * @return {Undefined} 无返回值
     */
    afterDestroy: function() {
      this.config.target.empty();
    }
  });
  exports.layout = Layout;

  var Page = Container.extend({
    init: function(config, parent) {
      this.config(config);

      config.init.apply(this, arguments);
    }
  });
  exports.Page = Page;
});