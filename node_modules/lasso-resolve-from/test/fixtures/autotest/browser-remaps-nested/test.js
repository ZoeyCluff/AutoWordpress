exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, './nested/server', { includeMeta: true});
};