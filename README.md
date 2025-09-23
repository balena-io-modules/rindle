rindle
======

[![npm version](https://badge.fury.io/js/rindle.svg)](http://badge.fury.io/js/rindle)
[![dependencies](https://david-dm.org/jviotti/rindle.png)](https://david-dm.org/jviotti/rindle.png)
[![Build Status](https://travis-ci.org/jviotti/rindle.svg?branch=master)](https://travis-ci.org/jviotti/rindle)
[![Build status](https://ci.appveyor.com/api/projects/status/cjyj0u68pq3x7031?svg=true)](https://ci.appveyor.com/project/resin-io/rindle)

Collection of utilities for working with Streams.

Description
-----------

This is a collection of functions that operate on streams to encapsulate some of the tasks I usually have to do in my project. I'll be adding more as I encounter more patterns.

Installation
------------

Install `rindle` by running:

```sh
$ npm install --save rindle
```

Documentation
-------------


* [rindle](#module_rindle)
    * [.wait(stream)](#module_rindle.wait)
    * [.extract(stream)](#module_rindle.extract)
    * [.bifurcate(stream, output1, output2)](#module_rindle.bifurcate)
    * [.pipeWithEvents(stream, output, events)](#module_rindle.pipeWithEvents) ⇒ <code>StreamReadable</code>
    * [.onEvent(stream, event)](#module_rindle.onEvent)

<a name="module_rindle.wait"></a>

### rindle.wait(stream)
This functions listens for the following events:

- `close`.
- `end`.
- `done`.

If those events pass any argument when being emitted, you'll be able to access them as arguments to the callback.

**Kind**: static method of [<code>rindle</code>](#module_rindle)  
**Summary**: Wait for a stream to close  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Stream</code> | stream |

**Example**  
```js
var fs = require('fs');
var rindle = require('rindle');

var input = fs.createReadStream('foo/bar');
var output = fs.createWriteStream('foo/baz');

input.pipe(output);

try {
  await rindle.wait(output);
  console.log('The output stream was closed!');
}(error) {
  if (error) throw error;
}
```
<a name="module_rindle.extract"></a>

### rindle.extract(stream)
Notice this function only extracts the *remaining data* from the stream.

**Kind**: static method of [<code>rindle</code>](#module_rindle)  
**Summary**: Extract data from readable stream  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>StreamReadable</code> | stream |

**Example**  
```js
var fs = require('fs');
var rindle = require('rindle');

var input = fs.createReadStream('foo/bar');

try {
  const data = await rindle.extract(input);
  console.log('The file contains: ' + data);
} catch (error) {
  if (error) throw error;
}
```
<a name="module_rindle.bifurcate"></a>

### rindle.bifurcate(stream, output1, output2)
The returned promised gets resolved when both output streams close.

**Kind**: static method of [<code>rindle</code>](#module_rindle)  
**Summary**: Bifurcate readable stream to two writable streams  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>StreamReadable</code> | input stream |
| output1 | <code>StreamWritable</code> | first output stream |
| output2 | <code>StreamWritable</code> | second output stream |

**Example**  
```js
var fs = require('fs');
var rindle = require('rindle');

var input = fs.createReadStream('foo/bar');
var output1 = fs.createWriteStream('foo/baz');
var output2 = fs.createWriteStream('foo/qux');

try {
  await rindle.bifurcate(input, output1, output2,
  console.log('All files written!');
} (error) {
  if (error) throw error;
}
```
<a name="module_rindle.pipeWithEvents"></a>

### rindle.pipeWithEvents(stream, output, events) ⇒ <code>StreamReadable</code>
**Kind**: static method of [<code>rindle</code>](#module_rindle)  
**Summary**: Pipe a stream along with certain events  
**Returns**: <code>StreamReadable</code> - resulting stream  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>StreamReadable</code> | input stream |
| output | <code>StreamWritable</code> | output stream |
| events | <code>Array.&lt;String&gt;</code> | events to pipe |

**Example**  
```js
var rindle = require('rindle');

rindle.pipeWithEvents(input, output, [
  'response',
  'request'
]);
```
<a name="module_rindle.onEvent"></a>

### rindle.onEvent(stream, event)
**Kind**: static method of [<code>rindle</code>](#module_rindle)  
**Summary**: Wait for a stream to emit a certain event  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| stream | <code>Stream</code> | stream |
| event | <code>String</code> | event name |

**Example**  
```js
var rindle = require('rindle');
var fs = require('fs');

try {
  const fd = await rindle.onEvent(fs.createReadStream('foo/bar'), 'open');
  console.log('The "open" event was emitted');
  console.log(fd);
} (error) {
  if (error) throw error;
}
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/jviotti/rindle/issues/new) on GitHub and I'll be happy to help.

Tests
-----

Run the test suite by doing:

```sh
$ gulp test
```

Contribute
----------

- Issue Tracker: [github.com/jviotti/rindle/issues](https://github.com/jviotti/rindle/issues)
- Source Code: [github.com/jviotti/rindle](https://github.com/jviotti/rindle)

Before submitting a PR, please make sure that you include tests, and that [jshint](http://jshint.com) runs without any warning:

```sh
$ gulp lint
```

License
-------

The project is licensed under the MIT license.
