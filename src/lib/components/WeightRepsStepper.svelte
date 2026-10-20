<script lang="ts">
  import { parseRepsDefault } from '$lib/exercise-utils'

  function fmtNum(n: number): string {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(1))
  }

  type Field = 'weight' | 'reps'

  let {
    weight = 0,
    reps = 0,
    units = 'kg',
    weightStep = 5,
    repsStep = 1,
    disabled = false,
    editable = false,
    onWeightChange,
    onRepsChange,
    // For inline editing
    origWeight = 0,
    origReps = 0,
    onFocus,
    onBlur
  }: {
    weight?: number
    reps?: number
    units?: string
    weightStep?: number
    repsStep?: number
    disabled?: boolean
    editable?: boolean
    onWeightChange?: (delta: number) => void
    onRepsChange?: (delta: number) => void
    origWeight?: number
    origReps?: number
    onFocus?: () => void
    onBlur?: () => void
  } = $props()

  // Shared stepper logic
  const HOLD_START_MS = 380
  const HOLD_MIN_MS = 70
  let holdId: ReturnType<typeof setTimeout> | null = null
  let editingField = $state<Field | null>(null)

  function stepWeight(delta: number) {
    onWeightChange?.(delta)
  }

  function stepReps(delta: number) {
    onRepsChange?.(delta)
  }

  function holdStart(e: PointerEvent, field: Field, dir: number, step: number) {
    if (!editable) return
    e.preventDefault()
    holdStop()
    const delta = dir * step
    if (field === 'weight') stepWeight(delta)
    else stepReps(delta)
    let delay = HOLD_START_MS
    const repeat = () => {
      if (field === 'weight') stepWeight(delta)
      else stepReps(delta)
      delay = Math.max(HOLD_MIN_MS, delay * 0.8)
      holdId = setTimeout(repeat, delay)
    }
    holdId = setTimeout(repeat, delay)
  }

  function holdStop() {
    if (holdId) { clearTimeout(holdId); holdId = null }
  }

  function keyStep(e: MouseEvent, field: Field, dir: number, step: number) {
    if (!editable) return
    if (e.detail === 0) {
      const delta = dir * step
      if (field === 'weight') stepWeight(delta)
      else stepReps(delta)
    }
  }

  function startEdit(field: Field) {
    if (!editable) return
    editingField = field
    onFocus?.()
  }

  function typed(e: Event, field: Field) {
    if (!editable) return
    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'))
    if (!isNaN(v) && v >= 0) {
      if (field === 'reps') stepReps(Math.round(v) - reps)
      else stepWeight(v - weight)
    }
  }

  function commitEdit() {
    editingField = null
    onBlur?.()
  }

  function selectAll(e: FocusEvent) {
    (e.target as HTMLInputElement).select()
  }

  $effect(() => holdStop)

  const minusIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/></svg>`
  const plusIcon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
</script>

<div class="wrs" data-component="WeightRepsStepper">
  <!-- Weight row -->
  <div class="wrs-row">
    <button
      class="wrs-btn"
      type="button"
      aria-label="Bajar {weightStep} {units}"
      disabled={disabled}
      onpointerdown={(e) => holdStart(e, 'weight', -1, weightStep)}
      onpointerup={holdStop}
      onpointerleave={holdStop}
      onpointercancel={holdStop}
      onclick={(e) => keyStep(e, 'weight', -1, weightStep)}
    >{@html minusIcon}</button>

    <div class="wrs-center" onclick={() => startEdit('weight')}>
      {#if editingField === 'weight'}
        <label class="wrs-iv">
          <input
            class="wrs-in"
            class:is-ed={weight !== origWeight}
            type="text"
            inputmode="decimal"
            enterkeyhint="next"
            aria-label="Peso"
            value={fmtNum(weight)}
            oninput={(e) => typed(e, 'weight')}
            onfocus={selectAll}
            onblur={commitEdit}
            onkeydown={(e) => e.key === 'Enter' && commitEdit()}
          />
          <span class="wrs-u">{units}</span>
        </label>
      {:else}
        <span class="wrs-value">
          {weight > 0 ? fmtNum(weight) : '—'}<small>{units}</small>
        </span>
      {/if}
    </div>

    <button
      class="wrs-btn"
      type="button"
      aria-label="Subir {weightStep} {units}"
      disabled={disabled}
      onpointerdown={(e) => holdStart(e, 'weight', 1, weightStep)}
      onpointerup={holdStop}
      onpointerleave={holdStop}
      onpointercancel={holdStop}
      onclick={(e) => keyStep(e, 'weight', 1, weightStep)}
    >{@html plusIcon}</button>
  </div>

  <!-- Reps row -->
  <div class="wrs-row">
    <button
      class="wrs-btn"
      type="button"
      aria-label="Menos reps"
      disabled={disabled}
      onpointerdown={(e) => holdStart(e, 'reps', -1, repsStep)}
      onpointerup={holdStop}
      onpointerleave={holdStop}
      onpointercancel={holdStop}
      onclick={(e) => keyStep(e, 'reps', -1, repsStep)}
    >{@html minusIcon}</button>

    <div class="wrs-center" onclick={() => startEdit('reps')}>
      {#if editingField === 'reps'}
        <label class="wrs-iv">
          <input
            class="wrs-in"
            class:is-ed={reps !== origReps}
            type="text"
            inputmode="numeric"
            enterkeyhint="next"
            aria-label="Reps"
            value={String(reps)}
            oninput={(e) => typed(e, 'reps')}
            onfocus={selectAll}
            onblur={commitEdit}
            onkeydown={(e) => e.key === 'Enter' && commitEdit()}
          />
          <span class="wrs-u">reps</span>
        </label>
      {:else}
        <span class="wrs-value">
          {reps > 0 ? reps : '—'}<small>reps</small>
        </span>
      {/if}
    </div>

    <button
      class="wrs-btn"
      type="button"
      aria-label="Más reps"
      disabled={disabled}
      onpointerdown={(e) => holdStart(e, 'reps', 1, repsStep)}
      onpointerup={holdStop}
      onpointerleave={holdStop}
      onpointercancel={holdStop}
      onclick={(e) => keyStep(e, 'reps', 1, repsStep)}
    >{@html plusIcon}</button>
  </div>
</div>

<style>
  .wrs { display: flex; flex-direction: column; gap: 16px; width: 100%; }

  /* Row layout - identical for weight and reps */
  .wrs-row {
    display: grid; grid-template-columns: 56px minmax(0,1fr) 56px; align-items: center; gap: 8px;
    padding: 6px; border-radius: 24px; background: rgba(255,255,255,0.04); width: 100%; max-width: 480px;
  }

  /* Center value area - same for display and edit */
  .wrs-center {
    display: flex; align-items: center; justify-content: center; min-width: 0; cursor: default;
  }
  .wrs-center:has(.wrs-in) { cursor: auto; }

  /* Value display - large, centered */
  .wrs-value {
    font-family: var(--font-mono); font-size: 64px; font-weight: 500; letter-spacing: -0.05em; line-height: 1; color: var(--text);
    text-align: center; white-space: nowrap;
  }
  .wrs-value small {
    font-family: var(--font-sans); font-size: 16px; color: var(--text-tertiary); letter-spacing: 0; margin-left: 4px; font-weight: 500;
  }

  /* Inline edit input - same width as value */
  .wrs-iv { display: flex; align-items: baseline; justify-content: center; gap: 4px; min-width: 0; }
  .wrs-in {
    width: auto; min-width: 80px; max-width: 160px; background: transparent; border: 0; outline: none; text-align: right;
    font-family: var(--font-mono); font-size: 64px; font-weight: 500; letter-spacing: -0.05em; line-height: 1;
    color: var(--text); padding: 0;
  }
  .wrs-in.is-ed { color: var(--rt); }
  .wrs-u { flex-shrink: 0; font-family: var(--font-sans); font-size: 16px; letter-spacing: 0; color: var(--text-tertiary); font-weight: 500; }

  /* Shared button - identical for both rows */
  .wrs-btn {
    height: 56px; width: 56px; border-radius: 16px; background: rgba(255,255,255,0.08);
    display: grid; place-items: center; color: var(--text); border: none; cursor: pointer;
    transition: transform 0.1s, background 0.1s;
    touch-action: manipulation; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
  }
  .wrs-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .wrs-btn:not(:disabled):active { transform: scale(0.93); background: color-mix(in srgb, var(--rt) 24%, transparent); }

  @media (max-width: 360px) {
    .wrs-row { grid-template-columns: 48px minmax(0,1fr) 48px; }
    .wrs-btn { height: 44px; width: 44px; }
    .wrs-value { font-size: 48px; }
    .wrs-value small { font-size: 13px; }
    .wrs-in { font-size: 48px; min-width: 60px; }
    .wrs-u { font-size: 13px; }
  }

  @media (max-height: 720px) {
    .wrs-btn { height: 44px; }
    .wrs-value { font-size: 48px; }
    .wrs-in { font-size: 48px; }
  }
</style>