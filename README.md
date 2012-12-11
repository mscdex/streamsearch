Description
===========

streamsearch is a module for [node.js](http://nodejs.org/) that allows searching a stream using the Boyer-Moore-Horspool algorithm.

This module is based heavily on the Streaming Boyer-Moore-Horspool C++ implementation by Hongli Lai [here](https://github.com/FooBarWidget/boyer-moore-horspool).


Requirements
============

* [node.js](http://nodejs.org/) -- v0.8.0 or newer


Installation
============

    npm install streamsearch

Example
=======

```javascript
  var StreamSearch = require('streamsearch'),
      inspect = require('util').inspect;

  var needle = new Buffer([13, 10]), // CRLF
      s = new StreamSearch(needle),
      chunks = [
        new Buffer('foo'),
        new Buffer(' bar'),
        new Buffer('\r'),
        new Buffer('\n'),
        new Buffer('baz, hello\r'),
        new Buffer('\n world.'),
        new Buffer('\r\n Node.JS rules!!\r\n\r\n')
      ];
  s.on('data', function(data, start, end) {
    console.log('data: ' + inspect(data.toString('ascii', start, end)));
  });
  s.on('match', function() {
    console.log('match!');
  });
  for (var i = 0, len = chunks.length; i < len; ++i)
    s.push(chunks[i]);

  // output:
  //
  // data: 'foo'
  // data: ' bar'
  // match!
  // data: 'baz, hello'
  // match!
  // data: ' world.'
  // match!
  // data: ' Node.JS rules!!'
  // match!
  // data: ''
  // match!
```


API
===

Events
------

* **data**(< _Buffer_ >chunk, < _integer_ >start, < _integer_ >end) - Emitted when non-needle data is available. This data is in `chunk` between `start` (inclusive) and `end` (exclusive).

* **match**() - Emitted when the needle has been found in the stream.


Properties
----------

* **maxMatches** - < _integer_ > - The maximum number of matches. Defaults to Infinity.

* **matches** - < _integer_ > - The current match count.


Functions
---------

* **(constructor)**(< _Buffer_ >needle) - Creates and returns a new instance for searching for `needle`.

* **push**(< _Buffer_ >chunk) - _integer_ - Process `chunk`. The return value is the last processed index in `chunk` + 1.

* **reset**() - _(void)_ - Resets internal state. Useful for when you wish to start searching a new/different stream for example.
