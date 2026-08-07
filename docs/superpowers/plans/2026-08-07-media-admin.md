# Implementation Plan — Media Admin (revisar y corregir imagen/gif del diccionario)

Date: 2026-08-07
Spec: `docs/superpowers/specs/2026-08-07-media-admin-design.md` (approved, commit `57bc5fe`)
Version base at start: `v2.15`
Working tree note: there are unrelated uncommitted changes (`coach-analysis.ts`, `Calendar.svelte`, `ExerciseDetail.svelte`, `storage.ts`, `types.ts`, `plan/+page.svelte`, `today/+page.svelte`, `big.spec.cjs`, untracked `AlternativesTab.svelte`). **Do NOT stage or commit those.** Commit only files created/modified by this plan. If a task requires editing one of those files, ask first.

## Summary
Build a dev-only admin route (`/admin`, desktop, `npm run dev`) that lists all 166
dictionary exercises with a live preview of `image` and `gif`, a candidate search
(free-exercise-db images + ExerciseGymGifsDB gifs via GitHub git-trees API, cached in
localStorage) plus a manual URL field, and a "Guardar (n)" flow that edits the
`image:`/`gif:` lines of each dictionary entry directly in
`src/lib/data/exercise-dictionary.ts`, writing the file back through a Vite dev-server
middleware (`POST /__admin/dictionary-save`).

## Goals
- Visual review of every dictionary exercise's image and gif (muscle filter + name search)
- Fix wrong URLs by picking a candidate or pasting a URL manually
- Save = rewrite the dictionary source file (dev only). Production shows the admin read-only
- TDD: pure serialization module + validated algorithm; E2E covers the admin route end-to-end

## Non-goals
- Editing `GYMVISUAL_OVERRIDES` (intentionally unused — edit dictionary entries directly)
- Photo/GIF upload or asset storage
- Bulk-select apply (drafts accumulate, but apply is all-or-nothing)
- Changing `resolveExerciseMedia()`, production routes, or stored-exercise normalization
- GYMVISUAL catalog integration

## Terminology
- **entry** — one object of the exported `EXERCISE_DICTIONARY` array
- **entry range** — `[start, end)` byte offsets of one entry in the source file
- **draft** — in-memory pending change `{ entryId, kind, url }`
- **catalog** — candidate media URLs (images or gifs) loaded from git-trees API
- **`_IMG(dir)`** = `IMG_BASE + dir + "/0.jpg"`; **`_GIF(path)`** = `EX_GIF_BASE + path + ".gif"`

## Background / Verified Facts
- `src/lib/data/exercise-dictionary.ts`: 166 entries; `IMG_BASE`/`EX_GIF_BASE` exported at top (lines 4-5); `GYMVISUAL_OVERRIDES` empty; `resolveExerciseMedia` at ~2599. Entry lines are `    image: _IMG('...'),` / `    gif: _GIF('...'),` (4-space indent, trailing comma)
- **Algorithm validated against the real file**: 166 unique entry ranges; multi-change per entry; byte-identical text after apply-then-revert (commas, indents, section comments like `// ── ESPALDA ──`, blank lines all preserved)
- git-trees API (`https://api.github.com/repos/{owner}/{repo}/git/trees/{ref}?recursive=1`) returns the full tree for both repos (~1.1MB JSON each). Image paths `exercises/<Dir>/0.jpg` (~873); gif paths `<muscle>/<name>.gif` (~1323). `exercises.json`/`db/exercises.json` do NOT exist (404)
- Reusable components: `SearchInput` (`bind:value` + `oninput:(val)=>void`), `Button` (variant primary/secondary/danger/ghost/text, size sm/md, `id`), `ActionRow` (title/description + `button` snippet), `Chip`, `SectionLabel`, `CenterDialog` (`open`, `onclose`). Toast: `toast.show(msg, isError, duration)` from `$lib/stores/ui`. Nav: `goto` from `$app/navigation`, `ROUTES` from `$lib/routes`
- `tests/big.spec.cjs`: single E2E file, guardrail `EXPECTED_STEPS` (do not modify), each `describe` has exactly one `test()`, per-block `SETTINGS` seeded via `seedIndexedDB`
- Dev server is SvelteKit + Vite (`npm run dev`), `sveltekit()` is the only plugin today

## Architecture

```
admin/+page.svelte ── reads EXERCISE_DICTIONARY (reactive, HMR refreshes after save)
   │  filters: muscle + query
   ├─ AdminCard.svelte ── image/gif preview + edit buttons
   │     └─ MediaPicker.svelte (in CenterDialog) ── catalog search + manual URL
   │           └─ catalogs.ts ── git-trees API fetch + localStorage cache
   ├─ editor.ts (store) ── drafts {entryId, kind, url}
   │     └─ POST /__admin/dictionary-save (JSON {changes})
   │           └─ vite.config.ts mediaEditorPlugin ── applyFileText() → write file
   └─ media-file.ts ── findEntryRanges / replaceLineInEntry / fromUrl / toUrl
```

## Task 1 — `src/lib/admin/media-file.ts` (pure serialization module)

### Add `src/lib/admin/media-file.ts`
```ts
import { IMG_BASE, EX_GIF_BASE } from '../data/exercise-dictionary'

export type LineKind = 'image' | 'gif'
export interface ChangeRequest { entryId: string; kind: LineKind; url: string }

export function serializedLine(line: string): LineKind | null {
  const trimmed = line.trim()
  if (/^image\s*:/.test(trimmed)) return 'image'
  if (/^gif\s*:/.test(trimmed)) return 'gif'
  return null
}

export function fromUrl(url: string): string {
  const s = url.trim()
  if (s.startsWith(IMG_BASE)) {
    const dir = s.slice(IMG_BASE.length)
    if (dir.endsWith('/0.jpg')) return `_IMG('${dir.slice(0, -6)}')`
    return `'${s}'`
  }
  if (s.startsWith(EX_GIF_BASE)) {
    const path = s.slice(EX_GIF_BASE.length)
    if (path.endsWith('.gif')) return `_GIF('${path.slice(0, -4)}')`
    return `'${s}'`
  }
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function toUrl(expression: string): string {
  const e = expression.trim()
  const img = e.match(/^_IMG\('([^']+)'\)$/)
  if (img) return IMG_BASE + img[1] + '/0.jpg'
  const gif = e.match(/^_GIF\('([^']+)'\)$/)
  if (gif) return EX_GIF_BASE + gif[1] + '.gif'
  if (e.startsWith("'") && e.endsWith("'") && e.length >= 2) return e.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\')
  return e
}

export function getCurrentValue(entryText: string, kind: LineKind): string | null {
  for (const line of entryText.split('\n')) {
    if (serializedLine(line) === kind) {
      const m = line.trim().match(/:\s*(.+?)\s*,?\s*$/)
      if (m) return toUrl(m[1])
    }
  }
  return null
}

export function replaceLineInEntry(entryText: string, kind: LineKind, url: string): string {
  const trimmed = url.trim()
  const current = getCurrentValue(entryText, kind)
  if (current !== null && current === trimmed) return entryText
  const lines = entryText.split('\n')
  let replaced = false
  const out: string[] = []
  for (const line of lines) {
    if (!replaced && serializedLine(line) === kind) {
      const m = line.match(/^(\s*)(image|gif)\s*:/)
      const indent = m ? m[1] : '    '
      const comma = line.trim().endsWith(',') ? ',' : ''
      out.push(`${indent}${kind}: ${fromUrl(trimmed)}${comma}`)
      replaced = true
    } else {
      out.push(line)
    }
  }
  if (!replaced) out.push(`    ${kind}: ${fromUrl(trimmed)}`)
  return out.join('\n')
}

function scanDepth(src: string, from: number): number {
  let inStr = false
  let esc = false
  for (let i = from; i < src.length; i++) {
    const c = src[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === "'") inStr = false
    } else if (c === "'") inStr = true
    else if (c === '{') return 1
    else if (c === '}') return 0
    else if (c === '/') {
      const n = src[i + 1]
      if (n === '/') {
        while (i < src.length && src[i] !== '\n') i++
      } else if (n === '*') {
        i += 2
        while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++
        i++
      }
    }
  }
  return 0
}

interface EntryRange { id: string; start: number; end: number }

export function findEntryRanges(src: string): EntryRange[] {
  const start = src.indexOf('export const EXERCISE_DICTIONARY')
  if (start === -1) throw new Error('EXERCISE_DICTIONARY not found')
  const ranges: EntryRange[] = []
  let i = start
  let guard = 0
  while (guard++ < 10000) {
    const open = src.indexOf('{', i)
    if (open === -1) break
    if (scanDepth(src, open) === 0) {
      i = open + 1
      continue
    }
    let close = open
    let d = 0
    do {
      if (src[close] === '{') d++
      if (src[close] === '}') d--
      close++
    } while (d > 0 && close < src.length)
    while (close < src.length && src[close] !== '\n') close++
    if (src[close] === '\n') close++
    const block = src.slice(open, close)
    if (block.includes('id:')) {
      const id = block.match(/id\s*:\s*'([^']+)'/)?.[1] ?? ''
      ranges.push({ id, start: open, end: close })
    }
    i = close
  }
  return ranges
}

export function applyFileText(src: string, changes: ChangeRequest[]): { text: string; applied: number; notFound: string[] } {
  if (!changes.length) return { text: src, applied: 0, notFound: [] }
  const ranges = findEntryRanges(src)
  const byId = new Map(ranges.map((r) => [r.id, r]))
  const byEntry = new Map<string, { range: EntryRange; changes: ChangeRequest[] }>()
  const notFound: string[] = []
  for (const c of changes) {
    const range = byId.get(c.entryId)
    if (!range) {
      notFound.push(c.entryId)
      continue
    }
    if (!byEntry.has(c.entryId)) byEntry.set(c.entryId, { range, changes: [] })
    byEntry.get(c.entryId)!.changes.push(c)
  }
  const ordered = [...byEntry.values()].sort((a, b) => b.range.start - a.range.start)
  let text = src
  let applied = 0
  for (const { range, changes } of ordered) {
    let entryText = text.slice(range.start, range.end)
    const before = entryText
    for (const c of changes) {
      const next = replaceLineInEntry(entryText, c.kind, c.url)
      if (next !== entryText) {
        entryText = next
        applied++
      }
    }
    if (entryText !== before) {
      text = text.slice(0, range.start) + entryText + text.slice(range.end)
    }
  }
  return { text, applied, notFound }
}
```
> Note: `findEntryRanges` slices `{`…`}` then extends to the end of that line (keeping `,` and the newline). Section comments and blank lines between entries live in the untouched gaps, so the roundtrip is byte-exact. Changes are applied per entry, entries sorted by descending start so earlier offsets stay valid.

### Verification
1. `npm run check` — passes (new module type-checks, import resolves)

## Task 2 — Vite dev plugin `mediaEditorPlugin`

### Modify `vite.config.ts`
```ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { applyFileText } from './src/lib/admin/media-file';

const buildTime = new Date().toISOString().slice(0, 16).replace('T', ' ')

const DICTIONARY_FILE = 'src/lib/data/exercise-dictionary.ts'

function mediaEditorPlugin(): Plugin {
  return {
    name: 'media-editor-plugin',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (url !== '/__admin/dictionary-save') return next()
        if (req.method === 'GET') {
          res.statusCode = 404
          res.end('only POST')
          return
        }
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.setHeader('Allow', 'POST')
          res.end('method not allowed')
          return
        }
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', async () => {
          try {
            const payload = JSON.parse(body || '{}')
            if (!Array.isArray(payload.changes)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'changes must be an array' }))
              return
            }
            const file = path.resolve(process.cwd(), DICTIONARY_FILE)
            const src = await fs.promises.readFile(file, 'utf8')
            const result = applyFileText(src, payload.changes)
            if (result.notFound.length) {
              res.statusCode = 422
              res.end(JSON.stringify({ error: 'entradas no encontradas', notFound: result.notFound }))
              return
            }
            if (result.applied > 0) {
              await fs.promises.writeFile(file, result.text, 'utf8')
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ applied: result.applied }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: String((err as Error)?.message || err) }))
          }
        })
      })
    }
  }
}

export default defineConfig({
	plugins: [mediaEditorPlugin(), sveltekit()],
	define: {
		__BUILD_TIME__: JSON.stringify(buildTime)
	}
});
```

### Verification
1. `npm run check` — passes
2. `npm run dev` in background; then:
   ```bash
   curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/__admin/dictionary-save          # expect 404
   curl -s -X POST http://localhost:5173/__admin/dictionary-save -H 'Content-Type: application/json' -d '{"changes":[]}'   # expect {"applied":0}
   curl -s -X POST http://localhost:5173/__admin/dictionary-save -H 'Content-Type: application/json' -d '{"nope":1}' -o /dev/null -w "%{http_code}\n"  # expect 400
   ```
   Confirm the dictionary file is byte-identical after these calls (`git diff --stat` shows no change).
3. Kill the dev server

## Task 3 — Admin route in `ROUTES` + entry link in You

### Modify `src/lib/routes.ts`
Add `admin: \`${base}/admin\`,` to the `ROUTES` object (after `you`).

### Modify `src/routes/you/+page.svelte`
Add an `ActionRow` right below `<MaintenanceCard .../>` inside the "Mantenimiento" section (around line 765-772):
```svelte
<ActionRow
  title="Revisar imágenes del diccionario"
  description="Admin visual para previsualizar y corregir image/gif (solo npm run dev)"
>
  {#snippet button()}
    <Button id="go-media-admin" size="sm" {accent} onclick={() => goto(ROUTES.admin)}>Abrir</Button>
  {/snippet}
</ActionRow>
```
Ensure imports exist: `ActionRow` (add if missing), `Button` (add if missing), `ROUTES` from `'$lib/routes'` (add if missing), `goto` from `'$app/navigation'` (add if missing).

### Verification
`npm run check` passes. Manual: `npm run dev` → /you → Datos → "Revisar imágenes del diccionario" navigates to `/Pedro-IA-Coach/admin`.

## Task 4 — `src/lib/admin/catalogs.ts`

```ts
import { IMG_BASE, EX_GIF_BASE } from '../data/exercise-dictionary'

export type CatalogKind = 'image' | 'gif'
export interface CatalogEntry { url: string; name: string }

const IMG_CATALOG_KEY = 'admin_img_catalog'
const GIF_CATALOG_KEY = 'admin_gif_catalog'
const CATALOG_TTL = 24 * 60 * 60 * 1000

interface CatalogCache { entries: CatalogEntry[]; fetchedAt: number }

function keyFor(kind: CatalogKind): string {
  return kind === 'image' ? IMG_CATALOG_KEY : GIF_CATALOG_KEY
}

export function readCache(kind: CatalogKind): CatalogEntry[] {
  try {
    const raw = localStorage.getItem(keyFor(kind))
    if (!raw) return []
    const c = JSON.parse(raw) as CatalogCache
    if (!Array.isArray(c.entries)) return []
    if (Date.now() - c.fetchedAt > CATALOG_TTL) return []
    return c.entries
  } catch {
    return []
  }
}

export function isStale(kind: CatalogKind): boolean {
  try {
    const raw = localStorage.getItem(keyFor(kind))
    if (!raw) return true
    const c = JSON.parse(raw) as CatalogCache
    return !Array.isArray(c.entries) || Date.now() - c.fetchedAt > CATALOG_TTL
  } catch {
    return true
  }
}

function writeCache(kind: CatalogKind, entries: CatalogEntry[]) {
  const c: CatalogCache = { entries, fetchedAt: Date.now() }
  localStorage.setItem(keyFor(kind), JSON.stringify(c))
}

export async function fetchCatalog(kind: CatalogKind): Promise<CatalogEntry[]> {
  const repo = {
    image: { owner: 'yuhonas', repo: 'free-exercise-db', ref: 'main', sub: 'exercises/' },
    gif: { owner: 'JahelCuadrado', repo: 'ExerciseGymGifsDB', ref: 'v1.1.0', sub: '' }
  } as const
  const r = repo[kind]
  const url = `https://api.github.com/repos/${r.owner}/${r.repo}/git/trees/${r.ref}?recursive=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`catálogo ${kind}: HTTP ${res.status}`)
  const json = await res.json()
  const base = kind === 'image' ? IMG_BASE : EX_GIF_BASE
  const entries: CatalogEntry[] = []
  for (const node of json.tree ?? []) {
    if (node.type !== 'blob') continue
    const p: string = node.path
    if (!p.startsWith(r.sub)) continue
    if (kind === 'image') {
      if (!p.endsWith('/0.jpg')) continue
      const dir = p.slice(r.sub.length, p.length - '/0.jpg'.length)
      entries.push({ url: base + dir + '/0.jpg', name: dir.replace(/-/g, ' ') })
    } else {
      if (!p.endsWith('.gif')) continue
      const name = p.slice(0, p.length - '.gif'.length).split('/').pop() ?? p
      entries.push({ url: base + p, name: name.replace(/-/g, ' ') })
    }
  }
  entries.sort((a, b) => a.name.localeCompare(b.name))
  writeCache(kind, entries)
  return entries
}

export function searchCatalog(kind: CatalogKind, query: string, limit = 50): CatalogEntry[] {
  const q = query.toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  const all = readCache(kind)
  if (!tokens.length) return all.slice(0, limit)
  return all.filter((e) => {
    const n = e.name.toLowerCase()
    return tokens.every((t) => n.includes(t))
  }).slice(0, limit)
}
```

### Verification
`npm run check` passes.

## Task 5 — `src/lib/admin/editor.ts` (draft store + save)

```ts
import { derived, get, writable } from 'svelte/store'
import { toast } from '$lib/stores/ui'
import type { LineKind } from './media-file'

export interface PendingDraft { entryId: string; kind: LineKind; url: string }

const drafts = writable<PendingDraft[]>([])

export const draftCount = derived(drafts, (d) => d.length)

export function queueReplace(entryId: string, kind: LineKind, url: string) {
  const trimmed = url?.trim()
  if (!trimmed) {
    toast('URL vacía, no se guardó nada')
    return
  }
  drafts.update((list) => {
    const idx = list.findIndex((d) => d.entryId === entryId && d.kind === kind)
    if (idx === -1) return [...list, { entryId, kind, url: trimmed }]
    const copy = [...list]
    copy[idx] = { entryId, kind, url: trimmed }
    return copy
  })
}

export function resetDrafts() {
  drafts.set([])
}

export async function saveDrafts(): Promise<boolean> {
  const list = get(drafts)
  if (!list.length) {
    toast('No hay cambios pendientes')
    return false
  }
  let json: { applied?: number; notFound?: string[]; error?: string }
  try {
    const res = await fetch('/__admin/dictionary-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: list })
    })
    json = await res.json()
    if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  } catch (err) {
    toast(`Error al guardar: ${(err as Error)?.message || err}`, true)
    return false
  }
  if (json.notFound?.length) toast(`No encontradas: ${json.notFound.join(', ')}`, true)
  if (json.applied) toast(`Guardado: ${json.applied} cambio${json.applied === 1 ? '' : 's'}`)
  resetDrafts()
  return true
}
```

### Verification
`npm run check` passes.

## Task 6 — `src/lib/components/MediaPicker.svelte`

```svelte
<script lang="ts">
  import SearchInput from './SearchInput.svelte'
  import Button from './Button.svelte'
  import { fetchCatalog, isStale, searchCatalog, type CatalogEntry, type CatalogKind } from '$lib/admin/catalogs'

  let {
    kind,
    current = '',
    accent = 'var(--accent)',
    onpick = () => {}
  }: {
    kind: CatalogKind
    current?: string
    accent?: string
    onpick?: (url: string) => void
  } = $props()

  let query = $state('')
  let entries = $state<CatalogEntry[]>([])
  let loading = $state(false)
  let refreshing = $state(false)
  let error = $state('')
  let showManual = $state(false)
  let manualUrl = $state('')
  let timer: ReturnType<typeof setTimeout> | undefined

  function runSearch() {
    if (isStale(kind)) {
      loading = true
      error = ''
      fetchCatalog(kind)
        .then(() => {
          entries = searchCatalog(kind, query)
          loading = false
        })
        .catch(() => {
          entries = searchCatalog(kind, query)
          loading = false
          error = 'No se pudo cargar el catálogo (usa el campo manual)'
        })
    } else {
      entries = searchCatalog(kind, query)
    }
  }

  function onInput() {
    clearTimeout(timer)
    timer = setTimeout(runSearch, 300)
  }

  function forceRefresh() {
    refreshing = true
    error = ''
    fetchCatalog(kind)
      .then(() => {
        entries = searchCatalog(kind, query)
        refreshing = false
      })
      .catch(() => {
        refreshing = false
        error = 'No se pudo actualizar el catálogo'
      })
  }

  function pick(url: string) {
    if (url && url.trim()) onpick(url.trim())
  }

  $effect(() => {
    entries = searchCatalog(kind, query)
    if (isStale(kind)) runSearch()
  })
</script>

<div class="picker" data-component="MediaPicker">
  <div class="picker-actions">
    <SearchInput bind:value={query} oninput={onInput} placeholder="Buscar ejercicio…" />
    <Button size="sm" variant="secondary" onclick={forceRefresh} disabled={refreshing}>
      {refreshing ? 'Actualizando…' : 'Actualizar catálogos'}
    </Button>
  </div>
  {#if error}<div class="picker-error">{error}</div>{/if}
  {#if loading}<div class="picker-status">Cargando catálogo…</div>{/if}
  <div class="picker-grid">
    {#each entries as e}
      <button class="cand" type="button" onclick={() => pick(e.url)}>
        <img src={e.url} alt={e.name} loading="lazy" onerror={(ev) => (ev.currentTarget.style.display = 'none')} />
        <span>{e.name}</span>
      </button>
    {/each}
  </div>
  {#if !entries.length && !loading && !error}
    <div class="picker-empty">Sin resultados</div>
  {/if}
  <div class="manual-toggle">
    <button class="manual-btn" type="button" style="color:{accent}" onclick={() => (showManual = !showManual)}>
      {showManual ? 'Ocultar' : 'Pegar URL manual'}
    </button>
  </div>
  {#if showManual}
    <div class="manual">
      <input bind:value={manualUrl} type="url" placeholder="https://…/ejercicio.jpg" />
      <Button size="sm" {accent} onclick={() => pick(manualUrl)}>Usar esta URL</Button>
    </div>
  {/if}
  {#if current}
    <div class="picker-current">Actual: <span class="mono">{current}</span></div>
  {/if}
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 12px; min-width: 300px; max-width: 560px; }
  .picker-actions { display: flex; gap: 8px; align-items: center; }
  .picker-actions :global(.search-input) { flex: 1; }
  .picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; max-height: 320px; overflow-y: auto; }
  .cand { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .cand img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: rgba(255,255,255,0.04); }
  .cand span { font-size: 10px; color: var(--text); text-align: center; font-family: var(--font-sans); }
  .picker-error, .picker-status, .picker-empty { font-size: 12px; color: var(--text); opacity: 0.7; }
  .picker-current { font-size: 11px; opacity: 0.6; word-break: break-all; }
  .manual-toggle { text-align: center; }
  .manual-btn { background: none; border: none; cursor: pointer; font-size: 12px; font-family: var(--font-sans); text-decoration: underline; }
  .manual { display: flex; gap: 8px; }
  .manual input { flex: 1; padding: 10px 12px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text); font-family: var(--font-mono); font-size: 12px; }
  .mono { font-family: var(--font-mono); }
</style>
```

### Verification
`npm run check` passes.

## Task 7 — `src/lib/components/AdminCard.svelte`

```svelte
<script lang="ts">
  import Button from './Button.svelte'

  export interface AdminEntry {
    id: string
    name: string
    muscle?: string
    image?: string
    gif?: string
  }

  let {
    entry,
    accent = 'var(--accent)',
    onedit = () => {}
  }: {
    entry: AdminEntry
    accent?: string
    onedit?: (entryId: string, kind: 'image' | 'gif') => void
  } = $props()

  let brokenImg = $state(false)
  let brokenGif = $state(false)
  $effect(() => {
    brokenImg = false
    brokenGif = false
  })
</script>

<div class="admin-card" data-component="AdminCard" data-entry-id={entry.id}>
  <div class="card-head">
    <div class="card-name">{entry.name}</div>
    {#if entry.muscle}<div class="card-muscle">{entry.muscle}</div>{/if}
  </div>
  <div class="media-grid">
    <div class="media-box">
      <div class="media-label">
        <span>IMG</span>
        <span class="media-badge" class:bad {brokenImg}>{brokenImg ? '⚠️ no carga' : 'ok'}</span>
      </div>
      {#if entry.image}
        <img class="preview" data-entry={entry.id} data-kind="image" src={entry.image} alt={entry.name}
          loading="lazy" onerror={() => (brokenImg = true)} />
      {:else}
        <div class="no-media">sin imagen</div>
      {/if}
      <div class="media-url" title={entry.image}>{entry.image}</div>
      <Button id={`edit-img-${entry.id}`} size="sm" variant="secondary" accent={accent} onclick={() => onedit(entry.id, 'image')}>Editar</Button>
    </div>
    <div class="media-box">
      <div class="media-label">
        <span>GIF</span>
        <span class="media-badge" class:bad {brokenGif}>{brokenGif ? '⚠️ no carga' : 'ok'}</span>
      </div>
      {#if entry.gif}
        <img class="preview" data-entry={entry.id} data-kind="gif" src={entry.gif} alt={entry.name}
          loading="lazy" onerror={() => (brokenGif = true)} />
      {:else}
        <div class="no-media">sin gif</div>
      {/if}
      <div class="media-url" title={entry.gif}>{entry.gif}</div>
      <Button id={`edit-gif-${entry.id}`} size="sm" variant="secondary" accent={accent} onclick={() => onedit(entry.id, 'gif')}>Editar</Button>
    </div>
  </div>
</div>

<style>
  .admin-card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 14px; }
  .card-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 12px; }
  .card-name { font-family: var(--font-sans); font-weight: 700; font-size: 15px; color: var(--text); }
  .card-muscle { font-size: 11px; opacity: 0.6; font-family: var(--font-mono); }
  .media-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .media-box { border: 1px solid var(--border); border-radius: 12px; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
  .media-label { display: flex; justify-content: space-between; align-items: center; font-family: var(--font-mono); font-size: 10px; }
  .media-badge { padding: 2px 6px; border-radius: 9999px; background: rgba(255,255,255,0.06); }
  .media-badge.bad { background: rgba(255,80,80,0.2); color: #ff7a7a; }
  .preview { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: rgba(255,255,255,0.04); }
  .no-media { width: 100%; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.35); font-size: 11px; }
  .media-url { font-family: var(--font-mono); font-size: 9px; opacity: 0.55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
```

### Verification
`npm run check` passes.

## Task 8 — `src/routes/admin/+page.svelte`

```svelte
<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { EXERCISE_DICTIONARY } from '$lib/data/exercise-dictionary'
  import { draftCount, saveDrafts, resetDrafts } from '$lib/admin/editor'
  import { queueReplace } from '$lib/admin/editor'
  import MediaPicker from '$lib/components/MediaPicker.svelte'
  import AdminCard from '$lib/components/AdminCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import SearchInput from '$lib/components/SearchInput.svelte'
  import Button from '$lib/components/Button.svelte'
  import Chip from '$lib/components/Chip.svelte'

  const isDev = import.meta.env.DEV

  let query = $state('')
  let muscle = $state('')
  let picker = $state<{ entryId: string; kind: 'image' | 'gif' } | null>(null)
  let saving = $state(false)

  const muscles = $derived([...new Set(EXERCISE_DICTIONARY.map((e) => e.muscle).filter(Boolean))].sort())

  const visibleEntries = $derived(
    EXERCISE_DICTIONARY.filter((e) => {
      if (muscle && e.muscle !== muscle) return false
      if (!query.trim()) return true
      const q = query.toLowerCase()
      return [e.name, e.id, e.en ?? ''].some((s) => s.toLowerCase().includes(q))
    })
  )

  const count = $derived($draftCount)

  async function onSave() {
    saving = true
    await saveDrafts()
    saving = false
  }

  function onEdit(entryId: string, kind: 'image' | 'gif') {
    picker = { entryId, kind }
  }

  function onPick(url: string) {
    if (!picker) return
    queueReplace(picker.entryId, picker.kind, url)
    picker = null
  }

  const pickerEntry = $derived(picker ? EXERCISE_DICTIONARY.find((e) => e.id === picker.entryId) : null)
</script>

<svelte:head><title>Admin Media</title></svelte:head>

<div class="admin-page">
  <div class="admin-header">
    <div>
      <button class="back" onclick={() => goto(ROUTES.you)}>← Tú</button>
      <h1 class="title">Diccionario · Media</h1>
      <p class="subtitle">{EXERCISE_DICTIONARY.length} ejercicios — revisa y corrige image/gif</p>
    </div>
    {#if isDev}
      <Button id="save-dict" accent="var(--accent)" onclick={onSave} disabled={saving || count === 0}>
        Guardar ({count})
      </Button>
    {:else}
      <Chip>solo lectura</Chip>
    {/if}
  </div>

  {#if !isDev}
    <div class="prod-note">El admin de media solo permite editar en local con <span class="mono">npm run dev</span>.</div>
  {/if}

  <div class="filters">
    <SearchInput bind:value={query} oninput={(v) => (query = v)} placeholder="Buscar por nombre o id…" />
    <div class="chips">
      <button class:active={!muscle} class="chip" onclick={() => (muscle = '')}>Todos</button>
      {#each muscles as m}
        <button class:active={muscle === m} class="chip" onclick={() => (muscle = m)}>{m}</button>
      {/each}
    </div>
  </div>

  <div class="grid">
    {#each visibleEntries as e}
      <AdminCard accent="var(--accent)" entry={e} onedit={onEdit} />
    {/each}
  </div>

  {#if !visibleEntries.length}
    <div class="empty">Sin resultados</div>
  {/if}
</div>

<CenterDialog open={!!picker} onclose={() => (picker = null)}>
  {#if picker && pickerEntry}
    <div class="picker-head">
      <div class="picker-title">{pickerEntry.name}</div>
      <button class="dialog-close" onclick={() => (picker = null)}>✕</button>
    </div>
    <MediaPicker
      kind={picker.kind}
      current={picker.kind === 'image' ? pickerEntry.image : pickerEntry.gif}
      accent="var(--accent)"
      onpick={onPick}
    />
  {/if}
</CenterDialog>

<style>
  .admin-page { padding: 20px; max-width: 900px; margin: 0 auto; }
  .admin-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 18px; }
  .back { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 13px; font-family: var(--font-sans); padding: 0; }
  .title { font-family: var(--font-sans); font-size: 24px; font-weight: 700; color: var(--text); margin: 6px 0 2px; letter-spacing: -0.5px; }
  .subtitle { font-size: 12px; opacity: 0.6; margin: 0; }
  .prod-note { background: rgba(255,180,60,0.1); border: 1px solid rgba(255,180,60,0.3); color: #ffc266; border-radius: 12px; padding: 10px 14px; font-size: 12px; margin-bottom: 14px; }
  .filters { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { background: rgba(255,255,255,0.06); border: 1px solid var(--border); color: var(--text); border-radius: 9999px; padding: 6px 12px; font-size: 11px; cursor: pointer; font-family: var(--font-mono); }
  .chip.active { background: var(--accent); color: var(--bg); border-color: var(--accent); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .empty { text-align: center; opacity: 0.5; padding: 40px 0; }
  .picker-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 12px; }
  .picker-title { font-family: var(--font-sans); font-weight: 700; color: var(--text); }
  .dialog-close { background: none; border: none; color: var(--text); cursor: pointer; font-size: 16px; }
  .mono { font-family: var(--font-mono); }
</style>
```
> Type note: the dictionary entry type may not include `en` — if `e.en` errors, use `(e as { en?: string }).en ?? ''`. `draftCount` is a store read with the `$` prefix (`$draftCount`). `$derived` must receive reactive reads (`query`, `muscle`, `$draftCount`), which the code above does.

### Verification
1. `npm run check` passes
2. `npm run dev` → `/Pedro-IA-Coach/admin` renders 166 cards, muscle filter + search work, picker opens, "Guardar (n)" appears
3. Save disabled in a production build (`npm run build` + `npm run preview` → button hidden, "solo lectura" chip)

## Task 9 — E2E coverage in `tests/big.spec.cjs`

Add ONE new `describe` block with exactly one `test()` at the end of the file. Do NOT touch `EXPECTED_STEPS` or existing blocks. Pattern follows existing blocks (per-block `SETTINGS`, `seedIndexedDB`, page.goto with base URL).

```js
describe('Admin: revisar y corregir media del diccionario', () => {
  test('abre admin, busca candidato y guarda un cambio de image/gif', async ({ page }) => {
    const SETTINGS = {
      id: 'settings',
      activeProgramId: null,
      currentWeekIdx: 0,
      units: 'kg',
      accentColor: '#d4ff3a',
      language: 'es',
      userName: 'Pedro',
      onboarded: true,
      onboardingStep: -1,
      pushSubscribed: false,
      notificationsEnabled: false,
      hasWatch: false
    }
    await seedIndexedDB(page, { settings: SETTINGS })

    // Seed catalogs so search is deterministic (no GitHub network call)
    await page.goto(BASE_URL)
    await page.evaluate(() => {
      const img = { entries: [{ url: 'https://img.test/candidate.jpg', name: 'candidate img' }], fetchedAt: Date.now() }
      const gif = { entries: [{ url: 'https://img.test/candidate.gif', name: 'candidate gif' }], fetchedAt: Date.now() }
      localStorage.setItem('admin_img_catalog', JSON.stringify(img))
      localStorage.setItem('admin_gif_catalog', JSON.stringify(gif))
    })

    // Open admin from You → Datos → Mantenimiento
    await page.goto(`${BASE_URL}you`)
    await page.getByRole('button', { name: 'Datos', exact: true }).click()
    await page.locator('#go-media-admin').click()
    await page.waitForURL('**/admin')
    await page.getByText('Diccionario · Media').waitFor()

    // Find the first entry card and its current image URL
    const card = page.locator('[data-component="AdminCard"]').first()
    const entryId = await card.getAttribute('data-entry-id')
    const imgBefore = await card.locator('img[data-kind="image"]').getAttribute('src')
    expect(imgBefore).toBeTruthy()

    // Open image picker, pick the seeded candidate, queue a draft
    await card.locator(`#edit-img-${entryId}`).click()
    await page.getByPlaceholder('Buscar ejercicio…').fill('candidate')
    await page.locator('[data-component="MediaPicker"] .cand').first().click()
    await expect(page.locator('#save-dict')).toContainText('Guardar (1)')

    // Save → plugin rewrites the dictionary file → module HMR updates the preview
    await page.locator('#save-dict').click()
    await expect(page.locator('#save-dict')).toContainText('Guardar (0)')
    await expect(card.locator('img[data-kind="image"]')).toHaveAttribute('src', 'https://img.test/candidate.jpg')

    // Revert so the source file stays pristine
    await card.locator(`#edit-img-${entryId}`).click()
    await page.getByPlaceholder('Buscar ejercicio…').fill('')
    await page.getByText('Pegar URL manual').click()
    await page.getByPlaceholder(/https:\/\/…/).fill(imgBefore)
    await page.getByText('Usar esta URL').click()
    await page.locator('#save-dict').click()
    await expect(card.locator('img[data-kind="image"]')).toHaveAttribute('src', imgBefore)
  })
})
```
> The first save mutates the real source file briefly; the revert restores it byte-exactly (validated in Task 1). If HMR reloads the page mid-test, Playwright's auto-wait re-resolves locators. `BASE_URL` and `expect`/`describe`/`test` already exist in the file.

### Verification
`npx playwright test -g "Admin: revisar"` passes; then full suite `npx playwright test` still passes and the dictionary file is unchanged (`git diff --stat src/lib/data/exercise-dictionary.ts` empty).

## Task 10 — Docs + release

1. **AGENTS.md**: add to Project Structure `src/lib/admin/` (`catalogs.ts`, `editor.ts`, `media-file.ts`) and `src/routes/admin/+page.svelte`; add a short "Media Admin" section under "Exercise Dictionary & Media" describing: route `/admin`, dev-only save via `POST /__admin/dictionary-save` (Vite plugin in `vite.config.ts`), draft flow, catalog localStorage keys (`admin_img_catalog`, `admin_gif_catalog`, 24h TTL), and that edits write `image:`/`gif:` lines directly in `exercise-dictionary.ts`
2. Run `bash scripts/bump-version.sh` (bumps `_VER_BASE` minor + date in `src/lib/pwa.ts`), then update `_VER_DESC` to ~10 words describing this change
3. `npm run check` and `npm run build` — fix any failures
4. `git add` only: `src/lib/admin/media-file.ts`, `src/lib/admin/catalogs.ts`, `src/lib/admin/editor.ts`, `src/lib/components/MediaPicker.svelte`, `src/lib/components/AdminCard.svelte`, `src/routes/admin/+page.svelte`, `src/lib/routes.ts`, `src/routes/you/+page.svelte`, `vite.config.ts`, `tests/big.spec.cjs`, `src/lib/pwa.ts`, `AGENTS.md`, `docs/superpowers/plans/2026-08-07-media-admin.md`
   - **Do NOT stage** the unrelated pre-existing modifications (coach-analysis.ts, Calendar.svelte, ExerciseDetail.svelte, storage.ts, types.ts, plan/+page.svelte, today/+page.svelte, AlternativesTab.svelte)
5. `git commit` with a message including the new version
6. `npx playwright test` — must pass before push
7. `git push`

## Risks / Notes
- **HMR after save**: the admin page imports `EXERCISE_DICTIONARY` directly, so after a save the module reloads and cards re-render with new URLs. No manual refresh needed
- **Catalog fetch size**: git-trees JSON is ~1.1MB; it is fetched once per 24h per kind and only when a picker opens with a stale cache
- **Raw-URL serialization**: pasted URLs not starting with `IMG_BASE`/`EX_GIF_BASE` are stored as quoted strings (`'https://…'`), not `_IMG`/`_GIF` expressions — by design
- **Entry count assertion**: `findEntryRanges` must return 166 (validated). The admin page's muscle filter/`title` derive from the live array, so a future added entry appears automatically
