lasso-resolve-css-urls
==========================

Transform for Lasso.js to replace URLs in CSS files with URLs of bundled resources

# Overview
CSS files (which might be derived from LESS or SASS resources) often contain references to other assets.

For example:
```css
.app {
    background-image: url(myfile.png);
}
```

When CSS URL resolving is enabled, image assets referenced in CSS files will automatically
be copied to the output directory and the URL reference will be replaced with the resultant URL.
In the example above, the file `myfile.png` will be moved to the output directory and the URL in the CSS
file will be adjusted accordingly.

Resource URLs that begin with `data:`, `//`, `http://`, and `https://` are ignored during URL resolving.

In the typical use case, relative URLs are resolved relative to the source file. However, it is also possible
to resolve URLs that are paths using rules of `require.resolve()`.


# Basic Usage

```javascript
var config = {
    resolveCssUrls: true
    ...
};

var myLasso = lasso.create(config);
myLasso.lassoPage(...);
```

# Custom URL Resolver
```javascript
var config = {
    resolveCssUrls: {
      urlResolver: function(url, lassoContext, callback) {
        url = url.replace('SOME_TOKEN', 'something else');
        callback(null, url);
      }
    }
    ...
};

var myLasso = lasso.create(config);
myLasso.lassoPage(...);
```
# Using require.resolve
Consider this CSS snippet:
```css
.app {
    background-image: url(require:assets-module/images/myfile.png);
}
```

In this example, the actual path to `assets-module/images/myfile.png` will
be resolved using the rules of `require.resolve()`.
The path will resolved relative to the source file.
Therefore, if the target is relative (e.g. `./myfile.png`), then the target will be
resolved relative to the source file.

# Base64 Encoding of images
Consider this CSS snippet:
```css
.app {
    background-image: url(myfile.png?base64);
}
```

The special "?base64" suffix will trigger the resolver to automatically encode
the image content using Base64 which will inline the data.
