var path = require('path');

exports.test = function(resolveFrom, dir) {
    return resolveFrom(path.join(dir, 'node_modules/installed/lib'), './client/tcp', { includeMeta: true});
};