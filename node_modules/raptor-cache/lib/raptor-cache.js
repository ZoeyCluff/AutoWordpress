var Cache = require('./Cache');
var DiskStore = require('./DiskStore');
var MemoryStore = require('./MemoryStore');
var VoidStore = require('./VoidStore');
var parallel = require('raptor-async/parallel');

var raptorCache = {
    createCache: function(config) {
        var store = config.store;

        if (store == null) {
            store = 'memory';
        }

        if (typeof store === 'string') {
            if (store === 'disk') {
                store = new DiskStore(config);
            } else if (store === 'memory') {
                store = new MemoryStore(config);
            } else if (store === 'none' || store === 'void') {
                store = new VoidStore();
            } else {
                throw new Error('Unsupported store type: ' + store);
            }
        }

        return new Cache(store, config);
    },

    createDiskCache: function(config) {
        var store = new DiskStore(config);
        return new Cache(store, config);
    },

    createMemoryCache: function(config) {
        var store = new MemoryStore(config);
        return new Cache(store, config);
    },

    createCacheManager: function(options) {
        var CacheManager = require('./CacheManager');
        return new CacheManager(options);
    },

    caches: require('./caches'),

    forEachCache: function(callback) {
        for (var key in this.caches) {
            if (raptorCache.caches.hasOwnProperty(key)) {
                callback(this.caches[key]);
            }
        }
    },

    flushAll: function(callback) {
        var flushTasks = [];

        raptorCache.forEachCache(function(cache) {
            flushTasks.push(function(callback) {
                cache.flush(function() {
                    callback();
                });
            });
        });

        parallel(flushTasks, callback || function() {});
    },
    freeAll: function(callback) {
        raptorCache.forEachCache(function(cache) {
            cache.free();
        });
    }
};

module.exports = raptorCache;
