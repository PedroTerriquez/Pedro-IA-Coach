<script lang="ts">
  import Button from './Button.svelte'

  let {
    exercise,
    accent = 'var(--accent)',
    units = 'kg',
    pendingWeight = $bindable(0),
    pendingSets = $bindable(4),
    pendingReps = $bindable(8),
    trackSR = $bindable(false),
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
    pendingSets?: number
    pendingReps?: number | string
    trackSR?: boolean
    loggedToday?: boolean
    isDirty?: boolean
    isLoggedState?: boolean
    onSave?: () => void
    onClear?: () => void
  } = $props()

  const STEP = 5

  let weightInput: string = $derived(String(pendingWeight || ''))

  function updateWeightDisplay() {
    weightInput = String(pendingWeight || '')
  }

  function decWeight() {
    pendingWeight = Math.max(0, +(pendingWeight - STEP).toFixed(1))
    updateWeightDisplay()
  }

  function incWeight() {
    pendingWeight = +(pendingWeight + STEP).toFixed(1)
    updateWeightDisplay()
  }

  function handleWeightInput(e: Event) {
    const target = e.target as HTMLInputElement
    const v = target.value.replace(/[^0-9.]/g, '')
    pendingWeight = v === '' ? 0 : parseFloat(v)
  }

  function incSets() { pendingSets = Math.min(20, pendingSets + 1) }
  function decSets() { pendingSets = Math.max(1, pendingSets - 1) }
  function incReps() { pendingReps = Math.min(50, +pendingReps + 1) }
  function decReps() { pendingReps = Math.max(1, +pendingReps - 1) }
</script>

<div class="tab-content">
  <div class="workout-card" style="border-color:{loggedToday ? `${accent}33` : 'rgba(255,255,255,0.06)'};box-shadow:{loggedToday ? `0 8px 32px ${accent}11` : '0 6px 20px rgba(0,0,0,0.2)'}">
    {#if loggedToday}
      <div class="card-glow" style="background:{accent}"></div>
    {/if}
    <div class="card-eyebrow">
      <span class="eyebrow-label">Peso de hoy</span>
      {#if loggedToday}
        <span class="saved-badge" style="color:{accent};background:{accent}1a">
          <span class="saved-dot" style="background:{accent};box-shadow:0 0 6px {accent}"></span>
          Guardado
        </span>
      {/if}
    </div>
    <div class="stepper-row">
      <button class="stepper-btn" onclick={decWeight}>−</button>
      <div class="stepper-display">
        <input
          type="text"
          inputmode="decimal"
          value={weightInput}
          oninput={handleWeightInput}
          placeholder="0"
          class="weight-input"
          style="color:{loggedToday ? accent : '#fafafa'}"
        >
        <div class="stepper-unit">{units} <span class="sep">·</span> incrementos de {STEP}{units}</div>
      </div>
      <button class="stepper-btn stepper-inc" onclick={incWeight}>+</button>
    </div>
    <div class="sr-section">
      {#if !trackSR}
        <button class="sr-add-btn" onclick={() => trackSR = true}>
          <span class="sr-plus">＋</span> Registrar series y repeticiones
        </button>
      {:else}
        <div class="sr-panel">
          <div class="sr-header">
            <span class="sr-title">Series y repeticiones</span>
            <Button variant="text" onclick={() => trackSR = false}>× quitar</Button>
          </div>
          <div class="sr-grid">
            <div class="mini-stepper">
              <div class="mini-info">
                <div class="mini-label">Series</div>
                <div class="mini-value">{pendingSets}</div>
                <div class="mini-plan">plan · {exercise.sets}</div>
              </div>
              <div class="mini-arrows">
                <button class="mini-arr-btn" onclick={incSets}>+</button>
                <button class="mini-arr-btn" onclick={decSets}>−</button>
              </div>
            </div>
            <div class="mini-stepper">
              <div class="mini-info">
                <div class="mini-label">Reps</div>
                <div class="mini-value">{pendingReps}</div>
                <div class="mini-plan">plan · {exercise.reps}</div>
              </div>
              <div class="mini-arrows">
                <button class="mini-arr-btn" onclick={incReps}>+</button>
                <button class="mini-arr-btn" onclick={decReps}>−</button>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
    {#if isLoggedState}
      <button class="log-btn saved" style="background:{accent}22;color:{accent}" disabled>
        <svg width="13" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="{accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Guardado · {pendingWeight}{units}
      </button>
    {:else}
      <button class="log-btn active" style="background:{accent};color:#0a0a0a;box-shadow:0 6px 20px {accent}33" onclick={() => onSave?.()}>
        Registrar · {pendingWeight}{units}
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
    padding: 14px 20px 30px;
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
    margin-bottom: 10px;
  }
  .eyebrow-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
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
  .sr-section {
    position: relative;
    z-index: 1;
  }
  .sr-add-btn {
    margin-top: 12px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 9px;
    cursor: pointer;
    background: transparent;
    border: 0.5px dashed rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.55);
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .sr-plus {
    font-size: 13px;
    line-height: 1;
    font-weight: 400;
  }
  .sr-panel {
    margin-top: 12px;
    animation: fadeUp 0.2s ease-out;
  }
  .sr-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .sr-title {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .sr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mini-stepper {
    background: rgba(255,255,255,0.04);
    border: 0.5px solid var(--border-medium);
    border-radius: 10px;
    padding: 8px 8px 8px 11px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .mini-info {
    flex: 1;
    min-width: 0;
  }
  .mini-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
  }
  .mini-value {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 500;
    color: var(--text);
    line-height: 1;
    letter-spacing: -0.5px;
  }
  .mini-plan {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 9px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.4px;
    white-space: nowrap;
  }
  .mini-arrows {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mini-arr-btn {
    width: 28px;
    height: 24px;
    border-radius: 6px;
    background: var(--border);
    border: 0.5px solid rgba(255,255,255,0.1);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
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
</style>
