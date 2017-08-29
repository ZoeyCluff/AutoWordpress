exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, 'installed', { includeMeta: true});
};