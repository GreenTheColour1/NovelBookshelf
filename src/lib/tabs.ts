import browser from 'webextension-polyfill';

export interface ActiveTab {
  id: number | undefined;
  url: string;
  title: string;
}

export async function getActiveTab(): Promise<ActiveTab | null> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab) return null;
  return { id: tab.id, url: tab.url ?? '', title: tab.title ?? '' };
}

/** Read textContent of `selector` in the active tab via on-demand injection. */
export async function querySelectorText(tabId: number | undefined, selector: string): Promise<string | null> {
  if (tabId == null) return null;
  if (!selector.trim()) return null;
  try {
    const results = await browser.scripting.executeScript({
      target: { tabId },
      func: (sel: string) => document.querySelector(sel)?.textContent ?? null,
      args: [selector]
    });
    const first = results?.[0];
    return (first?.result as string | null) ?? null;
  } catch (err) {
    // e.g. chrome:// or about: pages where injection is forbidden
    console.warn('[NovelBookshelf] selector query failed:', err);
    return null;
  }
}

export async function openUrl(url: string, active = true): Promise<void> {
  await browser.tabs.create({ url, active });
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
