function VoidStore(options) {
}

VoidStore.prototype = {
    free: function() {
    },

    get: function(key, callback) {
        return callback(null, null);
    },

    put: function(key, cacheEntry) {
    },

    remove: function(key) {
    },

    flush: function() {
    }
};

module.exports = VoidStore;