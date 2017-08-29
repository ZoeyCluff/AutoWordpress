var ok = require('assert').ok;
var nodePath = require('path');
var lassoCachingFS = require('lasso-caching-fs');
var browserRemapsByDir = {};
var flattenedBrowserRemapsByDir = {};

var browserRemapsByDir = {};

function resolveMain(dir, resolveFrom, extensions) {
    var meta = [];
    var resolved = resolveFrom(dir, './', extensions, meta);
    return resolved;
}

function resolveBrowserPath(path, dir, resolveFrom, extensions) {
    var meta = [];

    var resolved;

    if (path.charAt(0) === '.') {
        resolved = resolveFrom(dir, path, extensions, meta);
    } else {
        resolved = resolveFrom(dir, './' + path, extensions, meta);
        if (!resolved) {
            resolved = resolveFrom(dir, path, extensions, meta);
        }
    }

    return resolved;
}

function loadBrowserRemapsFromPackage(pkg, dir, resolveFrom, extensions) {
    var browser = pkg.browser;

    if (pkg.browser === undefined) {
        browser = pkg.browserify;
    }

    if (browser == null) {
        return undefined;
    }

    var browserRemaps = {};

    if (typeof browser === 'string' || browser === false) {
        var resolvedMain = resolveMain(dir, resolveFrom, extensions); // Resolve the main file for the current directory
        if (!resolvedMain) {
            throw new Error('Invalid "browser" field in "' + nodePath.join(dir, 'package.json') + '". Module not found: ' + dir);
        }

        browserRemaps[resolvedMain.path] = browser ? resolveBrowserPath(browser, dir, resolveFrom, extensions) : false;
    } else {
        for (var source in browser) {
            if (browser.hasOwnProperty(source)) {
                var target = browser[source];
                var resolvedSource = resolveBrowserPath(source, dir, resolveFrom, extensions);
                if (resolvedSource) {
                    var remapTo;

                    if (target === false) {
                        remapTo = false;
                    } else {
                        remapTo = resolveBrowserPath(target, dir, resolveFrom, extensions);
                        if (!remapTo) {
                            // Invalid path...
                            continue;
                        }
                    }

                    browserRemaps[resolvedSource.path] = remapTo;
                }
            }
        }
    }

    return browserRemaps;
}

exports.load = function(dir, resolveFrom, extensions) {
    ok(dir, '"dirname" is required');
    ok(typeof dir === 'string', '"dirname" must be a string');

    var browserRemaps = flattenedBrowserRemapsByDir[dir];
    if (browserRemaps) {
        return browserRemaps;
    }

    flattenedBrowserRemapsByDir[dir] = browserRemaps = {};

    var currentDir = dir;

    while(currentDir) {
        var currentBrowserRemaps = browserRemapsByDir[currentDir];

        if (currentBrowserRemaps === undefined) {
            var packagePath = nodePath.join(currentDir, 'package.json');
            var pkg = lassoCachingFS.readPackageSync(packagePath);

            if (pkg) {
                currentBrowserRemaps = loadBrowserRemapsFromPackage(pkg, currentDir, resolveFrom, extensions);
            }

            browserRemapsByDir[currentDir] = currentBrowserRemaps || null;
        }

        if (currentBrowserRemaps) {
            for (var k in currentBrowserRemaps) {
                if (currentBrowserRemaps.hasOwnProperty(k) && !browserRemaps.hasOwnProperty(k)) {
                    browserRemaps[k] = currentBrowserRemaps[k];
                }
            }
        }

        var parentDir = nodePath.dirname(currentDir);
        if (!parentDir || parentDir === currentDir) {
            break;
        }
        currentDir = parentDir;
    }

    return browserRemaps;
};