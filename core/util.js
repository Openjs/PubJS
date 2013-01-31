define(function(require, ex){
	var $ = require('jquery');

	// 变量类型判断
	function isFunc(func){
		return (func instanceof Function);
	}

	function isString(str){
		return (typeof(str) == 'string');
	}

	function isArray(val){
		return (val instanceof Array);
	}

	function isObject(val){
		return (val instanceof Object);
	}

	function starRegExp(str){
		str = str.replace(/([\$\.\^\(\)\[\]\{\}])/g, '\\$1');
		str = str.replace(/\*/g, '(?:.+)');
		return new RegExp(str);
	}

	function getCssValue(el, name){
		var val = $(el).css(name).replace(/[a-z]+/i, '');
		return parseInt(val,10) || 0;
	}

	function ucFirst(str){
		if (isString(str)){
			var c = str.charAt(0).toUpperCase();
			return c + str.substr(1);
		}
		return str;
	}

	function toHex(num, len){
		var hex = '0123456789ABCDEF';
		var c = '';
		num = parseInt(num, 10);
		while (num > 15){
			c = hex.charAt(num % 16) + c;
			num = num >> 4;
		}
		c = hex.charAt(num % 16) + c;

		while (len && c.length < len){
			c = '0' + c;
		}
		return c;
	}

	var _has = Object.prototype.hasOwnProperty;
	function has(obj, key){
		if (key === undefined) {return false;}
		return _has.call(obj, key);
	}

	ex.isFunc = isFunc;
	ex.isString = isString;
	ex.isArray = isArray;
	ex.isObject = isObject;
	ex.starRegExp = starRegExp;
	ex.getCssValue = getCssValue;
	ex.ucFirst = ucFirst;
	ex.toHex = toHex;
	ex.has = has;

	var ua = navigator.userAgent.toLowerCase(),tmp;
	ex.isIe = (tmp = ua.match(/msie ([\d.]+)/))?tmp[1]:false;
	ex.isFf = (tmp = ua.match(/firefox\/([\d.]+)/))?tmp[1]:false;
	ex.isChrome = (tmp = ua.match(/chrome\/([\d.]+)/))?tmp[1]:false;
	ex.isOpera = (tmp = ua.match(/opera.([\d.]+)/))?tmp[1]:false;
	ex.isSafari = (tmp = ua.match(/version\/([\d.]+).*safari/))?tmp[1]:false;
	ua = tmp = null;

	/**
	 * 返回对象自有的属性值
	 * @param  {Object} obj  属性所属的对象
	 * @param  {String} prop 属性名称
	 * @return {Mix}      返回对象的属性, 不存在或属性为继承获得, 返回undefined
	 */
	ex.own = function(obj, prop){
		if (has(obj, prop)){
			return obj[prop];
		}else {
			return undefined;
		}
	}

	function toRGB(r,g,b){
		var c = '#';
		c += toHex(r * 255, 2);
		c += toHex(g * 255, 2);
		c += toHex(b * 255, 2);
		return c;
	}

	/**
	 * HSL 转 RGB 颜色格式
	 * @param  {Number} h 色相 [ 0-360 ]
	 * @param  {Number} s 饱和 [ 0-1 ]
	 * @param  {Number} l 亮度 [ 0-1 ]
	 * @return {String}   CSS颜色字符串
	 */
	ex.hsl2rgb = function(h,s,l){
		if (isObject(h) && "h" in h && "s" in h && "l" in h) {
			l = h.l;
			s = h.s;
			h = h.h;
		}
		// h *= 360;
		var R, G, B, X, C;
		h = (h % 360) / 60;
		C = 2 * s * (l < 0.5 ? l : 1 - l);
		X = C * (1 - Math.abs(h % 2 - 1));
		R = G = B = l - C / 2;

		h = ~~h;
		R += [C, X, 0, 0, X, C][h];
		G += [X, C, C, X, 0, 0][h];
		B += [0, 0, X, C, C, X][h];

		return toRGB(R,G,B);
	}
	/**
	 * HSB/HSV 转 RGB 颜色格式
	 * @param  {Number} h 色相 [ 0-360 ]
	 * @param  {Number} s 饱和 [ 0-1 ]
	 * @param  {Number} v 明度 [ 0-1 ]
	 * @return {String}   CSS颜色字符串
	 */
	ex.hsb2rgb = function (h, s, v) {
		if (isObject(h) && "h" in h && "s" in h && "b" in h) {
			v = h.b;
			s = h.s;
			h = h.h;
		}
		// h *= 360;
		var R, G, B, X, C;
		h = (h % 360) / 60;
		C = v * s;
		X = C * (1 - Math.abs(h % 2 - 1));
		R = G = B = v - C;

		h = ~~h;
		R += [C, X, 0, 0, X, C][h];
		G += [X, C, C, X, 0, 0][h];
		B += [0, 0, X, C, C, X][h];

		return toRGB(R,G,B);
	};

	ex.blockEvent = function(evt){
		evt.stopPropagation();
		return false;
	};

	ex.each = function(list, cb, ct){
		if (!list || !isFunc(cb)) {return false;}
		if (!ct) {ct = window;}
		var ret, c, i=null;
		if (isArray(list)){
			for (i=0; i<list.length; i++){
				ret = cb.call(ct, list[i], i);
				if (ret === false){
					break;
				}
				if (ret === null){
					list.splice(i,1);
					i--;
				}else if (ret !== undefined){
					list[i] = ret;
				}
			}
			if (i==list.length){
				i = null;
			}
		}else if (isObject(list)){
			for (c in list){
				if (!_has.call(list, c)) {continue;}
				ret = cb.call(ct, list[c], c);
				if (ret === false){
					i = c;
					break;
				}
				if (ret === null){
					list[c] = null;
					delete list[c];
				}else if (ret !== undefined){
					list[c] = ret;
				}
			}
		}
		list = cb = ct = null;
		ex.each.result = i;
		return i;
	}

	ex.uniq = ex.unique = function(arr, keep){
		if (!isArray(arr)) {return null;}
		var exist = {};
		var result = keep ? [] : arr;
		for (var i=0; i<arr.length; i++){
			if (_has.call(exist, arr[i])){
				if (!keep){
					arr.splice(i--, 1);
				}
			}else {
				exist[arr[i]] = 1;

			}
		}
	}

	ex.find = function(list, value, field){
		var ret, c, i, al = (arguments.length >= 3);
		if (isArray(list)){
			c = list.length;
			for (i=0; i<c; i++){
				ret = list[i];
				if (al){
					if (ret && ret[field] == value){
						return ret;
					}
				}else if (ret == value){
					return ret;
				}
			}
		}else if (isObject(list)){
			for (i in list){
				if (!_has.call(list, i)) {continue;}
				ret = list[i];
				if (al){
					if (ret && ret[field] == value){
						return ret;
					}
				}else if (ret == value){
					return ret;
				}
			}
		}
		return undefined;
	}

	ex.getViewport = function(){
		var d = document, de = d.documentElement, db = d.body;
		var m = (d.compatMode === "CSS1Compat");
		return {
			width: (m ? de.clientWidth : db.clientWidth),
			height: (m ? de.clientHeight : db.clientHeight)
		};
	}
});