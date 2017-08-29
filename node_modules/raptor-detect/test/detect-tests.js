'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

require('../'); // Load this module just to make sure it works

describe('raptor-env/detect' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should allow an object argument for detect', function() {
        var runtimeDetect = require('../runtime');
        var isNode = false;
        var isV8 = false;
        var isRhino = false;

        runtimeDetect.detect({
            node: function() {
                isNode = true;
            },
            v8: function() {
                isV8 = true;
            },
            rhino: function() {
                isRhino = true;
            }
        });

        expect(isNode).to.equal(true);
        expect(isV8).to.equal(true);
        expect(isRhino).to.equal(false);
    });

    it('should allow an function argument for detect', function() {
        var runtimeDetect = require('../runtime');
        runtimeDetect.detect(function(env) {
            expect(env.node.version).to.be.a('string');
            expect(env.v8.version).to.be.a('string');
            expect(env.rhino).to.equal(undefined);
        });
    });
});

