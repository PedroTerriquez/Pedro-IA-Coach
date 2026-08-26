# Chart Labels + History Exercise Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix overlapping X-axis date labels on the weight chart, and add ExerciseDetail sheet access + inline exercise editing from the history Ejercicios tab.

**Architecture:** Two independent changes — a one-line fix in LineChart.svelte, and a multi-file update in history/+page.svelte to wire up ExerciseDetail and add inline edit forms.

**Tech Stack:** Svelte 5 (runes), TypeScript, existing components (LineChart, ExerciseDetail, Icon, Sparkline)

---

## Files

| File | Change |
|---|---|
| `src/lib/components/LineChart.svelte:46-50` | Only render first + last X-axis date labels |
| `src/routes/history/+page.svelte` | Import ExerciseDetail + Icon, add state, wire callbacks, restructure card markup, add edit form + styles |

---

### Task 1: LineChart X-axis — first and last labels only

**Files:**
- Modify: `src/lib/components/LineChart.svelte:46-50`

- [ ] **Step 1: Modify the pts.forEach loop to only render first and last labels**

Replace the existing `pts.forEach` block (lines 46-50) with:

```svelte
    pts.forEach((p, i) => {
      const isLast = i === pts.length - 1
      svg += `<circle cx="${p.x}" cy="${p.y}" r="${isLast ? 4 : 2.5}" fill="${isLast ? c : '#0a0a0a'}" stroke="${c}" stroke-width="1.5"/>`
      if (i === 0 || isLast) {
        const anchor = i === 0 ? 'start' : 'end'
        svg += `<text x="${p.x}" y="${height - 10}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="${anchor}" font-family="JetBrains Mono,monospace">${p.label}</text>`
      }
    })
```

Key changes:
- Added `if (i === 0 || isLast)` guard around the `<text>` element
- First label uses `text-anchor="start"`, last uses `text-anchor="end"` so they don't overflow the chart edges

- [ ] **Step 2: Verify the build passes**

Run: `npm run check`
Expected: PASS (no type errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/LineChart.svelte
git commit -m "fix(chart): show only first and last x-axis date labels"
```

---

### Task 2: History Ejercicios — ExerciseDetail sheet + inline edit

**Files:**
- Modify: `src/routes/history/+page.svelte`

- [ ] **Step 1: Add imports for ExerciseDetail and Icon**

At the top of the `<script>` block, add these imports after the existing imports (after line 10):

```svelte
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import Icon from '$lib/components/Icon.svelte'
```

- [ ] **Step 2: Add ExerciseDetail sheet state variables**

After the existing state variables (after line 23, `let loaded = $state(false)`), add:

```svelte
  let detailExercise: (Exercise & { logs: ExerciseLog[] }) | null = $state(null)
  let showDetail = $state(false)
```

- [ ] **Step 3: Add inline edit state variables**

After the detail state variables, add:

```svelte
  let expandedId: string | null = $state(null)
  let editingId: string | null = $state(null)
  let editName = $state('')
  let editMuscle = $state('')
  let editImgUrl = $state('')
```

- [ ] **Step 4: Replace the onOpenExercise stub with openDetail + edit functions**

Replace the existing `onOpenExercise` function (lines 77-79) with:

```svelte
  function openDetail(ex: Exercise & { logs: ExerciseLog[] }) {
    detailExercise = ex
    showDetail = true
  }

  function onDetailClose() {
    showDetail = false
    detailExercise = null
  }

  function toggleEdit(ex: Exercise & { logs: ExerciseLog[] }) {
    if (expandedId === ex.id) {
      expandedId = null
      editingId = null
    } else {
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
    await storage.saveExercise({
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

- [ ] **Step 5: Restructure the exercise card markup**

Replace the existing exercise card block (lines 152-173) with:

```svelte
      <div class="ex-list">
        {#each filtered as e}
          {@const last = getLastWeight(e.logs)}
          {@const delta = getDelta(e.logs)}
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
                  onclick={(ev) => { ev.stopPropagation(); toggleEdit(e) }}
                  aria-label="Editar ejercicio"
                >
                  <Icon name="pencil" size={16} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
              <div class="ex-muscle">{e.muscle}</div>
            </div>
            {#if e.logs.length > 0}
              <div class="ex-sparkline">
                <Sparkline data={e.logs} width={70} height={26} color={delta >= 0 ? accent : '#ff6b6b'} />
              </div>
            {:else}
              <div class="ex-sparkline-placeholder"></div>
            {/if}
            <div class="ex-stats">
              <div class="ex-last">{last}<span class="ex-unit">{units}</span></div>
              <div class="ex-delta" style="color:{delta >= 0 ? accent : '#ff6b6b'}">{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
            </div>
          </div>

          {#if expandedId === e.id}
            <div class="ex-edit-form">
              <input
                type="text"
                value={editName}
                oninput={(ev) => editName = (ev.target as HTMLInputElement).value}
                placeholder="Nombre"
                class="ex-edit-input"
              />
              <input
                type="text"
                value={editMuscle}
                oninput={(ev) => editMuscle = (ev.target as HTMLInputElement).value}
                placeholder="Músculo"
                class="ex-edit-input"
              />
              <input
                type="text"
                value={editImgUrl}
                oninput={(ev) => editImgUrl = (ev.target as HTMLInputElement).value}
                placeholder="URL imagen (opcional)"
                class="ex-edit-input"
              />
              <div class="ex-edit-actions">
                <button class="btn-cancel" onclick={cancelEdit}>Cancelar</button>
                <button class="btn-save" onclick={() => saveEdit(e)}>Guardar</button>
              </div>
            </div>
          {/if}
        {/each}
      </div>
```

- [ ] **Step 6: Add ExerciseDetail sheet at the end of the template**

After the closing `</div>` of the page (line 177), before `<style>`, add:

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

- [ ] **Step 7: Add new CSS styles**

Inside the `<style>` block, after the existing `.ex-delta` rule (line 272), add:

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
    flex-shrink: 0;
  }
  .ex-edit-btn:active {
    opacity: 1;
  }

  .ex-edit-form {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .ex-edit-input {
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 12px;
    color: #fafafa;
    font-size: 14px;
    font-family: 'Space Grotesk', sans-serif;
    outline: none;
  }
  .ex-edit-input:focus {
    border-color: rgba(255,255,255,0.2);
  }

  .ex-edit-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .btn-cancel {
    background: none;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 8px 16px;
    color: rgba(255,255,255,0.5);
    font-size: 13px;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
  .btn-save {
    background: var(--accent, #d4ff3a);
    border: none;
    border-radius: 10px;
    padding: 8px 16px;
    color: #0a0a0a;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
```

- [ ] **Step 8: Verify the build passes**

Run: `npm run check`
Expected: PASS (no type errors)

- [ ] **Step 9: Run the E2E tests**

Run: `npx playwright test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/routes/history/+page.svelte
git commit -m "feat(history): open ExerciseDetail sheet + inline edit from Ejercicios tab"
```

---

## Verification Checklist

After both tasks are complete:

1. **Chart labels**: Open ExerciseDetail > Historial tab with 10+ sessions → only first and last dates visible on X-axis
2. **Single session**: Exercise with 1 session → single label shown centered
3. **History card tap**: Tap exercise card in Ejercicios tab → ExerciseDetail sheet opens with correct exercise and weight chart
4. **Pencil icon**: Pencil icon visible next to exercise name on every card
5. **Inline edit**: Tap pencil → card expands inline with name/muscle/image fields pre-populated
6. **Save edit**: Modify name, tap Guardar → card collapses, name updates in list
7. **Cancel edit**: Tap Cancelar → card collapses, no changes saved
8. **Accordion**: Tap pencil on exercise A, then pencil on exercise B → A collapses, B expands
9. **No event bleed**: Tap pencil does NOT open ExerciseDetail sheet (stopPropagation)
10. **Accessibility**: Card is focusable via tabindex, pencil button has aria-label
