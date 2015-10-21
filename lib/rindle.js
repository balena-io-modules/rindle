/*
 * The MIT License
 *
 * Copyright (c) 2015 Juan Cruz Viotti. https://jviotti.github.io
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * @module rindle
 */

var _ = require('lodash');
var Promise = require('bluebird');

/**
 * @summary Wait for a stream to close
 * @function
 * @public
 *
 * @description
 * This functions listens for the following events:
 *
 * - `close`.
 * - `end`.
 * - `done`.
 *
 * If those events pass any argument when being emitted, you'll be able to access them as arguments to the callback.
 *
 * @param {Stream} stream - stream
 * @param {Function} callback - callback (error, args...)
 *
 * @example
 * var fs = require('fs');
 * var rindle = require('rindle');
 *
 * var input = fs.createReadStream('foo/bar');
 * var output = fs.createWriteStream('foo/baz');
 *
 * input.pipe(output);
 *
 * rindle.wait(output, function(error) {
 *   if (error) throw error;
 *   console.log('The output stream was closed!');
 * });
 */
exports.wait = function(stream, callback) {
  'use strict';

  return new Promise(function(resolve, reject) {
    var done = function() {
      return resolve(_.values(arguments));
    };

		stream.on('error', reject);
    stream.on('close', done);
    stream.on('end', done);
    stream.on('done', done);
  }).nodeify(callback, {
    spread: true
  });
};

/**
 * @summary Extract data from readable stream
 * @function
 * @public
 *
 * @description
 * Notice this function only extracts the *remaining data* from the stream.
 *
 * @param {StreamReadable} stream - stream
 * @param {Function} callback - callback (error, data)
 *
 * @example
 * var fs = require('fs');
 * var rindle = require('rindle');
 *
 * var input = fs.createReadStream('foo/bar');
 *
 * rindle.extract(input, function(error, data) {
 *   if (error) throw error;
 *   console.log('The file contains: ' + data);
 * });
 */
exports.extract = function(stream, callback) {
  'use strict';

  var chunks = '';

  stream.on('data', function(chunk) {
    chunks += chunk;
  });

  return exports.wait(stream).then(function() {
    return chunks;
  }).nodeify(callback);
};

/**
 * @summary Bifurcate readable stream to two writable streams
 * @function
 * @public
 *
 * @description
 * The callback is called when both output stream close.
 *
 * @param {StreamReadable} stream - input stream
 * @param {StreamWritable} output1 - first output stream
 * @param {StreamWritable} output2 - second output stream
 * @param {Function} callback - callback (error)
 *
 * @example
 *
 * var fs = require('fs');
 * var rindle = require('rindle');
 *
 * var input = fs.createReadStream('foo/bar');
 * var output1 = fs.createWriteStream('foo/baz');
 * var output2 = fs.createWriteStream('foo/qux');
 *
 * rindle.bifurcate(input, output1, output2, function(error) {
 *   if (error) throw error;
 *
 *   console.log('All files written!');
 * });
 */
exports.bifurcate = function(stream, output1, output2, callback) {
  'use strict';

  stream.pipe(output1);
  stream.pipe(output2);

  // Fulfil once we finish writing to both output streams
  return Promise.all([
    exports.wait(output1),
    exports.wait(output2)
  ]).nodeify(callback);
};