<script lang="ts">
  import Button from './Button.svelte'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import type { ExerciseLogBlock } from '$lib/types'

  let {
    exercise,
    accent = 'var(--accent)',
    units = 'kg',
    pendingWeight = $bindable(0),
    blocks = $bindable<ExerciseLogBlock[]>([]),
    advanced = $bindable(false),
    loggedToday = false,
    isDirty = false,
    isLoggedState = false,
    onSave,
    onClear
  }: {
    exercise: {
      sets: number
      reps: string | number
      exerciseId?: string
      id: string
    }
    accent?: string
    units?: string
    pendingWeight?: number
    blocks?: ExerciseLogBlock[]
    advanced?: boolean
    loggedToday?: boolean
    isDirty?: boolean
    isLoggedState?: boolean
    onSave?: () => void
    onClear?: () => void
  } = $props()

  const STEP = 5
  const WEIGHT_BLOCK_STEP = 2.5

  let weightInput: string = $derived(String(pendingWeight || ''))

  function decWeight() { pendingWeight = Math.max(0, +(pendingWeight - STEP).toFixed(1)) }
  function incWeight() { pendingWeight = +(pendingWeight + STEP).toFixed(1) }
  function handleWeightInput(e: Event) {
    const target = e.target as HTMLInputElement
    const v = target.value.replace(/[^0-9.]/g, '')
    pendingWeight = v === '' ? 0 : parseFloat(v)
  }

  function enterAdvanced() {
    blocks = [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: pendingWeight || 0 }]
    advanced = true
  }
  function exitAdvanced() {
    pendingWeight = topWeight || pendingWeight || 0
    advanced = false
  }

  function updateBlock(i: number, patch: Partial<ExerciseLogBlock>) {
    blocks = blocks.map((b, j) => (j === i ? { ...b, ...patch } : b))
  }
  function removeBlock(i: number) {
    if (blocks.length <= 1) return
    blocks = blocks.filter((_, j) => j !== i)
  }
  function duplicateBlock(i: number) {
    blocks = [...blocks.slice(0, i + 1), { ...blocks[i] }, ...blocks.slice(i + 1)]
  }
  function addBlock() {
    blocks = [...blocks, { ...blocks[blocks.length - 1] }]
  }

  function stepField(i: number, field: keyof ExerciseLogBlock, value: number, delta: number, min: number, max: number, decimals: boolean) {
    const raw = value + delta
    const rounded = decimals ? +raw.toFixed(1) : Math.round(raw)
    updateBlock(i, { [field]: Math.max(min, Math.min(max, rounded)) } as Partial<ExerciseLogBlock>)
  }
  function inputField(i: number, field: keyof ExerciseLogBlock, e: Event, min: number, max: number, decimals: boolean) {
    const raw = (e.target as HTMLInputElement).value.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '')
    const n = raw === '' ? 0 : Math.max(min, Math.min(max, parseFloat(raw)))
    updateBlock(i, { [field]: n } as Partial<ExerciseLogBlock>)
  }

  let totalSets = $derived(blocks.reduce((a, b) => a + (b.sets || 0), 0))
  let totalVolume = $derived(Math.round(blocks.reduce((a, b) => a + b.sets * b.reps * b.weight, 0)))
  let topWeight = $derived(blocks.length ? Math.max(...blocks.map(b => b.weight)) : 0)

  let saveLabel = $derived(
    advanced
      ? `${blocks.length} bloque${blocks.length > 1 ? 's' : ''} · máx ${topWeight}${units}`
      : `${pendingWeight}${units}`
  )

  function fmt(n: number): number { return Number.isInteger(n) ? n : +n.toFixed(1) }
</script>

{#snippet blockField(i: number, field: keyof ExerciseLogBlock, label: string, value: number, min: number, max: number, step: number, plan: string | undefined, unit: string | undefined, decimals: boolean)}
  <div class="block-field">
    <div class="block-field-label">{label}{#if unit}<span class="block-field-unit"> · {unit}</span>{/if}</div>
    <input
      class="block-field-input"
      value={value === 0 ? '' : String(decimals ? +(+value).toFixed(1) : value)}
      oninput={(e) => inputField(i, field, e, min, max, decimals)}
      placeholder="0"
      inputmode={decimals ? 'decimal' : 'numeric'}
    >
    {#if plan !== undefined}
      <div class="block-field-plan">plan {plan}</div>
    {/if}
    <div class="block-field-steps">
      <button class="block-step-btn" disabled={value <= min} onclick={() => stepField(i, field, value, -step, min, max, decimals)}>−</button>
      <button class="block-step-btn block-step-inc" style="color:{accent};background:{accent}18;border-color:{accent}44" disabled={value >= max} onclick={() => stepField(i, field, value, step, min, max, decimals)}>+</button>
    </div>
  </div>
{/snippet}

<div class="tab-content" data-component="WorkoutTab">
  <div class="workout-card" style="border-color:{loggedToday ? `${accent}33` : 'rgba(255,255,255,0.06)'};box-shadow:{loggedToday ? `0 8px 32px ${accent}11` : '0 6px 20px rgba(0,0,0,0.2)'}">
    {#if loggedToday}
      <div class="card-glow" style="background:{accent}"></div>
    {/if}
    <div class="card-eyebrow">
      <span class="eyebrow-label">{advanced ? 'Registro de hoy' : 'Peso de hoy'}</span>
      <div class="eyebrow-actions">
        {#if loggedToday}
          <span class="saved-badge" style="color:{accent};background:{accent}1a">
            <span class="saved-dot" style="background:{accent};box-shadow:0 0 6px {accent}"></span>
            Guardado
          </span>
        {/if}
        {#if advanced}
          <Button variant="text" onclick={exitAdvanced}>peso simple</Button>
        {/if}
      </div>
    </div>

    {#if advanced}
      <div class="block-list">
        {#each blocks as block, i (i)}
          <div class="block-card">
            <div class="block-card-header">
              <div class="block-badge">
                <span class="block-dot" style="background:{accent}"></span>
                Bloque {String(i + 1).padStart(2, '0')}
              </div>
              <div class="block-readout">
                <span class="block-readout-num">{fmt(block.sets)}</span>
                <span class="block-readout-sep">×</span>
                <span class="block-readout-num">{fmt(block.reps)}</span>
                <span class="block-readout-sep">·</span>
                <span class="block-readout-weight" style="color:{accent}">{fmt(block.weight)}{units}</span>
              </div>
              <div class="block-actions">
                <button class="icon-action-btn" onclick={() => duplicateBlock(i)} aria-label="Duplicar bloque">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="2" stroke="rgba(255,255,255,0.55)" stroke-width="1.4" />
                    <path d="M3 10.5V4a1 1 0 011-1h6.5" stroke="rgba(255,255,255,0.55)" stroke-width="1.4" stroke-linecap="round" />
                  </svg>
                </button>
                <button class="icon-action-btn" onclick={() => removeBlock(i)} disabled={blocks.length <= 1} aria-label="Quitar bloque">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M4 4l8 8M12 4l-8 8" stroke={blocks.length > 1 ? 'rgba(255,120,120,0.8)' : 'rgba(255,255,255,0.2)'} stroke-width="1.5" stroke-linecap="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="block-fields-grid">
              {@render blockField(i, 'sets', 'Series', block.sets, 1, 30, 1, String(exercise.sets), undefined, false)}
              {@render blockField(i, 'reps', 'Reps', block.reps, 1, 100, 1, String(exercise.reps), undefined, false)}
              {@render blockField(i, 'weight', 'Peso', block.weight, 0, 999, WEIGHT_BLOCK_STEP, undefined, units, true)}
            </div>
          </div>
        {/each}
      </div>

      <button class="btn-add-block" style="background:{accent}12;border-color:{accent}55;color:{accent}" onclick={addBlock}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke={accent} stroke-width="1.8" stroke-linecap="round" /></svg>
        Añadir bloque
      </button>

      <div class="totals-bar">
        <div class="total-cell">
          <div class="total-value">{blocks.length}</div>
          <div class="total-label">Bloques</div>
        </div>
        <div class="total-divider"></div>
        <div class="total-cell">
          <div class="total-value">{totalSets}</div>
          <div class="total-label">Series</div>
        </div>
        <div class="total-divider"></div>
        <div class="total-cell">
          <div class="total-value" style="color:{accent}">{totalVolume.toLocaleString('es')}<span class="total-unit">{units}</span></div>
          <div class="total-label">Volumen</div>
        </div>
      </div>
    {:else}
      <div class="stepper-row">
        <button class="stepper-btn" onclick={decWeight}>−</button>
        <div class="stepper-display">
          <input
            type="text"
            inputmode="decimal"
            value={weightInput}
            oninput={handleWeightInput}
            onfocus={(e) => (e.target as HTMLInputElement).select()}
            placeholder="0"
            class="weight-input"
            style="color:{loggedToday ? accent : '#fafafa'}"
          >
          <div class="stepper-unit">{units} <span class="sep">·</span> incrementos de {STEP}{units}</div>
        </div>
        <button class="stepper-btn stepper-inc" onclick={incWeight}>+</button>
      </div>

      <button class="btn-dashed-add" style="margin-top:12px" onclick={enterAdvanced}>
        <span class="sr-plus">＋</span> Series y repeticiones por bloque
      </button>
    {/if}

    {#if isLoggedState}
      <button class="log-btn saved" style="background:{accent}22;color:{accent}" disabled>
        <svg width="13" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="{accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Guardado · {saveLabel}
      </button>
    {:else}
      <button class="log-btn active" style="background:{accent};color:var(--bg);box-shadow:0 6px 20px {accent}33" onclick={() => onSave?.()}>
        {loggedToday ? 'Actualizar' : 'Registrar'} · {saveLabel}
      </button>
    {/if}
    {#if loggedToday}
      <div class="clear-btn-wrap">
        <Button variant="text" fullWidth onclick={() => onClear?.()}>× Eliminar registro de hoy</Button>
      </div>
    {/if}
  </div>
</div>

<style>
  .tab-content {
    padding: 14px 0 30px;
  }
  .workout-card {
    background: var(--surface);
    border-radius: 20px;
    padding: 18px 18px 16px;
    border: 0.5px solid;
    position: relative;
    overflow: hidden;
  }
  .card-glow {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    opacity: 0.09;
    filter: blur(60px);
  }
  .card-eyebrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 1;
    margin-bottom: 12px;
  }
  .eyebrow-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .eyebrow-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .saved-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
    white-space: nowrap;
  }
  .saved-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .stepper-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 1;
  }
  .stepper-btn {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: var(--border);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--text);
    touch-action: manipulation;
    flex-shrink: 0;
    padding: 0;
    line-height: 1;
    transition: all 0.15s;
  }
  .stepper-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .weight-input {
    background: transparent;
    border: 0;
    outline: none;
    text-align: center;
    width: 100%;
    font-family: var(--font-mono);
    font-size: 48px;
    font-weight: 500;
    letter-spacing: -2.2px;
    line-height: 1;
    padding: 0;
  }
  .stepper-unit {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    white-space: nowrap;
  }
  .sep {
    opacity: 0.5;
    margin: 0 4px;
  }
  .sr-plus {
    font-size: 13px;
    line-height: 1;
    font-weight: 400;
  }

  /* Multi-block editor */
  .block-list {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    animation: fadeUp 0.18s ease-out;
  }
  .block-card {
    background: rgba(255,255,255,0.03);
    border: 0.5px solid var(--border-medium);
    border-radius: 14px;
    padding: 11px 12px 12px;
  }
  .block-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 11px;
  }
  .block-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
    white-space: nowrap;
  }
  .block-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .block-readout {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 14px;
    letter-spacing: -0.3px;
    color: rgba(255,255,255,0.9);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .block-readout-num {
    font-weight: 600;
  }
  .block-readout-sep {
    color: rgba(255,255,255,0.35);
    margin: 0 4px;
  }
  .block-readout-weight {
    font-weight: 600;
  }
  .block-actions {
    display: flex;
    gap: 5px;
    flex-shrink: 0;
  }
  .icon-action-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    border: 0.5px solid var(--border-medium);
    cursor: pointer;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .icon-action-btn:disabled {
    cursor: default;
    opacity: 0.5;
  }
  .block-fields-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 7px;
  }
  .block-field {
    background: rgba(0,0,0,0.25);
    border: 0.5px solid rgba(255,255,255,0.07);
    border-radius: 11px;
    padding: 8px 6px 7px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .block-field-label {
    display: flex;
    align-items: baseline;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    font-weight: 600;
  }
  .block-field-unit {
    opacity: 0.7;
  }
  .block-field-input {
    background: transparent;
    border: 0;
    outline: none;
    text-align: center;
    width: 100%;
    font-family: var(--font-mono);
    font-size: 24px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: -1px;
    line-height: 1;
    padding: 0;
  }
  .block-field-plan {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.3px;
    color: rgba(255,255,255,0.32);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }
  .block-field-steps {
    display: flex;
    gap: 5px;
    width: 100%;
  }
  .block-step-btn {
    flex: 1;
    height: 30px;
    border-radius: 8px;
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.1);
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 400;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .block-step-btn:disabled {
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.2);
    cursor: default;
  }
  .btn-add-block {
    margin-top: 10px;
    width: 100%;
    padding: 11px 10px;
    border-radius: 11px;
    cursor: pointer;
    border: 0.5px dashed;
    font-family: var(--font-sans);
    font-size: 12.5px;
    font-weight: 600;
    letter-spacing: 0.1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    position: relative;
    z-index: 1;
  }
  .totals-bar {
    position: relative;
    z-index: 1;
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 11px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid var(--border-medium);
  }
  .total-cell {
    flex: 1;
    text-align: center;
    min-width: 0;
  }
  .total-value {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1;
    white-space: nowrap;
  }
  .total-unit {
    font-size: 9.5px;
    color: rgba(255,255,255,0.4);
    margin-left: 3px;
  }
  .total-label {
    margin-top: 5px;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
  }
  .total-divider {
    width: 0.5px;
    align-self: stretch;
    background: rgba(255,255,255,0.08);
  }

  .log-btn {
    margin-top: 14px;
    width: 100%;
    padding: 14px 18px;
    border-radius: 11px;
    border: 0;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    position: relative;
    z-index: 1;
    cursor: pointer;
  }
  .log-btn.saved {
    cursor: default;
    box-shadow: none;
  }
  .clear-btn-wrap {
    margin-top: 4px;
    position: relative;
    z-index: 1;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
