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

	var trim = String.prototype.trim;
	if (!trim){
		var trim_exp = /(^\s*)|(\s*$)/g;
		trim = function(){
			return this.replace(trim_exp, '');
		}
	}
	ex.trim = function(str){
		if (isString(str)){
			return trim.call(str);
		}else {
			return str;
		}
	}

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
	ex.stopEvent = function(evt){
		evt.stopPropagation();
		return true;
	}

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

	function Index(list, value, field){
		var ret, c, i, al = (arguments.length >= 3);
		if (isArray(list)){
			c = list.length;
			for (i=0; i<c; i++){
				ret = list[i];
				if (al){
					if (ret && ret[field] === value){
						return i;
					}
				}else if (ret === value){
					return i;
				}
			}
		}else if (isObject(list)){
			for (i in list){
				if (!_has.call(list, i)) {continue;}
				ret = list[i];
				if (al){
					if (ret && ret[field] === value){
						return i;
					}
				}else if (ret === value){
					return i;
				}
			}
		}
		return null;
	}
	ex.index = Index;

	ex.find = function(list){
		var id = Index.apply(this, arguments);
		if (id !== null){
			return list[id];
		}else {
			return null;
		}
	}

	ex.remove = function(list){
		var id = Index.apply(this, arguments);
		if (id === null){ return false; }
		if (isArray(list)){
			list.splice(id, 1);
		}else {
			delete list[id];
		}
		return true;
	}

	ex.getViewport = function(){
		var d = document, de = d.documentElement, db = d.body;
		var m = (d.compatMode === "CSS1Compat");
		return {
			width: (m ? de.clientWidth : db.clientWidth),
			height: (m ? de.clientHeight : db.clientHeight)
		};
	}

	ex.merge = function(target, source){
		ex.each(source, function(val, name){
			if (val === null || val === undefined){
				if (target){ delete target[name]; }
			}else {
				if (!target){ target = {};}
				target[name] = val;
			}
		});
		return target;
	}
	ex.first = function(list){
		var ret;
		if (isArray(list)){
			ret = list.shift();
		}else if (isObject(list)){
			for (var i in list){
				if (has(list, i)){
					ret = list[i];
					break;
				}
			}
		}
		return ret;
	}

	var tab = {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;'};
	var esc_reg  = /[&<>"]/g;
	function esc_rp(m){ return tab[m]; }
	ex.html = function(s){
		return (typeof(s) != 'string') ? s : s.replace(esc_reg, esc_rp);
	}

	/**
	 * 格式化数字, 自动补0前续
	 * @param  {Number} number 要格式化的数字
	 * @param  {Number} size   格式化后出来的数字位数
	 * @return {String}        格式化结果
	 */
	function fix0(number, size){
		number = number.toString();
		while (number.length < size){
			number = '0' + number;
		}
		return number;
	}
	ex.fix0 = fix0;

	var timestamp = null;
	var format_exp = /[YymndjNwaAghGHis]/g;
	function format_callback(tag){
		var t = timestamp;
		switch (tag){
			case 'Y': return t.getFullYear();
			case 'y': return t.getFullYear() % 100;
			case 'm': return fix0(t.getMonth()+1, 2);
			case 'n': return t.getMonth()+1;
			case 'd': return fix0(t.getDate(), 2);
			case 'j': return t.getDate();
			case 'N': return t.getDay();
			case 'w': return t.getDay() % 7;
			case 'a': return t.getHours() < 12 ? 'am':'pm';
			case 'A': return t.getHours() < 12 ? 'AM':'PM';
			case 'g': return t.getHours() % 12 + 1;
			case 'h': return fix0(t.getHours() % 12 + 1, 2);
			case 'G': return t.getHours();
			case 'H': return fix0(t.getHours(), 2);
			case 'i': return fix0(t.getMinutes(), 2);
			case 's': return fix0(t.getSeconds(), 2);
		}
		return tag;
	}
	ex.date = function(format, date, offset){
		if (!format) {return '';}
		var ts;
		if (isNaN(date)){
			if (date instanceof Date){
				ts = date;
				if (!isNaN(offset)){
					ts.setTime(ts.getTime() + offset * 1000);
				}
			}else {
				ts = new Date();
			}
		}else if (date > 5e8){
			// 时间戳
			ts = (new Date()).setTime(date * 1000);
		}else {
			// 时间偏移(秒数)
			ts = new Date();
			ts.setTime(ts.getTime() + date * 1000);
		}
		timestamp = ts;
		return format.replace(format_exp, format_callback);
	}
});