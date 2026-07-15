# SvelteKit Component Library — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace inline HTML/CSS duplication across SvelteKit routes with shared reusable components and design tokens.

**Architecture:** Build/fix 4 shared components (Sheet, ExerciseRow, SegmentedControl, CoachChat), then refactor 7 routes to adopt them. Migrate hardcoded values to `var(--token)` from `app.css`. Single commit, all tests passing.

**Tech Stack:** SvelteKit 5, Svelte 5 runes ($props, $derived, $state), TypeScript, scoped CSS

---

## File Map

### New Files
| File | Purpose |
|---|---|
| `src/lib/components/ExerciseRow.svelte` | Data row: thumbnail + name/muscle + sets×reps + weight |
| `src/lib/components/SegmentedControl.svelte` | Tab-like control with 2+ options |
| `src/lib/components/CoachChat.svelte` | Full chat interface (extracted from ExerciseDetail) |

### Modified Files
| File | Changes |
|---|---|
| `src/app.css` | Add `.input-field` utility class |
| `src/lib/components/Sheet.svelte` | Make `open` bindable, add `header` snippet |
| `src/lib/components/ExerciseDetail.svelte` | Use Sheet, SegmentedControl, CoachChat, StatBlock |
| `src/lib/components/Warmup.svelte` | Use Sheet, full inline→scoped CSS migration |
| `src/lib/components/Calendar.svelte` | Use ExerciseRow, token migration |
| `src/routes/today/+page.svelte` | Use ExerciseRow, SectionLabel, Chip, StatBlock |
| `src/routes/plan/+page.svelte` | Use ExerciseRow |
| `src/routes/history/+page.svelte` | Use SegmentedControl, Chip |
| `src/routes/you/+page.svelte` | Use SectionLabel, Chip, ExerciseRow, .input-field |

### Removed Files
| File | Reason |
|---|---|
| `src/lib/components/CoachCard.svelte` | Unused, replaced by CoachChat |

---

## Phase 1: Build Components (no route changes)

### Task 1: Add utility classes to `app.css`

**Files:**
- Modify: `src/app.css`

- [ ] **Step 1: Add utility classes after existing `.btn-ghost` block (after line 189)**

```css
.input-field {
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 0.5px solid var(--border-light);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  font-family: var(--font-sans);
  outline: none;
  box-sizing: border-box;
}

.input-field-mono {
  padding: 6px 8px;
  border-radius: 8px;
  border: 0.5px solid var(--border-light);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  font-family: var(--font-mono);
  text-align: right;
  outline: none;
  box-sizing: border-box;
}

.card {
  margin: 0 20px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  border: 0.5px solid var(--border);
}

.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 0.5px solid var(--border-light);
}
```

- [ ] **Step 2: Verify CSS is valid**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No new errors related to `app.css`

---

### Task 2: Fix `Sheet.svelte` API

**Files:**
- Modify: `src/lib/components/Sheet.svelte` (90 lines)

Current Sheet has `open: boolean` (not bindable) and renders children directly. We need:
- `open` to be bindable (`$bindable()`)
- Add optional `header` Snippet prop

- [ ] **Step 1: Update props to use `$bindable()`**

Replace lines 4-7:
```svelte
  let { open = $bindable(false), children, header }: {
    open: boolean
    children?: import('svelte').Snippet
    header?: import('svelte').Snippet
  } = $props()
```

- [ ] **Step 2: Update close handler to set open = false**

Replace the existing `close` function (should be near line 8-10):
```svelte
  function close() {
    open = false
  }
```

- [ ] **Step 3: Add header rendering in template**

In the template, after the handle div (line 24) and before the body div (line 25), add:
```svelte
        {#if header}
          <div class="sheet-header">{@render header()}</div>
        {/if}
```

- [ ] **Step 4: Add header style**

In the `<style>` block, add:
```css
  .sheet-header {
    padding: 4px 20px 0;
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
```

- [ ] **Step 5: Verify Sheet still compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No new errors

---

### Task 3: Create `ExerciseRow.svelte`

**Files:**
- Create: `src/lib/components/ExerciseRow.svelte`

This replaces the inline exercise row pattern used in 4 routes (today lines 763-783, plan lines 344-366, you lines 683-694, Calendar lines 398-414).

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  let { name, muscle, imgUrl, sets, reps, weight, units = 'kg', accent = 'var(--accent)', selectable = false, selected = false, onclick, actions }: {
    name: string
    muscle: string
    imgUrl?: string
    sets?: number
    reps?: string
    weight?: number
    units?: string
    accent?: string
    selectable?: boolean
    selected?: boolean
    onclick?: () => void
    actions?: import('svelte').Snippet
  } = $props()
</script>

<button class="exercise-row" class:selected {onclick} type="button">
  <div class="ex-thumb">
    {#if imgUrl}
      <img src={imgUrl} alt="" />
    {:else}
      <div class="ex-placeholder"></div>
    {/if}
  </div>
  <div class="ex-info">
    <div class="ex-name">{name}</div>
    <div class="ex-muscle">{muscle}</div>
  </div>
  <div class="ex-meta">
    {#if weight != null && weight > 0}
      <div class="ex-weight">{weight}<span class="ex-unit">{units}</span></div>
    {/if}
    {#if sets != null && reps}
      <div class="ex-sets">{sets}<span class="ex-x">x</span>{reps}</div>
    {/if}
  </div>
  {#if actions}
    <div class="ex-actions">{@render actions()}</div>
  {/if}
</button>

<style>
  .exercise-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 0;
    background: transparent;
    border: 0;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .exercise-row.selected {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 8px;
    margin: 0 -8px;
  }

  .ex-thumb {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--bg);
    overflow: hidden;
  }

  .ex-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ex-placeholder {
    width: 100%;
    height: 100%;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      var(--border-medium) 4px,
      var(--border-medium) 8px
    );
  }

  .ex-info {
    flex: 1;
    min-width: 0;
  }

  .ex-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ex-muscle {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 1px;
  }

  .ex-meta {
    text-align: right;
    flex-shrink: 0;
  }

  .ex-weight {
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
  }

  .ex-unit {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 1px;
  }

  .ex-sets {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .ex-x {
    font-size: 10px;
    margin: 0 1px;
  }

  .ex-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }
</style>
```

- [ ] **Step 2: Verify component compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 4: Create `SegmentedControl.svelte`

**Files:**
- Create: `src/lib/components/SegmentedControl.svelte`

Replaces inline segmented controls in ExerciseDetail (lines 362-373), history (lines 112-123), you (lines 542-547).

- [ ] **Step 1: Create the component**

```svelte
<script lang="ts">
  import { fly } from 'svelte/transition'

  let { options, value = $bindable(), accent = 'var(--accent)' }: {
    options: { label: string; value: string }[]
    value: string
    accent?: string
  } = $props()
</script>

<div class="seg-control">
  {#each options as opt}
    <button
      class="seg-btn"
      class:seg-active={value === opt.value}
      style={value === opt.value ? `color:${accent}` : ''}
      onclick={() => value = opt.value}
      type="button"
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .seg-control {
    display: flex;
    background: rgba(255, 255, 255, 0.04);
    border-radius: var(--radius-full);
    padding: 3px;
    gap: 2px;
  }

  .seg-btn {
    flex: 1;
    padding: 8px 16px;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    position: relative;
  }

  .seg-btn.seg-active {
    background: rgba(255, 255, 255, 0.08);
    font-weight: 600;
  }
</style>
```

- [ ] **Step 2: Verify component compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 5: Extract `CoachChat.svelte` from ExerciseDetail

**Files:**
- Create: `src/lib/components/CoachChat.svelte`
- Read: `src/lib/components/ExerciseDetail.svelte` lines 546-653 (chat template) + relevant styles

This extracts ~110 lines of chat template + ~150 lines of chat styles from ExerciseDetail.

- [ ] **Step 1: Create CoachChat.svelte with extracted code**

Read ExerciseDetail.svelte lines 48-70 (props), 546-653 (chat template), and the coach-related styles (search for `.coach-` in the style block starting around line 1494).

Create `src/lib/components/CoachChat.svelte`:
```svelte
<script lang="ts">
  let { exercise, accent = 'var(--accent)', onclose }: {
    exercise: { name: string; muscle: string; alternatives?: { name: string; reason: string }[] }
    accent?: string
    onclose?: () => void
  } = $props()

  let messages = $state<{ role: string; text: string }[]>([])
  let input = $state('')
  let loading = $state(false)
  let chatEl: HTMLDivElement

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    messages = [...messages, { role: 'user', text: userMsg }]
    input = ''
    loading = true

    try {
      const res = await fetch('/api/ai/exercise-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exercise: exercise.name,
          muscle: exercise.muscle,
          alternatives: exercise.alternatives || [],
          messages: [...messages, { role: 'user', text: userMsg }]
        })
      })
      const data = await res.json()
      messages = [...messages, { role: 'assistant', text: data.reply || 'No pude responder.' }]
    } catch {
      messages = [...messages, { role: 'assistant', text: 'Error de conexión.' }]
    } finally {
      loading = false
      chatEl?.scrollTo({ top: chatEl.scrollHeight, behavior: 'smooth' })
    }
  }

  const quickChips = ['Mejorar técnica', 'Me duele algo', '¿Voy muy pesado?', 'Variante fácil']
</script>

<div class="coach-overlay">
  <div class="coach-backdrop" onclick={onclose}></div>
  <div class="coach-panel">
    <div class="coach-header">
      <span class="coach-icon" style="color:{accent}">🤖</span>
      <span class="coach-title">Coach IA</span>
      <button class="coach-close" onclick={onclose}>✕</button>
    </div>

    <div class="coach-messages" bind:this={chatEl}>
      {#if messages.length === 0}
        <div class="coach-empty">
          Pregúntale al coach sobre <strong>{exercise.name}</strong>
        </div>
      {/if}
      {#each messages as msg}
        <div class="coach-bubble" class:coach-user={msg.role === 'user'}>
          <div class="coach-bubble-text">{msg.text}</div>
        </div>
      {/each}
      {#if loading}
        <div class="coach-bubble coach-typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
        </div>
      {/if}
    </div>

    <div class="coach-chips">
      {#each quickChips as chip}
        <button class="coach-chip" onclick={() => { input = chip; send() }}>{chip}</button>
      {/each}
    </div>

    <div class="coach-input-row">
      <input
        class="coach-input"
        placeholder="Escribe tu pregunta..."
        bind:value={input}
        onkeydown={(e) => e.key === 'Enter' && send()}
      />
      <button class="coach-send" onclick={send} disabled={!input.trim() || loading}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  </div>
</div>

<style>
  .coach-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .coach-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
  }

  .coach-panel {
    position: relative;
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    background: var(--bg);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .coach-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--border);
  }

  .coach-icon {
    font-size: 18px;
  }

  .coach-title {
    flex: 1;
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    color: var(--text);
  }

  .coach-close {
    width: 28px;
    height: 28px;
    border: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-secondary);
    font-size: 14px;
    cursor: pointer;
  }

  .coach-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 200px;
  }

  .coach-empty {
    text-align: center;
    color: var(--text-muted);
    font-size: 13px;
    padding: 40px 20px;
  }

  .coach-bubble {
    max-width: 85%;
    padding: 10px 14px;
    border-radius: 16px 16px 16px 4px;
    background: var(--surface);
    font-size: 13px;
    line-height: 1.5;
    color: var(--text);
  }

  .coach-user {
    align-self: flex-end;
    border-radius: 16px 16px 4px 16px;
    background: var(--accent);
    color: var(--bg);
  }

  .coach-typing {
    display: flex;
    gap: 4px;
    padding: 12px 16px;
  }

  .coach-typing .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: coachBlink 1.2s infinite;
  }

  .coach-typing .dot:nth-child(2) { animation-delay: 0.2s; }
  .coach-typing .dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes coachBlink {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }

  .coach-chips {
    display: flex;
    gap: 6px;
    padding: 8px 16px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .coach-chip {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border-medium);
    background: transparent;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    cursor: pointer;
    white-space: nowrap;
  }

  .coach-input-row {
    display: flex;
    gap: 8px;
    padding: 10px 16px 14px;
    border-top: 1px solid var(--border);
  }

  .coach-input {
    flex: 1;
    padding: 10px 14px;
    border-radius: var(--radius-full);
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 13px;
    outline: none;
  }

  .coach-send {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 50%;
    background: var(--accent);
    color: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .coach-send:disabled {
    opacity: 0.4;
    cursor: default;
  }
</style>
```

- [ ] **Step 2: Verify component compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors (component exists but isn't imported yet)

---

## Phase 2: Adopt Components in Routes

### Task 6: Refactor `ExerciseDetail.svelte` to use Sheet + SegmentedControl + CoachChat + StatBlock

**Files:**
- Modify: `src/lib/components/ExerciseDetail.svelte`

This is the largest refactor. Replace:
- Lines 246-257: inline sheet → `<Sheet bind:open={open}>`
- Lines 362-373: inline seg control → `<SegmentedControl>`
- Lines 546-653: inline coach chat → `<CoachChat>`
- Lines 464-477: inline stats grid → `<StatBlock>`

- [ ] **Step 1: Add imports at top of script**

After existing imports, add:
```svelte
  import Sheet from './Sheet.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import CoachChat from './CoachChat.svelte'
  import StatBlock from './StatBlock.svelte'
```

- [ ] **Step 2: Replace inline sheet structure (lines 246-257) with Sheet component**

Replace the overlay/backdrop/close/content/handle/scroll structure with:
```svelte
  <Sheet bind:open={open}>
    {#snippet header()}
      <span>{getExerciseDisplayName(exercise)}</span>
    {/snippet}
    <div class="detail-scroll">
      <!-- Navigation pills (lines 259-287) stay as-is -->
      <!-- Hero section (lines 289-338) stays as-is -->
      <!-- Prescription strip (lines 341-360) stays as-is -->
```

And close the Sheet at the end of the content (before the coach FAB and coach overlay):
```svelte
    </div>
  </Sheet>
```

Remove the old `.detail-overlay`, `.detail-backdrop`, `.detail-close-btn`, `.detail-content`, `.detail-handle` styles (lines 658-700).

- [ ] **Step 3: Replace inline segmented control (lines 362-373) with SegmentedControl**

Replace:
```svelte
        <div class="seg-control">
          <button class="seg-btn" class:seg-active={tab === 'workout'} onclick={() => tab = 'workout'}>
            Registrar
            {#if loggedToday}
              <span class="seg-dot" ...></span>
            {/if}
          </button>
          <button class="seg-btn" class:seg-active={tab === 'history'} onclick={() => tab = 'history'}>
            Historial
          </button>
        </div>
```

With:
```svelte
        <SegmentedControl
          options={[
            { label: 'Registrar', value: 'workout' },
            { label: 'Historial', value: 'history' }
          ]}
          bind:value={tab}
          {accent}
        />
```

Remove `.seg-control`, `.seg-btn`, `.seg-active`, `.seg-dot` styles (lines 1019-1060).

- [ ] **Step 4: Replace inline stats grid (lines 464-477) with StatBlock**

Replace:
```svelte
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value" style="color:{accent}">...<span class="stat-unit">kg</span></div>
              <div class="stat-label">Max total</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">...<span class="stat-unit">kg</span></div>
              <div class="stat-label">Actual</div>
            </div>
            <div class="stat-card">
              <div class="stat-value" style="color:...">...<span class="stat-unit">kg</span></div>
              <div class="stat-label">Delta 6 sem.</div>
            </div>
          </div>
```

With:
```svelte
          <div class="stats-grid">
            <StatBlock value={maxTotal} label="Max total" unit="kg" {accent} />
            <StatBlock value={currentWeight} label="Actual" unit="kg" />
            <StatBlock value={delta} label="Delta 6 sem." unit="kg" accent={delta >= 0 ? accent : '#ff6b6b'} />
          </div>
```

Remove `.stats-grid`, `.stat-card`, `.stat-value`, `.stat-unit`, `.stat-label` styles (lines 1320-1370).

- [ ] **Step 5: Replace inline coach chat (lines 546-653) with CoachChat**

Replace the entire `{#if chatOpen}...{/if}` block (lines 546-653) with:
```svelte
    {#if chatOpen}
      <CoachChat {exercise} {accent} onclose={() => chatOpen = false} />
    {/if}
```

Remove all `.coach-overlay`, `.coach-backdrop`, `.coach-panel`, `.coach-header`, `.coach-messages`, `.coach-bubble`, `.coach-chips`, `.coach-input-row`, `.coach-input`, `.coach-send`, `.coach-typing`, `.coach-fab` styles (lines 1472-1763).

- [ ] **Step 6: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -30`
Expected: No errors

---

### Task 7: Refactor `Warmup.svelte` to use Sheet + scoped CSS

**Files:**
- Modify: `src/lib/components/Warmup.svelte`

Replace inline sheet structure (lines 183-194) with `<Sheet>`, then migrate ALL inline styles to scoped CSS.

- [ ] **Step 1: Add Sheet import**

```svelte
  import Sheet from './Sheet.svelte'
```

- [ ] **Step 2: Replace inline sheet structure (lines 183-194) with Sheet**

Replace the overlay/backdrop/close/content/handle inline-styled divs with:
```svelte
<Sheet bind:open={isOpen}>
  <div class="warmup-content">
    <!-- navigation buttons, progress bar, slides -->
  </div>
</Sheet>
```

Where `isOpen` is a local `$state(true)` that the sheet's close button sets to false, and `onComplete` fires when done.

- [ ] **Step 3: Migrate ALL inline styles to scoped CSS**

Go through every element in the template and replace `style="..."` with CSS classes. Key mappings:

| Inline pattern | CSS class |
|---|---|
| `style="display:flex;align-items:center;justify-content:space-between;padding:0 16px"` | `.nav-row` |
| `style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.08);..."` | `.nav-btn` |
| `style="font-family:'Space Grotesk';font-size:15px;font-weight:600;color:#fafafa"` | `.slide-title` |
| `style="height:4px;border-radius:2px;background:rgba(255,255,255,0.08);flex:1"` | `.progress-track` |
| `style="height:4px;border-radius:2px;background:{accent};width:{pct}%"` | `.progress-fill` |
| `style="font-family:'JetBrains Mono';font-size:11px;color:rgba(255,255,255,0.45)"` | `.step-label` |

Write the full scoped `<style>` block using `var(--token)` references. The complete CSS should be ~80-100 lines covering all elements.

- [ ] **Step 4: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 8: Refactor `today/+page.svelte` to use ExerciseRow + SectionLabel + Chip + StatBlock

**Files:**
- Modify: `src/routes/today/+page.svelte`

- [ ] **Step 1: Add imports**

```svelte
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import StatBlock from '$lib/components/StatBlock.svelte'
```

- [ ] **Step 2: Replace inline exercise rows (lines 763-783) with ExerciseRow**

Replace the `{#each day.exercises as ex}` block with:
```svelte
            <div class="exercise-list">
              {#each day.exercises as ex (ex.exerciseId)}
                {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                <ExerciseRow
                  name={getExerciseDisplayName(resolved) || resolved.name}
                  muscle={resolved.muscle || ''}
                  {imgUrl}
                  sets={ex.sets}
                  reps={ex.reps}
                  {accent}
                  onclick={() => openExerciseDetail(resolved)}
                />
              {/each}
            </div>
```

Add `.exercise-list` style:
```css
  .exercise-list {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 1;
  }
```

- [ ] **Step 3: Replace inline section labels with SectionLabel**

Replace the inline `<div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono'...">` (lines 565-567, 718-720) with:
```svelte
<SectionLabel {accent}>Hoy en el gimnasio</SectionLabel>
```

- [ ] **Step 4: Replace inline stats grid (lines 791-803) with StatBlock**

Replace the 3-column grid with:
```svelte
        <div class="stats-grid">
          <StatBlock value={day?.exercises?.length || 0} label="Ejercicios" {accent} />
          <StatBlock value={totalVolume} label="Volumen" unit="kg" {accent} />
          <StatBlock value={prCount} label="PRs" {accent} />
        </div>
```

Add `.stats-grid` style:
```css
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
```

- [ ] **Step 5: Replace `class="pill"` with Chip component**

Replace `<span class="pill" style="background:...;color:...">DESCANSO</span>` (line 542) with:
```svelte
<Chip color="rgba(155,209,255,0.15)" textColor="#9bd1ff">DESCANSO</Chip>
```

Replace other `.pill` usages (lines 573, 726) similarly.

- [ ] **Step 6: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 9: Refactor `plan/+page.svelte` to use ExerciseRow

**Files:**
- Modify: `src/routes/plan/+page.svelte`

- [ ] **Step 1: Add import**

```svelte
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
```

- [ ] **Step 2: Replace inline exercise rows (lines 344-366) with ExerciseRow**

Replace the `{#each (day?.exercises || []) as ex}` block with:
```svelte
                  {#each (day?.exercises || []) as ex (ex.exerciseId || ex.id)}
                    {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                    {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                    {@const exId = ex.exerciseId || ex.id}
                    <ExerciseRow
                      name={getExerciseDisplayName(resolved) || 'Desconocido'}
                      muscle={resolved.muscle || ''}
                      {imgUrl}
                      sets={ex.sets}
                      reps={ex.reps}
                      weight={exerciseWeights[exId]}
                      {units}
                      {accent}
                      onclick={() => handleOpenExercise(ex)}
                    />
                  {/each}
```

- [ ] **Step 3: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 10: Refactor `history/+page.svelte` to use SegmentedControl + Chip

**Files:**
- Modify: `src/routes/history/+page.svelte`

- [ ] **Step 1: Add imports**

```svelte
  import SegmentedControl from '$lib/components/SegmentedControl.svelte'
  import Chip from '$lib/components/Chip.svelte'
```

- [ ] **Step 2: Replace inline tabs (lines 112-123) with SegmentedControl**

Replace:
```svelte
  <div class="tabs">
    <button class="tab-btn" class:tab-active={historyTab === 'constancia'}
      onclick={() => setTab('constancia')}>Constancia</button>
    <button class="tab-btn" class:tab-active={historyTab === 'ejercicios'}
      onclick={() => setTab('ejercicios')}>Ejercicios</button>
  </div>
```

With:
```svelte
  <SegmentedControl
    options={[
      { label: 'Constancia', value: 'constancia' },
      { label: 'Ejercicios', value: 'ejercicios' }
    ]}
    bind:value={historyTab}
  />
```

Remove `.tabs`, `.tab-btn`, `.tab-active` styles (lines 212-237).

- [ ] **Step 3: Replace inline chips (lines 145-153) with Chip**

Replace:
```svelte
    <div class="chips-row">
      {#each muscles as m}
        <button class="chip" class:chip-active={historyFilter === m}
          style={historyFilter === m ? `background:${accent};color:#0a0a0a` : ''}
          onclick={() => setFilter(m)}>{m}</button>
      {/each}
    </div>
```

With:
```svelte
    <div class="chips-row">
      {#each muscles as m}
        <button onclick={() => setFilter(m)}>
          <Chip
            color={historyFilter === m ? accent : undefined}
            textColor={historyFilter === m ? 'var(--bg)' : undefined}
          >{m}</Chip>
        </button>
      {/each}
    </div>
```

Note: The `<button>` wrapper is needed because Chip renders a `<span>`, and we need click handling. Alternatively, make Chip accept an `onclick` prop.

Remove `.chips-row`, `.chip`, `.chip-active` styles (lines 253-282).

- [ ] **Step 4: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 11: Refactor `you/+page.svelte` to use SectionLabel + Chip + ExerciseRow + `.input-field`

**Files:**
- Modify: `src/routes/you/+page.svelte`

- [ ] **Step 1: Add imports**

```svelte
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
```

- [ ] **Step 2: Replace `.section-label` class usages with SectionLabel component**

Replace all 7 instances (lines 551, 562, 573, 753, 764, 786, 806) of:
```svelte
<div class="section-label" style="margin:24px 0 10px"><span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>Section Title</div>
```

With:
```svelte
<div style="margin:24px 0 10px"><SectionLabel {accent}>Section Title</SectionLabel></div>
```

Note: The wrapper div preserves the margin spacing. The `<span>` inside the old HTML is redundant because `SectionLabel` already renders the dot via its own template.

- [ ] **Step 3: Replace inline exercise rows (lines 683-694) with ExerciseRow**

Replace the exercise list button with:
```svelte
<ExerciseRow
  name={ex.name}
  muscle={ex.muscle}
  imgUrl={resolveExerciseMedia(ex).imgUrl}
  {accent}
  onclick={() => toggleExpanded(ex.id)}
/>
```

- [ ] **Step 4: Replace inline input styles with `.input-field` / `.input-field-mono` classes**

Replace all full-width input `style="width:100%;padding:10px 12px;border-radius:10px;..."` (lines 663-664, 700-703) with:
```svelte
<input class="input-field" ... />
```

Replace all narrow profile inputs `style="width:72px;padding:6px 8px;border-radius:8px;..."` (lines 553, 554, 556) with:
```svelte
<input class="input-field-mono" style="width:72px" ... />
```

- [ ] **Step 5: Replace `.you-card` / `.you-row` scoped styles with global `.card` / `.card-row`**

Replace scoped styles (lines 849-874):
```css
  .you-card {
    margin: 0 20px;
    background: #141414;
    border-radius: 18px;
    border: 0.5px solid rgba(255,255,255,0.06);
  }
  .you-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
  }
```

With usage of global classes:
```svelte
<div class="card">  <!-- replaces .you-card -->
<div class="card-row">  <!-- replaces .you-row -->
```

Remove the `.you-card` and `.you-row` CSS rules from the scoped `<style>` block.

- [ ] **Step 6: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 12: Refactor `Calendar.svelte` to use ExerciseRow

**Files:**
- Modify: `src/lib/components/Calendar.svelte`

- [ ] **Step 1: Add import**

```svelte
  import ExerciseRow from './ExerciseRow.svelte'
```

- [ ] **Step 2: Replace inline exercise rows (lines 398-414) with ExerciseRow**

Replace:
```svelte
            {#each selRec.exercises as e, j}
              {@const log = selRec.logs ? selRec.logs.find((l: any) => l.exerciseId !== '__day__' && l.exerciseId === e.exerciseId) : null}
              <div class="detail-ex-row">
                <div class="detail-ex-idx" style="color:{accent}">{String(j + 1).padStart(2, '0')}</div>
                <div class="detail-ex-info">
                  <div class="detail-ex-name">{getExerciseDisplayName(e, language)}</div>
                  <div class="detail-ex-muscle">{e.muscle || ''}</div>
                </div>
                <div class="detail-ex-meta">
                  {#if log && log.weight > 0}
                    <span class="detail-ex-weight">{log.weight}<span class="detail-ex-unit">{log.units || units}</span></span>
                    <span class="detail-ex-sep"></span>
                  {/if}
                  <span class="detail-ex-setsreps">{e.sets}<span class="detail-ex-x">x</span>{e.reps}</span>
                </div>
              </div>
            {/each}
```

With:
```svelte
            {#each selRec.exercises as e, j}
              {@const log = selRec.logs ? selRec.logs.find((l: any) => l.exerciseId !== '__day__' && l.exerciseId === e.exerciseId) : null}
              <ExerciseRow
                name={getExerciseDisplayName(e, language)}
                muscle={e.muscle || ''}
                weight={log?.weight}
                units={log?.units || units}
                sets={e.sets}
                reps={e.reps}
                {accent}
              />
            {/each}
```

Remove `.detail-ex-row`, `.detail-ex-idx`, `.detail-ex-info`, `.detail-ex-name`, `.detail-ex-muscle`, `.detail-ex-meta`, `.detail-ex-weight`, `.detail-ex-unit`, `.detail-ex-setsreps`, `.detail-ex-x`, `.detail-ex-sep` styles from Calendar's scoped CSS.

- [ ] **Step 3: Token migration in Calendar's scoped CSS**

Replace hardcoded values in Calendar's `<style>` block:
- `#141414` → `var(--surface)`
- `#0a0a0a` → `var(--bg)`
- `#fafafa` → `var(--text)`
- `rgba(255,255,255,0.06)` → `var(--border)`
- `rgba(255,255,255,0.55)` → `var(--text-secondary)`
- `'Space Grotesk',sans-serif` → `var(--font-sans)`
- `'JetBrains Mono',monospace` → `var(--font-mono)`
- `14px` radius → `var(--radius-md)`
- `18px` radius → `var(--radius-lg)`
- `20px` radius → `var(--radius-xl)`

- [ ] **Step 4: Verify refactor compiles**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 13: Token migration in ExerciseDetail scoped CSS

**Files:**
- Modify: `src/lib/components/ExerciseDetail.svelte` (style block only)

- [ ] **Step 1: Replace hardcoded values in remaining scoped CSS**

In the `<style>` block (which is now smaller after extracting coach + seg control + stats), replace:
- `#141414` → `var(--surface)`
- `#0a0a0a` → `var(--bg)`
- `#fafafa` → `var(--text)`
- `rgba(255,255,255,0.06)` → `var(--border)`
- `rgba(255,255,255,0.08)` → `var(--border-medium)`
- `'Space Grotesk',sans-serif` → `var(--font-sans)`
- `'JetBrains Mono',monospace` → `var(--font-mono)`

- [ ] **Step 2: Verify compile**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 14: Token migration in Warmup scoped CSS

**Files:**
- Modify: `src/lib/components/Warmup.svelte` (style block from Task 7)

- [ ] **Step 1: Ensure all values use tokens**

The CSS written in Task 7 should already use tokens. Verify no hardcoded `#141414`, `#0a0a0a`, `#fafafa`, `rgba(255,255,255,...)` remain.

- [ ] **Step 2: Verify compile**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json 2>&1 | head -20`
Expected: No errors

---

### Task 15: Remove CoachCard.svelte

**Files:**
- Delete: `src/lib/components/CoachCard.svelte`

- [ ] **Step 1: Delete the file**

```bash
rm svelte-app/src/lib/components/CoachCard.svelte
```

- [ ] **Step 2: Verify no imports reference it**

Run: `grep -r "CoachCard" svelte-app/src/`
Expected: No results

---

### Task 16: Final verification

- [ ] **Step 1: Full type check**

Run: `cd svelte-app && npx svelte-check --tsconfig ./tsconfig.json`
Expected: No errors (or only pre-existing warnings)

- [ ] **Step 2: Build the app**

Run: `cd svelte-app && npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run Playwright tests**

Run: `npx playwright test`
Expected: All tests pass

- [ ] **Step 4: Verify no regressions in vanilla JS app**

Run: `npx playwright test tests/big.spec.js`
Expected: All tests pass (vanilla JS app untouched)
