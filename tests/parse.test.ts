import { describe, expect, test } from 'bun:test';
import { detectChapter, trySelectorText, tryUrl } from '../src/lib/parse.ts';
import { novelMatchesUrl } from '../src/lib/types.ts';

describe('tryUrl', () => {
  test('extracts capture group 1', () => {
    expect(tryUrl('https://example.com/novel/chapter-123/', 'chapter-(\\d+)').chapter).toBe(123);
  });
  test('supports decimals', () => {
    expect(tryUrl('https://example.com/c42.5/', 'c(\\d+(?:\\.\\d+)?)').chapter).toBe(42.5);
  });
  test('returns null on no match or bad regex', () => {
    expect(tryUrl('https://example.com/a', 'chapter-(\\d+)').chapter).toBeNull();
    expect(tryUrl('https://example.com/a', '([invalid').chapter).toBeNull();
    expect(tryUrl('https://example.com/a', '').chapter).toBeNull();
  });
});

describe('trySelectorText', () => {
  test('defaults to first number', () => {
    expect(trySelectorText('Chapter 57: Dawn').chapter).toBe(57);
  });
  test('honours custom regex', () => {
    expect(trySelectorText('Ch. 12 - v2', 'v(\\d+)').chapter).toBe(2);
  });
});

describe('detectChapter', () => {
  test('URL wins over selector', () => {
    const r = detectChapter({
      url: 'https://x.com/chapter-10/',
      urlRegex: 'chapter-(\\d+)',
      selectorText: 'Chapter 99',
      selectorRegex: '',
      hasSelector: true
    });
    expect(r).toMatchObject({ chapter: 10, source: 'url' });
  });
  test('falls back to selector', () => {
    const r = detectChapter({
      url: 'https://x.com/read',
      urlRegex: 'chapter-(\\d+)',
      selectorText: 'Chapter 7',
      selectorRegex: '',
      hasSelector: true
    });
    expect(r).toMatchObject({ chapter: 7, source: 'selector' });
  });
});

describe('novelMatchesUrl', () => {
  test('substring match is case-insensitive', () => {
    expect(
      novelMatchesUrl(
        { matchPattern: 'Example.com/Series/Foo' } as never,
        'https://example.com/series/foo/chapter-1'
      )
    ).toBe(true);
  });
  test('wildcard support', () => {
    expect(
      novelMatchesUrl({ matchPattern: 'example.com/series/*' } as never, 'https://example.com/series/bar/c3')
    ).toBe(true);
  });
  test('empty pattern never matches', () => {
    expect(novelMatchesUrl({ matchPattern: '' } as never, 'https://example.com/')).toBe(false);
  });
});
