import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRefs } from '../src/core/ref.ts';
import { versesOf, type BookText } from '../src/data/bible.ts';

describe('범위 파서', () => {
  test('장 범위와 여러 책', () => {
    assert.deepEqual(parseRefs('Gen 1-3; Ps 23'), [
      { book: 'Gen', chapter: 1 },
      { book: 'Gen', chapter: 2 },
      { book: 'Gen', chapter: 3 },
      { book: 'Ps', chapter: 23 },
    ]);
    assert.deepEqual(
      parseRefs('Lev 26-27; Num 1-2').map((p) => `${p.book} ${p.chapter}`),
      ['Lev 26', 'Lev 27', 'Num 1', 'Num 2'],
    );
  });

  test('한 장짜리 책과 숫자로 시작하는 약어', () => {
    assert.deepEqual(parseRefs('2John 1; 3John 1; Jude 1'), [
      { book: '2John', chapter: 1 },
      { book: '3John', chapter: 1 },
      { book: 'Jude', chapter: 1 },
    ]);
  });

  test('절 범위', () => {
    assert.deepEqual(parseRefs('Num 6:24-26'), [{ book: 'Num', chapter: 6, from: 24, to: 26 }]);
    assert.deepEqual(parseRefs('2Cor 13:13'), [{ book: '2Cor', chapter: 13, from: 13, to: 13 }]);
  });

  test('쉼표로 이은 절은 같은 장', () => {
    assert.deepEqual(parseRefs('Heb 4:14,16'), [
      { book: 'Heb', chapter: 4, from: 14, to: 14 },
      { book: 'Heb', chapter: 4, from: 16, to: 16 },
    ]);
    assert.deepEqual(parseRefs('Ps 36:7, 9-10'), [
      { book: 'Ps', chapter: 36, from: 7, to: 7 },
      { book: 'Ps', chapter: 36, from: 9, to: 10 },
    ]);
  });

  test('장을 넘는 절 범위', () => {
    assert.deepEqual(parseRefs('John 1:50-3:2'), [
      { book: 'John', chapter: 1, from: 50 },
      { book: 'John', chapter: 2 },
      { book: 'John', chapter: 3, from: 1, to: 2 },
    ]);
  });

  test('잘못된 범위는 거절', () => {
    assert.throws(() => parseRefs('Foo 1'), /없는 책/);
    assert.throws(() => parseRefs('Jude 2'), /2장이 없습니다/);
    assert.throws(() => parseRefs('Gen 5-3'), /거꾸로/);
    assert.throws(() => parseRefs('Num 6:26-24'), /거꾸로/);
    assert.throws(() => parseRefs('Gen'), /읽을 수 없습니다/);
    assert.throws(() => parseRefs('Gen 1:'), /읽을 수 없습니다/);
  });
});

describe('절 고르기', () => {
  const book: BookText = {
    book: 'Ps',
    chapters: { '1': { '1': 'a', '2': 'b', '3': 'c' }, '2': { '1': 'd', '2': 'e' } },
  };

  test('장 전체, 절 범위, 장 끝까지', () => {
    assert.deepEqual(versesOf(book, { book: 'Ps', chapter: 2 }).map((v) => v.text), ['d', 'e']);
    assert.deepEqual(versesOf(book, { book: 'Ps', chapter: 1, from: 2, to: 3 }).map((v) => v.verse), [2, 3]);
    assert.deepEqual(versesOf(book, { book: 'Ps', chapter: 1, from: 2 }).map((v) => v.verse), [2, 3]);
  });

  test('본문에 없는 장·절은 거절', () => {
    assert.throws(() => versesOf(book, { book: 'Ps', chapter: 3 }), /없는 범위/);
    assert.throws(() => versesOf(book, { book: 'Ps', chapter: 1, from: 2, to: 4 }), /없는 범위/);
    assert.throws(() => versesOf(book, { book: 'Ps', chapter: 1, from: 5 }), /없는 범위/);
  });
});
