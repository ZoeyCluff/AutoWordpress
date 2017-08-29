var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var parallel = require('raptor-async/parallel');
var series = require('raptor-async/series');
var raptorCache = require('../');
var fs = require('fs');
var nodePath = require('path');
var crypto = require('crypto');
var cacheDir = nodePath.join(__dirname, '.cache');

function removeCacheDir(dir) {
    try {
        var children = fs.readdirSync(dir);
        for (var i = 0; i < children.length; i++) {
            var file = nodePath.join(dir, children[i]);
            var stat = fs.statSync(file);
            
            if (stat.isDirectory()) {
                removeCacheDir(file);
            } else {
                fs.unlinkSync(file);
            }
        }

        fs.rmdirSync(dir);
    } catch(e) {}
}


describe('raptor-cache' , function() {

    // beforeEach(function(done) {
    //     require('raptor-logging').configureLoggers({
    //         'raptor-cache': 'DEBUG'
    //     });

    //     done();
    // });

    it('should invoke callback with null for missing cache entry', function(done) {
        var cache = raptorCache.createMemoryCache();
        parallel([
                function(callback) {
                    cache.get('hello', function(err, value) {
                        if (err) {
                            return callback(err);
                        }

                        expect(value == null).to.equal(true);
                        callback();
                    });
                }
            ],
            done);
    });

    it('should retrieve a key using a builder', function(done) {
        var cache = raptorCache.createMemoryCache();
        parallel([
                function(callback) {
                    cache.get('hello', function(callback) {
                        setTimeout(function() {
                            callback(null, 'world');
                        }, 100);
                    }, function(err, value) {
                        if (err) {
                            return callback(err);
                        }

                        expect(value).to.equal('world');
                        callback();
                    });
                }
            ],
            done);
    });

    it('should delay reads when a value is being built', function(done) {
        var cache = raptorCache.createMemoryCache();
        parallel([
                function(callback) {
                    cache.get('hello', function(callback) {
                        setTimeout(function() {
                            callback(null, 'world');
                        }, 100);
                    }, callback);
                },
                function(callback) {
                    cache.get('hello', function(callback) {
                        setTimeout(function() {
                            callback(null, 'world2');
                        }, 100);
                    }, callback);
                },
                function(callback) {
                    cache.get('hello', function(err, value) {
                        expect(value).to.equal('world');
                        callback();
                    });
                }
            ],
            done);
    });

    it('should support createReadStream() with a multi-file disk cache', function(done) {
        removeCacheDir(cacheDir);

        function createCache() {
            return raptorCache.createDiskCache({singleFile: false, dir: cacheDir});   
        }
        

        var reader = function() {
            return fs.createReadStream(nodePath.join(__dirname, 'hello.txt'));
        };

        var signature = null;

        var cache;

        series([
                function(callback) {
                    var shasum = crypto.createHash('sha1');

                    var stream = reader();
                    stream
                        .on('data', function(data) {
                            shasum.update(data);
                        })
                        .on('end', function() {
                            signature = shasum.digest('hex');
                            callback();
                        })
                        .on('error', function(e) {
                            callback(e);
                        });
                },
                function(callback) {
                    cache = createCache();
                    cache.put('hello', reader);
                    cache.flush(callback);
                },
                function(callback) {

                    cache = createCache();
                    var shasum = crypto.createHash('sha1');
                    var stream = cache.createReadStream('hello');
                    stream
                        .on('data', function(data) {
                            shasum.update(data);
                        })
                        .on('end', function() {
                            expect(shasum.digest('hex')).to.equal(signature);
                            callback();
                        })
                        .on('error', function(e) {
                            callback(e);
                        });
                },
                function(callback) {
                    var shasum = crypto.createHash('sha1');
                    var stream = cache.createReadStream('hello');
                    stream
                        .on('data', function(data) {
                            shasum.update(data);
                        })
                        .on('end', function() {
                            expect(shasum.digest('hex')).to.equal(signature);
                            callback();
                        })
                        .on('error', function(e) {
                            callback(e);
                        });
                }
            ],
            done);
    });
});

