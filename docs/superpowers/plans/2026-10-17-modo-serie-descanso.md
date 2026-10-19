# Modo serie en el descanso — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `RestTimerFullscreen` with a "Modo serie" screen during rest: one set at a time, weight 120px, ±5kg buttons 72px, reps ±, series marks on top; when rest ends → "Serie N guardada" with inline "Cambiar"; last rest → "Confirma tus series" redesigned to Detalle v2 standards (JetBrains Mono large, 56–72px buttons, ≥44px touch, 13–17px text, accent only on primary + done).

**Architecture:** 
1. Pure logic in `src/lib/series-mode.ts` (auto-fill, missing sets, "auto" flag)
2. New `SeriesModeScreen.svelte` replaces `RestTimerFullscreen` when entering from ExerciseDetail's "Iniciar descanso"
3. New `SeriesConfirmSheet.svelte` replaces `RestSetsSummary` with Detalle v2 tokens
3. `ExerciseDetail` opens `SeriesModeScreen` via existing `onStartRest`; `RestTimerBanner` unchanged
4. Delete `RestTimerFullscreen.svelte` and `RestSetsSummary.svelte` if orphaned

**Tech Stack:** Svelte 5 runes, TypeScript, Vite, existing design tokens (`--accent`, `--bg`, `--surface`, Space Grotesk/JetBrains Mono, 56px primary buttons, 220px ring)

**Spec:** `docs/superpowers/specs/2026-10-15-hoy-v2-detalle-v2-design.md` (Detalle v2 tokens/components), design-system `detalle-v2/07-alt-modo-serie.html`, `det2.js`, `det2.css`

## Global Constraints

- Mobile-first iPhone PWA, dark mode only
- Copy en español sin emojis; `getExerciseDisplayName()` y `units` (kg/lb) en todo
- Touch targets ≥44px; primary buttons 56px; weight 120px; ± buttons 72px/56px
- Acento solo para botón principal y lo hecho (borde, check, series, "Récord", último punto gráfica)
- No cambiar `armRest`, cola del Worker, notificaciones, `RestTimerBanner`
- Reutilizar componentes Detalle v2 y compartidos; borrar huérfanos y sus cards en `scripts/ds/groups.mjs`
- Lógica pura en `src/lib/`, no en `.svelte`
- Tests E2E en `tests/big.spec.cjs` con `seedIndexedDB`, actualizar `EXPECTED_STEPS`
- Verificación: `npm run check`, `npx playwright test`, `npm run build`

## Review Focus

1. **Auto-fill on skipped rest**: user lets rest end without touching weight/reps → set saved with previous/planned values, marked "auto" in Confirm sheet, correctable there
2. **Offline during rest**: timer runs, user edits weight/reps, comes back online → debounced save syncs, no data loss
3. **Rapid "Siguiente serie" taps**: double-tap protection works, each tap saves current set and starts next rest
4. **Last set Confirm sheet → cancel/close**: previously saved sets persist (already written during rest), Confirm only rewrites with corrections
5. **Units switch (kg/lb) mid-workout**: displayed values convert correctly in SeriesModeScreen and Confirm sheet

---

### Task 1: Pure logic — `src/lib/series-mode.ts`

**Files:**
- Create: `src/lib/series-mode.ts`
- Test: `tests/big.spec.cjs` (E2E only; unit tests not in suite)

**Interfaces:**
- Consumes: `SetEntry` from `set-log.ts`, `RestTimerData` from `rest-timer.ts`
- Produces: 
  - `getAutoFilledSets(exerciseId: string, plannedSets: number, plannedReps: string, lastWeight: number, currentSets: SetEntry[]): { sets: SetEntry[], autoFlags: boolean[] }`
  - `findMissingSets(currentSets: SetEntry[], plannedSets: number): number[]`
  - `markAutoFilled(sets: SetEntry[], autoFlags: boolean[]): SetEntry[]` (adds `_auto: true` ephemeral)

- [ ] **Step 1: Write failing E2E test scenario in `tests/big.spec.cjs`**

```javascript
// Scenario: "Modo serie — autollenado al saltar registro"
// Seed: exercise with 3 planned sets, 1 previous log at 70kg×10
// Steps: open Detail → "Iniciar descanso" → wait for rest to complete → "Empezar serie 2" → wait → "Empezar serie 3" → wait → "Confirma tus series"
// Assert: 3 sets in confirm, sets 2 & 3 marked "auto" (chip ámbar), values = 70kg×10
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test -g "Modo serie — autollenado"`
Expected: FAIL (component doesn't exist)

- [ ] **Step 3: Implement `series-mode.ts`**

```typescript
// src/lib/series-mode.ts
import type { SetEntry } from './set-log'

export interface AutoFillResult {
  sets: SetEntry[]
  autoFlags: boolean[]  // true = this set was auto-filled
}

export function getAutoFilledSets(
  exerciseId: string,
  plannedSets: number,
  plannedReps: string,
  lastWeight: number,
  currentSets: SetEntry[]
): AutoFillResult {
  const reps = parseInt(String(plannedReps).match(/\d+/)?.[0] || '0', 10)
  const fallback: SetEntry = { weight: lastWeight || 0, reps }
  const filled = [...currentSets]
  const autoFlags = currentSets.map(() => false)
  
  while (filled.length < plannedSets) {
    const prev = filled[filled.length - 1] || fallback
    filled.push({ ...prev })
    autoFlags.push(true)
  }
  
  return { sets: filled, autoFlags }
}

export function findMissingSets(currentSets: SetEntry[], plannedSets: number): number[] {
  const missing: number[] = []
  for (let i = currentSets.length; i < plannedSets; i++) missing.push(i + 1)
  return missing
}

// Ephemeral marker for UI (not persisted)
export function withAutoFlag(sets: SetEntry[], autoFlags: boolean[]): (SetEntry & { _auto?: boolean })[] {
  return sets.map((s, i) => ({ ...s, _auto: autoFlags[i] }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test -g "Modo serie — autollenado"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/series-mode.ts tests/big.spec.cjs
git commit -m "feat: add series-mode pure logic (auto-fill, missing sets, auto flags)"
```

---

### Task 2: `SeriesModeScreen.svelte` — Main screen during rest

**Files:**
- Create: `src/lib/components/SeriesModeScreen.svelte`
- Modify: `src/lib/components/ExerciseDetail.svelte` (import and use instead of RestTimerFullscreen)
- Test: `tests/big.spec.cjs`

**Interfaces:**
- Consumes: `series-mode.ts` functions, `RestTimerData` from `rest-timer.ts`, `saveSetEntry` from `set-log.ts`
- Produces: Full-screen component with states: `registering` (during rest), `saved` (rest done), `confirm` (last set done)

- [ ] **Step 1: Write failing E2E test scenarios**

```javascript
// Scenario: "Modo serie — registro en cada descanso"
// Seed: 3 planned sets, no previous logs
// Steps: open Detail → "Iniciar descanso" → set weight 80/reps 10 → "Serie 1 hecha · descansar" → rest ends → "Serie 1 guardada" → "Empezar serie 2" → ... → last rest → "Confirma tus series"
// Assert: each rest shows 220px ring, −15/+30 chips, weight 120px editable; saved screen shows check + "Serie N guardada · 80 kg × 10" + "Cambiar" + "Empezar serie N+1"

// Scenario: "Modo serie — botón Cambiar abre edición inline"
// Seed: as above, at "Serie 1 guardada"
// Steps: tap "Cambiar" → edit weight to 85 → tap outside → "Empezar serie 2"
// Assert: inline edit works (weight 34px, ±56px), value persists
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx playwright test -g "Modo serie — registro|Cambiar"`
Expected: FAIL

- [ ] **Step 3: Implement `SeriesModeScreen.svelte`**

Key structure (following `det2.js` states `S.msOn` / `S.msRest`):
- Props: `timer: RestTimerData`, `accent`, `onminimize`, `onskip`, `onadjust`, `onnext`, `onclose`, `visible`
- State: `phase: 'registering' | 'saved' | 'confirm'`, `weight`, `reps`, `saved`, `entries`, `autoFlags`
- During rest (`phase='registering'`): 220px ring, −15/+30 chips (52px), weight 120px (JetBrains Mono), ±5kg buttons 72px, reps ± buttons 56px, series marks top (4 dots: done=accent, current=white)
- Rest done (`phase='saved'`): ring complete with check, "Serie N guardada · XX kg × YY", "Cambiar" chip, "Empezar serie N+1" primary 56px
- Last set done (`phase='confirm'`): render `SeriesConfirmSheet` (Task 3)
- Debounced save (450ms) on weight/reps change → `saveSetEntry`
- "Siguiente serie" / "Empezar serie N+1" → commits shown set, calls `onnext`
- Minimize only during `registering`; skip → `onskip`
- Units via `timer.units`, name via `getExerciseDisplayName`

- [ ] **Step 4: Update `ExerciseDetail.svelte` to use `SeriesModeScreen`**

- Replace `RestTimerFullscreen` import with `SeriesModeScreen`
- Pass same props; `onnext` calls `startNextSet()` from `rest-timer.ts`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx playwright test -g "Modo serie — registro|Cambiar"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/SeriesModeScreen.svelte src/lib/components/ExerciseDetail.svelte tests/big.spec.cjs
git commit -m "feat: add SeriesModeScreen (modo serie during rest)"
```

---

### Task 3: `SeriesConfirmSheet.svelte` — "Confirma tus series" redesigned

**Files:**
- Create: `src/lib/components/SeriesConfirmSheet.svelte`
- Modify: `SeriesModeScreen.svelte` (use it in `phase='confirm'`)
- Test: `tests/big.spec.cjs`

**Interfaces:**
- Consumes: `series-mode.ts` `withAutoFlag`, `SetEntry`, `persistSets` from `set-log.ts`
- Produces: Confirm sheet with Detalle v2 standards

- [ ] **Step 1: Write failing E2E test scenarios**

```javascript
// Scenario: "Modo serie — Confirma tus series estándar Detalle v2"
// Seed: 3 sets, set 2 & 3 auto-filled
// Steps: reach Confirm sheet
// Assert: header 56px, title 28px, rows 56px mono 20px, "auto" chip ámbar, editor thumb-zone buttons 56-72px, input mono 56px, unit 17px, primary "Guardar 3 series" 60px acento, no mono 9-11px uppercase

// Scenario: "Modo serie — corregir serie autollenada en Confirma"
// Seed: as above
// Steps: tap auto-filled row → edit weight 70→75 → "Guardar 3 series"
// Assert: saved log has 75kg for that set, "auto" chip disappears
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx playwright test -g "Modo serie — Confirma|corregir"`
Expected: FAIL

- [ ] **Step 3: Implement `SeriesConfirmSheet.svelte`**

Design tokens from `det2.css` / `hoy2.css`:
- Header 56px: close 44px, title "Confirma tus series" 28px, eyebrow mono 12px (exercise name)
- Rows 56px: number circle 28px, value mono 20px "XX kg × YY", status chip 13px ("en rango" / "auto" ámbar / "bajo" naranja)
- Selected row editor (thumb-zone): weight line + reps line, each with ± buttons 56px, input mono 56px, unit 17px
- Step chips ±1.25/2.5/5 (44px)
- "Copiar a las siguientes" + "Siguiente serie" pills 48px
- Primary "Guardar N series" 60px, acento, full width
- Auto-filled sets: `_auto` flag → chip "auto" ámbar + subtle bg `rgba(255,184,77,0.1)`
- `persistSets` on save → calls `onclose`

- [ ] **Step 4: Integrate in `SeriesModeScreen.svelte`**

- When `timer.setIndex >= timer.sets` and rest done → `phase='confirm'`, render `SeriesConfirmSheet`
- Pass `entries` with `_auto` flags from `series-mode.ts`

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx playwright test -g "Modo serie — Confirma|corregir"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/SeriesConfirmSheet.svelte src/lib/components/SeriesModeScreen.svelte tests/big.spec.cjs
git commit -m "feat: add SeriesConfirmSheet (Confirma tus series v2)"
```

---

### Task 4: Clean up orphaned components

**Files:**
- Delete: `src/lib/components/RestTimerFullscreen.svelte`
- Delete: `src/lib/components/RestSetsSummary.svelte`
- Modify: `scripts/ds/groups.mjs` (remove their cards)
- Test: `npm run check`, `npm run build`

**Interfaces:**
- Consumes: nothing new
- Produces: cleaned component list

- [ ] **Step 1: Verify no imports remain**

Run: `grep -r "RestTimerFullscreen\|RestSetsSummary" src/lib/components/ src/routes/ --include="*.svelte" --include="*.ts"`
Expected: no results (only in deleted files)

- [ ] **Step 2: Delete files**

```bash
rm src/lib/components/RestTimerFullscreen.svelte src/lib/components/RestSetsSummary.svelte
```

- [ ] **Step 3: Update `scripts/ds/groups.mjs`**

Remove card generation for these components.

- [ ] **Step 4: Verify build passes**

Run: `npm run check && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/RestTimerFullscreen.svelte src/lib/components/RestSetsSummary.svelte scripts/ds/groups.mjs
git commit -m "chore: remove RestTimerFullscreen and RestSetsSummary (replaced by SeriesModeScreen/SeriesConfirmSheet)"
```

---

### Task 5: E2E test scenarios + `EXPECTED_STEPS` update

**Files:**
- Modify: `tests/big.spec.cjs`
- Test: `npx playwright test`

**Interfaces:**
- Consumes: all previous tasks
- Produces: 4 new test scenarios, updated `EXPECTED_STEPS`

- [ ] **Step 1: Add 4 new test scenarios** (already written in Tasks 1-3, ensure they're in the file)

1. `Modo serie — autollenado al saltar registro`
2. `Modo serie — registro en cada descanso`
3. `Modo serie — botón Cambiar abre edición inline`
4. `Modo serie — Confirma tus series estándar Detalle v2`
5. `Modo serie — corregir serie autollenada en Confirma`

- [ ] **Step 2: Update `EXPECTED_STEPS` constant**

Add 5 to current count (5 new tests).

- [ ] **Step 3: Run full test suite**

Run: `npx playwright test`
Expected: ALL PASS (including existing tests adapted in T15 of Hoy/Detalle v2 spec)

- [ ] **Step 4: Commit**

```bash
git add tests/big.spec.cjs
git commit -m "test: add 5 E2E scenarios for Modo serie en el descanso"
```

---

### Task 6: Verification and version bump

**Files:**
- All modified

- [ ] **Step 1: Run full verification**

Run: `npm run check && npx playwright test && npm run build`
Expected: ALL PASS

- [ ] **Step 2: Bump version and commit**

Run: `bash scripts/bump-version.sh`
Expected: version bumped, committed, pushed

---

## Execution Notes

- Tasks 1-3 are sequential (each builds on previous)
- Task 4 can run after Task 3 completes
- Task 5 runs after Task 4
- Task 6 is final gate
- No Worker changes, no schema changes
- All copy in Spanish, no emojis