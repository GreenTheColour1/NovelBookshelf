# NovelBookshelf 📚

Firefox extension (Manifest V3, Svelte 5 popup) that tracks the novels you're reading:
novel name, last chapter read, and per-novel rules for finding the chapter number
from the URL or the page.

## Dev

```bash
bun install
bun test            # unit tests (chapter parsing, URL matching)
bun run check       # svelte-check
bun run build       # typecheck + vite build -> dist/
```

`dist/` is the loadable extension.

### Load temporarily in Firefox

1. `bun run build`
2. Open `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on…**
   → pick `dist/manifest.json`.
3. Or: `bun run webext:run` (needs Firefox; see `web-ext-config.mjs`).

### Lint / package

```bash
bun run webext:lint    # 0 errors expected (1 Svelte-runtime innerHTML warning is benign)
bun run webext:build   # -> web-ext-artifacts/novelbookshelf-*.zip
```

## How tracking works

Each novel stores:

| Field | Meaning |
|---|---|
| `name` | Display name |
| `matchPattern` | Substring (or `*` wildcard) matched against the tab URL |
| `urlRegex` | Regex over the URL; first capture group = chapter, e.g. `chapter-(\d+)` |
| `selector` | CSS selector whose text holds the chapter, e.g. `.chapter-title` |
| `selectorRegex` | Optional digits extraction (default: first number) |
| `lastChapter` / `lastUrl` | Where you left off; **Open** jumps back there |
| `trackerUrl` | Optional series tracker page, opened via the **Tracker** button |

Detection priority: **URL regex first, then selector**. When several novels
match a page, the **longest (most specific) match pattern wins**, so a
hostname-only pattern can't shadow a precise series pattern on the same site.
The popup's **Current tab** card shows the matched novel, detected chapter +
source, and offers **Mark as read** / **Save current page as novel**.

When adding or editing a novel, the form live-tests your detection settings
against the current tab (debounced): if a chapter is detected it fills the
chapter field automatically — a failed detection leaves the field untouched,
and a value you typed yourself is never overwritten.

## Auto-update on navigation

The background script watches tab navigations (`tabs.onUpdated`). When a page
belongs to a novel with auto-track enabled and the detected chapter is
**greater** than the saved one, `lastChapter` + `lastUrl` move forward
automatically. It never moves backwards, and re-detecting the same chapter is
a no-op. Each novel has an **auto-update checkbox** in its add/edit form to
opt out (useful for table-of-contents pages that would otherwise jump you
ahead).

This needs the `<all_urls>` host permission so the background can read
selector text on any novel site (URL-regex novels work regardless). Firefox
shows an "access your data for all websites" prompt at install because of it.

Data lives in `storage.sync` (Firefox Sync), with automatic fallback to
`storage.local` if sync is full/unavailable — the popup shows a warning and
a live `Sync: x / 100 KB` meter. Use **Export/Import JSON** for backups.

## Providers

A provider captures everything known about a novel site (e.g. `fenrirealm.com`):
the chapter-detection method (URL regex / selector / extract regex) plus an
optional **title selector** naming the novel on chapter pages.

- The **Providers** section lists, adds, edits and deletes providers.
- Tune any novel's settings, then **save/update them as the provider** from the
  bottom of the novel form — or copy another provider's settings via Apply.
- **Save current page as novel** on a known provider pre-fills the detection
  method and names the novel from the title selector, so adding the 2nd, 3rd…
  novel from the same site is one click. Deleting a provider never touches
  novels already saved (they keep their own copy of the settings).

The popup is split into **Bookshelf / Providers / Backup** tabs to keep it
compact; the Current-tab card shows only the matched novel, saved vs.
detected chapter, and the action button.

## Project layout

```
manifest.json          # MV3 manifest (Firefox-only: gecko id, data_collection_permissions)
popup.html             # popup entry
src/popup/             # Svelte popup (main.ts, App.svelte, app.css)
src/components/        # CurrentTabCard, NovelList, NovelForm, ProviderForm, Favicon
src/lib/               # types.ts, parse.ts, storage.ts (sync), tabs.ts, autotrack.ts
                       # url.ts (save-defaults), providers.ts
src/background.ts      # install seed + auto-update on tab navigation
tests/                 # bun test (parse, autotrack, url, providers)
public/icons/          # extension icons
```
