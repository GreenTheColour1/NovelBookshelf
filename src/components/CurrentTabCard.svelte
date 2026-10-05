<script lang="ts">
  import type { ActiveTab } from '../lib/tabs.js';
  import type { Novel } from '../lib/types.js';
  import type { ChapterResult } from '../lib/parse.js';

  interface Props {
    tab: ActiveTab | null;
    detection: ChapterResult | null;
    detecting: boolean;
    matched: Novel | null;
    ondetect: () => void;
    onsaveNew: () => void;
    onupdate: () => void;
  }

  let { tab, detection, detecting, matched, ondetect, onsaveNew, onupdate }: Props = $props();
</script>

<section class="card">
  <div class="spread">
    <h1 style="margin:0">Current tab</h1>
    <button class="small" onclick={ondetect} disabled={!tab || detecting}>
      {detecting ? 'Detecting…' : 'Re-detect'}
    </button>
  </div>
  {#if !tab || !tab.url}
    <p class="muted">No readable tab. Open a novel chapter, then open this popup.</p>
  {:else if matched}
    <p style="margin:6px 0"><strong>{matched.name}</strong>
      <span class="muted">
        {#if matched.lastChapter != null}
          · saved Ch {matched.lastChapter}
        {/if}
        {#if detection?.chapter != null}
          → Ch {detection.chapter}
        {/if}
      </span>
    </p>
    {#if detection?.chapter != null}
      <div class="row">
        <button class="primary" onclick={onupdate}>Mark Ch {detection.chapter} as read</button>
      </div>
    {:else}
      <p class="muted" style="margin:6px 0">Couldn't detect the chapter here. Tune it in the novel's Edit form.</p>
    {/if}
  {:else}
    <p class="muted" style="margin:6px 0">This page doesn't match a tracked novel.</p>
    <div class="row">
      <button class="primary" onclick={onsaveNew}>Save current page as novel</button>
    </div>
  {/if}
</section>
