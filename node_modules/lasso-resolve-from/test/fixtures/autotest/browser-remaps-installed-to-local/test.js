exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, 'installed-foo', { includeMeta: true});
};