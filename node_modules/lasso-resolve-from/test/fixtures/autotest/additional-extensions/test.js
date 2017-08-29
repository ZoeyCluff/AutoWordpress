exports.test = function(resolveFrom, dir) {
    return resolveFrom(dir, './foo', {
        includeMeta: true,
        extensions: ['.bar']
    });
};