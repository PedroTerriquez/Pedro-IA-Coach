# Spec: Chart X-Axis Labels + History Exercise Edit Access

**Date:** 2026-08-25  
**Status:** Approved  
**Scope:** Two UI improvements to the history/exercise-detail experience

---

## Problem

1. **Chart labels overlap:** The LineChart X-axis renders a date label for every session. As history grows, labels overlap and become unreadable.
2. **No edit access from history:** The "Ejercicios" tab in History shows exercise cards, but tapping does nothing (stub `console.log`). Users cannot view exercise details or edit exercise metadata from this screen.

---

## Feature 1: Chart X-Axis — First and Last Labels Only

### Current behavior
`LineChart.svelte:46-50` — every data point renders a `<text>` X-axis label. With 10+ sessions, labels overlap.

### Change
Render only the **first** (`i === 0`) and **last** (`i === pts.length - 1`) date labels. If `data.length === 1`, render just that one label.

### File
`src/lib/components/LineChart.svelte`

### Implementation detail
```svelte
<!-- Current: renders label for every point -->
pts.forEach((p, i) => {
  ...
  svg += `<text ...>${p.label}</text>`
})

<!-- New: only first and last labels -->
pts.forEach((p, i) => {
  const isFirst = i === 0
  const isLast = i === pts.length - 1
  if (isFirst || isLast) {
    svg += `<text x="${p.x}" y="${height - 10}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="${isFirst ? 'start' : 'end'}" font-family="JetBrains Mono,monospace">${p.label}</text>`
  }
})
```

### Edge cases
- `data.length === 0`: no labels (already handled by early return)
- `data.length === 1`: render that single label, `text-anchor="middle"`
- `data.length === 2`: both are first and last, render both

---

## Feature 2: History Exercise List — Sheet + Inline Edit

### Current behavior
History > Ejercicios tab shows exercise cards with sparkline + last weight + delta. Tapping a card calls `onOpenExercise(ex)` which is a stub (`console.log`).

### New behavior

**Card tap → opens ExerciseDetail sheet**
- Tapping the card body opens the existing ExerciseDetail bottom sheet (same as from Today/Plan)
- Sheet shows the Historial tab with weight chart + session list
- Sheet can be closed to return to the history list

**Pencil icon → expands card inline with editing form**
- A pencil icon (`Icon name="pencil"`, 16px) is always visible next to the exercise name
- Tapping the pencil icon (with `stopPropagation`) expands the card in-place to reveal editing fields
- Fields: exercise name, muscle, image URL (same as `ExerciseListItem` in You > Ejercicios)
- Save/Cancel buttons at the bottom of the expanded area
- Accordion behavior: only one card expanded at a time; tapping another pencil collapses the previous

### Files to modify

| File | Change |
|---|---|
| `src/routes/history/+page.svelte` | Import ExerciseDetail + Icon, add editing state, wire callbacks, restructure card markup |
| `src/lib/components/LineChart.svelte` | First/last X-axis labels only |

### State additions (history/+page.svelte)

```typescript
// ExerciseDetail sheet state
let detailExercise: Exercise | null = $state(null)
let showDetail = $state(false)

// Inline edit state
let expandedId: string | null = $state(null)
let editingId: string | null = $state(null)
let editName = $state('')
let editMuscle = $state('')
let editImgUrl = $state('')
```

### Card markup restructure

```svelte
<!-- Before: <button class="card ex-card" onclick={() => onOpenExercise(e)}> -->
<div
  class="card ex-card"
  role="button"
  tabindex="0"
  onclick={() => openDetail(e)}
  onkeydown={(ev) => ev.key === 'Enter' && openDetail(e)}
>
  <div class="ex-info">
    <div class="ex-name-row">
      <span class="ex-name">{getExerciseDisplayName(e, $settings.language)}</span>
      <button
        class="ex-edit-btn"
        onclick|stopPropagation={() => toggleEdit(e)}
        aria-label="Editar ejercicio"
      >
        <Icon name="pencil" size={16} color="rgba(255,255,255,0.4)" />
      </button>
    </div>
    <div class="ex-muscle">{e.muscle}</div>
  </div>
  <!-- ...sparkline, stats... -->
</div>

{#if expandedId === e.id}
  <div class="ex-edit-form">
    <input bind:value={editName} placeholder="Nombre" />
    <input bind:value={editMuscle} placeholder="Músculo" />
    <input bind:value={editImgUrl} placeholder="URL imagen" />
    <div class="ex-edit-actions">
      <button onclick={() => saveEdit(e)}>Guardar</button>
      <button onclick={cancelEdit}>Cancelar</button>
    </div>
  </div>
{/if}
```

### Functions to add (history/+page.svelte)

```typescript
function openDetail(ex: Exercise) {
  detailExercise = ex
  showDetail = true
}

function onDetailClose() {
  showDetail = false
}

function toggleEdit(ex: Exercise) {
  if (expandedId === ex.id) {
    // Collapse
    expandedId = null
    editingId = null
  } else {
    // Expand + enter edit mode
    expandedId = ex.id
    editingId = ex.id
    editName = getExerciseDisplayName(ex, $settings.language)
    editMuscle = ex.muscle
    editImgUrl = ex.imgUrl || ''
  }
}

function cancelEdit() {
  expandedId = null
  editingId = null
}

async function saveEdit(ex: Exercise) {
  await storage.updateExercise({
    ...ex,
    name: editName,
    muscle: editMuscle,
    imgUrl: editImgUrl
  })
  expandedId = null
  editingId = null
  await refresh()
}
```

### ExerciseDetail wiring

`ExerciseDetail` expects an `ExerciseDetail` interface with `sets`, `reps`, `rest` (program-level fields). History exercises are `Exercise` objects without these. Construct a compatible object with defaults:

```svelte
{#if detailExercise}
  <ExerciseDetail
    exercise={{
      ...detailExercise,
      sets: 0,
      reps: '',
      rest: 0,
      logs: detailExercise.logs
    }}
    open={showDetail}
    {accent}
    {units}
    hasPrev={false}
    hasNext={false}
    isToday={false}
    onClose={onDetailClose}
  />
{/if}
```

- `hasPrev`/`hasNext` = `false`: no sequential navigation from history context
- `isToday` = `false`: Workout tab is read-only (no logging from history)
- No `onLog` needed since logging is disabled

### Styles to add

```css
.ex-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.ex-edit-btn {
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: opacity 0.15s;
}

.ex-edit-btn:hover {
  opacity: 1;
}

.ex-edit-form {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid var(--border);
}

.ex-edit-form input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 12px;
  color: var(--text);
  font-size: 14px;
  font-family: 'Space Grotesk', sans-serif;
}

.ex-edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
```

---

## Testing

- **Chart labels:** Open ExerciseDetail > Historial tab with 10+ sessions → only first and last dates visible on X-axis
- **Chart labels (edge):** Exercise with 1 session → single label shown centered
- **History card tap:** Tap exercise card in Ejercicios tab → ExerciseDetail sheet opens with correct exercise
- **Pencil icon tap:** Tap pencil → card expands inline with name/muscle/image fields populated
- **Save edit:** Modify name, tap Guardar → card collapses, name updates in list
- **Cancel edit:** Tap Cancelar → card collapses, no changes saved
- **Accordion:** Tap pencil on exercise A, then pencil on exercise B → A collapses, B expands
- **Card tap vs pencil:** Tap pencil does NOT open ExerciseDetail sheet (stopPropagation)
- **Accessibility:** Card is focusable via tabindex, pencil button is a real button with aria-label

---

## Out of scope

- Editing tips/alternatives from history (only name/muscle/image — matching You > Ejercicios edit form scope)
- Swipe gestures on exercise cards
- Reordering exercises from history
