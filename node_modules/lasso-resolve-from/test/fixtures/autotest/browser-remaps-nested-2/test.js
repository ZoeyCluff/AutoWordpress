var path = require('path');

exports.test = function(resolveFrom, dir) {
    return resolveFrom(path.join(dir, 'nested'), './server', { includeMeta: true});
};