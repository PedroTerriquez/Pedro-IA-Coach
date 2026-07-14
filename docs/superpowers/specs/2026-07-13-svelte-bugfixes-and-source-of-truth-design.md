# Svelte App: Bug Fixes + Source of Truth Architecture

**Date:** 2026-07-13
**Status:** Approved
**Scope:** 5 bug fixes + shared state store + E2E test

---

## Context

The Svelte migration of Coach Pedro AI has 5 bugs blocking release. The root cause of bugs #1–#4 is a missing shared state layer — each view loads data independently in `onMount`, leading to stale state, cross-view inconsistencies, and ID-vs-name display issues. Bug #5 is a missing CSS/styling issue.

No push until all fixes are complete and tests pass.

---

## Bug #1: Today — Exercises outside training card

**File:** `src/routes/today/+page.svelte`

**Current behavior:** After warmup completes (`phase === 'training'`), the template renders:
- A "Fase 02" training card (lines 744–763) with title, progress bar, play button
- A separate `<div id="today-exercise-list">` (lines 765–786) BELOW the card with exercise rows containing checkboxes and weight inputs

**Expected behavior:** The training card should contain mini exercise previews inside it — small image + name + sets×reps as a visual preview. No checkboxes or weight inputs in the preview (those belong in the detail sheet).

**Fix:**
1. Move the exercise rendering INTO the training card, after the progress bar section (after line 762)
2. Each exercise row: 44×44 image thumbnail (from `resolveExerciseMedia`) + exercise name + muscle pill + `{sets}×{reps}` on the right
3. Remove the separate `<div id="today-exercise-list">` entirely
4. Remove checkboxes and weight inputs from the preview (they exist in ExerciseDetail)
5. Keep the card clickable (`onclick={openTrainingDetail}`) — tapping opens the detail sheet

**Layout inside card (after progress bar):**
```
┌─────────────────────────────────┐
│ Fase 02          [● Sigue]      │
│ Entrenamiento                    │
│ Chest · Shoulders · Triceps      │
│ ━━━━━━━━━━ 2/5                  │
│                                 │
│ ┌────┬──────────────┬─────────┐ │
│ │img │ Press Banca  │ 4×8-10  │ │
│ └────┴──────────────┴─────────┘ │
│ ┌────┬──────────────┬─────────┐ │
│ │img │ Press Inclin │ 3×10    │ │
│ └────┴──────────────┴─────────┘ │
│ ┌────┬──────────────┬─────────┐ │
│ │img │ Aperturas    │ 3×12    │ │
│ └────┴──────────────┴─────────┘ │
│                                 │
│              [▶ Play button]    │
└─────────────────────────────────┘
```

---

## Bug #2: Plan — Auto-expand today's exercises on week switch

**File:** `src/routes/plan/+page.svelte`

**Current behavior:** When switching weeks via tab clicks, `handleWeekClick` sets `planExpandedDayIdx = null` and `planAutoExpanded = false`. The `$effect` re-expands using `todayIdx = (new Date().getDay() + 6) % 7` — but this is the calendar position (Mon=0..Sun=6), NOT the program's day index after reschedule.

**Expected behavior:** When switching to any week, auto-expand the day that corresponds to TODAY in that week, considering the reschedule order for that specific week.

**Fix:**
1. In `handleWeekClick`, compute the correct expanded day index by applying the reschedule order for the new week:
   ```ts
   const key = program ? `${program.id}-week-${idx}` : ''
   const rescheduleOrders = ($settings.rescheduleWeekOrder || {}) as Record<string, number[]>
   const order = rescheduleOrders[key] || DEFAULT_ORDER
   // todayIdx is calendar position (Mon=0..Sun=6)
   // We need to find which calIdx maps to today's original day
   // Actually: the calendar shows days in `order` sequence
   // So calIdx 0 = order[0], calIdx 1 = order[1], etc.
   // Today's calendar position is `todayIdx`
   // The day at that position is `week.days[order[todayIdx]]`
   // We want to expand calIdx = todayIdx (the calendar slot for today)
   planExpandedDayIdx = todayIdx
   planAutoExpanded = true
   ```
2. The `$effect` should also handle the case where `todayIdx` maps to a rest day — in that case, expand the first workout day instead, or don't expand.
3. When switching weeks, always re-expand today's slot (or first workout slot if today is rest).

---

## Bug #3: Source of truth — Shared state store

**New file:** `src/lib/stores/app-state.ts`

**Problem:** Each view independently loads `program`, `weekIdx`, `day`, `exercises` in `onMount`. This causes:
- ExerciseDetail navigation (prev/next) uses a local `detailExercises` array set at open time — navigating past the boundaries shows exercises from wrong weeks/days
- Plan tab changes `currentWeekIdx` but Today and History don't react
- Today computes `day` from `detectedDayIdx` + reschedule at mount — doesn't update if reschedule changes

**Design:**

```ts
import { writable, derived, get } from 'svelte/store'
import * as Storage from '$lib/storage'
import { settings } from './settings'
import type { Program, ProgramDay, Exercise, ProgramWeek } from '$lib/types'

interface AppState {
  program: Program | null
  currentWeekIdx: number
  todayDayIdx: number          // calendar index (Mon=0..Sun=6)
  todayOriginalDayIdx: number  // after reschedule mapping
  todayDay: ProgramDay | null
  todayWeek: ProgramWeek | null
  exercises: Exercise[]
  exercisesById: Record<string, Exercise>
  loaded: boolean
}

function createAppState() {
  const store = writable<AppState>({
    program: null, currentWeekIdx: 0, todayDayIdx: 0,
    todayOriginalDayIdx: 0, todayDay: null, todayWeek: null,
    exercises: [], exercisesById: {}, loaded: false
  })

  return {
    subscribe: store.subscribe,
    load: async () => {
      const [exs, progs, s] = await Promise.all([
        Storage.getExercises(),
        Storage.getPrograms(),
        Storage.getSettings()
      ])
      const program = progs.find(p => p.id === s.activeProgramId) || null
      const currentWeekIdx = s.currentWeekIdx || 0
      const weekObj = program?.weeks?.[currentWeekIdx] || null
      const todayDayIdx = (new Date().getDay() + 6) % 7
      const rescheduleKey = program ? `${program.id}-week-${currentWeekIdx}` : ''
      const orders = (s.rescheduleWeekOrder || {}) as Record<string, number[]>
      const order = orders[rescheduleKey] || [0, 1, 2, 3, 4, 5, 6]
      const todayOriginalDayIdx = order[todayDayIdx < order.length ? todayDayIdx : 0]
      const todayDay = weekObj?.days?.[todayOriginalDayIdx] || null
      const exercisesById = Object.fromEntries(exs.map(e => [e.id, e]))

      store.set({
        program, currentWeekIdx, todayDayIdx, todayOriginalDayIdx,
        todayDay, todayWeek: weekObj,
        exercises: exs, exercisesById, loaded: true
      })
    },
    setWeek: async (idx: number) => {
      const state = get(store)
      if (!state.program) return
      await settings.update({ currentWeekIdx: idx })
      const s = await Storage.getSettings()
      const weekObj = state.program.weeks[idx] || null
      const rescheduleKey = `${state.program.id}-week-${idx}`
      const orders = (s.rescheduleWeekOrder || {}) as Record<string, number[]>
      const order = orders[rescheduleKey] || [0, 1, 2, 3, 4, 5, 6]
      const todayOriginalDayIdx = order[state.todayDayIdx < order.length ? state.todayDayIdx : 0]
      const todayDay = weekObj?.days?.[todayOriginalDayIdx] || null
      store.update(s => ({
        ...s, currentWeekIdx: idx, todayWeek: weekObj,
        todayOriginalDayIdx, todayDay
      }))
    },
    refresh: async () => {
      // Re-read from IndexedDB (after mutations)
      const state = get(store)
      const exs = await Storage.getExercises()
      const exercisesById = Object.fromEntries(exs.map(e => [e.id, e]))
      store.update(s => ({ ...s, exercises: exs, exercisesById }))
    }
  }
}

export const appState = createAppState()
```

**Consumers:**
- **Today** `onMount`: call `appState.load()`, then derive `day`, `weekObj`, `todayExercises` from `$appState`
- **Plan** `handleWeekClick`: call `appState.setWeek(idx)` — all views react
- **History**: read `$appState.program` and `$appState.currentWeekIdx` for Calendar
- **ExerciseDetail** navigation: receive `detailExercises` derived from `$appState.todayDay.exercises` + `$appState.exercisesById`, scoped to current day

**Key change for ExerciseDetail navigation:**
The `onDetailNavigate` callback in Today currently increments/decrements `detailIdx` within the local `detailExercises` array. With the shared store, `detailExercises` is always derived from the current day's exercises, so prev/next naturally stays within the day. If the user reaches the end of today's exercises, `hasNext` becomes false.

---

## Bug #4: History "programado" shows IDs instead of names

**File:** `src/lib/components/Calendar.svelte`

**Current behavior (line 57–62):**
```ts
const exercises = raw.map((e: any) => {
  if (e.name) return e
  const resolved = exercisesMap?.[e.exerciseId]
  const display = getExerciseDisplayName(resolved || e)
  return { ...e, name: display || e.exerciseId, muscle: (resolved as any)?.muscle || e.muscle }
})
```

When `getExerciseDisplayName` returns empty string (or the global function isn't available), the fallback is `e.exerciseId` — a UUID-like string.

**Fix:**
1. Use `exercisesMap` first (passed as prop from history page, which loads all exercises):
   ```ts
   const exercises = raw.map((e: any) => {
     if (e.name) return e
     const resolved = exercisesMap?.[e.exerciseId]
     if (resolved?.name) return { ...e, name: resolved.name, muscle: resolved.muscle || e.muscle }
     // Fallback: try global function, then raw field, then generic label
     const display = typeof getExerciseDisplayName === 'function' 
       ? getExerciseDisplayName(resolved || e) 
       : ''
     return { ...e, name: display || e.name || 'Ejercicio', muscle: (resolved as any)?.muscle || e.muscle }
   })
   ```
2. The key insight: `exercisesMap` is built from the `exercises` prop which contains all exercises from IndexedDB. If an exercise ID exists in the program but not in the exercises map, we should still show something readable — use `e.name` if it exists (from the program definition), otherwise a generic label.

---

## Bug #5: You — "Ejercicios" subtab not clickable

**File:** `src/routes/you/+page.svelte`

**Current behavior:** The tab buttons use `class:you-tab-active={activeTab === 'ejercicios'}` but there is NO `<style>` block in the component. The `you-tab-active` class has no CSS definition. However, the `onclick` handler should still work.

**Root cause analysis:** The buttons DO have `onclick={() => setTab('ejercicios')}` which sets `activeTab = 'ejercicios'`. The template has `{#else if activeTab === 'ejercicios'}` at line 653 which should render the exercises section. Possible causes:
1. The exercises section renders but is empty/hidden due to a CSS issue
2. A JavaScript error in the exercises section prevents rendering
3. The button click is intercepted by another element

**Fix:**
1. Add a `<style>` block with proper tab button styles (consistent with other tab UIs in the app)
2. Ensure the `ejercicios` tab content renders correctly — check for any runtime errors in the exercise list rendering
3. Test that clicking the tab actually switches the view

---

## E2E Test Plan

**Single comprehensive test file:** `tests/svelte-flow.spec.js`

Test scenarios to cover in one continuous flow:

1. **App loads** → redirects to Today (or shows empty state)
2. **Today — empty state** → shows "Comenzar" button → navigates to You
3. **You — create program** → Programas tab → create program with 2 weeks, 3 days each
4. **You — create exercises** → Ejercicios tab → verify tab is clickable → create 5+ exercises
5. **Today — warmup phase** → shows warmup card → complete warmup
6. **Today — training phase** → training card shows exercise previews inside card (Bug #1 fix)
7. **Today — exercise detail** → open detail → log weight → navigate prev/next → verify stays within day (Bug #3)
8. **Plan — week switching** → switch to week 2 → exercises auto-expand for today (Bug #2)
9. **Plan — multi-week** → switch to week 3 → exercises update correctly
10. **History — constancia tab** → select a day → "programado" shows exercise NAMES not IDs (Bug #4)
11. **History — ejercicios tab** → exercise list with sparklines renders
12. **You — ejercicios tab** → tab is clickable and shows exercise list (Bug #5)
13. **Cross-view consistency** → change week in Plan → navigate to Today → verify it reflects the change

---

## Implementation Order

1. Create `src/lib/stores/app-state.ts` (source of truth store)
2. Fix Bug #4 — Calendar.svelte exercise name resolution
3. Fix Bug #5 — You page ejercicios tab styling/clickability
4. Fix Bug #1 — Today training card exercise previews
5. Fix Bug #2 — Plan auto-expand on week switch
6. Refactor Today, Plan, History to use `appState` store (Bug #3)
7. Write E2E test
8. Run `npm run check` (svelte-check) to verify no type errors
9. Run tests and verify all pass
10. Commit all changes
