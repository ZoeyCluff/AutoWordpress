exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, '@foo/bar', { includeMeta: true});
};