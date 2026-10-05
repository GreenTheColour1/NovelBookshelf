<script lang="ts">
  import { onMount } from 'svelte';
  import CurrentTabCard from '../components/CurrentTabCard.svelte';
  import Favicon from '../components/Favicon.svelte';
  import NovelForm from '../components/NovelForm.svelte';
  import NovelList from '../components/NovelList.svelte';
  import ProviderForm from '../components/ProviderForm.svelte';
  import { detectChapter, type ChapterResult } from '../lib/parse.js';
  import {
    createProvider,
    findProviderForUrl,
    hostOfUrl,
    normalizeProviders,
    type Provider
  } from '../lib/providers.js';
  import {
    loadNovels,
    loadProviders,
    mirrorLocal,
    mirrorLocalProviders,
    onNovelsChanged,
    onProvidersChanged,
    saveNovels,
    saveProviders,
    syncUsage
  } from '../lib/storage.js';
  import { downloadJson, getActiveTab, openUrl, querySelectorText, type ActiveTab } from '../lib/tabs.js';
  import { createNovel, findBestMatch, normalizeNovels, type Novel } from '../lib/types.js';
  import { suggestDefaultsForUrl } from '../lib/url.js';

  let novels = $state<Novel[]>([]);
  let providers = $state<Provider[]>([]);
  let loading = $state(true);
  let tab = $state<ActiveTab | null>(null);
  let detection = $state<ChapterResult | null>(null);
  let detecting = $state(false);
  let warning = $state<string | null>(null);
  let query = $state('');
  let sortBy = $state<'recent' | 'name'>('recent');
  let editing = $state<Novel | null>(null);
  let isNew = $state(false);
  let editingProvider = $state<Provider | null>(null);
  let isNewProvider = $state(false);
  let view = $state<'bookshelf' | 'providers' | 'backup'>('bookshelf');
  let fileInput: HTMLInputElement | undefined = $state();

  let matched = $derived(tab ? findBestMatch(novels, tab.url) : null);
  /** Provider handling the site of the novel currently being added/edited. */
  let formProvider = $derived(
    editing ? findProviderForUrl(providers, isNew ? tab?.url : editing.lastUrl) : null
  );
  let formProviderHost = $derived(
    editing ? hostOfUrl(isNew ? tab?.url : editing.lastUrl) : ''
  );
  let visible = $derived(
    novels
      .filter((n) => (query.trim() ? n.name.toLowerCase().includes(query.trim().toLowerCase()) : true))
      .sort((a, b) => (sortBy === 'name' ? a.name.localeCompare(b.name) : b.updatedAt - a.updatedAt))
  );
  let usage = $derived(syncUsage(novels, providers));

  async function refreshTabAndDetect() {
    detecting = true;
    try {
      tab = await getActiveTab();
      detection = null;
      if (tab && matched) {
        let selectorText: string | null = null;
        if (matched.selector?.trim()) selectorText = await querySelectorText(tab.id, matched.selector);
        detection = detectChapter({
          url: tab.url,
          urlRegex: matched.urlRegex,
          selectorText,
          selectorRegex: matched.selectorRegex,
          hasSelector: !!matched.selector?.trim()
        });
      }
    } finally {
      detecting = false;
    }
  }

  async function persist(next: Novel[]) {
    novels = next;
    const res = await saveNovels(next);
    warning = res.warning ?? null;
    if (res.synced) await mirrorLocal(next);
  }

  async function handleUpdateFromTab() {
    if (!matched || !tab || detection?.chapter == null) return;
    await persist(
      novels.map((n) =>
        n.id === matched!.id ? { ...n, lastChapter: detection!.chapter, lastUrl: tab!.url, updatedAt: Date.now() } : n
      )
    );
    await refreshTabAndDetect();
  }

  async function persistProviders(next: Provider[]) {
    providers = next;
    const res = await saveProviders(next);
    warning = res.warning ?? null;
    if (res.synced) await mirrorLocalProviders(next);
  }

  async function handleSaveNew() {
    if (!tab) return;
    const suggested = suggestDefaultsForUrl(tab.url);
    const provider = findProviderForUrl(providers, tab.url);
    // Prefer the provider's title selector for a clean novel name.
    let name = tab.title || suggested.matchPattern || 'New novel';
    if (provider?.titleSelector?.trim()) {
      const extracted = (await querySelectorText(tab.id, provider.titleSelector))?.trim().slice(0, 140);
      if (extracted) name = extracted;
    }
    editing = createNovel({
      name,
      matchPattern: suggested.matchPattern,
      lastUrl: tab.url,
      urlRegex: provider?.urlRegex || suggested.urlRegex,
      selector: provider?.selector ?? '',
      selectorRegex: provider?.selectorRegex ?? ''
    });
    isNew = true;
  }

  async function handleSaveForm(draft: Novel) {
    if (Number.isNaN(draft.lastChapter as unknown as number)) draft.lastChapter = null;
    draft.updatedAt = Date.now();
    if (isNew) await persist([...novels, draft]);
    else await persist(novels.map((n) => (n.id === draft.id ? draft : n)));
    editing = null;
    isNew = false;
    await refreshTabAndDetect();
  }

  async function handleDelete(novel: Novel) {
    if (!confirm(`Remove "${novel.name}" from your bookshelf?`)) return;
    await persist(novels.filter((n) => n.id !== novel.id));
    if (editing?.id === novel.id) editing = null;
  }

  async function handleSaveProvider(draft: Novel) {
    const host = hostOfUrl(tab?.url ?? draft.lastUrl);
    if (!host) return;
    const existing = findProviderForUrl(providers, tab?.url ?? draft.lastUrl);
    if (existing) {
      // Refresh the existing provider's settings from the tuned novel.
      await persistProviders(
        providers.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                urlRegex: draft.urlRegex ?? '',
                selector: draft.selector ?? '',
                selectorRegex: draft.selectorRegex ?? '',
                updatedAt: Date.now()
              }
            : p
        )
      );
      return;
    }
    await persistProviders([
      ...providers,
      createProvider({
        host,
        urlRegex: draft.urlRegex,
        selector: draft.selector,
        selectorRegex: draft.selectorRegex
      })
    ]);
  }

  function handleAddProvider() {
    editingProvider = createProvider({ host: hostOfUrl(tab?.url) });
    isNewProvider = true;
  }

  async function handleSaveProviderForm(draft: Provider) {
    draft.updatedAt = Date.now();
    if (isNewProvider) await persistProviders([...providers, draft]);
    else await persistProviders(providers.map((p) => (p.id === draft.id ? draft : p)));
    editingProvider = null;
    isNewProvider = false;
  }

  async function handleDeleteProvider(provider: Provider) {
    if (!confirm(`Remove provider "${provider.name}"? Novels already saved keep their own settings.`)) return;
    await persistProviders(providers.filter((p) => p.id !== provider.id));
    if (editingProvider?.id === provider.id) editingProvider = null;
  }

  function handleExport() {
    downloadJson(`novelbookshelf-${new Date().toISOString().slice(0, 10)}.json`, {
      app: 'novelbookshelf',
      version: 1,
      exportedAt: new Date().toISOString(),
      novels,
      providers
    });
  }

  function handleImportFile(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        // Legacy format: bare novels array.
        const novelList = Array.isArray(parsed) ? parsed : parsed.novels;
        if (!Array.isArray(novelList)) throw new Error('bad file');
        await persist(normalizeNovels(novelList as Novel[]));
        const providerList = Array.isArray(parsed) ? [] : (parsed.providers ?? []);
        if (!Array.isArray(providerList)) throw new Error('bad file');
        await persistProviders(normalizeProviders(providerList as Provider[]));
      } catch {
        alert('Could not import that file. Expected a NovelBookshelf JSON backup.');
      } finally {
        if (fileInput) fileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  onMount(() => {
    let offNovels: (() => void) | undefined;
    let offProviders: (() => void) | undefined;
    (async () => {
      novels = await loadNovels();
      providers = await loadProviders();
      loading = false;
      offNovels = onNovelsChanged((next) => {
        novels = next;
      });
      offProviders = onProvidersChanged((next) => {
        providers = next;
      });
      await refreshTabAndDetect();
    })();
    return () => {
      offNovels?.();
      offProviders?.();
    };
  });
</script>

<h1>📚 NovelBookshelf</h1>

{#if warning}
  <div class="warn">{warning}</div>
{/if}

{#if loading}
  <p class="muted">Loading…</p>
{:else}
  <div class="tabs" role="tablist" aria-label="Sections">
    <button role="tab" aria-selected={view === 'bookshelf'} class:active={view === 'bookshelf'} onclick={() => (view = 'bookshelf')}>Bookshelf ({novels.length})</button>
    <button role="tab" aria-selected={view === 'providers'} class:active={view === 'providers'} onclick={() => (view = 'providers')}>Providers ({providers.length})</button>
    <button role="tab" aria-selected={view === 'backup'} class:active={view === 'backup'} onclick={() => (view = 'backup')}>Backup</button>
  </div>

  {#if view === 'bookshelf'}
  <CurrentTabCard
    {tab}
    {detection}
    {detecting}
    {matched}
    ondetect={refreshTabAndDetect}
    onsaveNew={handleSaveNew}
    onupdate={handleUpdateFromTab}
  />

  {#if editing}
    <div style="margin-top:10px">
      {#key editing.id + (isNew ? '-new' : '-edit')}
        <NovelForm
          initial={editing}
          heading={isNew ? 'Add novel' : `Edit — ${editing.name}`}
          tab={tab}
          provider={formProvider}
          providers={providers}
          providerHost={formProviderHost}
          onsave={handleSaveForm}
          oncancel={() => { editing = null; isNew = false; }}
          onsaveprovider={handleSaveProvider}
        />
      {/key}
    </div>
  {/if}

  <div class="row" style="margin-bottom:8px;margin-top:10px">
    <input bind:value={query} placeholder="Search novels…" aria-label="Search novels" />
    <select bind:value={sortBy} aria-label="Sort novels" style="max-width:110px">
      <option value="recent">Recent</option>
      <option value="name">Name</option>
    </select>
  </div>

  <NovelList
    novels={visible}
    {query}
    onopen={(url) => openUrl(url)}
    onedit={(n) => { editing = { ...n }; isNew = false; }}
    ondelete={handleDelete}
  />

  {:else if view === 'providers'}
  {#if editingProvider}
    <div style="margin-bottom:8px">
      {#key editingProvider.id + (isNewProvider ? '-new' : '-edit')}
        <ProviderForm
          initial={editingProvider}
          heading={isNewProvider ? 'Add provider' : `Edit — ${editingProvider.name}`}
          onsave={handleSaveProviderForm}
          oncancel={() => { editingProvider = null; isNewProvider = false; }}
        />
      {/key}
    </div>
  {/if}
  {#if providers.length === 0 && !editingProvider}
    <p class="muted">No providers yet. Tune a novel's detection settings, then save them as a provider — future novels from that site inherit them.</p>
  {:else}
    <ul style="list-style:none;margin:0 0 8px;padding:0;display:grid;gap:8px">
      {#each providers as p (p.id)}
        <li class="card">
          <div class="spread">
            <span class="row" style="gap:6px"><Favicon host={p.host} size={16} /><strong>{p.name}</strong></span>
            <span class="muted mono">{p.host}</span>
          </div>
          <div class="row" style="margin-top:6px">
            <span style="flex:1"></span>
            <button class="small" onclick={() => { editingProvider = { ...p }; isNewProvider = false; }}>Edit</button>
            <button class="small danger" onclick={() => handleDeleteProvider(p)}>Delete</button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  {#if !editingProvider}
    <div class="row" style="margin-bottom:8px">
      <button class="small" onclick={handleAddProvider}>Add provider for current site</button>
    </div>
  {/if}

  {:else}
  <div class="row" style="flex-wrap:wrap;margin-top:10px">
    <button class="small" onclick={handleExport} disabled={novels.length === 0 && providers.length === 0}>Export JSON</button>
    <button class="small" onclick={() => fileInput?.click()}>Import JSON</button>
    <input
      type="file"
      accept="application/json,.json"
      style="display:none"
      bind:this={fileInput}
      onchange={handleImportFile}
    />
    <span class="muted" title="storage.sync quota">Sync: {(usage.bytes / 1024).toFixed(1)} / 100 KB</span>
  </div>
  {/if}
{/if}
