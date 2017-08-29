var path = require('path');

exports.test = function(resolveFrom, dir) {
    var fromDir = path.join(dir, 'bar');

    return resolveFrom(fromDir, '../foo/index', {
        includeMeta: true
    });
};