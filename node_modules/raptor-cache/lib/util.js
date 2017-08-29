var DelayedReadStream = require('./DelayedReadStream');

exports.createDelayedReadStream = function(streamProvider) {
    return new DelayedReadStream(streamProvider);
};
