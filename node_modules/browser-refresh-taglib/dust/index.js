var raptorDust = require('raptor-dust');

exports.registerHelpers = function(dust) {
    raptorDust.registerHelpers({
        'browser-refresh': require('../refresh-tag')
    }, dust);
};