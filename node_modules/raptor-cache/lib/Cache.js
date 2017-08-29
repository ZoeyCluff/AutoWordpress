var DataHolder = require('raptor-async/DataHolder');
var inherit = require('raptor-util/inherit');
var EventEmitter = require('events').EventEmitter;
var CacheEntry = require('./CacheEntry');
var logger = require('raptor-logging').logger(module);
var util = require('./util');

function logPrefix(cache) {
    return (cache.name || '(unnamed)') + ':';
}

function isCacheEntryValid(cache, cacheEntry, lastModified) {
    if (cache.timeToIdle && cacheEntry.meta.lastAccessed && (Date.now() - cacheEntry.meta.lastAccessed > cache.timeToIdle)) {
        return false;
    }

    if (cache.timeToLive && cacheEntry.meta.created && (Date.now() - cacheEntry.meta.created > cache.timeToLive)) {
        return false;
    }

    if (lastModified !== undefined) {
        // The lookup includes a known last modified timestamp.
        // Return false if one of the following is true:
        // - The cache entry does not include a lastModified (when it was stored it was not known)
        // - The lookup last modified timestamp is more recent than the cache entry last modified time stamp
        if (!cacheEntry.meta.lastModified || (lastModified > cacheEntry.meta.lastModified)) {
            if (logger.isDebugEnabled()) {
                logger.debug(logPrefix(cache), 'Cache entry expired for key: ' + cacheEntry.key +
                    ', cacheEntry.meta.lastModified: ' + cacheEntry.meta.lastModified +
                    ', lastModified: ' + lastModified);
            }
            return false;
        }
    }

    return true;
}

function callbackToPromise(func, thisObj, args) {
    return new Promise(function(resolve, reject) {
        args.push(function callback(err, result) {
            if (err) {
                return reject(err);
            }

            resolve(result);
        });
        func.apply(thisObj, args);
    });
}

function getCacheEntry(cache, key, builder, lastModified, callback) {
    var debugEnabled = logger.isDebugEnabled();

    var hold = cache.pending[key];
    if (hold) {
        if (debugEnabled) {
            logger.debug(logPrefix(cache), 'Hold on key. Delaying getCacheEntry. key: ', key);
        }

        // The value for this key is being built... let's wait for it
        // to finish before reading from the cache
        hold.done(function() {

            logger.debug(logPrefix(cache), 'Trying again. key: ', key);

            // Try again after the hold is released...
            getCacheEntry(cache, key, builder, lastModified, callback);
        });
        return;
    }

    if (debugEnabled) {
        logger.debug(logPrefix(cache), 'No hold on key. Continuing with getCacheEntry for key: ', key);
    }

    cache.cacheStore.get(key, function(err, cacheEntry) {
        if (err) {
            return callback(err);
        }

        logger.debug(logPrefix(cache), 'getCacheEntry: ', key);

        if (cacheEntry && !isCacheEntryValid(cache, cacheEntry, lastModified)) {
            if (debugEnabled) {
                logger.debug(logPrefix(cache), 'Cache entry invalid for key: ', key);
            }
            cache.remove(key);
            cacheEntry = null;
        }

        if (cacheEntry) {
            if (cache.timeToIdle) {
                cacheEntry.meta.lastAccessed = Date.now();
            }

            if (debugEnabled) {
                logger.debug(logPrefix(cache), 'Found cache entry for key: ', key);
            }

            return callback(null, cacheEntry);
        }

        if (builder) {
            logger.debug(logPrefix(cache), 'getCacheEntry: ', key, ' - Will invoke builder...');

            // See if there is a hold on this key
            var hold = cache.pending[key];
            if (hold) {
                if (debugEnabled) {
                    logger.debug(logPrefix(cache), 'There is a hold. Waiting for it to finish.');
                }

                // There is a hold... try again after the hold is released...
                hold.done(function() {
                    if (debugEnabled) {
                        logger.debug(logPrefix(cache), 'Hold finished.');
                    }
                    getCacheEntry(cache, key, builder, lastModified, callback);
                });
            } else {
                hold = cache.hold(key);
                if (debugEnabled) {
                    logger.debug(logPrefix(cache), 'Hold created before invoking builder.');
                }

                var builderCallback = function(err, value) {
                    if (err) {
                        // logger.error(logPrefix(cache), 'Error returned by cache entry builder.', err);
                        hold.release();
                        callback(err);
                        return;
                    }
                    if (debugEnabled) {
                        logger.debug(logPrefix(cache), 'Cache entry builder for key "' + key + '" finished.');
                    }
                    var options;
                    if (lastModified !== undefined) {
                        options = {
                            lastModified: lastModified
                        };
                    }

                    cache.put(key, value, options);
                    hold.release();
                    getCacheEntry(cache, key, builder, lastModified, callback);
                };

                var result = builder(builderCallback);

                if (result !== undefined) {
                    // Assume a promise or value was returned
                    Promise.resolve(result)
                        .then(function(value) {
                            builderCallback(null, value);
                        })
                        .catch(function(err) {
                            builderCallback(err);
                        });
                }
            }
        } else {
            callback();
        }
    });

}

function scheduleFree(cache) {
    if (cache.freeDelay) {
        if (cache.freeTimeoutID) {
            clearTimeout(cache.freeTimeoutID);
        }
        cache.freeTimeoutID = setTimeout(function() {
            logger.info(logPrefix(cache), 'Cleared cache after ' + cache.freeDelay + 'ms of inactivity.');
            cache.cacheStore.free();
        }, cache.freeDelay);
    }
}

function Cache(cacheStore, options) {
    if (!options) {
        options = {};
    }

    this.name = options.name;
    this.cacheStore = cacheStore;
    this.timeToLive = options.timeToLive;
    this.timeToIdle = options.timeToIdle;
    this.freeDelay = options.freeDelay;
    this.freeTimeoutID = null;
    this.read = options.read !== false;
    this.write = options.write !== false;

    // timeToLive: maximum duration since entry added until entry is automatically invalidated
    if (!this.timeToLive || this.timeToLive < 0) {
        // entries will live indefinitely
        this.timeToLive = 0;
    }

    // timeToIdle: maximum duration of inactivity until entry is automatically invalidated
    if (!this.timeToIdle || this.timeToIdle < 0) {
        this.timeToIdle = 0;
    }

    // freeDelay: duration of time after no activity after which the entire cache will be cleared
    if (!this.freeDelay || this.freeDelay < 0) {
        this.freeDelay = 0;
    }

    var _this = this;

    if (cacheStore.hasOwnProperty('isCacheEntryValid')) {
        cacheStore.isCacheEntryValid = function(cacheEntry) {
            return isCacheEntryValid(_this, cacheEntry);
        };
    }

    if (this.freeDelay) {
        scheduleFree(this);
    }

    this.pending = {};
}

Cache.prototype = {

    hold: function(key) {
        scheduleFree(this);

        var pending = this.pending;
        var dataHolder = new DataHolder();

        var hold = pending[key] = {
            done: function(callback) {
                dataHolder.done(callback);
            },
            release: function() {
                delete pending[key];
                dataHolder.resolve();
            }
        };

        return hold;
    },

    _getCallback: function(key, options, callback) {
        if (this.read === false) {
            callback();
            return;
        }

        var debugEnabled = logger.isDebugEnabled();
        if (debugEnabled) {
            logger.debug(logPrefix(this), 'Get called. Key: ' + key);
        }

        scheduleFree(this);

        var builder;
        var lastModified;

        if (typeof options === 'function') {
            builder = options;
            options = null;
        } else if (options) {
            builder = options.builder;
            lastModified = options.lastModified;
        }

        getCacheEntry(this, key, builder, lastModified, function(err, cacheEntry) {
            if (err) {
                return callback(err);
            }

            if (cacheEntry) {
                cacheEntry.readValue(callback);
            } else {
                callback();
            }
        });
    },

    get: function(key, options, callback) {
        if (arguments.length === 2 && typeof options === 'function') {
            callback = options;
            options = null;
        }

        if (typeof callback === 'function') {
            this._getCallback(key, options, callback);
        } else {
            return callbackToPromise(this._getCallback, this, [key, options]);
        }
    },

    createReadStream: function(key, options) {
        var streamDataHolder = new DataHolder();

        if (this.read === false) {
            streamDataHolder.reject(new Error('Unable to create read stream for "' + key + '". Invalid cache entry'));
            return util.createDelayedReadStream(streamDataHolder);
        }

        scheduleFree(this);

        var builder;
        var lastModified;

        if (typeof options === 'function') {
            builder = options;
            options = null;
        } else if (options) {
            builder = options.builder;
            lastModified = options.lastModified;
        }

        getCacheEntry(this, key, builder, lastModified, function(err, cacheEntry) {

            if (err) {
                return streamDataHolder.reject(err);
            }

            if (!cacheEntry) {
                return streamDataHolder.reject(new Error('Unable to create read stream for "' + key + '". Invalid cache entry'));
            }


            streamDataHolder.resolve(cacheEntry.createReadStream());
        });

        return util.createDelayedReadStream(streamDataHolder);
    },

    _containsCallback: function(key, options, callback) {
        if (this.read === false) {
            return callback(null, false);
        }

        scheduleFree(this);

        var lastModified;

        if (options) {
            lastModified = options.lastModified;
        }

        getCacheEntry(this, key, null, lastModified, function(err, cacheEntry) {
            if (err) {
                return callback(err);
            }

            callback(null, cacheEntry != null);
        });
    },
    contains: function(key, options, callback) {
        if (arguments.length === 2) {
            callback = options;
            options = null;
        }

        if (typeof callback === 'function') {
            return this._containsCallback(key, options, callback);
        } else {
            return callbackToPromise(this._containsCallback, this, [key, options]);
        }
    },

    put: function(key, value, options) {
        if (this.write === false) {
            return;
        }

        var debugEnabled = logger.isDebugEnabled();
        if (debugEnabled) {
            logger.debug(logPrefix(this), 'Put called. Key: ' + key + ', Value: ' + !!value);
        }

        scheduleFree(this);

        var builder;

        if (options) {
            builder = options.builder;
        }

        var reader;

        if (typeof value === 'function') {
            if (debugEnabled) {
                logger.debug(logPrefix(this), 'Put called for ' + key + '  with value that is function (assumed to be reader)');
            }
            reader = value;
            value = undefined;
        }

        if ((value === undefined) && (reader === undefined)) {
            // no value, reader,  or builder so remove the entry
            if (debugEnabled) {
                logger.debug(logPrefix(this), 'Removing ' + key + ' because put called with undefined value');
            }
            this.remove(key);
            return;
        }

        var cacheEntry = new CacheEntry({
            key: key,

            // value might be undefined
            value: value,

            // reader might be undefined
            reader: reader
        });

        if (this.timeToLive) {
            cacheEntry.meta.created = Date.now();
        }

        if (options && options.lastModified) {
            cacheEntry.meta.lastModified = options.lastModified;
        }

        if (debugEnabled) {
            logger.debug(logPrefix(this), 'Storing value for key ' + key + ', cacheEntry.meta.lastModified: ' + cacheEntry.meta.lastModified + ', Has reader: ' + !!reader + ', Has value: ' + !!value);
        }

        this.cacheStore.put(key, cacheEntry);
    },

    remove: function(key) {
        if (this.write === false) {
            return;
        }

        scheduleFree(this);
        // remove any hold on this key
        this.pending[key] = undefined;

        // remove from lookup table
        this.cacheStore.remove(key);
    },

    _flushCallback: function(callback) {
        this.cacheStore.flush(callback);
    },

    flush: function(callback) {
        if (typeof callback === 'function') {
            return this._flushCallback(callback);
        } else {
            return callbackToPromise(this._flushCallback, this, []);
        }
    },

    free: function() {
        if (this.cacheStore.free) {
            this.cacheStore.free();
        }
    }
};

inherit(Cache, EventEmitter);

module.exports = Cache;
