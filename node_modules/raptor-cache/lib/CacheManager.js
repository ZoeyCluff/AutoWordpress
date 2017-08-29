var inherit = require('raptor-util/inherit');
var raptorCache = require('./raptor-cache');
var caches = require('./caches');
var EventEmitter = require('events').EventEmitter;

function CacheManager(options) {
    if (!options) {
        options = {};
    }

    this.cacheProfiles = {};

    if (options.profiles) {
        // Merge in the defaults from the options first
        this.configureCacheDefaults(options.profiles);
    }

    this.profileName = options.profile;

    this.caches = options.caches || caches;
}

CacheManager.prototype = {

    getCache: function(name, cacheConfigName) {
        if (!cacheConfigName) {
            cacheConfigName = name;
        }

        var cache = this.caches[name];

        if (!cache) {
            var cacheConfig = {};

            cacheConfig.name = name;

            var merge = function(props) {
                if (!props) {
                    return;
                }

                Object.keys(props).forEach(function(k) {
                    if (!cacheConfig.hasOwnProperty(k)) {
                        cacheConfig[k] = props[k];
                    }
                });
            };

            if (this.profileName) {
                var profile = this.cacheProfiles[this.profileName];
                if (profile) {
                    merge(profile[cacheConfigName]);
                }
            }

            var defaultProfile = this.cacheProfiles['*'];
            if (defaultProfile) {
                merge(defaultProfile[cacheConfigName]); // Merge in defaults that apply to this cache regardless of profile
                merge(defaultProfile['*']); // Merge in defaults that apply to all profiles and all caches
            }

            this.emit('cacheConfigured', {
                name: name,
                cacheConfigName: cacheConfigName,
                config: cacheConfig
            });

            cache = this.caches[name] = raptorCache.createCache(cacheConfig);

            if (!cache.name) {
                cache.name = name;
            }
        }

        return cache;
    },

    configureCacheDefaults: function(profileName, cacheConfigName, defaults) {
        if (typeof profileName === 'object') {
            // The profileName argument is actually a profiles object
            var profiles = profileName;
            Object.keys(profiles).forEach(function(profileName) {
                var profile = profiles[profileName];
                Object.keys(profile).forEach(function(cacheConfigName) {
                    var cacheConfig = profile[cacheConfigName];
                    this.configureCacheDefaults(profileName, cacheConfigName, cacheConfig);
                }, this);
            }, this);

            return;
        }

        var targetProfile = this.cacheProfiles[profileName] || (this.cacheProfiles[profileName] = {});
        var targetCacheConfig = targetProfile[cacheConfigName] || (targetProfile[cacheConfigName] = {});
        Object.keys(defaults).forEach(function(k) {
            if (!targetCacheConfig.hasOwnProperty(k)) {
                targetCacheConfig[k] = defaults[k];
            }
        });

    }
};

inherit(CacheManager, EventEmitter);

module.exports = CacheManager;
