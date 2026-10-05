<script lang="ts">
  import type { Novel } from '../lib/types.js';

  interface Props {
    novels: Novel[];
    query: string;
    onopen: (url: string) => void;
    onedit: (n: Novel) => void;
    ondelete: (n: Novel) => void;
  }

  let { novels, query, onopen, onedit, ondelete }: Props = $props();

  function timeAgo(ts: number): string {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
</script>

{#if novels.length === 0}
  <p class="muted">{query ? 'No novels match your search.' : 'No novels yet. Save the current page above to start tracking.'}</p>
{:else}
  <ul style="list-style:none;margin:0;padding:0;display:grid;gap:8px">
    {#each novels as novel (novel.id)}
      <li class="card">
        <div class="spread">
          <strong>{novel.name}</strong>
          <span class="muted">{novel.lastChapter != null ? `Ch ${novel.lastChapter}` : 'no chapter yet'}</span>
        </div>
        <div class="muted">Updated {timeAgo(novel.updatedAt)}</div>
        <div class="row" style="margin-top:6px;flex-wrap:wrap">
          <button class="small primary" onclick={() => onopen(novel.lastUrl)}>Open</button>
          {#if novel.trackerUrl}
            <button class="small" title={novel.trackerUrl} onclick={() => onopen(novel.trackerUrl)}>Tracker</button>
          {/if}
          <span style="flex:1"></span>
          <button class="small" onclick={() => onedit(novel)}>Edit</button>
          <button class="small danger" onclick={() => ondelete(novel)}>Delete</button>
        </div>
      </li>
    {/each}
  </ul>
{/if}
