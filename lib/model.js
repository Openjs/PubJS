define(function(require) {
  var EventEmitter = require('./events').EventEmitter;
  var util = require('./util');

  return function(app) {
    var extend = app.extend;

    var ModelBase = null;
    var ModelProp = null;
    var Model = extend.call(EventEmitter, {
      // 构造函数
      Constructor: function(config, parent) {
        // 父模块实例
        this.$parent = (parent instanceof Model) ? parent : null;
        // 实例相对根目录
        this.$root = config && config.root || '';
        // 数据存储
        this.$data = config && config.data || undefined;
        // 事件绑定列表
        this.$bind = {};
        // 字实例列表
        this.$child = {};
        // 错误计数器
        this.$error = 0;
      },
      /**
       * 设置属性值
       * @param  {String} uri   属性URI
       * @param  {Mix}    value 属性值
       * @return {Object}       返回链式调用指针
       */
      set: function(uri, value) {
        if (this.$parent) {
          if (uri === '/') { uri = ''; }
          this.$parent.set(this.$root + uri, value);
          return this;
        }
        this._prepare(uri, true);
        if (ModelBase) {
          var last = ModelBase[ModelProp];
          var type = util.has(ModelBase, ModelProp) ? 'update' : 'create';
          // 更新值
          ModelBase[ModelProp] = value;
          // 触发更新事件
          this.emit(uri, type, value, last);
          ModelBase = ModelProp = last = null;
        } else {
          this.$error++;
        }
        return this;
      },
      setDefault: function(uri, value, deep) {
        var data = this.get(uri);
        if (data) {
          // 合并默认值
          if (!util.isNumber(deep)) {
            deep = -1;
          }
          var _value = util.extend(deep, value, data);
        }
        this.set(uri, _value);
      },
      merge: function(uri, value, deep) {
        var data = this.get(uri);
        if (data) {
          // 合并默认值
          if (!util.isNumber(deep)) {
            deep = -1;
          }
          var _value = util.extend(deep, data, value);
        }
        this.set(uri, _value);
      },
      /**
       * 获取传址属性值 (可被外部修改)
       * @param  {String} uri 属性URI
       * @param  {Mix}    def <可选> 属性不存在时返回的默认值
       * @return {Mix}        返回读取到的属性值或默认值
       */
      get: function(uri, def) {
        if (arguments.length === 0) {
          uri = '/';
        }
        if (this.$parent) {
          if (uri === '/') { uri = ''; }
          return this.$parent.get(this.$root + uri, def);
        }
        this._prepare(uri);
        if (ModelBase && util.has(ModelBase, ModelProp)) {
          // 克隆对象, 防止被外部污染
          return ModelBase[ModelProp];
        }
        return def;
      },
      /**
       * 获取传值形式的属性值
       * @param  {String} uri 属性URI
       * @param  {Mix}    def <可选> 属性不存在时返回的默认值
       * @return {Mix}        返回读取到的属性值或默认值
       */
      val: function(uri, def) {
        var data = this.get(uri, def);
        if (data) {
          return util.clone(data);
        } else {
          return data;
        }
      },
      /**
       * 删除属性
       * @param  {String} uri    属性URI
       * @param  {Bool}   silent <可选> 静默删除, 不触发删除事件
       * @return {Object}        返回链式调用指针
       */
      remove: function(uri, silent) {
        if (this.$parent) {
          if (uri === '/') { uri = ''; }
          this.$parent.remove(this.$root + uri);
          return this;
        }
        this._prepare(uri);
        if (ModelBase && util.has(ModelBase, ModelProp)) {
          var last = ModelBase[ModelProp];
          delete ModelBase[ModelProp];
          // this.emit(uri, 'remove', undefined, last);
          last = null;
        } else {
          this.$error++;
        }
        ModelBase = ModelProp = null;
        return this;
      },
      /**
       * 生成指定URI为起点的模型实例
       * @param  {String} root 根节点URI, 必须以 "/" 开始的非根节点字符串
       * @return {Object}      返回新的模型实例对象
       */
      extract: function(root) {
        if (!root || root.length < 2 || root.charAt(0) !== '/') {
          return null;
        } else {
          var mod = new Model({'root': root}, this);
          var childs = this.$child[root] || [];
          childs.push(mod);
          this.$child[root] = childs;
          return mod;
        }
      },
      /**
       * 销毁当前模型对象, 移除父模型中的事件绑定与关联
       * @return {None}
       */
      destroy: function() {
        var parent = this.$parent;
        if (parent) {
          var root = this.$root;
          // 解除事件绑定
          util.each(this.$bind, function(bind) {
            parent.unbind(root + bind.uri, bind.callback);
          });
          // 解除实例关联
          var childs = parent.$child[root];
          if (childs) {
            var len = childs.length;
            while (len--) {
              if (childs[len] === this) {
                childs.splice(len, 1);
              }
            }
          }
          this.$parent = null;
        }
      },
      /**
       * 返回错误计数, 并清空错误计数器
       * @return {Number} 返回之前操作的错误计数
       */
      error: function() {
        var err = this.$error;
        this.$error = 0;
        return err;
      },
      _prepare: function(uri, create) {
        if (this.$parent) {
          return this.$parent._prepare(this.$root + uri, create);
        }
        // 分解URI, 查找对应的记录
        ModelBase = this;
        ModelProp = '$data';
        if (uri === '/') {
          return true;
        }
        try {
          if (uri.charAt(0) !== '/' || uri.indexOf('//') != -1) {
            throw null;
          }
          var ns = uri.split('/');
          ns.shift(); // 过滤开始根目录左边的空白
          while (ns.length) {
            if (create && ModelBase[ModelProp] === undefined) {
              ModelBase[ModelProp] = {};
            }
            ModelBase = ModelBase[ModelProp];
            ModelProp = ns.shift();
            if (ModelBase && typeof(ModelBase) === 'object') {
              if (ModelBase instanceof Array && isNaN(+ModelProp)) {
                throw null;
              }
            } else {
              throw null;
            }
          }
        } catch (e) {
          ModelBase = ModelProp = null;
          return false;
        }
        return true;
      }
    });

    return Model;
  };
})