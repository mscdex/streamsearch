'use strict';

const assert = require('assert');

const StreamSearch = require('../lib/sbmh.js');

[
  {
    needle: '\r\n',
    chunks: [
      'foo',
      ' bar',
      '\r',
      '\n',
      'baz, hello\r',
      '\n world.',
      '\r\n Node.JS rules!!\r\n\r\n',
    ],
    expect: [
      [false, 'foo'],
      [false, ' bar'],
      [ true, null],
      [false, 'baz, hello'],
      [ true, null],
      [false, ' world.'],
      [ true, null],
      [ true, ' Node.JS rules!!'],
      [ true, ''],
    ],
  },
  {
    needle: '---foobarbaz',
    chunks: [
      '---foobarbaz',
      'asdf',
      '\r\n',
      '---foobarba',
      '---foobar',
      'ba',
      '\r\n---foobarbaz--\r\n',
    ],
    expect: [
      [ true, null],
      [false, 'asdf'],
      [false, '\r\n'],
      [false, '---foobarba'],
      [false, '---foobarba'],
      [ true, '\r\n'],
      [false, '--\r\n'],
    ],
  },
].forEach((test, i) => {
  console.log(`Running test #${i + 1}`);
  const { needle, chunks, expect } = test;

  const results = [];
  const ss = new StreamSearch(Buffer.from(needle),
                              (isMatch, data, start, end) => {
    if (data)
      data = data.toString('latin1', start, end);
    else
      data = null;
    results.push([isMatch, data]);
  });

  for (const chunk of chunks)
    ss.push(Buffer.from(chunk));

  assert.deepStrictEqual(results, expect);
});

[
  {
    name: 'unmatched lookbehind prefix',
    needle: Buffer.from('ababba'),
    chunks: [Buffer.from('beforeabab'), Buffer.from('abbaafter')],
    expect: [[false, 'before'], [true, 'ab'], [false, 'after']],
  },
  {
    name: 'binary lookbehind prefix',
    needle: Buffer.from([0, 1, 0, 1, 1, 0]),
    chunks: [Buffer.from([255, 0, 1, 0, 1]), Buffer.from([0, 1, 1, 0, 254])],
    expect: [[false, '\xff'], [true, '\x00\x01'], [false, '\xfe']],
  },
  {
    name: 'reset before zero-prefix match',
    needle: Buffer.from('ababba'),
    chunks: [Buffer.from('abab'), Buffer.from('ba')],
    reset: true,
    expect: [[true, null]],
  },
].forEach((test) => {
  console.log(`Running lookbehind test: ${test.name}`);
  const results = [];
  const ss = new StreamSearch(test.needle, (isMatch, data, start, end) => {
    results.push([isMatch, data ? data.toString('latin1', start, end) : null]);
  });

  if (test.reset) {
    ss.push(Buffer.from('aba'));
    ss.reset();
    assert.strictEqual(ss.matches, 0);
  }
  for (const chunk of test.chunks)
    ss.push(chunk);

  assert.deepStrictEqual(results, test.expect, test.name);
  assert.strictEqual(ss.matches, 1, test.name);
});
