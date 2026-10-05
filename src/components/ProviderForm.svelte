<script lang="ts">
  import type { Provider } from '../lib/providers.js';

  interface Props {
    initial: Provider;
    heading: string;
    onsave: (p: Provider) => void;
    oncancel: () => void;
  }

  let { initial, heading, onsave, oncancel }: Props = $props();

  // Local editable copy. Parent remounts this component per provider via {#key}.
  // svelte-ignore state_referenced_locally
  let draft = $state({ ...initial });
</script>

<section class="card">
  <h1 style="margin:0 0 8px">{heading}</h1>
  <div style="display:grid;gap:8px">
    <label>Provider name
      <input bind:value={draft.name} placeholder="e.g. Fenrirealm" />
    </label>
    <label>Site hostname
      <input class="mono" bind:value={draft.host} placeholder="fenrirealm.com" autocapitalize="off" spellcheck="false" />
    </label>
    <label>URL regex — first capture group = chapter (optional)
      <input class="mono" bind:value={draft.urlRegex} placeholder=".*\/(\d+)(?:[/?#]|$)" />
    </label>
    <label>Page CSS selector holding chapter (optional)
      <input class="mono" bind:value={draft.selector} placeholder=".chapter-title" />
    </label>
    <label>Selector extract regex (optional, default: first number)
      <input class="mono" bind:value={draft.selectorRegex} placeholder="(\d+(?:\.\d+)?)" />
    </label>
    <label>Title selector — novel name on chapter pages (optional)
      <input class="mono" bind:value={draft.titleSelector} placeholder=".novel-title a" />
    </label>
    <div class="row">
      <button
        class="primary"
        disabled={!draft.host.trim()}
        onclick={() => onsave({ ...draft, host: draft.host.trim().toLowerCase(), name: draft.name.trim() || draft.host.trim().toLowerCase() })}
      >Save</button>
      <button onclick={oncancel}>Cancel</button>
    </div>
    <p class="muted">Novels saved from this site inherit these settings. Fill either URL regex or selector (or both — URL wins).</p>
  </div>
</section>
