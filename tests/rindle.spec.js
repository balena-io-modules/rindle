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

var chai = require('chai');
var sinon = require('sinon');
var _ = require('lodash');
var fs = require('fs');
var StringStream = require('string-to-stream');
var StreamReadable = require('stream').Readable;
var StreamPassThrough = require('stream').PassThrough;
var EventEmitter = require('events').EventEmitter;
var tmp = require('tmp');
tmp.setGracefulCleanup();

chai.use(require('chai-as-promised'));
chai.use(require('sinon-chai'));

var { expect } = chai;

var rindle = require('../lib/rindle');

describe('Rindle:', function () {
	'use strict';

	describe('.wait()', function () {
		describe('given a stream that emits a close event with no result', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('close');
					}, this),
					100,
				);
			});

			it('should not reject', async function () {
				await rindle.wait(this.stream);
			});

			it('should return no result', async function () {
				const result = await rindle.wait(this.stream);
				expect(result).to.deep.equal([]);
			});
		});

		describe('given a stream that emits a close event with a result', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('close', 'foo');
					}, this),
					100,
				);
			});

			it('should return the result', async function () {
				const result = await rindle.wait(this.stream);
				expect(result).to.deep.equal(['foo']);
			});
		});

		describe('given a stream that emits a close event with multiple results', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('close', 'foo', 'bar', 'baz');
					}, this),
					100,
				);
			});

			it('should return all the results', async function () {
				const result = await rindle.wait(this.stream);
				expect(result).to.deep.equal(['foo', 'bar', 'baz']);
			});
		});

		describe('given a stream that emits an end event with no result', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('end');
					}, this),
					100,
				);
			});

			it('should return no error', async function () {
				await rindle.wait(this.stream);
			});
		});

		describe('given a stream that emits a done event with no result', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('done');
					}, this),
					100,
				);
			});

			it('should return no error', async function () {
				await rindle.wait(this.stream);
			});
		});

		describe('given a stream that emits an error event', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();
				setTimeout(
					_.bind(function () {
						this.stream.emit('error', new Error('stream error'));
					}, this),
					100,
				);
			});

			it('should yield the error', async function () {
				try {
					await rindle.wait(this.stream);
					throw new Error('No error was thrown but was expected');
				} catch (error) {
					expect(error).to.be.an.instanceof(Error);
					expect(error.message).to.equal('stream error');
				}
			});
		});
	});

	describe('.extract()', function () {
		describe('given a stream that emits data', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					this.push('Hello');
					this.push(' ');
					this.push('World');
					this.push(null);
				};
			});

			it('should yield the stream data', async function () {
				rindle.extract(this.stream, function (error, data) {
					expect(error).to.not.exist;
					expect(data).to.equal('Hello World');
				});
			});
		});

		describe('given a stream that throws an error', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					// If we don't emit an error event with a slight timeout
					// then the error is emitted before an error listener
					// is attached. This causes the error to be thrown
					// directly in Node v0.10.
					_.defer(
						_.bind(function () {
							this.emit('error', new Error('stream error'));
						}, this),
					);
				};
			});

			it('should yield the error', async function () {
				try {
					await rindle.extract(this.stream);
					throw new Error('No error was thrown but was expected');
				} catch (error) {
					expect(error).to.be.an.instanceof(Error);
					expect(error.message).to.equal('stream error');
				}
			});
		});
	});

	describe('.bifurcate()', function () {
		describe('given a stream that emits data', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					this.push('Hello');
					this.push(' ');
					this.push('World');
					this.push(null);
				};
			});

			describe('given two duplex streams', function () {
				beforeEach(function () {
					this.output1 = new StreamPassThrough();
					this.output2 = new StreamPassThrough();
				});

				it('should pipe all data to both streams', function () {
					rindle.bifurcate(this.stream, this.output1, this.output2);

					return Promise.all([
						rindle.extract(this.output1),
						rindle.extract(this.output2),
					]).then(function ([one, two]) {
						expect(one).to.equal('Hello World');
						expect(two).to.equal('Hello World');
					});
				});
			});

			describe('given two file-system writable streams', function () {
				beforeEach(function () {
					this.output1Path = tmp.tmpNameSync();
					this.output2Path = tmp.tmpNameSync();

					this.output1 = fs.createWriteStream(this.output1Path);
					this.output2 = fs.createWriteStream(this.output2Path);
				});

				it('should write all data to both files', function () {
					return rindle.bifurcate(
						this.stream,
						this.output1,
						this.output2,
						_.bind(function (error) {
							return Promise.all([
								fs.promises.readFile(this.output1Path, {
									encoding: 'utf8',
								}),
								fs.promises.readFile(this.output2Path, {
									encoding: 'utf8',
								}),
							]).then(function ([one, two]) {
								expect(one).to.equal('Hello World');
								expect(two).to.equal('Hello World');
							});
						}, this),
					);
				});
			});
		});
	});

	describe('.pipeWithEvents()', function () {
		describe('given a stream which emits various events', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					this.push('Hello');
					this.push(' ');
					this.push('World');
					this.push(null);
				};

				_.defer(
					_.bind(function () {
						this.stream.emit('foo');
						this.stream.emit('bar');
						this.stream.emit('baz');
					}, this),
				);
			});

			it('should be able to pipe all events', async function () {
				var output = new StreamPassThrough();

				var fooSpy = sinon.spy();
				var barSpy = sinon.spy();
				var bazSpy = sinon.spy();

				output.on('foo', fooSpy);
				output.on('bar', barSpy);
				output.on('baz', bazSpy);

				var pipe = rindle.pipeWithEvents(this.stream, output, [
					'foo',
					'bar',
					'baz',
				]);
				await rindle
					.extract(pipe)
					.delay(100)
					.then(function (data) {
						expect(data).to.equal('Hello World');
						expect(fooSpy).to.have.been.calledOnce;
						expect(barSpy).to.have.been.calledOnce;
						expect(bazSpy).to.have.been.calledOnce;
					});
			});

			it('should be able to pipe some events', async function () {
				var output = new StreamPassThrough();

				var fooSpy = sinon.spy();
				var barSpy = sinon.spy();
				var bazSpy = sinon.spy();

				output.on('foo', fooSpy);
				output.on('bar', barSpy);
				output.on('baz', bazSpy);

				var pipe = rindle.pipeWithEvents(this.stream, output, ['bar']);
				await rindle
					.extract(pipe)
					.delay(100)
					.then(function (data) {
						expect(data).to.equal('Hello World');
						expect(fooSpy).to.not.have.been.called;
						expect(barSpy).to.have.been.calledOnce;
						expect(bazSpy).to.not.have.been.called;
					});
			});
		});

		describe('given a stream which emits events with data', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					this.push('Hello');
					this.push(' ');
					this.push('World');
					this.push(null);
				};

				_.defer(
					_.bind(function () {
						this.stream.emit('foo', 'bar', 'baz');
						this.stream.emit('hello', 'world');
					}, this),
				);
			});

			it('should pipe the events along with their corresponding data', async function () {
				var output = new StreamPassThrough();

				var fooSpy = sinon.spy();
				var helloSpy = sinon.spy();

				output.on('foo', fooSpy);
				output.on('hello', helloSpy);

				var pipe = rindle.pipeWithEvents(this.stream, output, ['foo', 'hello']);
				await rindle
					.extract(pipe)
					.delay(100)
					.then(function (data) {
						expect(data).to.equal('Hello World');
						expect(fooSpy).to.have.been.calledOnce;
						expect(fooSpy).to.have.been.calledWith('bar', 'baz');
						expect(helloSpy).to.have.been.calledOnce;
						expect(helloSpy).to.have.been.calledWith('world');
					});
			});
		});

		describe('given a stream which emits an event multiple times', function () {
			beforeEach(function () {
				this.stream = new StreamReadable({
					encoding: 'utf8',
				});

				this.stream._read = function () {
					this.push('Hello');
					this.push(' ');
					this.push('World');
					this.push(null);
				};

				_.defer(
					_.bind(function () {
						this.stream.emit('foo', 'bar');
						this.stream.emit('foo', 'baz');
						this.stream.emit('foo', 'qux');
					}, this),
				);
			});

			it('should pipe the events the corresponding parts', async function () {
				var output = new StreamPassThrough();

				var fooSpy = sinon.spy();
				output.on('foo', fooSpy);

				var pipe = rindle.pipeWithEvents(this.stream, output, ['foo']);
				await rindle
					.extract(pipe)
					.delay(100)
					.then(function (data) {
						expect(data).to.equal('Hello World');
						expect(fooSpy).to.have.been.calledThrice;
					});
			});
		});
	});

	describe('.onEvent()', function () {
		describe('given a stream that emits an event with no arguments', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();

				_.defer(
					_.bind(function () {
						this.stream.emit('foo');
					}, this),
				);
			});

			it('should eventually resolve to undefined', function () {
				var promise = rindle.onEvent(this.stream, 'foo');
				expect(promise).to.eventually.be.undefined;
			});
		});

		describe('given a stream that emits an event with one argument', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();

				_.defer(
					_.bind(function () {
						this.stream.emit('foo', 'bar');
					}, this),
				);
			});

			it('should eventually resolve with the argument', function () {
				var promise = rindle.onEvent(this.stream, 'foo');
				expect(promise).to.eventually.equal('bar');
			});
		});

		describe('given a stream that emits an event with multiple argument', function () {
			beforeEach(function () {
				this.stream = new EventEmitter();

				_.defer(
					_.bind(function () {
						this.stream.emit('foo', 'bar', 'baz', 'qux');
					}, this),
				);
			});

			it('should eventually resolve with all the arguments', async function () {
				var promise = rindle.onEvent(this.stream, 'foo');
				await expect(promise).to.eventually.become(['bar', 'baz', 'qux']);
			});

			it('should be able to spread all the arguments', async function () {
				await rindle
					.onEvent(this.stream, 'foo')
					.spread(function (one, two, three) {
						expect(one).to.equal('bar');
						expect(two).to.equal('baz');
						expect(three).to.equal('qux');
					});
			});

			it('should be able to spread all the arguments with a callback', async function () {
				const result = await rindle.onEvent(this.stream, 'foo');
				expect(result).to.deep.equal(['bar', 'baz', 'qux']);
			});
		});
	});

	describe('.getStreamFromString()', function () {
		it('should throw if no input', function () {
			chai
				.expect(function () {
					rindle.getStreamFromString();
				})
				.to.throw('Not a string: undefined');
		});

		it('should throw if input is not a string', function () {
			chai
				.expect(function () {
					rindle.getStreamFromString(13);
				})
				.to.throw('Not a string: 13');
		});

		it('should return an instance of ReadableStream', function () {
			var stringStream = rindle.getStreamFromString('Hello World');
			expect(stringStream).to.be.an.instanceof(StringStream);
		});

		it('should be a stream containing the string characters', function () {
			var stringStream = rindle.getStreamFromString('Hello World');
			chai
				.expect(rindle.extract(stringStream))
				.to.eventually.equal('Hello World');
		});
	});
});
