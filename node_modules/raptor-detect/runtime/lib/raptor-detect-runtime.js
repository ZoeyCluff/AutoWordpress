exports.detect = require('../../').create(function(env) {
    var versions = typeof process !== 'undefined' && process.versions && process.versions;

    if (versions && versions.node) {
        env.node = {version: versions.node};
        env.v8 = {version: versions.node};
        env.modules = {version: versions.modules};
        env.server = true;
    }
    else if (typeof Packages !== 'undefined') {
        env.jvm = true;
        // Could be Nashorn or Rhino, but we will assume Rhino for now...
        env.rhino = true;
        env.server = true;
    }
    else if (typeof window !== 'undefined') {
        env.browser = true;
    }
});

