'use strict';
var ok = require('assert').ok;
var path = require('path');
var Module = require('module').Module;
var isAbsolute = require('is-absolute');
var browserRemapsLoader = require('./browser-remaps-loader');
var lassoCachingFS = require('lasso-caching-fs');
var nodeResolveFrom = require('resolve-from');
var extend = require('raptor-util/extend');
var isObjectEmpty = require('raptor-util/isObjectEmpty');

function resolveMain(dir, meta, extensions) {

    var packagePath = path.join(dir, 'package.json');
    var pkg = lassoCachingFS.readPackageSync(packagePath);

    var main = pkg && pkg.main;

    if (main) {
        if (main.charAt(0) !== '.') {
            main = './' + main;
        }
    } else {
        main = './index';
    }

    var resolvedMain = resolveFrom(dir, main, extensions);
    if (!resolvedMain) {
        return undefined;
    }

    if (meta) {
        meta.push({
            'type': 'main',
            'dir': dir,
            'main': resolvedMain.path
        });
    }

    return resolvedMain.path;
}

function loadRemaps(dir, extensions, additionalRemaps) {
    var remaps = browserRemapsLoader.load(dir, resolveFrom, extensions);

    if (additionalRemaps) {
        if (typeof additionalRemaps === 'function') {
            additionalRemaps = additionalRemaps(dir);
        }

        if (additionalRemaps && !isObjectEmpty(additionalRemaps)) {
            remaps = extend({}, remaps);
            extend(remaps, additionalRemaps);
        }
    }

    return remaps;
}

function tryExtensions(targetModule, extensions) {
    var originalExt = path.extname(targetModule);
    var hasExt = originalExt !== '';
    var stat = lassoCachingFS.statSync(targetModule);

    if (stat.exists() && !stat.isDirectory()) {
        return [targetModule, stat];
    }

    if (!hasExt) {
        // Short circuit for the most common case where it is a JS file
        var withJSExt = targetModule + '.js';
        stat = lassoCachingFS.statSync(withJSExt);
        if (stat.exists()) {
            return [withJSExt, stat];
        }
    }

    // Try with the extensions
    for (var i=0, len=extensions.length; i<len; i++) {
        var ext = extensions[i];
        if (ext !== originalExt) {
            var targetModuleWithExt = targetModule + ext;
            stat = lassoCachingFS.statSync(targetModuleWithExt);
            if (stat.exists()) {
                return [targetModuleWithExt, stat];
            }
        }
    }
}

function resolveFrom(fromDir, targetModule, extensions, meta, shouldLoadRemaps, additionalRemaps) {
    var resolved;
    var resolvedPath;
    var stat;

    if (isAbsolute(targetModule)) {
        resolved = tryExtensions(targetModule, extensions);
        if (!resolved) {
            return undefined;
        }

        resolvedPath = resolved[0];
        stat = resolved[1];
    } else if (targetModule.charAt(0) === '.') {
        // Don't go through the search paths for relative paths
        resolvedPath = path.join(fromDir, targetModule);
        resolved = tryExtensions(resolvedPath, extensions);

        if (!resolved) {
            stat = lassoCachingFS.statSync(resolvedPath);
            if (stat && stat.isDirectory()) {
                resolvedPath = resolvedPath;
            } else {
                return undefined;
            }
        }

        if (!stat) {
            resolvedPath = resolved[0];
            stat = resolved[1];
        }

    } else {
        var sepIndex = targetModule.indexOf('/');
        var packageName;
        var packageRelativePath;

        if (sepIndex !== -1 && targetModule.charAt(0) === '@') {
            sepIndex = targetModule.indexOf('/', sepIndex+1);
        }

        if (sepIndex === -1) {
            packageName = targetModule;
            packageRelativePath = null;
        } else {

            packageName = targetModule.substring(0, sepIndex);
            packageRelativePath = targetModule.substring(sepIndex + 1);
        }

        var searchPaths = Module._nodeModulePaths(fromDir);

        for (var i=0, len=searchPaths.length; i<len; i++) {
            var searchPath = searchPaths[i];

            var packagePath = path.join(searchPath, packageName);

            stat = lassoCachingFS.statSync(packagePath);

            if (stat.isDirectory()) {
                if (meta) {
                    meta.push({
                        type: 'installed',
                        packageName: packageName,
                        searchPath: searchPath,
                        fromDir: fromDir
                    });
                }
                // The installed module has been found, but now need to find the module
                // within the package
                if (packageRelativePath) {
                    return resolveFrom(packagePath, './' + packageRelativePath, extensions, meta, shouldLoadRemaps, additionalRemaps);
                } else {
                    resolvedPath = packagePath;
                }
                break;
            }
        }

        if (!resolvedPath) {
            // If we still didn't resolve the path then let's go through the native Node.js module
            // resolver as a last resort. The `resolve-from` module internally uses Module._resolveFilename
            // and it is possible that this method could have been patched.
            resolvedPath = nodeResolveFrom(fromDir, targetModule);
            if (resolvedPath === targetModule) {
                // If this is a native module such as "buffer" it will still resolve to the same string.
                // If it is a native module then we want to the resolved path to be null since we will
                // resolve native modules for the browser separately
                resolvedPath = null;
            }
        }

        if (!resolvedPath) {
            return undefined;
        }
    }

    if (stat.isDirectory()) {
        resolvedPath = resolveMain(resolvedPath, meta, extensions);
        if (!resolvedPath) {
            return undefined;
        }
    }


    var voidRemap = false;
    if (shouldLoadRemaps) {
        var fromRemaps = loadRemaps(fromDir, extensions, additionalRemaps);

        var targetDir = path.dirname(resolvedPath);
        // The target file might have a different set of remaps based on where it is located on the file system
        var targetRemaps = loadRemaps(targetDir, extensions, additionalRemaps);

        // Handle all of the remappings
        while (true) {
            var remapTo = fromRemaps[resolvedPath];

            if (remapTo === undefined && targetRemaps) {
                remapTo = targetRemaps[resolvedPath];
            }

            if (remapTo == null || remapTo.path === resolvedPath) {
                break;
            } else {
                var remapToTarget = typeof remapTo === 'object' ? remapTo.path : remapTo;

                if (meta) {
                    meta.push({
                        type: 'remap',
                        from: resolvedPath,
                        to: remapToTarget
                    });

                    if (remapTo.meta) {
                        for (let i=0; i<remapTo.meta.length; i++) {
                            meta.push(remapTo.meta[i]);
                        }
                    }
                }

                if (remapToTarget === false) {
                    voidRemap = true;
                    break;
                }

                resolvedPath = remapToTarget;

                var newDir = path.dirname(resolvedPath);
                if (newDir !== targetDir) {
                    targetDir = newDir;
                    targetRemaps = loadRemaps(targetDir, extensions, additionalRemaps);
                }
            }
        }
    }

    var result = { path: resolvedPath };

    if (meta) {
        result.meta = meta;
    }

    if (voidRemap) {
        result.voidRemap = true;
    }

    return result;
}

module.exports = function(fromDir, targetModule, options) {
    ok(targetModule, '"targetModule" is required');
    ok(typeof targetModule === 'string', '"targetModule" should be a string');
    ok(fromDir, '"fromDir" is required');
    ok(typeof fromDir === 'string', '"fromDir" should be a string');

    var includeMeta;
    var extensions;
    var meta;
    var additionalRemaps;

    if (options) {
        includeMeta = options.includeMeta === true;
        meta = includeMeta ? [] : undefined;

        extensions = options.extensions;

        additionalRemaps = options.remaps;
    }

    if (!extensions) {
        extensions = [];

        let nodeRequireExtensions = require.extensions;
        for (let ext in nodeRequireExtensions) {
            if (ext !== '.node') {
                extensions.push(ext);
            }
        }
    }

    var resolved = resolveFrom(fromDir, targetModule, extensions, meta, true /*shouldLoadRemaps*/, additionalRemaps);

    if (resolved == null) {
        return undefined;
    }

    return resolved;
};