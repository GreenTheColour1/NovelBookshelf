import { findBestMatch, type Novel } from './types.js';

/**
 * Should the saved chapter move forward to `detected`?
 * Only ever moves forward — never backwards, never on null.
 */
export function shouldAutoUpdate(saved: number | null, detected: number | null): boolean {
  if (detected == null || Number.isNaN(detected)) return false;
  if (saved == null) return true;
  return detected > saved;
}

/** Best-matching novel that owns `url` and has auto-track enabled. */
export function findAutoTrackedNovel(novels: Novel[], url: string | undefined): Novel | null {
  if (!url) return null;
  return findBestMatch(
    novels.filter((n) => n.autoTrack !== false),
    url
  );
}

/**
 * Should a freshly detected chapter fill the form's chapter field?
 * Fills when the field is empty, or when it still holds the value a previous
 * auto-fill wrote (i.e. the user hasn't typed their own value since).
 * Never clears: a failed detection leaves the field untouched.
 */
export function shouldAutofillChapter(
  current: number | null,
  lastAutoFilled: number | null,
  detected: number | null
): boolean {
  if (detected == null || Number.isNaN(detected)) return false;
  if (current == null) return true;
  return current === lastAutoFilled;
}
