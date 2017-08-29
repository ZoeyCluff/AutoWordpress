exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, 'symlink-module', { includeMeta: true});
};