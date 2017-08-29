'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;
var nodePath = require('path');
var fs = require('fs');
var logger = require('raptor-logging').logger(module);

function findUrls(path) {
    try
    {
        var code = fs.readFileSync(nodePath.join(__dirname, path), {encoding: 'utf8'});
        var cssParser = require('../');
        var urls = {};
        cssParser.findUrls(code, function(url, index, endIndex) {
            urls[url] = [index, endIndex];
        });
        return urls;
    }

    catch(e) {
        logger.error(e);
        throw e;
    }
}

function replaceUrls(path, replacerFunc, callback) {
    try {
        var code = fs.readFileSync(nodePath.join(__dirname, path), {encoding: 'utf8'});
        var cssParser = require('../');
        return cssParser.replaceUrls(code, replacerFunc, callback);
    }
    catch(e) {
        logger.error(e);
        throw e;
    }
}

describe('raptor-css-parser' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache.hasOwnProperty(k)) {
                delete require.cache[k];
            }
        }

        done();
    });

    it('should handle replacements for a simple CSS file', function(done) {
        replaceUrls(
            'fixtures/simple.css',
            function(url, matchStart, matchEnd, callback) {
                callback(null, url.toUpperCase());
            },
            function(err, code) {
                expect(code).to.equal(".test { background-image: url('IMAGE1.PNG'); }\n.test2 { background-image: url('IMAGE2.PNG'); }");
                done();
            });
    });

    it('should encode special chars', function(done) {
        replaceUrls(
            'fixtures/special-chars.css',
            function(url, matchStart, matchEnd, callback) {
                callback(null, 'data:image/svg+xml;utf8,(hello\nworld)');
            },
            function(err, code) {
                expect(code).to.equal(".test { background-image: url('data:image/svg+xml;utf8,(hello%0Aworld)'); }");
                done();
            });
    });

    it('should handle replacements for a simple CSS file', function(done) {
        replaceUrls(
            'fixtures/simple.css',
            function(url, matchStart, matchEnd, callback) {
                callback(null, url.toUpperCase());
            },
            function(err, code) {
                expect(code).to.equal(".test { background-image: url('IMAGE1.PNG'); }\n.test2 { background-image: url('IMAGE2.PNG'); }");
                done();
            });
    });

    it('should handle generic CSS file', function() {
        var urls = findUrls('fixtures/style.css');
        expect(Object.keys(urls).length).to.equal(3);
        expect(urls['d.png']).to.not.equal(null);
        expect(urls['throbber.gif']).to.not.equal(null);
        expect(urls['d.gif']).to.not.equal(null);
    });

    it('should handle data: URIs', function() {
        var urls = Object.keys(findUrls('fixtures/data-uri.css'));
        expect(urls.length).to.equal(0);
    });
});

