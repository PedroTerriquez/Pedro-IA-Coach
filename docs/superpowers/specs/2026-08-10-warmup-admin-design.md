# Warmup/Stretch Admin: `exercise-warmup.ts` + Admin Subtabs

**Date:** 2026-08-10
**Status:** Approved (design review)

## Problem

The `/admin` media review screen only covers the 166-entry exercise dictionary. The
warmup (`calentar`) and stretch (`estirar`) exercises have wrong/missing media and no
way to fix them. Currently:

- 80 warmup/stretch exercises live in `WARMUP_DATA` (keyed by muscle, split into
  `warmup[]` and `stretch[]`).
- Static images live in `IMG_MAP` (`src/lib/data/warmup.ts`) — 16 entries have no
  image, 48 keys are legacy/unused.
- GIFs live in `WARMUP_GIF_MAP` (`src/lib/data/warmup-gifs.ts`) — 40 entries have no
  gif, and one key (`Circulos de Muñecas con Puños Cerrados`) never matches the
  canonical name (`Círculos de Muñecas con Puños Cerrados`) so that gif never renders.

Goal: give warmup/stretch the same architecture and admin treatment as the exercise
dictionary, so images/gifs can be reviewed and fixed in `/admin`.

## Decisions

1. **Full replacement**: a new `src/lib/data/exercise-warmup.ts` becomes the single
   source of truth for warmup/stretch exercises (text + media), mirroring the
   dictionary file structure. `WARMUP_DATA`, `IMG_MAP`, and `warmup-gifs.ts` are
   deleted.
2. **Identical entry shape** to the dictionary: id-keyed objects with `es`, `muscle`,
   `image`, `gif`, plus the warmup-specific text fields and a `kind` discriminator.
3. **Admin subtabs**: `Ejercicios | Calentamiento | Estiramiento`. Dictionary tab is
   unchanged. Calentamiento/Estiramiento reuse the same look (AdminCard, MediaPicker,
   muscle/letter/search filters, reviewed toggle, "Guardar (n)" FAB).
4. **Edit scope for warmup**: image + gif + rename (edit `es`). **No aliases.**
5. **Dev-only save**: new `/__admin/warmup-save` Vite plugin endpoint rewrites
   `exercise-warmup.ts` on disk. Prod/preview stays "solo lectura", same as today.
6. The 12 generic fallback exercises (`GENERIC_WARMUP` in `warmup-components.ts`) are
   **out of scope** — they keep their hardcoded images.

## New file: `src/lib/data/exercise-warmup.ts`

```ts
// Warmup/stretch exercise data (single source of truth)
import { IMG_BASE, EX_GIF_BASE } from './media-bases';

const _IMG = (p: string, n = 0): string => IMG_BASE + p + '/' + n + '.jpg'
const _GIF = (path: string): string => EX_GIF_BASE + path + '.gif'

export const EXERCISE_WARMUP = [
  {
    id: 'warmup-chest-flexiones-pared',
    es: 'Flexiones Dinámicas Excéntricas contra Pared',
    kind: 'warmup',                    // 'warmup' | 'stretch'
    muscle: 'chest',                   // internal muscle key
    posInicial: '…',
    ejecucion: '…',
    respiracion: '…',
    duracion: '…',
    stallbar: true,                    // optional
    image: _IMG('Pushups'),
    gif: _GIF('pectorals/push-up-wall'),
  },
  // … 80 entries total
]
```

### Entry fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique, stable; prefix `warmup-` or `stretch-` |
| `es` | string | Display name (renamable in admin) |
| `kind` | `'warmup' \| 'stretch'` | Selects the subtab and runtime pool |
| `muscle` | string | Internal muscle key (same 16 keys as today) |
| `posInicial` | string | Text section |
| `ejecucion` | string | Text section |
| `respiracion` | string | Text section |
| `duracion` | string | Text section |
| `stallbar?` | boolean | Optional; shows STALLBAR badge |
| `image?` | string | `_IMG('dir')` serialization |
| `gif?` | string | `_GIF('path')` serialization |

### Ordering
Entries are written in WARMUP_DATA's muscle order (chest, shoulders, triceps, biceps,
back, midback, lats, traps, quads, hamstrings, glutes, calves, soleus, abs, forearms,
neck), warmup before stretch within each muscle. This preserves today's runtime order
in the Today warmup/stretch flow.

### Migration
- `es`/text/stallbar copied verbatim from `WARMUP_DATA`.
- `image` from `IMG_MAP` (normalized key match against `es`); absent → field omitted.
- `gif` from `WARMUP_GIF_MAP` (normalized key match); absent → field omitted.
- Fixes the accent-mismatch gif key by using canonical `es` names.
- 48 legacy `IMG_MAP` keys not matching any entry are dropped (unused).

## Refactors

### `src/lib/data/warmup.ts`
- **Remove** `WARMUP_DATA` and `IMG_MAP`.
- **Keep** `img()` (used by `GENERIC_WARMUP`), `MUSCLE_ALIASES`, `resolveMuscles`,
  `resolveOne`, `resolveSingle`, `getUniqueWarmupMuscles`, `MUSCLE_DISPLAY`.
- Muscle-key source changes: `Object.keys(WARMUP_DATA)` → the unique `muscle` values
  derived from `EXERCISE_WARMUP` (same 16 keys → identical resolution behavior).
- Import `EXERCISE_WARMUP` from `./exercise-warmup`.

### `src/lib/data/warmup-components.ts`
- `resolvePanelItems(muscles, mode)` unchanged in behavior:
  - `keys = getUniqueWarmupMuscles(muscles)`
  - items = for each resolved key, entries with `kind === mode` and `muscle === key`
  - each item: `{ ...entry, imgUrl: entry.image ?? '', tag: MUSCLE_DISPLAY[key] ?? key }`
  - empty → `GENERIC_WARMUP_ONLY` / `GENERIC_STRETCH_ONLY` fallback (unchanged)
- Imports change from `WARMUP_DATA`/`IMG_MAP` to `EXERCISE_WARMUP`.

### `src/lib/components/Warmup.svelte`
- gif resolution: `item.gif` → `EX_GIF_BASE + item.gif + '.gif'` (no name-keyed map).
- Remove `WARMUP_GIF_MAP` import.

### Deleted
- `src/lib/data/warmup-gifs.ts` (only consumer was `Warmup.svelte`).

## Admin

### Subtabs (`src/routes/admin/+page.svelte`)
Segmented control at the top: `Ejercicios | Calentamiento | Estiramiento`.
- `tab` state; panes stay mounted (hidden with CSS) so per-tab filter/scroll/draft
  state survives tab switches.
- Header/subtitle reflect the active tab and its reviewed counts.
- `Ejercicios` pane: existing dictionary UI, unchanged.

### `WarmupAdminTab.svelte` (new, prop `mode: 'warmup' | 'stretch'`)
Lists `EXERCISE_WARMUP.filter(e => e.kind === mode)` mapped to `AdminEntry`:
`{ id, name: es, muscle: MUSCLE_DISPLAY[muscle], image, gif }` (no `en`, no aliases).
- Filters: search (name/id), muscle chips, letter chips (first letter of name).
- `AdminCard` per entry: image+gif thumbs + ✓/✕, reviewed toggle, rename pencil,
  IMG/GIF edit buttons. No alias UI.
- MediaPicker dialog: same as dictionary (catalogs already include free-exercise-db
  images + ExerciseGymGifsDB gifs).
- Drafts held in component-local state; FAB `Guardar (n)` → POST `/__admin/warmup-save`.
- After save, local entry state is updated in-memory (mirrors the dictionary's
  `applySavedChanges`).

### `AdminCard.svelte`
Add `showAliases = true` prop; when `false`, hide the alias row + alias input.

### `reviewed.ts` (namespaced)
- Store becomes `Record<string, string[]>`: `{ dict: [...], warmup: [...] }`.
- localStorage key `admin_reviewed` migrates old flat array → `{ dict: [...] }`.
- `toggleReviewed(ns, id)`; `reviewedFor(ns)`.
- Warmup reviewed keys = entry `id`s (unique across warmup+stretch, single namespace).
- Admin page's `$reviewed` usage updated to the `dict` namespace.

## Save path (dev-only)

### `src/lib/admin/media-file.ts`
- `findEntryRanges(src, arrayName = 'EXERCISE_DICTIONARY')` — parameterize the
  hardcoded array name so the same parser serves both files.
- Everything else (`applyFileText`, `setNameLine`, `replaceLineInEntry`,
  `fromUrl`/`toUrl`) is reused as-is: warmup renames edit the `es` line (id-keyed, no
  key juggling).

### `vite.config.ts`
- New route `/__admin/warmup-save` (POST), mirroring `/__admin/dictionary-save`, with
  `WARMUP_FILE = 'src/lib/data/exercise-warmup.ts'` and
  `applyFileText(src, changes, 'EXERCISE_WARMUP')`.
- `handleHotUpdate` suppresses reload for `exercise-warmup.ts` (admin re-imports it).
- Same 422/500/405 error handling.

## Testing & Verification

1. **Migration coverage script** (node, one-off): all 80 canonical names present;
   image/gif coverage matches IMG_MAP/WARMUP_GIF_MAP after normalization; accent bug
   fixed; legacy keys dropped.
2. `npm run check` — svelte-check clean.
3. `npm run build` — adapter-static build clean.
4. `npx playwright test` — must stay green (the suite exercises the warmup/stretch
   flow: 4 sections visible for chest, generic fallback for non-matching muscles).
5. Manual dev verification of `/__admin/warmup-save` via curl (same as the dictionary
   save; not covered by E2E because the save plugin is dev-only).

## Out of scope
- Generic fallback exercises (`GENERIC_WARMUP`).
- Warmup aliases.
- Any change to the exercise dictionary admin behavior.
- Production/admin read-only messaging (already exists, unchanged).
