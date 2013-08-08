define(function(require, exports){
	exports.MODULE_NAME = 'login';
	var view = require('base/view');

	var v1 = view.container.extend({
		init: function(config){
			console.log("i'm View1 at "+this._.name);
			this.master('init');
		}
	});

	var v2 = v1.extend({
		init: function(config){
			console.log("i'm View2 at "+this._.name);
			this.master('init');
		}
	});

	var v3 = v2.extend({
		init: function(config){
			console.log("i'm View3 at "+this._.name);
			this.master('init');
		}
	});

	exports.onMain = function(boot, data, app){
		app.core.create('foo', v3, {target:'body'});
		app.core.create('bar', v3, {target:'body'});
	}

});