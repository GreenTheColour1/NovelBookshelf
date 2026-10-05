<script lang="ts">
  import { shouldAutofillChapter } from '../lib/autotrack.js';
  import { detectChapter } from '../lib/parse.js';
  import { providerDetection, type Provider } from '../lib/providers.js';
  import { querySelectorText, type ActiveTab } from '../lib/tabs.js';
  import type { Novel } from '../lib/types.js';

  interface Props {
    initial: Novel;
    heading: string;
    tab: ActiveTab | null;
    /** Provider handling the current site, if one is saved. */
    provider: Provider | null;
    /** All providers, offered for one-click settings copy. */
    providers: Provider[];
    /** Hostname a new provider would be saved under ('' hides the button). */
    providerHost: string;
    onsave: (n: Novel) => void;
    oncancel: () => void;
    onsaveprovider: (draft: Novel) => void;
  }

  let {
    initial,
    heading,
    tab,
    provider,
    providers,
    providerHost,
    onsave,
    oncancel,
    onsaveprovider
  }: Props = $props();

  // Local editable copy. Parent remounts this component per novel via {#key},
  // so snapshotting the prop once is intentional.
  // svelte-ignore state_referenced_locally
  let draft = $state({ ...initial });

  // Live detection: whenever a detection setting changes, retry against the
  // current tab and auto-fill the chapter field. A failed detection never
  // clears the field, and a manually typed value is never overwritten.
  let detectStatus = $state<string | null>(null);
  let lastAutoFilled = $state<number | null>(null);
  let runId = 0;
  let applyId = $state('');

  function applySelectedProvider(): void {
    const selected = providers.find((p) => p.id === applyId);
    if (!selected) return;
    draft = { ...draft, ...providerDetection(selected) };
    applyId = '';
  }

  async function runLiveDetection(): Promise<void> {
    const my = ++runId;
    const url = tab?.url ?? '';
    if (!url) {
      detectStatus = null;
      return;
    }
    let selectorText: string | null = null;
    if (draft.selector?.trim()) {
      selectorText = await querySelectorText(tab?.id, draft.selector);
      if (my !== runId) return; // superseded by a newer keystroke
    }
    const result = detectChapter({
      url,
      urlRegex: draft.urlRegex,
      selectorText,
      selectorRegex: draft.selectorRegex,
      hasSelector: !!draft.selector?.trim()
    });
    if (my !== runId) return;
    if (result.chapter != null) {
      detectStatus = `Detected chapter ${result.chapter} from ${result.source === 'url' ? 'the URL' : 'the page'}.`;
      if (shouldAutofillChapter(draft.lastChapter, lastAutoFilled, result.chapter)) {
        draft.lastChapter = result.chapter;
        lastAutoFilled = result.chapter;
      }
    } else {
      detectStatus = 'No chapter detected with these settings — you can fill it in manually.';
    }
  }

  $effect(() => {
    // Subscribe to exactly the detection inputs (plus current tab).
    const _urlRegex = draft.urlRegex;
    const _selector = draft.selector;
    const _selectorRegex = draft.selectorRegex;
    const _tabUrl = tab?.url;
    const _tabId = tab?.id;
    const t = setTimeout(() => void runLiveDetection(), 400);
    return () => clearTimeout(t);
  });
</script>

<section class="card">
  <h1 style="margin:0 0 8px">{heading}</h1>
  <div style="display:grid;gap:8px">
    {#if provider}
      <p class="muted" style="margin:0">Using detection settings from provider “{provider.name}”.</p>
    {:else if providers.length > 0}
      <div class="row">
        <select bind:value={applyId} aria-label="Copy settings from a provider" style="flex:1">
          <option value="">Copy settings from a provider…</option>
          {#each providers as p (p.id)}
            <option value={p.id}>{p.name} ({p.host})</option>
          {/each}
        </select>
        <button class="small" disabled={!applyId} onclick={applySelectedProvider}>Apply</button>
      </div>
    {/if}
    <label>Novel name
      <input bind:value={draft.name} placeholder="e.g. My Great Novel" />
    </label>
    <label>URL match pattern (substring or * wildcard)
      <input class="mono" bind:value={draft.matchPattern} placeholder="example.com/series/my-novel*" />
    </label>
    <label>URL regex — first capture group = chapter (optional)
      <input class="mono" bind:value={draft.urlRegex} placeholder="chapter-(\d+)" />
    </label>
    <label>Page CSS selector holding chapter (optional)
      <input class="mono" bind:value={draft.selector} placeholder=".chapter-title" />
    </label>
    <label>Selector extract regex (optional, default: first number)
      <input class="mono" bind:value={draft.selectorRegex} placeholder="(\d+(?:\.\d+)?)" />
    </label>
    <div class="row">
      <label style="flex:1">Last chapter
        <input
          type="number"
          min="0"
          step="any"
          value={draft.lastChapter ?? ''}
          oninput={(e) => {
            const v = (e.currentTarget as HTMLInputElement).value;
            draft.lastChapter = v === '' ? null : Number(v);
          }}
        />
      </label>
      <label style="flex:2">Last URL (jump target)
        <input class="mono" bind:value={draft.lastUrl} />
      </label>
    </div>
    <label>Tracker URL — series page, opened via the Tracker button (optional)
      <input class="mono" bind:value={draft.trackerUrl} placeholder="https://www.novelupdates.com/series/…" />
    </label>
    {#if detectStatus}
      <p class="muted" role="status" style="margin:0">{detectStatus}</p>
    {/if}
    <label class="row" style="align-items:center">
      <input type="checkbox" bind:checked={draft.autoTrack} style="width:auto" />
      <span>Auto-update chapter when I open a newer page of this novel</span>
    </label>
    <div class="row">
      <button
        class="primary"
        disabled={!draft.name.trim() || !draft.lastUrl.trim()}
        onclick={() => onsave({ ...draft, name: draft.name.trim() })}
      >Save</button>
      <button onclick={oncancel}>Cancel</button>
    </div>
    {#if providerHost}
      <div class="row">
        <button
          class="small"
          onclick={() => onsaveprovider({ ...draft, name: draft.name.trim() })}
        >{provider
            ? `Update provider “${provider.name}” with these settings`
            : `Save these settings as provider for ${providerHost}`}</button>
      </div>
    {/if}
    <p class="muted">Tip: fill either URL regex or selector (or both — URL wins). The chapter field fills in automatically when detection succeeds.</p>
  </div>
</section>
