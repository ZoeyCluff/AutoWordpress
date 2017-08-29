# porti

[![Build Status](https://travis-ci.org/austinkelleher/porti.svg)](https://travis-ci.org/austinkelleher/porti)
![NPM version](https://badge.fury.io/js/porti.svg)

Node.js utility for obtaining random TCP ports

## Installation

```bash
npm install porti --save
```

## Usage

```javascript
const porti = require('porti');

// Finding an unused port in a range of ports. If a range is not specified,
// Porti falls back to a default range DEFAULT_MIN_PORT_RANGE - DEFAULT_MAX_PORT_RANGE.
// None of the properties in the first options argument are required.
porti.getUnusedPort({
  min: 2000,          // lower bound of random port range to select from
  max: 5000,          // upper bound of random port range to select from
}).then((port) => {
  ...
}).catch((err) => {
  ...
})
```
