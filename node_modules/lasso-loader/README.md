lasso-loader
============

This module provides functionality to asynchronously load JavaScript and CSS resources in any web browser. It's used by Lasso.js to support lazily loading resources, but it can also be used independently of Lasso.js.

NOTE: All resources are loaded in parallel.

# Usage

```javascript
var lassoLoader = require('lasso-loader');

lassoLoader.load({
        js: [
            'http://foo.com/static/foo.js',
            'http://foo.com/static/bar.js'
        ],
        css: [
            'http://foo.com/static/foo.css',
            'http://foo.com/static/bar.css'
        ]
    },
    function(err) {
        if (err) {
            // Something went wrong
        } else {
            // All resources successfully loaded!
        }
    });
```