/**
 * A provider captures everything known about a novel-hosting site
 * (e.g. fenrirealm.com): how to find the chapter number and how to find
 * the novel's name. Novels saved from a known provider inherit these, so
 * the user only confirms instead of configuring.
 */
export interface Provider {
  id: string;
  /** Display name, e.g. "Fenrirealm". */
  name: string;
  /** Bare hostname, lowercase, e.g. "fenrirealm.com". */
  host: string;
  /** Regex over the chapter URL; first capture group = chapter. */
  urlRegex?: string;
  /** CSS selector whose text holds the chapter number. */
  selector?: string;
  /** Optional regex to extract digits from the selector text. */
  selectorRegex?: string;
  /** CSS selector whose text holds the novel's title on chapter pages. */
  titleSelector?: string;
  updatedAt: number;
  createdAt: number;
}

export function createProvider(partial: Partial<Provider> & { host: string }): Provider {
  const now = Date.now();
  const host = partial.host.trim().toLowerCase();
  return {
    id: partial.id ?? crypto.randomUUID(),
    name: partial.name?.trim() || host,
    host,
    urlRegex: partial.urlRegex ?? '',
    selector: partial.selector ?? '',
    selectorRegex: partial.selectorRegex ?? '',
    titleSelector: partial.titleSelector ?? '',
    updatedAt: partial.updatedAt ?? now,
    createdAt: partial.createdAt ?? now
  };
}

/** Backfill defaults for providers stored before a field existed. */
export function normalizeProviders(providers: Provider[]): Provider[] {
  return providers.map((p) => ({
    ...p,
    host: (p.host ?? '').trim().toLowerCase(),
    name: p.name?.trim() || (p.host ?? '').trim().toLowerCase(),
    urlRegex: p.urlRegex ?? '',
    selector: p.selector ?? '',
    selectorRegex: p.selectorRegex ?? '',
    titleSelector: p.titleSelector ?? ''
  }));
}

export function hostOfUrl(rawUrl: string | undefined): string {
  if (!rawUrl) return '';
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** Does this provider handle `rawUrl`? Exact host or any subdomain. */
export function providerMatchesUrl(provider: Provider, rawUrl: string | undefined): boolean {
  const host = hostOfUrl(rawUrl);
  if (!host || !provider.host) return false;
  return host === provider.host || host.endsWith(`.${provider.host}`);
}

/** First provider handling `rawUrl`, if any. */
export function findProviderForUrl(
  providers: Provider[],
  rawUrl: string | undefined
): Provider | null {
  if (!rawUrl) return null;
  return providers.find((p) => providerMatchesUrl(p, rawUrl)) ?? null;
}

export interface ProviderDetection {
  urlRegex: string;
  selector: string;
  selectorRegex: string;
  titleSelector: string;
}

/** Detection settings carried from a provider onto a novel draft. */
export function providerDetection(provider: Provider): ProviderDetection {
  return {
    urlRegex: provider.urlRegex ?? '',
    selector: provider.selector ?? '',
    selectorRegex: provider.selectorRegex ?? '',
    titleSelector: provider.titleSelector ?? ''
  };
}
