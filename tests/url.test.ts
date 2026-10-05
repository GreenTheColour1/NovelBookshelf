import { describe, expect, test } from 'bun:test';
import { suggestDefaultsForUrl } from '../src/lib/url.ts';
import { tryUrl } from '../src/lib/parse.ts';

const WITCH = 'https://fenrirealm.com/series/is-it-weird-for-a-guy-to-apply-to-a-witch-school/486';
const REGRESSION = 'https://fenrirealm.com/series/absolute-regression/838';

describe('suggestDefaultsForUrl', () => {
  test('scopes match pattern to the series, stripping the chapter number', () => {
    expect(suggestDefaultsForUrl(WITCH).matchPattern).toBe(
      'fenrirealm.com/series/is-it-weird-for-a-guy-to-apply-to-a-witch-school'
    );
    expect(suggestDefaultsForUrl(REGRESSION).matchPattern).toBe(
      'fenrirealm.com/series/absolute-regression'
    );
  });

  test('series patterns do not cross-match other series on the same site', () => {
    const a = suggestDefaultsForUrl(WITCH).matchPattern;
    const b = suggestDefaultsForUrl(REGRESSION).matchPattern;
    expect(REGRESSION.toLowerCase().includes(a.toLowerCase())).toBe(false);
    expect(WITCH.toLowerCase().includes(b.toLowerCase())).toBe(false);
    expect(WITCH.toLowerCase().includes(a.toLowerCase())).toBe(true);
  });

  test('suggested regex detects the chapter in the source URL', () => {
    for (const url of [WITCH, REGRESSION]) {
      const { urlRegex } = suggestDefaultsForUrl(url);
      expect(urlRegex).not.toBe('');
      expect(tryUrl(url, urlRegex).chapter).toBe(Number(url.split('/').pop()));
    }
  });

  test('handles trailing slashes, query strings and decimals', () => {
    expect(suggestDefaultsForUrl('https://x.com/s/foo/12/').matchPattern).toBe('x.com/s/foo');
    expect(suggestDefaultsForUrl('https://x.com/s/foo/12?from=home').matchPattern).toBe('x.com/s/foo');
    expect(suggestDefaultsForUrl('https://x.com/s/foo/42.5').matchPattern).toBe('x.com/s/foo');
    const { urlRegex } = suggestDefaultsForUrl('https://x.com/s/foo/42.5');
    expect(tryUrl('https://x.com/s/foo/42.5', urlRegex).chapter).toBe(42.5);
    // query-string style chapter URLs keep the full path as the series id
    expect(suggestDefaultsForUrl('https://x.com/read?novel=foo&c=12').matchPattern).toBe('x.com/read');
  });

  test('falls back gracefully on garbage input', () => {
    expect(suggestDefaultsForUrl('not a url')).toEqual({ matchPattern: '', urlRegex: '' });
    expect(suggestDefaultsForUrl('about:blank').urlRegex).toBe('');
  });
});
