var path = require('path');

exports.test = function(resolveFrom, dir) {
    function remaps(dir) {
        var remaps = {};

        if (dir === __dirname) {
            remaps[path.join(__dirname, 'foo.js')] = path.join(__dirname, 'bar/bar.js');

        } else if (dir === path.join(__dirname, 'bar')) {
            remaps[path.join(__dirname, 'bar/bar.js')] = path.join(__dirname, 'baz/baz.js');
        } else if (dir === path.join(__dirname, 'baz')) {
            return null;
        }

        return remaps;
    }

    return resolveFrom(dir, './foo', {
        includeMeta: true,
        remaps: remaps
    });
};