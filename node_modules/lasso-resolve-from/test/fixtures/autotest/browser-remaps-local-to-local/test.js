exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, './server', { includeMeta: true});
};