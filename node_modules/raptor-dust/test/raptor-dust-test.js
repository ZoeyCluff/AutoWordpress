'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var fs = require('fs');

var dust = require('dustjs-linkedin');

dust.onLoad = function(path, callback) {
    if (!fs.existsSync(path)) {
        if (!path.endsWith('.dust')) {
            path += '.dust';
        }
    }

    fs.readFile(path, 'utf-8', callback);
};

var raptorDust = require('../');
raptorDust.registerHelper('app-hello', require('./components/app-hello/renderer'));

raptorDust.registerHelper('async-test', function(input, out) {
    var asyncOut = out.beginAsync();

    setTimeout(function () {
        asyncOut.write('Hello Async');
        asyncOut.end();
    }, 200);
});

describe('raptor-dust' , function() {

    beforeEach(function(done) {
        // for (var k in require.cache) {
        //     if (require.cache.hasOwnProperty(k)) {
        //         delete require.cache[k];
        //     }
        // }

        done();
    });

    it('should allow a simple custom tag to be rendered', function(done) {
        dust.render(require.resolve('./pages/app-tags.dust'), {}, function(err, output) {
            if (err) {
                return done(err);
            }

            expect(output).to.equal('app-hello: Hello Frank');
            done();
        });
    });

    it('should allow a simple async tag to be rendered', function(done) {
        dust.render(require.resolve('./pages/async-test.dust'), {}, function(err, output) {
            if (err) {
                return done(err);
            }

            expect(output).to.equal('Hello Async');
            done();
        });
    });

    it('should allow dust.stream() to be used with an existing async writer', function(done) {
        var out = require('async-writer').create();
        var asyncOut = out.beginAsync();
        var output = '';
        out.on('finish', function() {
            expect(output).to.equal('Hello Async');
            done();
        });

        var templatePath = require.resolve('./pages/async-test.dust');
        var templateData = {};
        var attributes = out.attributes;
        var base = attributes.dustBase;

        if (!base) {
            // Make sure all Dust context objects use the "attributes"
            // as their global so that attributes are carried across
            // rendering calls
            attributes.stream = out.stream;
            base = attributes.dustBase = dust.makeBase(attributes);
        }

        if (out.dustContext) {
            base = out.dustContext.push(base);
        }

        templateData = base.push(templateData);
        templateData.templateName = templatePath;

        dust.stream(templatePath, templateData)
            .on('data', function(data) {
                output += data;
            })
            .on('end', function() {
                asyncOut.end();
            });

        out.end();
    });

});