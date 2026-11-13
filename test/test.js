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
    name: 'offset after lookbehind',
    needle: 'abc',
    chunks: [['a', 0], ['XbcZ', 1]],
    expect: [[true, null], [false, 'Z']],
  },
  {
    name: 'skipped bytes cannot complete a lookbehind match',
    needle: 'abc',
    chunks: [['a', 0], ['bcX', 2]],
    expect: [[false, 'a'], [false, 'X']],
  },
  {
    name: 'offset suffix retained for the following chunk',
    needle: 'abcd',
    chunks: [['a', 0], ['XXb', 2], ['XXcdZ', 2]],
    expect: [[true, null], [false, 'Z']],
  },
  {
    name: 'match after rejected lookbehind',
    needle: 'abc',
    chunks: [['a', 0], ['QZabc!', 1]],
    expect: [[false, 'a'], [true, 'Z'], [false, '!']],
  },
  {
    name: 'binary offset suffix',
    needle: '\x00\xff\x01',
    chunks: [['\x00', 0], ['ZZ\xff\x01!', 2]],
    expect: [[true, null], [false, '!']],
  },
].forEach((test) => {
  console.log(`Running offset test: ${test.name}`);
  const results = [];
  const ss = new StreamSearch(Buffer.from(test.needle, 'latin1'),
                              (isMatch, data, start, end) => {
    assert(start >= 0);
    assert(end >= start);
    if (data)
      assert(end <= data.length);
    results.push([isMatch, data ? data.toString('latin1', start, end) : null]);
  });
  for (const [chunk, pos] of test.chunks) {
    const buf = Buffer.from(chunk, 'latin1');
    assert.strictEqual(ss.push(buf, pos), buf.length);
  }
  ss.destroy();
  assert.deepStrictEqual(results, test.expect, test.name);
});

{
  const results = [];
  const ss = new StreamSearch('abc', (isMatch, data, start, end) => {
    results.push([isMatch, data ? data.toString('latin1', start, end) : null]);
  });
  ss.maxMatches = 1;
  ss.push('a');
  const chunk = Buffer.from('XXbc!abc?');
  assert.strictEqual(ss.push(chunk, 2), 4);
  assert.strictEqual(ss.matches, 1);
  ss.maxMatches = 2;
  assert.strictEqual(ss.push(chunk, 4), 8);
  assert.strictEqual(ss.matches, 2);
  ss.maxMatches = Infinity;
  assert.strictEqual(ss.push(chunk, 8), chunk.length);
  ss.destroy();
  assert.deepStrictEqual(results, [
    [true, null], [true, '!'], [false, '?'],
  ]);
}

{
  const ss = new StreamSearch('abc', () => {
    ss.reset();
    ss.maxMatches = 0;
  });
  ss.push('a');
  assert.strictEqual(ss.push(Buffer.from('XXbc!'), 2), 4);
  assert.strictEqual(ss.matches, 0);
}
