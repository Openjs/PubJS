define("lib/middlewares/query-debug", [], function(require, exports, module) {
    module.exports = function() {
        return function(app, next) {
            var search = window.location.search;
            app.query = queryParser(search.substring(1));
            next();
        };
    };
    function queryParser(quertstring) {
        var _tmp1 = quertstring.split("&");
        var query = {};
        if (_tmp1[0] == "") return query;
        for (var i = 0, l = _tmp1.length; i < l; i++) {
            var _tmp2 = _tmp1[i].split("=");
            query[_tmp2[0]] = typeParser(_tmp2[1]);
        }
        return query;
    }
    function typeParser(value) {
        if (isNaN(parseInt(value))) {
            var rtn = null;
            switch (value) {
              case "true":
                rtn = true;
                break;

              case "false":
                rtn = false;
                break;

              case "null":
                rtn = null;
                break;

              case "undefined":
                rtn = undefined;
                break;

              case "NaN":
                rtn = NaN;
                break;

              default:
                rtn = value;
            }
            return rtn;
        } else {
            return parseFloat(value);
        }
    }
});