raptor-cache
============
This module provides a caching layer that supports asynchronous reading and writing and it prevents duplicate work from being done by allowing a "hold" to be put on a cache entry. A common pattern when utilizing a cache is to read from the cache and to then build the cached value if it was not found in the cache. By putting a hold on a cache entry while its value is being built asynchronously, this caching layer can ensure that a value for a particular key is only built once by the current process. This module solves the challenges of working with asynchronous cache stores and provides out-of-box support for an in-memory cache and a disk-based cache. It is possible to provide a custom cache store that connects to a centralized cache such as [Redis](http://redis.io/) or [memcached](http://memcached.org/).

# Installation

```bash
npm install raptor-cache --save
```

# Example

```javascript
var raptorCache = require('raptor-cache');
var cache = raptorCache.createCache({
    store: 'disk',
    timeToLive: 10000, // Permanently remove a cache entry after 10s (regardless of usage)
    timeToIdle: 7000, // Permanently remove a cache entry that has not been accessed for 7s
    freeDelay: 5000, // Free all memory after 5s of inactivity
    
    // Disk store specific config:
    dir: '.cache/my-cache',
    flushDelay: 1000, // Commit cached values to disk after 1s of no write activity
    encoding: 'utf8'
});

cache.get(
    'hello', // key
    function builder(callback) { // This function will be called if the value has not been cached
        setTimeout(function() {
            // Respond back with the value to put in the cache
            callback(null, 'world');
        }, 1000)
        
    },
    function callback(err, value) {
        // value === 'world'
    });

// Request a stream to read a value:
cache.getReadStream(
    'hello', // key
    function callback(err, stream) {
        stream.pipe(process.stdin); // pipes out 'world'

        // NOTE: Stream will be null if nothing was cached for key
    });
```

# Cache Stores

### Memory Store

Characteristics:

- Every cache key and value is kept in memory 

```javascript
var raptorCache = require('raptor-cache');
var cache = raptorCache.createMemoryCache({
    ...
});
```



### Disk Store (Combined File)

Characteristics:

- An in-memory representation of _all keys and all values_ is maintained at all times
- The in-memory cache is backed by a disk cache that is stored in a single file
- The cache file is read in its entirety the first time the cache is read or written to
- Whenever the in-memory cache is modified, a flush is scheduled. If a flush had already been scheduled then it is cancelled so that
    flushes can be batched up. Essentially, after a x delay of no activity the in-memory cache is flushed to disk
- Values cannot be null or undefined

NOTES:

- This cache store is not suitable for storing very large amounts of data since it is all kept in memory


Configuration options:

- flushDelay (int) - The amount of delay in ms after a modification to flush the updated cache to disk. -1 will disable autoamtic flushing. 0 will result in an immediate flush


```javascript
var raptorCache = require('raptor-cache');
var cache = raptorCache.createDiskCache({
    dir: 'some/directory',
    singleFile: true,
    flushDelay: 1000,
    ...
});
```

### Disk Store (Separate Files)

Characteristics:

- Each cached value is stored in its own file (as raw bytes)
- The cached values are not kept in memory (they can only be streamed from disk)
- An index is maintained to keep up with what is in the cache
- The entire index is kept in memory until the "free" delay is reached

Configuration options:

- flushDelay (int) - The amount of delay in ms after a modification to flush the updated cache to disk. -1 will disable autoamtic flushing. 0 will result in an immediate flush

```javascript
var raptorCache = require('raptor-cache');
var cache = raptorCache.createDiskCache({
    dir: 'some/directory',
    singleFile: false,
    flushDelay: 1000,
    ...
});
```

### Composite Store

Characteristics:

- One or more caches can be combined to produce a tiered cache
- Cache keys are looked up in order
- Cached values found in lower-tier caches are added to higher tiers
- New cache entries are added to all tiers
- Each individual cache can have its own settings

Configuration options:

- caches (Array) - An ordered array of caches

```javascript
var raptorCache = require('raptor-cache');
var cache = raptorCache.createCompositeCache({
    caches: [
        raptorCache.createMemoryCache(...),
        raptorCache.createDiskCache(...),
        ...
    ]
});
```
