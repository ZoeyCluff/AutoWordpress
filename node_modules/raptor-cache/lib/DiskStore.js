var nodePath = require('path');
var logger = require('raptor-logging').logger(module);
var mkdirp = require('mkdirp');
var DataHolder = require('raptor-async/DataHolder');
var DEFAULT_FLUSH_DELAY = 1000;
var fs = require('fs');
var CacheEntry = require('./CacheEntry');
var ok = require('assert').ok;
var uuid = require('uuid');
var through = require('through');

var util = require('./util');

var CACHE_VERSION = 1;
var MODE_SINGLE_FILE = 1;
var MODE_MULTI_FILE = 2;

// for reading binary data
var dissolve = require('dissolve');

function STRING_DESERIALIZE(reader, callback) {
    var value = '';
    reader()
        .on('data', function(data) {
            value += data;
        })
        .on('end', function() {
            callback(null, value);
        })
        .on('error', function(err) {
            callback(err);
        });
}

function JSON_SERIALIZE(obj) {
    return JSON.stringify(obj);
}

function JSON_DESERIALIZE(reader, callback) {
    var json = '';

    reader()
        .on('data', function(data) {
            json += data;
        })
        .on('end', function() {
            callback(null, JSON.parse(json));
        })
        .on('error', function(err) {
            callback(err);
        });
}

function logPrefix(store) {
    return store.name || '(unnamed):';
}

function isObjectEmpty(o) {
    if (!o) {
        return true;
    }

    for (var k in o) {
        if (o.hasOwnProperty(k)) {
            return false;
        }
    }
    return true;
}

function getReaderFunc(store, cacheEntry) {
    var fullPath = nodePath.join(store.dir, cacheEntry.meta.file);

    function doCreateReadStream() {
        return fs.createReadStream(fullPath, {encoding: store.encoding});
    }

    var writeFileDataHolder = cacheEntry.data.writeFileDataHolder;

    if (writeFileDataHolder) {
        return function reader() {
            var streamDataHolder = new DataHolder();
            writeFileDataHolder.done(function(err) {
                if (err) {
                    return streamDataHolder.reject(err);
                }


                streamDataHolder.resolve(fs.createReadStream(fullPath, {encoding: store.encoding}));
            });
            return util.createDelayedReadStream(streamDataHolder);
        };

    } else {
        return doCreateReadStream;
    }
}

function readFromDisk(store, callback) {

    if (store.shouldReadFromDisk === false) {
        store.cache = {};
    }

    var debugEnabled = logger.isDebugEnabled();

    if (store.cache) {
        // If the cache has already been read from disk then just invoke
        // the callback immediately
        if (callback) {
            callback(null, store.cache);
        }
        return;
    }

    if (store.readDataHolder) {
        // If we have already started reading the initial cache from disk then
        // just piggy back off the existing read by attaching a listener to the
        // async data holder
        if (callback) {
            store.readDataHolder.done(callback);
        }

        return;
    }

    // Create a new async data holder to keep track of the fact that we have
    // started to read the cache file from disk
    var readDataHolder = store.readDataHolder = new DataHolder();

    if (callback) {
        // If a callback was provided then we need to attach the listener
        // to the async data holder for this read operation
        readDataHolder.done(callback);
    }

    // Create an empty cache object that we will populate with the cache entries
    var cache = {};

    // Keep a flag to avoid invoking reject or resolve multiple times
    var finished = false;

    function done(err) {
        if (finished) {
            return;
        }

        if (debugEnabled) {
            logger.debug(logPrefix(store), 'readFromDisk() - done.', err ? 'With error: ' + err : '(no errors)');
        }

        finished = true;

        store.readDataHolder = null;
        store.cache = cache;

        // While reaading from disk the cache may have been modified
        // using either "put" or "remove". These pending updates were
        // applied to a temporary cache that we need to now apply to the
        // cache loaded from disk
        var pendingCache = store.pendingCache;

        if (pendingCache) {
            for (var k in pendingCache) {
                if (pendingCache.hasOwnProperty(k)) {
                    var v = pendingCache[k];
                    if (v === undefined) { // A remove is handled by setting the value to undefined
                        // Use "remove" so that the flush will happen correctly
                        store.remove(k);
                    } else {
                        // Use "put" so that the flush will happen correctly
                        store.put(k, v);
                    }
                }
            }
            store.pendingCache = null;
        }

        // Make sure to resolve only after applying any writes that occurred before the read finished
        readDataHolder.resolve(cache);
    }

    if (debugEnabled) {
        logger.debug(logPrefix(store), 'readFromDisk() - reading: ', store.file);
    }

    var inStream = fs.createReadStream(store.file);

    var versionIncompatible = false;

    var parser = dissolve()

        // read the version
        .uint8('version')

        .tap(function() {
            var version = this.vars.version;
            if (version !== store.version) {
                logger.warn('Incompatible cache version. Skipping reading cache from disk.');
                versionIncompatible = true;
                inStream.unpipe(parser);
                done();
            }
        })

        // read the mode
        .uint8('mode')

        .tap(function() {
            store.mode = this.vars.mode;
        })

        .loop(function(end) {

            if (versionIncompatible) {
                return end();
            }

            var cacheEntry = null;

                // read the key length
            this.uint16le('keyLen')

                // handle the key length
                .tap(function() {
                    var keyLen = this.vars.keyLen;
                    if (debugEnabled) {
                        logger.debug(logPrefix(store), 'readFromDisk: keyLen: ', keyLen);
                    }
                    this.buffer('key', keyLen);
                })

                // handle the key
                .tap(function() {
                    var key = this.vars.key.toString('utf8');
                    cacheEntry = new CacheEntry({
                            key: key,
                            deserialize: store.deserialize,
                            encoding: store.encoding
                        });
                })

                // read the meta length
                .uint16le('metaLen')

                // read the meta
                .tap(function() {
                    var metaLen = this.vars.metaLen;
                    if (debugEnabled) {
                        logger.debug(logPrefix(store), 'readFromDisk: metaLen: ', metaLen);
                    }
                    if (metaLen > 0) {
                        this.buffer('meta', metaLen);
                    }
                })

                // handle the meta
                .tap(function() {
                    var metaBuffer = this.vars.meta;
                    if (metaBuffer) {
                        var metaJSON = metaBuffer.toString('utf8');
                        if (debugEnabled) {
                            logger.debug(logPrefix(store), 'meta for ', cacheEntry.key, ':', metaJSON);
                        }
                        cacheEntry.meta = JSON.parse(metaJSON);
                    }

                    if (!store.isCacheEntryValid || store.isCacheEntryValid(cacheEntry)) {
                        cache[cacheEntry.key] = cacheEntry;
                    }

                    // Even if we are skipping this entry we still need to read through the
                    // remaining bytes...
                    if (store.mode === MODE_SINGLE_FILE) {
                        // The value is stored in the same file...

                            // read the value length
                        this.uint32le('valueLen')

                            // read the value
                            .tap(function() {
                                var valueLen = this.vars.valueLen;
                                if (debugEnabled) {
                                    logger.debug(logPrefix(store), 'readFromDisk: valueLen: ', valueLen);
                                }
                                this.buffer('value', valueLen);
                            })

                            // handle the value
                            .tap(function() {
                                var value = this.vars.value;

                                if (store.encoding) {
                                    value = value.toString(store.encoding);
                                }

                                cacheEntry.value = value;
                            });
                    } else {
                        this.tap(function() {
                            cacheEntry.reader = getReaderFunc(store, cacheEntry);
                        });
                    }

                });
        });

    inStream.on('error', done);
    inStream.on('end', done); // <-- This is the one that will trigger done() if everything goes through successfully
    parser.on('error', done);

    inStream.pipe(parser);
}

function scheduleFlush(store) {
    if (store.flushDelay < 0) {
        // no automatic flushing
        return;
    } else if (store.flushDelay === 0) {
        // don't wait to flush
        store.flush();
        return;
    }

    // since flushing was deferred due to a reschedule, don't allow flush
    // to occur immediately after any pending flush (if one exists)
    store.flushAfterComplete = false;

    if (store.flushTimeoutID) {
        clearTimeout(store.flushTimeoutID);
        store.flushTimeoutID = null;
    }

    store.flushTimeoutID = setTimeout(function() {
        store.flushTimeoutID = null;
        store.flush();
    }, store.flushDelay);
}

function getUniqueFile() {
    var id = uuid.v4();
    var l1 = id.substring(0, 2);
    var l2 = id.substring(2);
    return l1 + '/' + l2.replace(/-/g, '');
}

function writeCacheValueToSeparateFile(store, cacheEntry) {

    if (cacheEntry.meta.file || cacheEntry.data.writeFileDataHolder) {
        // The cache entry has already been written to disk or it is in the process
        // of being written to disk... nothing to do
        return;
    }

    logger.debug(logPrefix(store), 'writeCacheValueToSeparateFile() - key: ', cacheEntry.key);
    var key = cacheEntry.key;
    var encoding = store.encoding;

    var writeFileDataHolder = cacheEntry.data.writeFileDataHolder = new DataHolder();
    var relPath = getUniqueFile();
    cacheEntry.meta.file = relPath;

    var originalReader = cacheEntry.reader;

    var value = cacheEntry.value;

    var fullPath = nodePath.join(store.dir, relPath);
    var parentDir = nodePath.dirname(fullPath);

    function done(err) {
        if (err) {
            writeFileDataHolder.reject(err);
        } else {
            // Remove the value from the cache entry since we are flushing it to disk
            // and do not want to keep it in memory
            delete cacheEntry.value;
            cacheEntry.deserialized = false;

            cacheEntry.reader = getReaderFunc(store, cacheEntry); // Replace the original reader with a new reader... one that will read from the separate file that will write to

            writeFileDataHolder.resolve(relPath);
        }

        delete cacheEntry.data.writeFileDataHolder;
    }

    mkdirp(parentDir, function(err) {
        if (err) {
            return done(err);
        }

        if (value !== undefined) {
            if (typeof value !== 'string' && !(value instanceof Buffer)) {
                var serialize = store.serialize;

                if (!serialize) {
                    throw new Error('Serializer is required for non-String/Buffer values');
                }

                value = serialize(value);
            }

            if (typeof value === 'string') {
                value = new Buffer(value, encoding);
            }

            fs.writeFile(fullPath, value, done);

        } else if (originalReader) {
            var inStream = originalReader();
            if (!inStream || typeof inStream.pipe !== 'function') {
                throw new Error('Cache reader for key "' + key + '" did not return a stream');
            }

            var outStream = fs.createWriteStream(fullPath, {encoding: encoding});
            outStream.on('close', done);
            inStream.pipe(outStream);
        } else {
            throw new Error('Illegal state');
        }
    });
}

function removeExternalCacheFile(cacheEntry) {
    if (cacheEntry.writeFileDataHolder) {
        cacheEntry.writeFileDataHolder.done(function(err, file) {
            if (err) {
                return;
            }
            delete cacheEntry.meta.file;
            fs.unlink(file, function() {});
        });
    } else if (cacheEntry.meta.file) {
        fs.unlink(cacheEntry.meta.file, function() {});
        delete cacheEntry.meta.file;
    } else {
        throw new Error('Illegal state');
    }
}

/**
 * This cache store has the following characteristics:
 * - An in-memory representation is maintained at all times
 * - The in-memory cache is backed by a disk cache that is stored in a single file
 * - The cache file is read in its entirety the first time the cache is read or written to
 * - Whenever the in-memory cache is modified, a flush is scheduled. If a flush had already been scheduled then it is cancelled so that
 *     flushes can be batched up. Essentially, after a x delay of no activity the in-memory cache is flushed to disk
 * - Values put into the cache must be an instance of Buffer
 * - Values cannot be null or undefined
 *
 * NOTES:
 * - This cache store is not suitable for storing very large amounts of data since it is all kept in memory
 *
 * Configuration options:
 * - flushDelay (int) - The amount of delay in ms after a modification to flush the updated cache to disk. -1 will disable autoamtic flushing. 0 will result in an immediate flush
 *
 * @param {Object} config Configuration options for this cache (see above)
 */
function DiskStore(config) {
    if (!config) {
        config = {};
    }

    var dir = config.dir;

    if (dir) {
        dir = nodePath.resolve(process.cwd(), dir);
    } else {
        dir = nodePath.join(process.cwd(), '.cache');
    }

    this.name = config.name;
    this.flushDelay = config.flushDelay || DEFAULT_FLUSH_DELAY;
    this.dir = dir;

    this.mode = config.singleFile === false ? MODE_MULTI_FILE : MODE_SINGLE_FILE;
    this.encoding = config.encoding;
    this.serialize = config.serialize;
    this.deserialize = config.deserialize;

    if (config.valueType === 'string') {
        if (!this.encoding) {
            this.encoding = 'utf8';
        }

        if (!this.deserialize) {
            this.deserialize = STRING_DESERIALIZE;
        }
    } else if (config.valueType === 'json') {
        if (!this.encoding) {
            this.encoding = 'utf8';
        }

        if (!this.deserialize) {
            this.deserialize = JSON_DESERIALIZE;
        }

        if (!this.serialize) {
            this.serialize = JSON_SERIALIZE;
        }
    }

    this.version = CACHE_VERSION;
    this.file = nodePath.join(dir, 'cache');

    this._reset();

    this.isCacheEntryValid = null;

    mkdirp.sync(nodePath.dirname(this.file));

    this.shouldReadFromDisk = config.readFromDisk !== false;

    if (this.shouldReadFromDisk === false) {
        // If the cache is configured to not be read from disk then populate the cache with an empty
        // object to prevent it being from read from disk
        this.cache = {};
    }

    logger.info(logPrefix(this), 'Created DiskStore cache at ' + dir);
}

DiskStore.prototype = {
    _reset: function() {
        this.readDataHolder = null;
        this.cache = null;
        this.flushTimeoutID = null;
        this.pendingCache = null;
        this.flushingDataHolder = null;
        this.flushAfterComplete = false;
        this.modified = false;
    },

    free: function() {
        var _this = this;

        // Don't reset things in the middle of a pending read or flush...
        if (this.readDataHolder) {
            this.readDataHolder.done(function() {
                _this._reset();
            });
        } else if (this.flushingDataHolder) {
            this.flushingDataHolder.done(function() {
                _this._reset();
            });
        } else {
            this._reset();
        }
    },

    get: function(key, callback) {
        if (this.pendingCache && this.pendingCache.hasOwnProperty(key)) {
            if (logger.isDebugEnabled()) {
                logger.debug(logPrefix(this), 'Found cache entry for key "' + key + '" in pendingCache');
            }
            return callback(null, this.pendingCache[key]);
        }

        if (this.cache) {
            // cache has been read from disk
            callback(null, this.cache[key]);
        } else {
            // wait for read from disk to finish
            readFromDisk(this, function(err, cache) {
                if (err) {
                    return callback(err);
                }

                callback(null, cache[key]);
            });
        }
    },

    put: function(key, cacheEntry) {
        ok(typeof key === 'string', 'key should be a string');
        ok(cacheEntry, 'cacheEntry is required');

        if (cacheEntry.constructor !== CacheEntry) {
            var value = cacheEntry;
            cacheEntry = new CacheEntry({
                key: key,
                value: value
            });
        } else {
            cacheEntry.key = key;
        }

        if (this.deserialize) {
            cacheEntry.deserialize = this.deserialize;
        }

        if (this.mode === MODE_MULTI_FILE) {
            writeCacheValueToSeparateFile(this, cacheEntry);
        }

        if (this.cache) {
            if (logger.isDebugEnabled()) {
                logger.debug(logPrefix(this), 'Value put into cache with key: ' + key);
            }

            this.cache[key] = cacheEntry;
            this.modified = true;
            scheduleFlush(this);
        } else {
            if (!this.pendingCache) {
                this.pendingCache = {};
            }

            if (logger.isDebugEnabled()) {
                logger.debug(logPrefix(this), 'Value put into pendingCache with key: ' + key);
            }

            this.pendingCache[key] = cacheEntry;

            // Start reading from disk (it not started already) so that
            // we can update the cache and apply the "puts" and then flush
            // the cache back to disk
            readFromDisk(this);
        }
    },

    remove: function(key) {
        if (this.cache) {
            if (this.mode === MODE_MULTI_FILE) {
                var cacheEntry = this.cache[key];
                if (cacheEntry) {
                    removeExternalCacheFile(cacheEntry);
                }
            }

            delete this.cache[key];
            this.modified = true;
            scheduleFlush(this);
        } else {
            if (!this.pendingCache) {
                this.pendingCache = {};
            }

            this.pendingCache[key] = undefined;

            // Start reading from disk (it not started already) so that
            // we can update the cache and apply the updates and then flush
            // the cache back to disk
            readFromDisk(this);
        }
    },

    flush: function(callback) {
        var debugEnabled = logger.isDebugEnabled();
        var _this = this;

        if (!this.cache) {
            if (!this.readDataHolder) {
                // If there is no read in progress then there is nothing to do
                return callback ? callback() : undefined;
            }

            readFromDisk(this, function(err) {
                if (err) {
                    if (callback) {
                        callback(err);
                    }
                    return;
                }

                _this.flush(callback);
            });
            return;
        }

        if (this.flushTimeoutID) {
            clearTimeout(this.flushTimeoutID);
            this.flushTimeoutID = null;
        }

        if (this.modified === false) {
            // No changes to flush...
            if (callback) {
                if (this.flushingDataHolder) {
                    // If there is a flush in progress then attach a
                    // listener to the current async data holder
                    this.flushingDataHolder.done(callback);
                }  else {
                    // Otherwise, no flush is happening and nothing to
                    // do so invoke callback immediately
                    callback();
                }
            }

            return;
        }

        if (debugEnabled) {
            logger.debug(logPrefix(this), 'flush() cache keys: ', Object.keys(this.cache));
        }

        if (this.flushingDataHolder) {
            // a flush is already in progress but set flag that we have been asked to
            // flush so that flushing can begin again immediately after the current flush completes
            this.flushAfterComplete = true;

            if (callback) {
                // If a callback was provided then attach a listener to the async flushing data holder
                this.flushingDataHolder.done(callback);
            }
        } else {
            this.flushingDataHolder = new DataHolder();

            if (callback) {
                // If a callback was provided then attach a listener to the async flushing data holder
                this.flushingDataHolder.done(callback);
            }

            this._doFlush();
        }
    },

    _doFlush: function() {
        var _this = this;
        var debugEnabled = logger.isDebugEnabled();

        this.flushAfterComplete = false;
        this.modified = false;

        var encoding = this.encoding;

        var finished = false;

        var cache = this.cache;

        // Now let's start actually writing the cache to disk...

        var tempFile = nodePath.join(this.dir, 'tmp' + uuid.v1());
        var file = this.file;

        var ended = false;


        var out = fs.createWriteStream(tempFile);

        function end() {
            if (ended) {
                return;
            }
            ended = true;
            out.end();
        }

        function done(err) {
            if (debugEnabled) {
                logger.debug(logPrefix(_this), 'Cache flush() - done.', err ? 'Error: ' + err : '');
            }

            if (finished) {
                return;
            }

            finished = true;

            end();

            if (err) {
                try {
                    // flush didn't work so remove the temp file
                    fs.unlinkSync(tempFile);
                } catch(e) {
                    // ignore
                }
            }

            if (_this.modified) {
                // modification occurred while flushing was happening
                if (_this.flushAfterComplete) {
                    // while flushing was happening we were asked for an immediate flush
                    // but we deferred it due to the flush that was already in progress
                    // so let's go ahead and immediately do another flush
                    _this._doFlush();
                    return;
                }
            }

            // no modifications happened during flush

            // reset the flag to flush after complete
            _this.flushAfterComplete = false;

            if (err) {
                // if err occurred then let any callbacks know (not much we can do)
                _this.flushingDataHolder.reject(err);
            } else {
                // let callbacks know that flush finished successfully
                _this.flushingDataHolder.resolve();
            }

            // since flush completed and we notified all of the listeners, clear the data holder
            _this.flushingDataHolder = null;
        }

        out.on('close', function() { // The flush is completed when the file is closed
            if (debugEnabled) {
                logger.debug(logPrefix(_this), 'Cache flush completed to file ' + tempFile);
            }

            // Delete the existing file if it exists
            fs.unlink(file, function() {
                fs.rename(tempFile, file, function(err) {
                    if (err) {
                        return done(err);
                    }

                    logger.debug(logPrefix(_this), 'Cache renamed temp file to ' + file);

                    // Keep track that there is no longer a flush in progress
                    done();
                });
            });
        });

        out.on('error', done);

        // Save copy of the keys that we are going to write
        var keys = Object.keys(cache);
        // Number of keys that we are going to write
        var numKeys = keys.length;
        var i = 0;
        var readyForNext = true;
        var bufferAvailable = true;
        var serialize = this.serialize;

        function writeUInt8(value) {
            var buffer = new Buffer(1);
            buffer.writeUInt8(value, 0);
            bufferAvailable = out.write(buffer);
        }

        function writeBufferShort(buffer) {
            var len = buffer ? buffer.length : 0;
            var lenBuffer = new Buffer(2);
            lenBuffer.writeUInt16LE(len, 0);

            bufferAvailable = out.write(lenBuffer); // Write the length of the key as a 32bit unsigned integer (little endian)
            if (buffer) {
                bufferAvailable = out.write(buffer);
            }
        }

        function writeBufferLong(buffer) {
            var lenBuffer = new Buffer(4);
            lenBuffer.writeUInt32LE(buffer ? buffer.length : 0, 0);

            out.write(lenBuffer); // Write the length of the key as a 32bit unsigned integer (little endian)

            if (buffer != null) {
                bufferAvailable = out.write(buffer);
            }
        }

        function writeInlineValue(key, cacheEntry) {
            var value = cacheEntry.value;

            if (value !== undefined) {

                if (typeof value !== 'string' && !(value instanceof Buffer)) {
                    // convert non-String/non-Buffer to something that is a String or Buffer
                    if (!serialize) {
                        throw new Error('Error writing value for cache. Serializer is required for non-String/Buffer values. Cannot write ' + key + ' with value of type ' + (typeof value));
                    }

                    value = serialize(value);
                }

                // it's possible that serialize function (if called) returned a String
                if (typeof value === 'string') {
                    // convert String to Buffer
                    value = new Buffer(value, encoding || 'utf8');
                }

                if (debugEnabled) {
                    logger.debug(logPrefix(_this), 'writeInlineValue: valueLen: ', value ? value.length : undefined);
                }
                writeBufferLong(value);
            } else if (cacheEntry.reader) {
                readyForNext = false;

                var inStream = cacheEntry.reader();
                if (!inStream || typeof inStream.pipe !== 'function') {
                    throw new Error('Cache reader for key "' + key + '" did not return a stream');
                }

                var buffers = [];
                var totalLength = 0;

                inStream.on('error', done);

                inStream.pipe(through(function write(data) {
                        if (typeof data === 'string') {
                            data = new Buffer(data, encoding || 'utf8');
                        }
                        buffers.push(data); //data *must* not be null
                        totalLength += data.length;
                    },
                    function end () { //optional
                        var valueBuffer = Buffer.concat(buffers, totalLength);
                        if (debugEnabled) {
                            logger.debug(logPrefix(_this), 'writeInlineValue: valueLen: ', valueBuffer.length);
                        }
                        writeBufferLong(valueBuffer);
                        readyForNext = true;
                        continueWriting();
                    }));

            } else {
                writeBufferLong(0);
            }
        }

        function writeExternalValue(key, cacheEntry) {

            if (cacheEntry.data.writeFileDataHolder) {
                if (debugEnabled) {
                    logger.debug(logPrefix(_this), 'writeExternalValue() - waiting for: ', key);
                }
                readyForNext = false;
                // We are waiting for this entries value to be flushed to a separate file...
                cacheEntry.data.writeFileDataHolder.done(function(err, file) {
                    if (debugEnabled) {
                        logger.debug(logPrefix(_this), 'writeExternalValue() - done waiting for: ', key);
                    }

                    if (err) {
                        return done(err);
                    }

                    readyForNext = true;
                    continueWriting();
                });
            }
        }

        // WRITE VERSION (unsigned 8-bit integer)
        writeUInt8(this.version);

        // WRITE MODE (MODE_SINGLE_FILE or MODE_MULTI_FILE, unsigned 8-bit integer)
        writeUInt8(this.mode);

        // variable to keep track of actual number written (since we might skip records that are removed while writing)
        var numWritten = 0;

        // This method is used to asynchronously write out cache entries to disk
        // NOTE: We did not make a copy of the cache so it is possible that some of the keys
        //       may no longer exist as we are flushing to disk, but that is okay since
        //       there is code to check if the key still exists in the cache
        function continueWriting() {
            if (debugEnabled) {
                logger.debug(logPrefix(_this), 'continueWriting(), i:', i, numKeys, 'bufferAvailable:', bufferAvailable, 'readyForNext:', readyForNext);
            }

            if (i === numKeys && readyForNext) {
                end();
                return;
            }

            // We'll be nice and keep writing to disk until the output file stream tells us that
            // it has no more buffer available. When that happens we wait for the drain event
            // to be fired before continuing writing where we left off.
            // NOTE: It is not mandatory to stop writing to the output stream when its buffer fills up (the bytes will be buffered by Node.js)
            while (i < numKeys && bufferAvailable && readyForNext) {
                var key = keys[i];

                if (debugEnabled) {
                    logger.debug(logPrefix(_this), 'Writing #' + (numWritten + 1) + ', ' + (i+1) + ' of ' + numKeys, ', key: ', key);
                }

                // go ahead and increment index so that we don't try to write this key again
                i++;

                if (!cache.hasOwnProperty(key)) {
                    // A cache entry may have been removed while flushing
                    continue;
                }

                var cacheEntry = cache[key];

                writeBufferShort(new Buffer(key, 'utf8'));

                var meta = cacheEntry.meta;

                if (!isObjectEmpty(meta)) {
                    var metaJson = JSON.stringify(meta);
                    var metaBuffer = new Buffer(JSON.stringify(meta, 'utf8'));

                    if (debugEnabled) {
                        logger.debug(logPrefix(_this), 'Meta (length: ' + metaBuffer.length + '): ' + metaJson);
                    }
                    writeBufferShort(metaBuffer);
                } else {
                    writeBufferShort(0);
                }

                if (_this.mode === MODE_SINGLE_FILE) {
                    writeInlineValue(key, cacheEntry);
                } else {
                    writeExternalValue(key, cacheEntry);
                }

                numWritten++;
            }

            if (i === numKeys && readyForNext) {
                end();
            }
        }

        out.on('drain', function() {
            bufferAvailable = true;

            if (i < numKeys && readyForNext) {
                continueWriting();
            }
        });

        // kick off writing entries (stop writing when we run out of buffers and resume when drained)
        continueWriting();
    }
};

module.exports = DiskStore;
