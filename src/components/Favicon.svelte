<script lang="ts">
  interface Props {
    host: string;
    size?: number;
  }

  let { host, size = 16 }: Props = $props();

  // Remounted per host via {#key}, so `failed` never goes stale across rows.
  let failed = $state(false);
</script>

{#key host}
  {#if !failed && host}
    <img
      src={`https://${host}/favicon.ico`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerpolicy="no-referrer"
      onerror={() => (failed = true)}
      style="border-radius:4px;flex:none"
    />
  {:else}
    <span
      aria-hidden="true"
      style={`display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:4px;background:var(--accent);color:var(--accent-fg);font-size:${Math.max(9, size - 6)}px;font-weight:700;flex:none`}
    >{(host[0] ?? '?').toUpperCase()}</span>
  {/if}
{/key}

<style>
  img {
    vertical-align: -3px;
  }
</style>
