# AGENTS.md — NovelBookshelf

Firefox-only MV3 extension. Svelte 5 popup built with plain `vite-plugin-svelte`
(no SvelteKit). Runtime is Bun; package manager is Bun.

## Verify (in this order)

```bash
bun test          # unit tests, no typecheck involved
bun run check     # svelte-check; must be clean
bun run build     # check + vite build; output is dist/
bunx web-ext lint --source-dir=dist   # expect 0 errors, 1 benign warning (see below)
```

- `tests/` is deliberately excluded from `tsconfig.json`: `bun:test` types are
  not installed, so do not "fix" this by adding tests to the tsconfig.
- The one `UNSAFE_VAR_ASSIGNMENT` (innerHTML) lint warning comes from the Svelte
  runtime's template cloning, not app code. It is expected; do not chase it.
- `dist/` is the loadable extension (`about:debugging` → Load Temporary Add-on
  → `dist/manifest.json`). Never edit `dist/` by hand.

## Build wiring that breaks silently

- `manifest.json` lives at repo root and is copied into `dist/` by the
  `copyManifest` plugin in `vite.config.ts`. Icons come from `public/` via
  Vite's `publicDir`. If the popup loads blank, check these copies first.
- `vite.config.ts` sets `base: './'`. Absolute asset paths (`/popup.js`) do not
  resolve on extension pages — do not remove this.
- Extension CSP bans inline `<script>` (Vite output already complies). Inline
  `<style>` is fine.

## Manifest constraints (all load-bearing)

- Keep **both** `gecko` and `browser_specific_settings.gecko` with the same
  `id`: Firefox reads the former, `web-ext lint` errors without the latter.
- `strict_min_version` is `142.0` because `background.type` needs ≥112 and
  `...data_collection_permissions` needs ≥140/142. Lowering it reintroduces
  lint warnings; the extension genuinely needs those keys.
- `data_collection_permissions: { required: ["none"] }` is mandatory for new
  Firefox extensions — do not remove.
- `host_permissions: ["<all_urls>"]` exists so the background can run
  `scripting.executeScript` for selector-based detection without a user gesture.
  Removing it silently disables selector auto-tracking (URL-regex tracking keeps
  working).

## Architecture notes

- `storage.sync` is the source of truth (`src/lib/storage.ts`), with automatic
  fallback + local mirror when sync is full/unavailable. `sync.set` merges keys,
  so `saveNovels`/`saveProviders` writing single keys is safe.
- Stored data must always pass through `normalize*` (`load*`, `onChanged`,
  import): it backfills fields added after v0.1.0 (`autoTrack`, `trackerUrl`).
- Novel matching is most-specific-wins (`findBestMatch`, longest pattern), not
  first-match — needed because hostname-only patterns overlap series patterns.
- Background auto-update (`src/background.ts`, `tabs.onUpdated`) is
  forward-only (`shouldAutoUpdate`) and idempotent; re-detecting the same
  chapter skips the write.
- Popup↔background share chunks (`storage-*`, `tabs-*`); both import from
  `src/lib/`. `src/lib/tabs.ts` touches `document` only inside functions, so it
  is safe to import from the background module.

## Svelte 5 conventions used here

- Forms (`NovelForm`, `ProviderForm`) snapshot props into local `draft` and rely
  on parent `{#key ...}` remounts per edited item — the
  `state_referenced_locally` ignore is intentional, do not "fix" with `$effect`
  syncing (it causes clobbering loops with live detection).
- `onMount` callbacks must not be `async` when returning a cleanup function;
  use an inner async IIFE (see `App.svelte`).
- New UI state lives in `App.svelte` (`view` tabs); keep the popup to
  `Bookshelf / Providers / Backup` tabs rather than stacking sections.
