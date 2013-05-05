define('#pub-view', ['#pub-app', 'jquery'], function(require, exports) {
  var App = require("#pub-app");
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
  
  var Container = App.Module.extend(
    {
      "html"      : "",
      // 是否自动添加
      "auto"      : 1,
      // 是否自动执行layout
      "autoLayout": 0,
      /*
        是否自动隐藏
        支持参数
        {
        Array。附加的判断区域
            "andSelf":[]
        }
      */
      "autoHide"  : 0
    },
    function(config, parent, idObject) {
      $.extend(true, this.config, {
        // 标签名
        "tag"       : (config.tagName || "div"),
        // ID
        "id"        : (config.id || null),
        // 标签添加容器或目标容器的jq选择器
        "target"    : parent
      }, config);

      if (!this.config.el) {
        if (this.config.tag === "body") {
          this.el = $("body:first");
        } else {
          this.el = this.createDom(this.config);
        }
        
        this.auotHideHandler = null;
        if (App.util.isString(this.config.target)) {
          this.config.target = $(this.config.target);
        }
      } else {
        this.el = this.config.el;
      }
    },
    App.Module,
    {
      init: function() {
        if (this.config.auto) {
          this.render();
        }
      },
      /**
       * 显示容器
       * @param  {Mix}      config   函数执行配置。<String|Number>
       * @return {Object}            Container实例
       */
      show: function(config) {
        config = config || undefined;
        if (this.config.autoHide && !config) {
          config = 0;
        }
        var self = this;
        var callBack = function() {
          self.afterShow();
          if (self.config.autoHide) {
            var el = [self.el];
            if (self.config.autoHide.andSelf) {
              el = el.concat(self.config.autoHide.andSelf);
            }
            self.auotHideHandler = _hideOnDocumentClick(el, self.hide, self);
            el = null;
          }
          self.cast('containerShow');
        };

        this.el.show(config,callBack);

        if (config === undefined) {
          self.cast('containerShow');
        }
        
        return this;
      },
      /**
       * 隐藏容器
       * @param  {Mix}      config   函数执行配置。<String|Number>
       * @param  {Function} callback 回调函数
       * @return {Object}            Container实例
       */
      hide: function(config) {
        config = config || undefined;
        if (this.config.autoHide && !config) {
          config = 0;
        }
        var self = this;
        var callBack = function(){
          self.afterHide();
          if (self.config.autoHide) {
            self.auotHideHandler = null;
          }
          self.cast('containerHide');
        };

        this.el.hide(config,callBack);
        if (config === undefined) {
          self.cast('containerHide');
        }
        return this;
      },
      afterHide: $.noop,
      afterShow: $.noop,
      /**
       * 把当前容器插入到指定的容器中
       * @param  {Object} target 容器实例或者jQuery对象实例
       * @return {None}        无返回
       */
      appendTo: function(target) {
        if (target.jquery){
          this.el.appendTo(target);
        } else if (target.el && target.el.jquery) {
          this.el.appendTo(target.el);
        }
      },
      /**
       * 创建html Dom
       * @param  {Object} config dom创建配置
       * @return {Object}        jquery对象
       */
      createDom: function(config) {
        return _create(config);
      },
      /**
       * 容器渲染函数
       * @return {Object} Container实例
       */
      render: function() {
        if (this.el && this.config.tag !== "body") {
          this.appendTo(this.config.target);
        }
        return this;
      },
      /**
       * 删除容器
       * @param  {Boolean} doom 是否彻底销毁
       * @return {Object}       Container实例
       */
      remove: function(doom) {
        this.el.remove();
        if (doom) {
          this.el = null;
        }
        return this;
      },
      /**
       * 框架销毁函数的回调函数
       * @return {Undefined} 无返回值
       */
      afterDestroy: function() {
        this.remove(true);
      },
      /**
       * 销毁函数
       * @return {Undefined} 无返回值
       */
      destroy: function() {
        if (this.doms){
          for (var key in this.doms) {
            if (this.doms.hasOwnProperty(key) && this.doms[key] && this.doms[key].jquery) {
              this.doms[key].remove();
            }
          }
        }
        if (this.el) {
          this.el.find("*").unbind();
          this.el.empty();
        }
        Container.master(this, "destroy");
      }
    });
  Container.isMaster = true;
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
  
  var Layout = App.Module.extend(
    {
      "target"  : null,
      // 行，列
      "grid"    : [1,1],
      // 行与列的样式前缀前缀
      "perfix"  : {
        "row" : "layoutRow",
        "col" : "layoutCol",
        "cell": "layoutCell"
      },
      // 每个单元实例的配置<Array>
      "cellSet": null
    },
    function(config, parent, idObject) {
      if (!config.target) {
        return false;
      }
      // layout中的单元。依照上->下，左->右的顺序排列
      this.gridCells  = null;
      // layout中的行
      this.gridRows   = null;
      // 单元数量
      this.cellsLen   = 0;
      // layout是否已经建立
      this.hasBuilded = 0;
    },
    App.Module,
    {
      init: function() {
        this.doLayout();
        this.hasBuilded = 1;
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
        if(!isNaN(index)){
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
      afterDestroy: function(){
        this.config.target.empty();
      }
    });
  Layout.isMaster = true;
  exports.layout = Layout;

  var Page = App.Module.extend(
    {},
    Container,
    {
      init: function() {
        this.config.init.apply(this, arguments);
      }
    });
  exports.Page = Page;

  var Form = App.Module.extend(
    {
      // HTMLFormElement實例
      "tagName": "form",

      // 默認設置
      "method" : "POST",
      "type"   : "multipart/form-data",
      "action" : "/"
    },
    Container,
    {
      init: function() {
        this.render();

        var $el = $(this.el);
        $el.attr('action', this.config.action);
        $el.attr('method', this.config.method.toUpperCase());
        $el.attr('type',   this.config.type);
      },
      append: function(key, value, filename) {
        // TODO
      },
      submit: function(callback) {
        // TODO
      }
    });
  exports.Form = Form;
});