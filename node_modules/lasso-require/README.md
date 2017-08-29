lasso-require
========================

Plugin for the [Lasso.js](https://github.com/lasso-js/lasso) that adds support for transporting Node.js-style modules to the browser.

# Installation

This plugin is included as part of the `lasso` module so it is not necessary to use `npm install` to add the module to your project. However, if you want to use a specific version of the `lasso-require` plugin then you can install it using the following command:

```
npm install lasso-require --save
```

# Usage

This plugin is enabled by default, but if you want to provide your own configuration then you can do that using code similar to the following:

```javascript
require('lasso').configure({
    require: {
        extensions: ['.js'], // Defaults to ['.js']
        transforms: [ // Browserify compatible transforms
            'deamdify'
        ]
    }
})
```

The `lasso-require` plugin introduces two new dependency types that you can use to target Node.js modules for the browser. There usage is shown in the following `browser.json` file:

```json
{
    "dependencies": [
        "require: jquery",
        "require-run: ./main"
    ]
}
```


These new dependency types are described in more detail below.

# Dependency Types

## require

The `require` dependency type will wrap a Node.js module for delivery to the browser and allow it to be required from another module. For example:

__Input modules:__

_foo.js:_
```javascript
exports.add = function(a, b) {
    return a + b;
}
```

_bar.js:_
```javascript
var foo = require('./foo');

exports.sayHello = function() {
    console.log('Hello World! 2+2=' + foo.add(2, 2));
};
```

__Output Bundles:__

After running the following command:

```bash
lasso require:./foo require:./bar --name test
```

The output written to `static/test.js` will be the following:

```javascript
$_mod.def("/foo", function(require, exports, module, __filename, __dirname) { exports.add = function(a, b) {
    return a + b;
} });
$_mod.def("/bar", function(require, exports, module, __filename, __dirname) { var foo = require('./foo');

exports.sayHello = function() {
    console.log('Hello World! 2+2=' + foo.add(2, 2));
}; });
```

__NOTE:__ `$_mod` is a global introduced by the [client-side Node.js module loader](https://github.com/raptorjs/raptor-modules/blob/master/client/lib/raptor-modules-client.js). It should never be used directly!. The code that declares `$_mod` is not shown in the output above for brevity.

## require-run

In the previous examples, neither the `foo.js` or `bar.js` module will actually run. The `require-run` dependency type should be used to make a module self-executing. This is the equivalent of the entry point for your application when loaded in the browser.

Continuing with the previous example:

__Input modules:__

_foo.js_
(see above)

_bar.js_
(see above)

_main.js:_
```javascript
require('./bar').sayHello();
```

__Output Bundles:__

After running the following command:

```bash
lasso require-run:./main --name test
```

Alternatively:
```bash
lasso --main main.js --name test
```

The output written to `static/test.js` will be the following:

```javascript
$_mod.def("/foo", function(require, exports, module, __filename, __dirname) { exports.add = function(a, b) {
    return a + b;
} });

$_mod.def("/bar", function(require, exports, module, __filename, __dirname) { var foo = require('./foo');

exports.sayHello = function() {
    console.log('Hello World! 2+2=' + foo.add(2, 2));
}; });

$_mod.run("/main", function(require, exports, module, __filename, __dirname) { require('./bar').sayHello(); });
```

## Conditional Remap

The `lasso-require` supports the [package.json browser field](https://gist.github.com/defunctzombie/4339901) for remapping a JavaScript module to a different module during client-side bundling. For example:

```json
{
    "browser": {
        "./foo.js": "./foo-browser.js"
    }
}
```

The `lasso-require` plugin also allows modules to be conditionally remapped based on the set of enabled flags by adding additional information an `browser.json` in the same directory as a module. For example:

```json
{
    "dependencies": [
        ...
    ],
    "requireRemap": [
        {
            "from": "./foo.js",
            "to": "./foo-mobile.js",
            "if-flag": "mobile"
        }
    ]
}
```

If the `mobile` flag is set during optimization and the `foo.js` module is required on the client (e.g., `require('./foo')`) then the returned module will be the exports for `foo-mobile.js` (not `foo.js`).
