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
'use strict';

var stringToStream = require('string-to-stream');

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
 * try {
 *   await rindle.wait(output);
 *   console.log('The output stream was closed!');
 * }(error) {
 *   if (error) throw error;
 * }
 */
exports.wait = function (stream) {
	return new Promise(function (resolve, reject) {
		var done = function () {
			var args = Array.prototype.slice.call(arguments);
			return resolve(args);
		};

		stream.on('error', reject);
		stream.on('close', done);
		stream.on('end', done);
		stream.on('done', done);
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
 *
 * @example
 * var fs = require('fs');
 * var rindle = require('rindle');
 *
 * var input = fs.createReadStream('foo/bar');
 *
 * try {
 *   const data = await rindle.extract(input);
 *   console.log('The file contains: ' + data);
 * } catch (error) {
 *   if (error) throw error;
 * }
 */
exports.extract = function (stream) {
	var chunks = '';

	stream.on('data', function (chunk) {
		chunks += chunk;
	});

	return exports.wait(stream).then(function () {
		return chunks;
	});
};
/**
 * @summary Bifurcate readable stream to two writable streams
 * @function
 * @public
 *
 * @description
 * The returned promised gets resolved when both output streams close.
 *
 * @param {StreamReadable} stream - input stream
 * @param {StreamWritable} output1 - first output stream
 * @param {StreamWritable} output2 - second output stream
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
 * try {
 *   await rindle.bifurcate(input, output1, output2,
 *   console.log('All files written!');
 * } (error) {
 *   if (error) throw error;
 * }
 */
exports.bifurcate = function (stream, output1, output2) {
	stream.pipe(output1);
	stream.pipe(output2);

	// Fulfill once we finish writing to both output streams
	return Promise.all([exports.wait(output1), exports.wait(output2)]);
};

/**
 * @summary Pipe a stream along with certain events
 * @function
 * @public
 *
 * @param {StreamReadable} stream - input stream
 * @param {StreamWritable} output - output stream
 * @param {String[]} events - events to pipe
 *
 * @returns {StreamReadable} resulting stream
 *
 * @example
 * var rindle = require('rindle');
 *
 * rindle.pipeWithEvents(input, output, [
 *   'response',
 *   'request'
 * ]);
 */
exports.pipeWithEvents = function (stream, output, events) {
	events.forEach(function (event) {
		stream.on(event, function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(event);
			output.emit.apply(output, args);
		});
	});

	return stream.pipe(output);
};

/**
 * @summary Wait for a stream to emit a certain event
 * @function
 * @public
 *
 * @param {Stream} stream - stream
 * @param {String} event - event name
 *
 * @example
 * var rindle = require('rindle');
 * var fs = require('fs');
 *
 * try {
 *   const fd = await rindle.onEvent(fs.createReadStream('foo/bar'), 'open');
 *   console.log('The "open" event was emitted');
 *   console.log(fd);
 * } (error) {
 *   if (error) throw error;
 * }
 */
exports.onEvent = function (stream, event) {
	return new Promise(function (resolve) {
		stream.on(event, function () {
			var args = Array.prototype.slice.call(arguments);

			if (args.length === 0) {
				args = undefined;
			} else if (args.length === 1) {
				args = args[0];
			}

			return resolve(args);
		});
	});
};

/**
 * @summary Get a readable stream from a string
 * @function
 * @public
 *
 * @param {String} string - input string
 * @returns {ReadableStream} - string stream
 *
 * @example
 * var rindle = require('rindle');
 * rindle.getStreamFromString('Hello World!').pipe(process.stdout);
 */
exports.getStreamFromString = function (s) {
	if (typeof s !== 'string') {
		throw new Error('Not a string: ' + s);
	}

	return stringToStream(s);
};
