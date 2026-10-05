import { describe, expect, test } from 'bun:test';
import { findAutoTrackedNovel, shouldAutofillChapter, shouldAutoUpdate } from '../src/lib/autotrack.ts';
import { normalizeNovels } from '../src/lib/types.ts';

describe('shouldAutoUpdate', () => {
  test('moves forward when detected is greater', () => {
    expect(shouldAutoUpdate(10, 11)).toBe(true);
  });
  test('never moves backwards or stays on equal', () => {
    expect(shouldAutoUpdate(11, 11)).toBe(false);
    expect(shouldAutoUpdate(11, 5)).toBe(false);
  });
  test('adopts any chapter when nothing saved yet', () => {
    expect(shouldAutoUpdate(null, 1)).toBe(true);
  });
  test('ignores null / NaN detections', () => {
    expect(shouldAutoUpdate(3, null)).toBe(false);
    expect(shouldAutoUpdate(3, Number.NaN)).toBe(false);
  });
});

describe('findAutoTrackedNovel', () => {
  const novels = normalizeNovels([
    { id: 'a', name: 'A', matchPattern: 'example.com/a', lastUrl: 'https://example.com/a/1' },
    { id: 'b', name: 'B', matchPattern: 'example.com/b', lastUrl: 'https://example.com/b/1', autoTrack: false }
  ] as never);
  test('finds enabled match', () => {
    expect(findAutoTrackedNovel(novels, 'https://example.com/a/chapter-5')?.id).toBe('a');
  });
  test('skips novels with autoTrack disabled', () => {
    expect(findAutoTrackedNovel(novels, 'https://example.com/b/chapter-5')).toBeNull();
  });
  test('returns null when nothing matches', () => {
    expect(findAutoTrackedNovel(novels, 'https://other.com/x')).toBeNull();
  });
  test('prefers the most specific pattern when several match', () => {
    const overlapping = normalizeNovels([
      { id: 'site', name: 'Site', matchPattern: 'fenrirealm.com', lastUrl: 'https://fenrirealm.com/' },
      {
        id: 'series',
        name: 'Series',
        matchPattern: 'fenrirealm.com/series/absolute-regression',
        lastUrl: 'https://fenrirealm.com/series/absolute-regression/1'
      }
    ] as never);
    expect(
      findAutoTrackedNovel(overlapping, 'https://fenrirealm.com/series/absolute-regression/838')?.id
    ).toBe('series');
  });
});

describe('normalizeNovels', () => {
  test('backfills autoTrack: true', () => {
    const [n] = normalizeNovels([{ id: 'x', matchPattern: 'y' }] as never);
    expect(n?.autoTrack).toBe(true);
  });
  test('preserves explicit opt-out', () => {
    const [n] = normalizeNovels([{ id: 'x', autoTrack: false }] as never);
    expect(n?.autoTrack).toBe(false);
  });
  test('backfills trackerUrl and preserves it', () => {
    const [a] = normalizeNovels([{ id: 'x' }] as never);
    expect(a?.trackerUrl).toBe('');
    const [b] = normalizeNovels([{ id: 'y', trackerUrl: 'https://t.example/s' }] as never);
    expect(b?.trackerUrl).toBe('https://t.example/s');
  });
});

describe('shouldAutofillChapter', () => {
  test('fills an empty field on successful detection', () => {
    expect(shouldAutofillChapter(null, null, 12)).toBe(true);
  });
  test('refreshes a value a previous auto-fill wrote', () => {
    expect(shouldAutofillChapter(12, 12, 13)).toBe(true);
  });
  test('never overwrites a manually typed value', () => {
    expect(shouldAutofillChapter(5, null, 12)).toBe(false);
    expect(shouldAutofillChapter(5, 12, 13)).toBe(false);
  });
  test('never fills on failed detection', () => {
    expect(shouldAutofillChapter(null, null, null)).toBe(false);
    expect(shouldAutofillChapter(null, null, Number.NaN)).toBe(false);
  });
});
