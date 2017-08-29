'use strict';

const net = require('net');

const getUnusedPort = exports.getUnusedPort = (options) => {
  options = options || {};

  let min = options.min || 1024;
  let port = options.port || min;
  let max = options.max;

  let promise = new Promise((resolve, reject) => {
    let server = net.createServer();

    if (port >= max) {
      let error = new Error('Could not find an unused port');
      error.code = 'NO_UNUSED';
      return reject(error);
    }

    server.listen(port, (err) => {
      if (err) {
        return reject(err);
      }

      server.once('close', () => resolve(port));
      server.close();
    });

    server.on('error', reject);
  });

  return promise.catch((err) => {
    if (err.code === 'NO_UNUSED') throw err;
    return getUnusedPort({ min, max, port: ++port });
  });
};
