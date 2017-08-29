var cssParser = require('raptor-css-parser');
var nodePath = require('path');
var REQUIRE_PREFIX = 'require:';
var lassoResolveFrom = require('lasso-resolve-from');

function defaultUrlResolver(url, lassoContext, callback) {
    if (url.indexOf('//') !== -1) {
        return callback(null, url);
    }

    var queryStart = url.indexOf('?');
    var query;
    var target = url;

    if (queryStart !== -1) {
        query = url.substring(queryStart + 1);
        target = url.substring(0, queryStart);
    }

    if (target.charAt(0) === '/' && target.charAt(1) !== '/') {
        target = nodePath.join(lassoContext.getProjectRoot(), target);
    } else if (target.startsWith(REQUIRE_PREFIX)) {
        target = target.substring(REQUIRE_PREFIX.length).trim();

        var from;
        if (lassoContext.dependency) {
            from = lassoContext.dependency.getDir(lassoContext);
        } else {
            from = lassoContext.getProjectRoot();
        }

        var resolved = lassoResolveFrom(from, target);

        if (resolved) {
            target = resolved.path;
        } else {
            var err = new Error('Module not found: ' + target + ' (from: ' + from + ')');
            err.target = target;
            err.from = from;
            err.code = 'MODULE_NOT_FOUND';
            return callback(err);
        }
    }

    if (query) {
        // Add back the query string
        target += '?' + query;
    }

    callback(null, target);
}

module.exports = function (lasso, pluginConfig) {

    var urlResolver = pluginConfig.urlResolver || defaultUrlResolver;

    lasso.addTransform({
        contentType: 'css',

        name: module.id,

        // true: The transform function will RECEIVE and RETURN a stream that can be used to read the transformed out
        // false: The transform function will RECEIVE full code and RETURN a value or promise
        stream: false,

        transform: function(code, lassoContext, callback) {
            var dependency = lassoContext.dependency;
            if (dependency && dependency.resolveCssUrlsEnabled === false) {
                return callback(null, code);
            }

            var lasso = lassoContext.lasso;
            cssParser.replaceUrls(
                code,

                // the replacer function
                function(url, start, end, callback) {
                    urlResolver(url, lassoContext, function(err, url) {
                        if (err || !url) {
                            return callback(err);
                        }

                        lasso.lassoResource(url, {lassoContext: lassoContext}, function(err, bundledResource) {
                            if (err) {
                                return callback(err);
                            }

                            callback(null, bundledResource && bundledResource.url);
                        });
                    });
                },

                // when everything is done
                function(err, code) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, code);
                });
        }
    });
};
