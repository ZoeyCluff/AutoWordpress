require('raptor-polyfill/string/startsWith');

var chai = require('chai');
chai.config.includeStack = true;
var nodePath = require('path');
var isArray = Array.isArray;

var resolveFrom = require('../');


describe('lasso-resolve-from', function() {
    require('./autotest').scanDir(
        nodePath.join(__dirname, 'fixtures/autotest'),
        function (dir) {
            var main = require(nodePath.join(dir, 'test.js'));

            function relativizePaths(o) {
                if (isArray(o)) {
                    return o.map(relativizePaths);
                } else if (typeof o === 'object') {
                    for (var k in o) {
                        if (o.hasOwnProperty(k)) {
                            var v = o[k];
                            o[k] = relativizePaths(v);
                        }
                    }
                } else if (typeof o === 'string') {
                    if (o.startsWith(dir)) {
                        return o.substring(dir.length);
                    }
                }

                return o;
            }

            if (main && main.checkThrownError) {
                var error;

                try {
                    main.test(resolveFrom, dir);
                } catch(e) {
                    error = e;
                }

                if (!error) {
                    throw new Error('Error expected!');
                } else {

                }
            } else {
                return relativizePaths(main.test(resolveFrom, dir));
            }
        },
    {
        ext: '.json'
    });
});