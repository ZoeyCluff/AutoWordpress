exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, './universal', { includeMeta: true});
};