var DustAsyncWriter = require('./DustAsyncWriter');

function invokeRenderer(renderFunc, dustChunk, dustContext, dustBodies, params, buildInput) {
    var attributes = dustContext.global;

    var dustAsyncWriter = new DustAsyncWriter(dustChunk, dustContext, attributes);

    // Keep a reference to the underlying stream that we are writing to (if available)
    if (attributes.stream) {
        dustAsyncWriter.stream = attributes.stream;
    }

    params = params || {};

    if (buildInput) {
        params = buildInput(dustChunk, dustContext, dustBodies, params, dustAsyncWriter);
    } else {
        for (var k in params) {
            if (params.hasOwnProperty(k)) {
                if (k === 'true') {
                    params[k] = true;
                }
                else if (k === 'false') {
                    params[k] = false;
                }
            }
        }
    }

    renderFunc(params, dustAsyncWriter);

    dustAsyncWriter.end();

    return dustAsyncWriter._dustChunk;
}

function dustHelperFromRenderer(renderer) {
    var renderFunc;
    var buildInput;

    if (typeof renderer === 'function') {
        renderFunc = renderer;
    } else {
        renderFunc = renderer.renderer || renderer.render || renderer.process;
        buildInput = renderer.buildInput;
    }

    if (typeof renderFunc !== 'function') {
        throw new Error('Invalid renderer: ' + renderer);
    }

    return function(chunk, context, bodies, params) {
        return invokeRenderer(renderFunc, chunk, context, bodies, params, buildInput);
    };
}

function registerHelper(name, renderer, dust) {
    if (!dust) {
        dust = require('dustjs-linkedin');
    }

    dust.helpers[name] = dustHelperFromRenderer(renderer);
}

function registerHelpers(tags, dust) {
    if (!dust) {
        dust = require('dustjs-linkedin');
    }

    for (var tagName in tags) {
        if (tags.hasOwnProperty(tagName)) {
            registerHelper(tagName, tags[tagName], dust);
        }
    }
}

exports.invokeRenderer = invokeRenderer;
exports.registerHelper = registerHelper;
exports.registerHelpers = registerHelpers;
