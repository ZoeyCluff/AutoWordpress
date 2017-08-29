'use strict';
var chai = require('chai');
chai.Assertion.includeStack = true;
require('chai').should();
var expect = require('chai').expect;

function createMockAppender() {
    var logEvents = [];
    return {
        log: function(logEvent) {
            logEvents.push(logEvent);
        },
        logEvents: logEvents,
        check: function(expectedLogEvents) {
            expect(logEvents.length).to.equal(expectedLogEvents.length);
            for (var i=0, len=logEvents.length; i<len; i++) {
                var actual = logEvents[i];
                var expected = expectedLogEvents[i];

                expect(expected.level).to.equal(actual.logLevel.name);
                expect(expected.args.length).to.equal(actual.args.length);
                for (var j=0, len2=actual.args.length; j<len2; j++) {
                    expect(expected.args[j]).to.deep.equal(actual.args[j]);
                }
            }
        }
    };
}

describe('raptor-logging' , function() {

    beforeEach(function(done) {
        for (var k in require.cache) {
            if (require.cache[k]) {
                delete require.cache[k];
            }
        }
        done();
    });

    it('should allow loggers and appenders to be configured', function() {
        var logging = require('../');

        var appender = createMockAppender();

        logging.configure({
            appenders: [
                appender
            ],
            loggers: {
                'foo': 'WARN',
                'bar': 'DEBUG'
            }
        });

        var fooLogger = logging.logger('foo');
        fooLogger.error('foo1');
        fooLogger.debug('foo2');

        var barLogger = logging.logger('bar');
        barLogger.error('bar1');
        barLogger.debug('bar2');

        appender.check([
            {level: 'ERROR', args: ['foo1']},
            {level: 'ERROR', args: ['bar1']},
            {level: 'DEBUG', args: ['bar2']}
        ]);
    });

    it('should allow loggers to be created from modules', function() {
        var logging = require('../');

        var appender = createMockAppender();

        logging.configure({
            appenders: [
                appender
            ],
            loggers: {
                'foo': 'WARN',
                'bar': 'DEBUG'
            }
        });

        var loggingTestsLogger = logging.logger(module);
        expect(loggingTestsLogger._loggerName).to.equal('raptor-logging/test/logging-tests');
    });

    it('should allow logging to be created using module id', function() {
        var logging = require('../');

        logging.configure({
            loggers: {
                'foo': 'WARN',
                'bar': 'DEBUG'
            }
        });

        var mockModule = {
            id: '/path/to/module'
        };

        var fooLogger = logging.logger(mockModule);
        expect(fooLogger._loggerName).to.equal('/path/to/module');
    });

    it('should throw error if module passed to logger does not have id or filename properties', function() {
        var logging = require('../');

        logging.configure({
            loggers: {
                'foo': 'WARN',
                'bar': 'DEBUG'
            }
        });

        var mockModule = {};

        expect(function() {
            logging.logger(mockModule);
        }).to.throw('Invalid logger object. It must contain either a `filename` or `id` property.');
    });
});
