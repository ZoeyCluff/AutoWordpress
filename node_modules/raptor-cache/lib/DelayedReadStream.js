var Readable = require('stream').Readable;
var inherit = require('raptor-util/inherit');

function DelayedReadStream(streamDataHolder) {
    DelayedReadStream.$super.call(this, {objectMode: true});

    var readCalled = false;
    var wrappedStream = null;
    var paused = false;
    var _this = this;

    this._read = function() {
        if (readCalled) {
            if (wrappedStream && paused) {
                wrappedStream.resume();
            }
        } else {
            readCalled = true;

            streamDataHolder.done(function(err, stream) {
                wrappedStream = stream;

                if (err) {
                    _this.emit('error', err);
                    _this.emit('end');
                    return;
                }

                wrappedStream
                    .on('end', function() {
                        _this.push(null);
                    })
                    .on('error', function(e) {
                        _this.emit('error', err);
                    })
                    .on('data', function(data) {
                        if (_this.push(data) === false) {
                            paused = true;
                            wrappedStream.pause();
                        }
                    });

                // Start the flow of data if it
                wrappedStream.resume();
            });
        }
    };

    this.toString = function() {
        return '[DelayedReadStream readCalled=' + readCalled + ', wrappedStream=' + wrappedStream + ']';
    };
}

inherit(DelayedReadStream, Readable);



module.exports = DelayedReadStream;
