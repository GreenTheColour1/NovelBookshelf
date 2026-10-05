import { describe, expect, test } from 'bun:test';
import {
  createProvider,
  findProviderForUrl,
  hostOfUrl,
  normalizeProviders,
  providerDetection,
  providerMatchesUrl
} from '../src/lib/providers.ts';

describe('hostOfUrl', () => {
  test('extracts lowercase hostname', () => {
    expect(hostOfUrl('https://FenriRealm.com/series/x/486')).toBe('fenrirealm.com');
  });
  test('returns empty on garbage', () => {
    expect(hostOfUrl(undefined)).toBe('');
    expect(hostOfUrl('not a url')).toBe('');
  });
});

describe('providerMatchesUrl', () => {
  const p = createProvider({ host: 'fenrirealm.com' });
  test('matches exact host', () => {
    expect(providerMatchesUrl(p, 'https://fenrirealm.com/series/a/1')).toBe(true);
  });
  test('matches subdomains but not lookalikes', () => {
    expect(providerMatchesUrl(p, 'https://m.fenrirealm.com/series/a/1')).toBe(true);
    expect(providerMatchesUrl(p, 'https://fenrirealm.com.evil.com/x')).toBe(false);
    expect(providerMatchesUrl(p, 'https://other.com/series/a/1')).toBe(false);
  });
});

describe('findProviderForUrl', () => {
  const providers = normalizeProviders([
    { host: 'fenrirealm.com', name: 'Fenrirealm' },
    { host: 'example.com', name: 'Example' }
  ] as never);
  test('finds the provider for a chapter URL', () => {
    expect(
      findProviderForUrl(
        providers,
        'https://fenrirealm.com/series/absolute-regression/838'
      )?.name
    ).toBe('Fenrirealm');
  });
  test('returns null for unknown sites', () => {
    expect(findProviderForUrl(providers, 'https://unknown.org/x')).toBeNull();
  });
});

describe('createProvider / normalizeProviders', () => {
  test('lowercases host and defaults name to host', () => {
    const p = createProvider({ host: 'FenriRealm.COM' });
    expect(p.host).toBe('fenrirealm.com');
    expect(p.name).toBe('fenrirealm.com');
  });
  test('backfills missing detection fields', () => {
    const [p] = normalizeProviders([{ host: 'x.com' }] as never);
    expect(p).toMatchObject({ urlRegex: '', selector: '', selectorRegex: '', titleSelector: '' });
  });
});

describe('providerDetection', () => {
  test('carries the detection settings', () => {
    const p = createProvider({ host: 'x.com', urlRegex: 'r', selector: 's', selectorRegex: 'sr' });
    expect(providerDetection(p)).toEqual({ urlRegex: 'r', selector: 's', selectorRegex: 'sr', titleSelector: '' });
  });
});
