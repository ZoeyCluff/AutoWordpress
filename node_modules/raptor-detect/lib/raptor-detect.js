function detect(detector) {
    var info = detector.cached;
    if (!info) {
        info = {};
        var output = detector.func(info);
        if (output !== undefined) {
            info = output;
        }
        detector.cached = info;
    }

    return info;
}

function invokeHandlers(info, handlers) {
    if (!handlers) {
        return;
    }

    if (typeof handlers === 'function') {
        handlers(info);
    }

    for (var k in handlers) {
        if (handlers.hasOwnProperty(k) && info[k]) {
            handlers[k](info[k]);
        }
    }
}

function create(detectorFunc) {
    var detector = {
        func: detectorFunc,
        cached: null
    };

    return function(handlers) {
        var info = detect(detector);
        invokeHandlers(info, handlers);
        return info;
    };
}

exports.create = create;
