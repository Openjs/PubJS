define(function(require, exports) {

  var util = require('./util');
  
  // EventEmitter(without `domain` module) From Node.js
  function EventEmitter() {
    this._events = this._events || {};
    this._maxListeners = this._maxListeners || defaultMaxListeners;
  }
  EventEmitter.createEvent = function(sender, type, count) {
    return {
      'from'        : sender,
      'type'        : type,
      'count'       : count,
      'param'       : null,
      'data'        : null,
      'target'      : null,
      'method'      : 'on' + util.ucFirst(type),
      'returnValue' : null,


      'symbol': 'event'
    };
  }

  var defaultMaxListeners = 10;
  EventEmitter.prototype.setMaxListeners = function(n) {
    if (typeof n !== 'number' || n < 0) {
      throw TypeError('n must be a positive number');
    }
    this._maxListeners = n;
  };


  /**
   * emit a single event
   * @param  {String} type event's type
   * @return {Promise}      promise object
   *
   *
   * Usage:
   *   evtObj.emit('foobar', 1, 2, 3)
   *     .done(function(evt) {
   *       // Doing somethings  
   *     })
   *     .fail(function(err) {
   *       // Doing somethings
   *     });
   * 
   */
  EventEmitter.prototype.emit = function(type) {
    var err       = null;
    var handler   = null;
    var len       = null;
    var i         = null;
    var listeners = null;
    var evt       = null;
    var args      = arguments;
    var promise   = new Promise();

    if (args[args.length - 1].symbol !== 'event') {
      var evt = EventEmitter.createEvent(this, type, 0);
    } else {
      var evt = args[args.length - 1];
    }

    if (!util.isString(type)) {
      evt = EventEmitter.createEvent(this, type, 0);
    } else {
      evt = type;
      type = evt.type;
    }

    if (!this._events) {
      this._events = {};
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      if (!this._events.error ||
          (typeof this._events.error === 'object' &&
           !this._events.error.length)) {
        err = args[1];
        if (err instanceof Error) {
          promise.reject(err); // Unhandled 'error' event
        } else {
          promise.reject(TypeError('Uncaught, unspecified "error" event.'));
        }
        return promise;
      }
    }

    handler = this._events[type];

    if (typeof handler === 'function') {

      switch (args.length) {
        // fast cases
        case 1:
          handler.call(this, evt);
          break;
        case 2:
          handler.call(this, evt, args[1]);
          break;
        case 3:
          handler.call(this, evt, args[1], args[2]);
          break;
        // slower
        default:
          len = args.length;
          args = new Array(len);
          args.unshift(evt);
          for (i = 1; i < len; i++) {
            args[i - 1] = args[i];
          }
          handler.apply(this, args);
      }

      evt.count++;
    } else if (typeof handler === 'object') {
      len = args.length;
      args = new Array(len - 1);
      for (i = 1; i < len; i++) {
        args[i - 1] = args[i];
      }

      listeners = handler.slice();
      len = listeners.length;

      evt.count += len;

      for (i = 0; i < len; i++) {
        listeners[i].apply(this, args);
      }
    }

    console.log(evt);

    promise.resolve(evt);
    return promise;
  };

  EventEmitter.prototype.fire = function(type) {
    var self = this;

    var promise = new Promise();
    var evt = EventEmitter.createEvent(this, type, 0);

    var args = slice(arguments);
    args.shift();
    args.unshift(evt);

    function _fire(_evt) {
      var parent = this.parent();

      if (parent) {
        parent.emit.apply(parent, args)
          .done(_fire.bind(parent))
          .fail(promise.reject.bind(self));
      } else {
        promise.resolve(_evt);
      }
    }

    _fire.apply(self);

    return promise;
  };

  EventEmitter.prototype.cast = function(type) {
    var self = this;

    var promise = new Promise();
    var evt = EventEmitter.createEvent(this, type, 0);

    var args = slice(arguments);
    args.shift();
    args.unshift(evt);

    var pend = this.childs();

    function _cast() {
      if (pend && pend.length) {
        var childs = [];

        pend.forEach(function(child) {
          var p = child.emit.apply(child, args)
            .done(function(evt) {
              childs.push.apply(childs, child.childs());
            })
            .fail(function(err) {
              pend = null;
              return promise.reject(err);
            });
        });

        pend = childs.slice();

        return _cast();
      } else if (util.isArray(pend)) {
        return promise.resolve(evt);
      }
    }

    _cast();

    return promise;
  };

  EventEmitter.prototype.addListener = function(type, listener) {
    var m;

    if (typeof listener !== 'function') {
      throw TypeError('listener must be a function');
    }

    if (!this._events) {
      this._events = {};
    }

    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (this._events.newListener) {
      this.emit('newListener', type, typeof listener.listener === 'function' ?
                listener.listener : listener);
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    } else if (typeof this._events[type] === 'object') {
      // If we've already got an array, just append.
      this._events[type].push(listener);
    } else {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    // Check for listener leak
    if (typeof this._events[type] === 'object' && !this._events[type].warned) {
      m = this._maxListeners;
      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    return this;
  };

  EventEmitter.prototype.on = EventEmitter.prototype.addListener;

  EventEmitter.prototype.once = function(type, listener) {
    if (typeof listener !== 'function') {
      throw TypeError('listener must be a function');
    }

    function g() {
      this.removeListener(type, g);
      listener.apply(this, arguments);
    }

    g.listener = listener;
    this.on(type, g);

    return this;
  };

  // emits a 'removeListener' event iff the listener was removed
  EventEmitter.prototype.removeListener = function(type, listener) {
    var list, position, length, i;

    if (typeof listener !== 'function') {
      throw TypeError('listener must be a function');
    }

    if (!this._events || !this._events[type]) {
      return this;
    }

    list = this._events[type];
    length = list.length;
    position = -1;

    if (list === listener ||
        (typeof list.listener === 'function' && list.listener === listener)) {
      this._events[type] = undefined;
      if (this._events.removeListener) {
        this.emit('removeListener', type, listener);
      }

    } else if (typeof list === 'object') {
      for (i = length; i-- > 0;) {
        if (list[i] === listener ||
            (list[i].listener && list[i].listener === listener)) {
          position = i;
          break;
        }
      }

      if (position < 0) {
        return this;
      }

      if (list.length === 1) {
        list.length = 0;
        this._events[type] = undefined;
      } else {
        list.splice(position, 1);
      }

      if (this._events.removeListener) {
        this.emit('removeListener', type, listener);
      }
    }

    return this;
  };

  EventEmitter.prototype.removeAllListeners = function(type) {
    var key, listeners;

    if (!this._events) {
      return this;
    }

    // not listening for removeListener, no need to emit
    if (!this._events.removeListener) {
      if (arguments.length === 0) {
        this._events = {};
      } else if (this._events[type]) {
        this._events[type] = undefined;
      }
      return this;
    }

    // emit removeListener for all listeners on all events
    if (arguments.length === 0) {
      for (key in this._events) {
        if (key === 'removeListener') {
          continue;
        }
        this.removeAllListeners(key);
      }
      this.removeAllListeners('removeListener');
      this._events = {};
      return this;
    }

    listeners = this._events[type];

    if (typeof listeners === 'function') {
      this.removeListener(type, listeners);
    } else {
      // LIFO order
      while (listeners.length) {
        this.removeListener(type, listeners[listeners.length - 1]);
      }
    }
    this._events[type] = undefined;

    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    var ret;
    if (!this._events || !this._events[type]) {
      ret = [];
    } else if (typeof this._events[type] === 'function') {
      ret = [this._events[type]];
    } else {
      ret = this._events[type].slice();
    }
    return ret;
  };

  EventEmitter.listenerCount = function(emitter, type) {
    var ret;
    if (!emitter._events || !emitter._events[type]) {
      ret = 0;
    } else if (typeof emitter._events[type] === 'function') {
      ret = 1;
    } else {
      ret = emitter._events[type].length;
    }
    return ret;
  };


  function Promise(done) {
    this.results = null;
    this.errors  = null;
    this.ended   = false;

    // Done Callback
    if ('function' === typeof done) {
      this.done(done);
    }
  }
  util.inherits(Promise, _EventEmitter);
  Promise.prototype.resolve = function() {
    if (!this.ended) {
      // Arguments processing
      var args = slice(arguments);

      // Done
      this.emit('resolve', args);
      this.ended   = true;
      this.results = args;
    }

    return this;
  };
  Promise.prototype.reject = function() {
    if (!this.ended) {
      // Arguments processing
      var args = slice(arguments);

      // Error!
      this.emit('reject', args);
      this.ended  = true;
      this.errors = args;
    }

    return this;
  };
  Promise.prototype.then = function(done, fail) {
    return this
      .done(done)
      .fail(fail);
  };
  Promise.prototype.done = function(callback) {
    var self = this;

    if (self.ended) {
      // Done before
      if (self.results !== null) {
        callback.apply(self, self.results);
      }
    } else {
      // Event listening
      self.on('resolve', function(args) {
        var ret = callback.apply(self, args);

        if (ret instanceof Promise) {
          ret.fail(self.reject.bind(self));
        }
      });
    }

    return self;
  };
  Promise.prototype.fail = function(callback) {
    var self = this;

    if (self.ended) {
      // Reject Before
      if (self.errors !== null) {
        callback.apply(self, self.errors);
      }
    } else {
      // Event listening
      self.on('reject', function(args) {
        callback.apply(self, args);
      });
    }

    return self;
  };
  function slice(argv) {
    var args = [];

    for (var i = 0; i < argv.length; i++) {
      args[i] = argv[i];
    }

    return args;
  }


  exports.EventEmitter = EventEmitter;
  exports.Promise = Promise;
});

// EventEmitter(without `domain` module) From Node.js
function _EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || defaultMaxListeners;
}

var defaultMaxListeners = 10;
_EventEmitter.prototype.setMaxListeners = function(n) {
  if (typeof n !== 'number' || n < 0)
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
};

_EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (typeof this._events.error === 'object' &&
         !this._events.error.length)) {
      er = arguments[1];
      if (this.domain) {
        if (!er) er = new TypeError('Uncaught, unspecified "error" event.');
      } else if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (typeof handler === 'undefined')
    return false;

  if (typeof handler === 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (typeof handler === 'object') {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

_EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (typeof listener !== 'function')
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type, typeof listener.listener === 'function' ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (typeof this._events[type] === 'object')
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (typeof this._events[type] === 'object' && !this._events[type].warned) {
    m = this._maxListeners;
    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible _EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      console.trace();
    }
  }

  return this;
};

_EventEmitter.prototype.on = _EventEmitter.prototype.addListener;

_EventEmitter.prototype.once = function(type, listener) {
  if (typeof listener !== 'function')
    throw TypeError('listener must be a function');

  function g() {
    this.removeListener(type, g);
    listener.apply(this, arguments);
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
_EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (typeof listener !== 'function')
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (typeof list.listener === 'function' && list.listener === listener)) {
    this._events[type] = undefined;
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (typeof list === 'object') {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      this._events[type] = undefined;
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

_EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      this._events[type] = undefined;
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (typeof listeners === 'function') {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  this._events[type] = undefined;

  return this;
};

_EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (typeof this._events[type] === 'function')
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

_EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (typeof emitter._events[type] === 'function')
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};