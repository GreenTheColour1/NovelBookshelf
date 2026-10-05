// Background module (MV3, Firefox event-page style).
// Owns automatic chapter tracking: whenever a tab navigates to a page that
// belongs to an auto-tracked novel and the detected chapter is greater than
// the saved one, the saved chapter + URL move forward. Never moves backwards.

import browser from 'webextension-polyfill';
import { findAutoTrackedNovel, shouldAutoUpdate } from './lib/autotrack.js';
import { detectChapter } from './lib/parse.js';
import { loadNovels, mirrorLocal, saveNovels } from './lib/storage.js';
import { querySelectorText } from './lib/tabs.js';

browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Seed empty list so sync area exists from the start.
    const existing = await browser.storage.sync.get('novels');
    if (!Array.isArray(existing['novels'])) {
      await browser.storage.sync.set({ novels: [] });
    }
  }
});

function isTrackableUrl(url: string | undefined): url is string {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'));
}

async function maybeAutoUpdate(tabId: number, url: string): Promise<void> {
  const novels = await loadNovels();
  const novel = findAutoTrackedNovel(novels, url);
  if (!novel) return;

  let selectorText: string | null = null;
  if (novel.selector?.trim()) {
    // Requires host permission for the page (see manifest host_permissions).
    selectorText = await querySelectorText(tabId, novel.selector);
  }

  const detected = detectChapter({
    url,
    urlRegex: novel.urlRegex,
    selectorText,
    selectorRegex: novel.selectorRegex,
    hasSelector: !!novel.selector?.trim()
  });
  if (!shouldAutoUpdate(novel.lastChapter, detected.chapter)) return;

  const next = novels.map((n) =>
    n.id === novel.id
      ? { ...n, lastChapter: detected.chapter, lastUrl: url, updatedAt: Date.now() }
      : n
  );
  const res = await saveNovels(next);
  if (res.synced) await mirrorLocal(next);
}

// Fires on navigations (changeInfo.url) and full page loads (status complete).
// Handler is idempotent: re-detecting the same chapter is a no-op write skip.
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const url = changeInfo.url ?? (changeInfo.status === 'complete' ? tab.url : undefined);
  if (!isTrackableUrl(url)) return;
  void maybeAutoUpdate(tabId, url).catch((err) =>
    console.warn('[NovelBookshelf] auto-update failed:', err)
  );
});
