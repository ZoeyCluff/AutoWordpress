lasso-image
================

This module provides a plugin for the [Lasso.js](https://github.com/lasso-js/lasso) and a JavaScript API
that allows image info (URL, width and height) to be retrieved on both the server and the client.

# Installation

Install the plugin:

```
npm install lasso-image --save
```

Enable the plugin:

```javascript
require('lasso').configure({
    plugins: [
        'lasso-image',
        ...
    ]
})
```

# Usage

The following code can be used to get image info (URL, width and height) on both the server and the client:

```javascript
var lassoImage = require('lasso-image');
lassoImage.getImageInfo(require.resolve('./my-image.png'), function(err, imageInfo) {
    if (err) {
        // Handle the error
    }

    console.log('URL: ', imageInfo.url);
    console.log('width: ', imageInfo.width);
    console.log('height: ', imageInfo.height);
});
```

Referenced images will automatically be bundled and written and the URL for the bundled image will be returned. The
result is cached (on the server) so there is no performance penalty in making subsequent calls for the same image path.
