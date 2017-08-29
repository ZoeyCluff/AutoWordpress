var tokenizerRegExp = /url\(\s*"([^"]*)"\s*\)|url\(\s*'([^']*)'\s*\)|url\(([^\)]*)\)|\/\*|\*\/|\/\/|\n|\r|\\\\|\\"|"/g;
var nodePath = require('path');
var parallel = require('raptor-async/parallel');

function encodeSpecialURLChar(c) {
    if (c === "'") {
        return '%27';
    } else {
        return encodeURI(c);
    }
}

function Part(parsedLess, type, text, start, end) {
    this.parsedLess = parsedLess;
    this.type = type;
    this.text = text;
    this.start = start;
    this.end = end;
    this.replacement = null;
}

Part.prototype = {
    replaceWith: function(value) {
        this.replacement = value;
    },

    isUrl: function() {
        return this.type === 'url';
    },

    getUrl: function() {
        return this.text;
    }
};

function ParsedCSS(originalCode, path) {
    this.originalCode = originalCode;
    this.path = path;
    this.dirname = path ? nodePath.dirname(path) : undefined;
    this.parts = [];
}

ParsedCSS.prototype = {
    _addPart: function(type, text, start, end) {
        this.pendingCount++;
        this.parts.push(new Part(this, type, text, start, end));
    },

    getParts: function() {
        return this.parts;
    },

    getPath: function() {
        return this.path;
    },

    getCode: function() {
        var code = this.originalCode;

        for (var i = this.parts.length-1; i>=0; i--) {
            var part = this.parts[i];

            var start = part.start;
            var end = part.end;
            var replacement = part.replacement;

            if (replacement != null) {
                code = code.substring(0, start) + replacement + code.substring(end);
            }
        }

        return code;
    }
};

function parse(code, path) {
    var parsed = new ParsedCSS(code, path);

    var matches;
    var inMultiLineComment = false;
    var inSingleLineComment = false;
    var inString = false;

    while((matches = tokenizerRegExp.exec(code)) != null) {
        var url;
        var match = matches[0];

        if (inSingleLineComment) {
            if (match === '\n' || match === '\r') {
                inSingleLineComment = false;
            }
        } else if (inMultiLineComment) {
            if (match === '*/') {
                inMultiLineComment = false;
            }
        } else if (inString) {
            if (match === '"') {
                inString = false;
            }
        } else if (match === '\\*') {
            inMultiLineComment = true;
        } else if (match === '//') {
            inSingleLineComment = true;
        }  else if (match === '"') {
            inString = true;
        } else if ((url = (matches[1] || matches[2] || matches[3]))) {
            parsed._addPart(
                'url',
                url.trim(),
                matches.index + match.indexOf('(')+1,
                matches.index + match.lastIndexOf(')'));
        }
    }

    return parsed;
}

module.exports = {
    parse: parse,

    findUrls: function(code, callback) {
        var parsed = parse(code);
        var parts = parsed.getParts();

        for (var i=0, len=parts.length; i<len; i++) {
            var part = parts[i];
            if (part.isUrl()) {
                var url = part.getUrl();
                if (url.indexOf('data:') !== 0) {
                    callback(url.trim(),
                        part.start,
                        part.end);
                }
            }
        }
    },

    replaceUrls: function(code, replacerFn, callback) {
        var parsed = parse(code);
        var parts = parsed.getParts();

        var work = [];

        function createJob(part) {
            return function(callback) {
                replacerFn(part.getUrl(), part.start, part.end, function(err, url) {
                    if (err) {
                        return callback(err);
                    }

                    if (url) {

                        url = "'" + url.replace(/['%]|\n|\r/g, encodeSpecialURLChar) + "'";

                        part.replaceWith(url);
                    }

                    callback();
                });

            };
        }

        for (var i=0, len=parts.length; i<len; i++) {
            var part = parts[i];
            if (part.isUrl()) {
                var url = part.getUrl();
                if (url.indexOf('data:') !== 0) {
                    work.push(createJob(part));
                }
            }
        }

        parallel(work, function(err) {
            if (err) {
                return callback(err);
            }

            callback(null, parsed.getCode());
        });
    }
};