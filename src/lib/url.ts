export interface UrlSuggestions {
  /**
   * Series-specific substring pattern: host + path with any trailing
   * chapter number stripped, e.g.
   * `fenrirealm.com/series/is-it-weird-for-a-guy-to-apply-to-a-witch-school`.
   */
  matchPattern: string;
  /**
   * Tailored URL regex suggestion (first capture group = chapter),
   * or '' when the URL gives no hint.
   */
  urlRegex: string;
}

const TRAILING_NUMBER_SEGMENT = /\/\d+(?:\.\d+)?\/?$/;

/**
 * Derive sensible "Save current page" defaults from a chapter URL.
 * Falls back to hostname-only pattern / empty regex when unsure —
 * the form's live detection will tell the user if it doesn't hit.
 */
export function suggestDefaultsForUrl(rawUrl: string): UrlSuggestions {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { matchPattern: '', urlRegex: '' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { matchPattern: u.hostname, urlRegex: '' };
  }

  let path = u.pathname.replace(/\/+$/, '');
  let chapterStyle: 'trailing-number' | 'chapter-token' | 'none' = 'none';
  if (TRAILING_NUMBER_SEGMENT.test(path)) {
    chapterStyle = 'trailing-number';
    path = path.replace(TRAILING_NUMBER_SEGMENT, '').replace(/\/+$/, '');
  } else if (/chapter[-_/\s]*\d+/i.test(rawUrl)) {
    chapterStyle = 'chapter-token';
  }

  const matchPattern = path ? `${u.hostname}${path}` : u.hostname;
  const urlRegex =
    chapterStyle === 'trailing-number'
      ? '.*\\/(\\d+(?:\\.\\d+)?)(?:[/?#]|$)'
      : chapterStyle === 'chapter-token'
        ? 'chapter[-_/](\\d+)'
        : '';
  return { matchPattern, urlRegex };
}
