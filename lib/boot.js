// 启动模块定义(路由模块)
define('#pub-boot', ['#pub-app'], function(require, exports) {
  var app = require('#pub-app');

  // 定义路由操作
  var env = exports.env = {
    login         : null,
    handler       : null,
    current       : null,
    wait_template : false
  };

  function run(handler) {
    env.handler = handler || app.config('router/default_handler') || 'default';

    // 加载控制器
    require.async((app.config('handlers_base') || '../handlers/') + env.handler, onRun);
  }
  function onRun(handler) {
    // 已经被运行过, 防止快速点击的时候重复运行
    if (!env.handler) { return false; }

    // 模块加载完成，检查方法是否有效，有效则调用
    if (!handler) {
      app.error('handler is missing - ' + env.handler + ':router()');
    } else if (handler.name != env.handler) {
      app.error('handler is invalid - ' +  env.handler + ':router()');
    } else {
      var now = {
        name: env.handler
      };
      env.current = [env.handler];

      if (handler.router && app.util.isFunc(handler.router)) {

        app._runMiddlewares(window.location.href, function() {
          if (app.config('debug') > 0) {
            app.log('[PubJS] Running handler ' + env.handler);
          }

          if (handler.beforeRun && app.util.isFunc(handler.beforeRun)) {
            handler.beforeRun(exports, now, app);
          }

          handler.router(app);

          if (handler.afterRun && app.util.isFunc(handler.afterRun)) {
            handler.afterRun(exports, now, app);
          }
        });
      } else {
        app.error('Router is invalid - ' + env.handler + ':router()');
      }
      if (env.handler == now.handler) {
        env.handler = null;
      }
    }
  }
  exports.run = run;

  // 重新加载当前操作
  exports.reload = function(silent) {
    if (env.current) {
      run.apply(exports, env.current);
    }
    // 发送全局消息
    if (!silent) {
      app.core.cast('reload');
    }
  }
  // 切换页面显示模块
  var lastPage = null;
  /**
   * 切换整体页面
   * @param  {String} name 要切换到当前的页面模块对象URI
   * @return {String}      返回原显示的模块URI
   */
  exports.switchPage = function(name) {
    if (name == lastPage) {
      return;
    }
    var last = lastPage;
    var mod;
    if (lastPage) {
      mod = app.core.get(lastPage);
      if (mod) {
        mod.hide();
      }
    }
    lastPage = name;
    mod = app.core.get(name);
    if (mod) {
      mod.show();
    }
    return last;
  }

  // 监听Hash变化事件
  var oldURL = -1;
  function hashChanged(evt) {
    if (oldURL === -1) {return;} // 应用还没有开始
    oldURL = window.location.href;
    var path = window.location.pathname.substr(1);
    var param = path.split('/');

    var handler = param.shift();

    run(handler);
  }
  if (('onhashchange' in window) && (document.documentumentMode === undefined || document.documentumentMode==8)) {
    if (window.addEventListener) {
      window.addEventListener('hashchange', hashChanged, false);
    } else if (window.attachEvent) {
      window.attachEvent('onhashchange', hashChanged);
    } else {
      window.onhashchange = hashChanged;
    }
  } else {
    setInterval(function() {
      if (oldURL != window.location.href) {
        hashChanged.call(window);
      }
    }, 150);
  }

  // 设置默认配置
  require.async('pub-config', function(config) {
    config = config || {};

    app.init(
      config,
      function() {
        // 开始应用
        oldURL = window.location.href;
        hashChanged();
        // 自动登录的请求
        window.app = app;

        if (app.config('debug') > 1) {
          app.log('[PubJS] Environment inited.');
        }
      }
    );
  });
});