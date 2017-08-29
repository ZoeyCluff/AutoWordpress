var AsyncWriter = require('async-writer').AsyncWriter;

function ChunkWriter(dustAsyncWriter) {
    this._dustAsyncWriter = dustAsyncWriter;
}

ChunkWriter.prototype = {
    write: function(str) {
        this._dustAsyncWriter._dustChunk.write(str);
    }
};

function DustAsyncWriter(dustChunk, dustContext, attributes, async, asyncAttributes) {
    var writer = new ChunkWriter(this);
    if (!asyncAttributes) {
        asyncAttributes = { remaining: 0, last: 0 };
    }
    DustAsyncWriter.$super.call(this, writer, attributes, asyncAttributes);

    this._dustChunk = dustChunk;
    this.dustContext = dustContext;
    this._dustAsync = async === true;
}

DustAsyncWriter.prototype = {
    featureLastFlush: false,
    getAttribute: function(name) {
        return this.attributes[name] || this.dustContext.get(name);
    },

    beginAsync: function(options) {
        var attributes = this.attributes;
        var asyncOut;
        var dustContext = this.dustContext;
        var asyncAttributes = this._async;

        this._dustChunk = this._dustChunk.map(function(asyncDustChunk) {
            asyncOut = new DustAsyncWriter(asyncDustChunk, dustContext, attributes, true /* async */, asyncAttributes);
        });

        asyncOut.handleBeginAsync(options, this);

        return asyncOut;
    },

    end: function(data) {
        if (data) {
            this.write(data);
        }

        if (this._dustAsync) {
            this._dustChunk.end();
            this.handleEnd(true);
        } else {
            this.handleEnd(false);
        }

        return this;
    },

    renderDustBody: function(body, context) {
        this._dustChunk = this._dustChunk.render(body, context || this.dustContext);
    },

    _finish: function() {
    },

    flush: function() {
        var stream = this.stream;
        if (stream && stream.flush) {
            stream.flush();
        }
    }
};

require('raptor-util').inherit(DustAsyncWriter, AsyncWriter);

module.exports = DustAsyncWriter;
