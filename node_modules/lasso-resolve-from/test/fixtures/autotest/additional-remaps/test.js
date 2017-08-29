var path = require('path');

exports.test = function(resolveFrom, dir) {
    var remaps = {};
    remaps[path.join(dir, 'foo.js')] = path.join(dir, 'bar.js');

    return resolveFrom(dir, './foo', {
        includeMeta: true,
        remaps: remaps
    });
};