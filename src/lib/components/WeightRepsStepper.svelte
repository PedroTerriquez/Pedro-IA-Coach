<script lang="ts">
  import NumberStepper from './NumberStepper.svelte'

  function fmtNum(n: number): string {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(1))
  }

  type Field = 'weight' | 'reps'

  // Weight over reps: two NumberSteppers you can hold or tap to type (series mode)
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
    /** Kept for callers; the figure no longer changes colour when edited */
    origWeight?: number
    origReps?: number
    onFocus?: () => void
    onBlur?: () => void
  } = $props()

  function change(field: Field, delta: number) {
    if (!editable) return
    if (field === 'weight') onWeightChange?.(delta)
    else onRepsChange?.(delta)
  }

  function typed(e: Event, field: Field) {
    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'))
    if (isNaN(v) || v < 0) return
    if (field === 'reps') change('reps', Math.round(v) - reps)
    else change('weight', v - weight)
  }
</script>

<div class="wrs" data-component="WeightRepsStepper">
  <NumberStepper
    label="Peso"
    display={weight > 0 ? fmtNum(weight) : '—'}
    unit={units}
    decLabel="Bajar {weightStep} {units}"
    incLabel="Subir {weightStep} {units}"
    decDisabled={disabled}
    incDisabled={disabled}
    repeat
    tapToType
    decimals
    onstep={(dir) => change('weight', dir * weightStep)}
    oninput={(e) => typed(e, 'weight')}
    onfocus={onFocus}
    ondone={onBlur}
  />
  <NumberStepper
    size="sm"
    label="Reps"
    display={reps > 0 ? String(reps) : '—'}
    unit="reps"
    decLabel="Menos reps"
    incLabel="Más reps"
    decDisabled={disabled}
    incDisabled={disabled}
    repeat
    tapToType
    onstep={(dir) => change('reps', dir * repsStep)}
    oninput={(e) => typed(e, 'reps')}
    onfocus={onFocus}
    ondone={onBlur}
  />
</div>

<style>
  .wrs { display: flex; flex-direction: column; gap: 16px; width: 100%; }
</style>
