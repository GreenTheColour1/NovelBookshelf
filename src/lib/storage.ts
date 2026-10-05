import browser from 'webextension-polyfill';
import { normalizeProviders, type Provider } from './providers.js';
import { normalizeNovels, type Novel } from './types.js';

const NOVELS_KEY = 'novels';
const PROVIDERS_KEY = 'providers';
const SYNC_QUOTA_BYTES = 100 * 1024; // storage.sync total quota (~100KB)

export interface SaveResult {
  synced: boolean;
  warning?: string;
}

async function setSyncArea(payload: Record<string, unknown>): Promise<SaveResult> {
  try {
    await browser.storage.sync.set(payload);
    return { synced: true };
  } catch (err) {
    // storage.sync quota exceeded (or sync disabled) -> fall back to local
    // so the user never loses data. Surface a warning in the UI.
    console.warn('[NovelBookshelf] storage.sync failed, falling back to local:', err);
    await browser.storage.local.set(payload);
    // Best-effort: keep local copy in sync too when sync works, so a
    // future sync failure still has recent data.
    return {
      synced: false,
      warning:
        'Firefox Sync storage is full or unavailable — saved locally on this device instead. Try removing old novels or shortening URLs.'
    };
  }
}

/** Thin wrapper so the rest of the app doesn't touch browser.storage directly. */
export async function loadNovels(): Promise<Novel[]> {
  const data = await browser.storage.sync.get(NOVELS_KEY);
  const novels = data[NOVELS_KEY];
  if (!Array.isArray(novels)) return [];
  return normalizeNovels(novels as Novel[]);
}

export async function saveNovels(novels: Novel[]): Promise<SaveResult> {
  return setSyncArea({ [NOVELS_KEY]: novels });
}

export async function loadProviders(): Promise<Provider[]> {
  const data = await browser.storage.sync.get(PROVIDERS_KEY);
  const providers = data[PROVIDERS_KEY];
  if (!Array.isArray(providers)) return [];
  return normalizeProviders(providers as Provider[]);
}

export async function saveProviders(providers: Provider[]): Promise<SaveResult> {
  return setSyncArea({ [PROVIDERS_KEY]: providers });
}

/** Keep a local mirror whenever sync succeeds, as a safety net. */
export async function mirrorLocal(novels: Novel[]): Promise<void> {
  try {
    await browser.storage.local.set({ [NOVELS_KEY]: novels });
  } catch {
    // ignore — local mirror is best-effort
  }
}

/** Keep a local mirror of providers whenever sync succeeds. */
export async function mirrorLocalProviders(providers: Provider[]): Promise<void> {
  try {
    await browser.storage.local.set({ [PROVIDERS_KEY]: providers });
  } catch {
    // ignore — local mirror is best-effort
  }
}

export function estimateSizeBytes(value: unknown): number {
  return new Blob([JSON.stringify(value)]).size;
}

export function syncUsage(novels: Novel[], providers: Provider[] = []): {
  bytes: number;
  quota: number;
  over: boolean;
} {
  const bytes = estimateSizeBytes({ novels, providers });
  return { bytes, quota: SYNC_QUOTA_BYTES, over: bytes > SYNC_QUOTA_BYTES };
}

export function onNovelsChanged(cb: (novels: Novel[]) => void): () => void {
  const listener = (changes: Record<string, browser.Storage.StorageChange>, area: string) => {
    if (area !== 'sync' && area !== 'local') return;
    const change = changes[NOVELS_KEY];
    if (change && Array.isArray(change.newValue)) cb(normalizeNovels(change.newValue as Novel[]));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function onProvidersChanged(cb: (providers: Provider[]) => void): () => void {
  const listener = (changes: Record<string, browser.Storage.StorageChange>, area: string) => {
    if (area !== 'sync' && area !== 'local') return;
    const change = changes[PROVIDERS_KEY];
    if (change && Array.isArray(change.newValue)) cb(normalizeProviders(change.newValue as Provider[]));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
