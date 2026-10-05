import { DEFAULT_SELECTOR_REGEX } from './types.js';

export type ChapterSource = 'url' | 'selector' | null;

export interface ChapterResult {
  chapter: number | null;
  source: ChapterSource;
  /** The raw matched string (regex match or element text), for UI debugging. */
  raw: string | null;
}

/** Extract the first parseable number from a regex match array. Prefers capture group 1. */
function numberFromMatch(match: RegExpMatchArray | null): number | null {
  if (!match) return null;
  const candidate = match[1] ?? match[0];
  if (candidate == null) return null;
  const n = Number.parseFloat(candidate);
  return Number.isFinite(n) ? n : null;
}

function safeRegExp(pattern: string): RegExp | null {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

export function tryUrl(url: string, urlRegex?: string): { chapter: number | null; raw: string | null } {
  if (!urlRegex?.trim()) return { chapter: null, raw: null };
  const re = safeRegExp(urlRegex);
  if (!re) return { chapter: null, raw: null };
  const m = url.match(re);
  if (!m) return { chapter: null, raw: null };
  return { chapter: numberFromMatch(m), raw: m[0] ?? null };
}

export function trySelectorText(
  text: string | null | undefined,
  selectorRegex?: string
): { chapter: number | null; raw: string | null } {
  if (text == null) return { chapter: null, raw: null };
  const pattern = selectorRegex?.trim() ? selectorRegex : DEFAULT_SELECTOR_REGEX;
  const re = safeRegExp(pattern);
  if (!re) return { chapter: null, raw: text.slice(0, 200) };
  const m = text.match(re);
  if (!m) return { chapter: null, raw: text.slice(0, 200) };
  return { chapter: numberFromMatch(m), raw: m[0] ?? null };
}

export interface ParseInput {
  url: string;
  urlRegex?: string;
  selectorText?: string | null;
  selectorRegex?: string;
  hasSelector: boolean;
}

/**
 * URL regex wins over selector (user picks priority implicitly by filling
 * only one, or URL first when both are set).
 */
export function detectChapter(input: ParseInput): ChapterResult {
  const fromUrl = tryUrl(input.url, input.urlRegex);
  if (fromUrl.chapter != null) {
    return { chapter: fromUrl.chapter, source: 'url', raw: fromUrl.raw };
  }
  if (input.hasSelector) {
    const fromSel = trySelectorText(input.selectorText, input.selectorRegex);
    if (fromSel.chapter != null) {
      return { chapter: fromSel.chapter, source: 'selector', raw: fromSel.raw };
    }
    return { chapter: null, source: null, raw: fromSel.raw };
  }
  return { chapter: null, source: null, raw: fromUrl.raw };
}
