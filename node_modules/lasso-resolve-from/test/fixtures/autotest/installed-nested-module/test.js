exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, 'installed-foo/foo', { includeMeta: true});
};