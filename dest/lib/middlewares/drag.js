/**
 * 拖动控制模块
 * @description 只传入dom参数, 可以取消绑定
 * @param {jQuery}   dom      绑定触发拖拽的jQuery对象
 * @param {Object}   data     <可选> 回调事件参数
 * @param {Function} callback 回调函数
 * @param {Object}   context  <可选> 回调函数调用域
 */
define("lib/middlewares/drag", [ "gallery/jquery/1.8.3/jquery" ], function(require, exports, module) {
    var $ = require("gallery/jquery/1.8.3/jquery.js");
    module.exports = function() {
        return function(app, next) {
            app.drag = Drag;
            next();
        };
    };
    function Drag(dom, data, callback, context) {
        if (!dom) {
            return false;
        }
        if (!dom.jquery) {
            dom = $(dom);
        }
        if (arguments.length == 1) {
            dom.unbind("mousedown.drag", DragEvent);
        } else {
            if (isFunc(data)) {
                context = callback;
                callback = data;
                data = null;
            }
            dom.bind("mousedown.drag", {
                cb: callback,
                ct: context || window,
                data: data
            }, DragEvent);
        }
        return false;
    }
    /**
   * 拖拽DOM事件处理封装函数
   * @param {Event} evt jQuery事件对象
   */
    function DragEvent(evt) {
        var ev = evt.data;
        switch (evt.type) {
          case "mouseup":
            $(document).unbind("mouseup.drag", DragEvent);
            $(document).unbind("mousemove.drag", DragEvent);
            ev.type = "endDrag";

          /* falls through */
            case "mousemove":
            if (evt.type != "mouseup") {
                ev.type = "moveDrag";
            }
            ev.cx = evt.pageX;
            ev.cy = evt.pageY;
            ev.dx = evt.pageX - ev.x;
            ev.dy = evt.pageY - ev.y;
            ev.cb.call(ev.ct, ev);
            break;

          case "mousedown":
            if (evt.button == 2) {
                return false;
            }
            ev.cx = ev.x = evt.pageX;
            ev.cy = ev.y = evt.pageY;
            ev.dx = 0;
            ev.dy = 0;
            ev.type = "startDrag";
            if (ev.cb.call(ev.ct, ev)) {
                $(document).bind("mouseup.drag", ev, DragEvent);
                $(document).bind("mousemove.drag", ev, DragEvent);
            }
            break;
        }
        return false;
    }
});