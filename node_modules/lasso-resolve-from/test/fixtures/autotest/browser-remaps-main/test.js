exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, './', { includeMeta: true});
};