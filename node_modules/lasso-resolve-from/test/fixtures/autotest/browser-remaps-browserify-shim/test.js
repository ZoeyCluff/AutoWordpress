exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, 'path', { includeMeta: true});
};