# lasso-istanbul-instrument-transform

Lasso.js transform that uses Istanbul to instrument ES6 code to ES5 for code coverage.

## Prerequisites

This transform requires Lasso v2+

## Installation

```bash
npm install lasso-istanbul-instrument-transform --save-dev
```

## Usage

```javascript
require('lasso').configure({
    require: {
        transforms: [
            {
                transform: 'lasso-istanbul-instrument-transform',
                config: {
                    extensions: ['.js', '.es6'] // Enabled file extensions. Default: ['.js', '.es6']
                }
            }
        ]
    }
});
```
