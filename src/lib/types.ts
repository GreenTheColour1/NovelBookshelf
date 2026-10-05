export interface Novel {
  id: string;
  name: string;
  /** Substring matched against the tab URL. Supports `*` wildcards. */
  matchPattern: string;
  /** Regex applied to the page URL. First capture group is the chapter. */
  urlRegex?: string;
  /** CSS selector whose textContent holds the chapter. */
  selector?: string;
  /** Optional regex to extract digits from the selector text. Defaults to first number. */
  selectorRegex?: string;
  lastChapter: number | null;
  /** URL to jump back to. */
  lastUrl: string;
  /** Optional series tracker page (e.g. NovelUpdates), opened via the Tracker button. */
  trackerUrl: string;
  /** Whether background auto-update on navigation is enabled for this novel. */
  autoTrack: boolean;
  updatedAt: number;
  createdAt: number;
}

export function createNovel(partial: Partial<Novel> & { name: string; lastUrl: string }): Novel {
  const now = Date.now();
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name,
    matchPattern: partial.matchPattern ?? '',
    urlRegex: partial.urlRegex ?? '',
    selector: partial.selector ?? '',
    selectorRegex: partial.selectorRegex ?? '',
    lastChapter: partial.lastChapter ?? null,
    lastUrl: partial.lastUrl,
    trackerUrl: partial.trackerUrl ?? '',
    autoTrack: partial.autoTrack ?? true,
    updatedAt: partial.updatedAt ?? now,
    createdAt: partial.createdAt ?? now
  };
}

/**
 * Backfill defaults for novels stored before a field existed
 * (e.g. `autoTrack` added after v0.1.0). Always normalize stored data.
 */
export function normalizeNovels(novels: Novel[]): Novel[] {
  return novels.map((n) => ({ ...n, trackerUrl: n.trackerUrl ?? '', autoTrack: n.autoTrack ?? true }));
}

export const DEFAULT_SELECTOR_REGEX = '(\\d+(?:\\.\\d+)?)';

export function matchPatternToRegExp(pattern: string): RegExp | null {
  const trimmed = pattern.trim();
  if (!trimmed) return null;
  // Escape regex chars except `*`, then turn `*` into `.*`
  const escaped = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  try {
    return new RegExp(escaped, 'i');
  } catch {
    return null;
  }
}

/** Does this novel "own" the given tab URL? */
export function novelMatchesUrl(novel: Novel, url: string | undefined): boolean {
  if (!url) return false;
  if (!novel.matchPattern.trim()) return false;
  if (novel.matchPattern.includes('*')) {
    return matchPatternToRegExp(novel.matchPattern)?.test(url) ?? false;
  }
  return url.toLowerCase().includes(novel.matchPattern.trim().toLowerCase());
}

/**
 * Best owner of `url`: among all matching novels, the longest (most
 * specific) match pattern wins. Keeps a sloppy hostname-only pattern from
 * shadowing a precise series pattern on the same site.
 */
export function findBestMatch(novels: Novel[], url: string | undefined): Novel | null {
  if (!url) return null;
  let best: Novel | null = null;
  let bestLen = -1;
  for (const novel of novels) {
    if (!novelMatchesUrl(novel, url)) continue;
    const len = novel.matchPattern.trim().length;
    if (len > bestLen) {
      best = novel;
      bestLen = len;
    }
  }
  return best;
}
