var ok = require('assert').ok;
var CacheEntry = require('./CacheEntry');

function MemoryStore(options) {
    this.cache = {};
}

MemoryStore.prototype = {
    free: function() {
        this.cache = {};
    },

    get: function(key, callback) {
        return callback(null, this.cache[key]);
    },

    put: function(key, cacheEntry) {
        ok(typeof key === 'string', 'key should be a string');
        ok(cacheEntry != null, 'cacheEntry is required');

        if (!(cacheEntry instanceof CacheEntry)) {
            cacheEntry = new CacheEntry({
                key: key,
                value: cacheEntry
            });
        } else {
            cacheEntry.key = key;
        }

        this.cache[key] = cacheEntry;
    },

    remove: function(key) {
        delete this.cache[key];
    },

    flush: function(callback) {
        callback();
        // don't need to flush memory cache stores
    }
};

module.exports = MemoryStore;
