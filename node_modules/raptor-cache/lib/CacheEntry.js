var through = require('through');
var Readable = require('stream').Readable;

function createReadableFromValue(value, encoding) {
    var readableStream  = new Readable({objectMode: true});
    readableStream.push(value);
    readableStream.push(null);

    return readableStream;
}

function CacheEntry(config) {
    if (!config) {
        config = {};
    }

    this.key = config.key;
    this.value = config.value;
    this.valueHolder = config.valueHolder;
    this.reader = config.reader;
    this.meta = {}; // Metadata that should be persisted with the cache entry
    this.data = {}; // A container for extra data that can be attached to (not written to disk)
    this.deserialize = config.deserialize;

    // if CacheEntry is constructed with a value then we assume that it has already been deserialized
    this.deserialized = (config.value !== undefined);
    this.encoding = config.encoding;
}

var proto = CacheEntry.prototype;

proto.createReadStream = function() {
    if (this.deserialize) {
        throw new Error('A read stream cannot be created for cache entries with a deserialize');
    }

    var value = this.value;
    if (value !== undefined) {
        return createReadableFromValue(value, this.encoding);
    } else if (this.reader) {
        return this.reader();
    } else {
        var Readable = require('stream').Readable;
        var inStream = new Readable();
        inStream.push(null);
        return inStream;
    }
};

proto.readValue = function(callback) {
    var value = this.value;
    if (this.deserialized === true) {
        // value has already been serialized
        return callback(null, value);
    }


    var reader;

    if (value === undefined) {
        reader = this.reader;
        if (reader === undefined) {
            throw new Error('Cannot read from CacheEntry with no value or reader');
        }
    } else {
        reader = function() {
            return createReadableFromValue(value, this.encoding);
        };
    }

    var _this = this;

    if (this.deserialize) {
        this.deserialize(reader, function(err, value) {
            if (err) {
                return callback(err);
            }

            _this.value = value;
            _this.deserialized = true;
            callback(null, value);
        });
    }
};

proto.readRaw = function(callback) {
    if (this.value) {
        return callback(null, this.value);
    }

    var result = [];
    var totalLength = 0;

    var inStream = this.createReadStream();
    inStream.pipe(through(
        function data(d) {
            totalLength += d.length;
            result.push(d);
        },
        function end() {
            if (result.length) {
                if (typeof result[0] === 'string') {
                    callback(null, result.join(''));
                } else {
                    var valueBuffer = Buffer.concat(result, totalLength);
                    callback(null, valueBuffer);
                }
            } else {
                callback();
            }
        }));
};

module.exports = CacheEntry;
