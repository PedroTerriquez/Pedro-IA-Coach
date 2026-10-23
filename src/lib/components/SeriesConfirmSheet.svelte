<script lang="ts">
  import type { SetEntry } from '$lib/set-log'
  import WeightRepsStepper from './WeightRepsStepper.svelte'
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  let {
    name,
    reps,
    units = 'kg',
    entries,
    onsave = undefined,
    onclose = undefined
  }: {
    name: string
    reps: string
    units?: string
    entries: (SetEntry & { _auto?: boolean })[]
    onsave?: (sets: SetEntry[]) => void | Promise<void>
    onclose?: () => void
  } = $props()

  const WEIGHT_STEPS = [1.25, 2.5, 5]

  let orig = $derived(entries.map(e => ({ ...e })))
  let sets = $state<SetEntry[]>(entries.map(e => ({ ...e })))
  let sel = $state(0)
  let stepKg = $state(2.5)
  let saving = $state(false)
  let rowsEl = $state<HTMLElement | null>(null)

  let minReps = $derived(parseInt(String(reps).match(/\d+/)?.[0] || '0', 10))
  let target = $derived(String(reps).replace(/\s*-\s*/, '–'))
  let volume = $derived(Math.round(sets.reduce((a, s) => a + s.weight * s.reps, 0)))
  let editedCount = $derived(sets.filter((_, i) => isEdited(i)).length)
  let isLast = $derived(sel === sets.length - 1)
  let current = $derived(sets[sel])
  let saveLabel = $derived(
    `Guardar ${sets.length} serie${sets.length === 1 ? '' : 's'}` +
    (editedCount ? ` · ${editedCount} editada${editedCount > 1 ? 's' : ''}` : '')
  )

  function fmt(n: number): string {
    return String(+(+n).toFixed(2))
  }

  function isEdited(i: number): boolean {
    return sets[i].weight !== orig[i].weight || sets[i].reps !== orig[i].reps
  }

  function isAuto(i: number): boolean {
    return entries[i]?._auto === true
  }

  function isLow(i: number): boolean {
    return minReps > 0 && sets[i].reps < minReps
  }

  function buzz() {
    if (navigator.vibrate) navigator.vibrate(8)
  }

  function select(i: number) {
    sel = i
    rowsEl?.children[i]?.scrollIntoView({ block: 'nearest' })
  }

  function onWeightChange(delta: number) {
    sets[sel].weight = Math.max(0, +(sets[sel].weight + delta).toFixed(2))
    buzz()
  }

  function onRepsChange(delta: number) {
    sets[sel].reps = Math.max(0, sets[sel].reps + delta)
    buzz()
  }

  function nextSet() {
    if (isLast) (document.activeElement as HTMLElement | null)?.blur()
    else select(sel + 1)
  }

  function copyDown() {
    for (let i = sel + 1; i < sets.length; i++) sets[i] = { ...sets[sel] }
    buzz()
  }

  function reset() {
    sets[sel] = { ...orig[sel] }
  }

  async function save() {
    if (saving) return
    saving = true
    if (navigator.vibrate) navigator.vibrate(40)
    try {
      await onsave?.(sets.map(s => ({ ...s })))
    } finally {
      saving = false
    }
  }
</script>

<div class="scs" data-component="SeriesConfirmSheet">
  <header class="scs-top">
  <IconButton size="sm" variant="filled" icon="x" label="Cerrar" onclick={onclose} />
  <span class="scs-status">Completado</span>
  <span class="scs-top-gap"></span>
</header>

<section class="scs-head">
  <span class="scs-eyebrow">{name}</span>
  <h1 class="scs-title">Confirma tus series</h1>
  <div class="scs-meta">
    <span>objetivo <b>{target}</b> reps</span>
    <span>volumen <b class="scs-vol">{volume.toLocaleString('es-MX')} {units}</b></span>
  </div>
</section>

<section class="scs-rows" bind:this={rowsEl}>
  {#each sets as s, i}
    <button class="scs-row" data-testid={TID.confirmRow} class:is-sel={i === sel} class:is-auto={isAuto(i)} type="button" aria-label="Serie {i + 1}" aria-pressed={i === sel} onclick={() => select(i)}>
      <span class="scs-n">{i + 1}</span>
      <span class="scs-val">{fmt(s.weight)}<small>{units}</small><i>×</i>{s.reps}<small>reps</small></span>
      {#if isEdited(i)}
        <span class="scs-st ed">editada</span>
      {:else if isAuto(i)}
        <span class="scs-st auto">auto</span>
      {:else if isLow(i)}
        <span class="scs-st low">{s.reps - minReps} rep</span>
      {:else}
        <span class="scs-st ok"><Icon name="check" size={12} />en rango</span>
      {/if}
    </button>
  {/each}
</section>

{#if current}
  <section class="scs-ed" aria-live="polite">
    <div class="scs-ed-top">
      <div>
        <div class="scs-ed-title">Serie {sel + 1} de {sets.length}</div>
        <div class="scs-ed-prev">Registrado: {fmt(orig[sel].weight)} {units} × {orig[sel].reps}</div>
      </div>
      {#if isEdited(sel)}
        <Button variant="text" size="pill" onclick={reset}>Restablecer</Button>
      {/if}
    </div>

    <WeightRepsStepper
      editable
      weight={current.weight}
      reps={current.reps}
      units={units}
      weightStep={stepKg}
      repsStep={1}
      origWeight={orig[sel].weight}
      origReps={orig[sel].reps}
      onWeightChange={onWeightChange}
      onRepsChange={onRepsChange}
    />

    <div class="scs-foot">
      <Button variant="secondary" size="pill" class="scs-pill" disabled={isLast} onclick={copyDown}>Copiar a las siguientes</Button>
      <Button variant="secondary" size="pill" class="scs-pill" onclick={nextSet}>
        {isLast ? 'Listo' : 'Siguiente serie'}<Icon name="arrow" size={14} />
      </Button>
    </div>
  </section>
{/if}

<footer class="scs-actions">
  <Button variant="primary" size="lg" accent="var(--rt)" class="scs-save" testId={TID.confirmSave} disabled={saving} onclick={save}>
    {saveLabel}<Icon name="arrow" size={18} />
  </Button>
</footer>
</div>

<style>
  /* Fills the timer screen so the rows scroll and «Guardar» stays on screen */
  .scs { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .scs-top { display: flex; align-items: center; justify-content: space-between; height: 56px; flex-shrink: 0; }
  .scs-top-gap { width: 44px; }
  .scs-status {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    letter-spacing: 1.5px; text-transform: uppercase; color: var(--rt);
  }
  .scs-status::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: var(--rt); box-shadow: 0 0 10px var(--rt);
  }

  .scs-head { flex-shrink: 0; padding: 6px 2px 12px; display: flex; flex-direction: column; gap: 4px; }
  .scs-eyebrow {
    font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase; color: var(--rt);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .scs-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.7px; line-height: 1.1; color: var(--text); }
  .scs-meta { white-space: nowrap; display: flex; gap: 14px; margin-top: 6px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }
  .scs-meta b { color: var(--text); font-weight: 500; }

  .scs-rows { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scrollbar-width: none; }
  .scs-rows::-webkit-scrollbar { display: none; }
  .scs-row {
    position: relative; flex-shrink: 0; display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 12px;
    min-height: 56px; padding: 0 14px 0 10px; border-radius: var(--radius-md);
    border: 1px solid rgba(255,255,255,0.06); background: var(--surface); color: var(--text);
    text-align: left; cursor: pointer; font: inherit; -webkit-tap-highlight-color: transparent;
    transition: border-color 0.15s, background 0.15s;
  }
  .scs-row.is-sel { border-color: color-mix(in srgb, var(--rt) 60%, transparent); background: color-mix(in srgb, var(--rt) 7%, var(--surface)); }
  .scs-row.is-auto { background: rgba(255,184,77,0.08); }
  .scs-n {
    width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    color: var(--text-secondary); background: rgba(255,255,255,0.05);
  }
  .scs-row.is-sel .scs-n { background: var(--rt); color: #0a0a0a; }
  .scs-val { font-family: var(--font-mono); font-size: 20px; font-weight: 500; letter-spacing: -0.8px; display: flex; align-items: baseline; gap: 5px; }
  .scs-val small { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
  .scs-val i { font-style: normal; color: var(--text-muted); font-size: 15px; margin: 0 3px; }
  .scs-st {
    display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
    letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
  }
  .scs-st.ok { color: var(--text-tertiary); }
  .scs-st.low { color: #ffb84d; }
  .scs-st.ed { color: var(--rt); }
  .scs-st.ed::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--rt); }
  .scs-st.auto { color: #ffb84d; background: rgba(255,184,77,0.15); padding: 2px 8px; border-radius: 999px; font-size: 9px; }

  .scs-ed {
    flex-shrink: 0; margin-top: 12px; border-radius: var(--radius-2xl); border: 0.5px solid var(--border-medium);
    background: linear-gradient(180deg, #1c1c1c, #151515); padding: 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .scs-ed-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; padding-left: 4px; }
  .scs-ed-title { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; color: var(--text); }
  .scs-ed-prev { white-space: nowrap; margin-top: 2px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }
  .scs-foot { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 8px; }
  /* Two Button pills share the row: they fill their half and keep the text whole */
  .scs .scs-foot :global(.scs-pill) { width: 100%; min-width: 0; padding: 0; gap: 6px; font-size: 14px; font-weight: 500; }

  .scs-actions { flex-shrink: 0; margin-top: 14px; display: flex; flex-direction: column; }

  @media (max-width: 360px) {
    .scs-foot { grid-template-columns: 1.3fr 1fr; }
    .scs .scs-foot :global(.scs-pill) { font-size: 11.5px; letter-spacing: -0.2px; }
    .scs-foot :global(.scs-pill svg) { display: none; }
  }

  @media (max-height: 720px) {
    .scs-head { padding: 2px 2px 8px; gap: 2px; }
    .scs-title { font-size: 22px; }
    .scs-meta { margin-top: 2px; }
    .scs-row { min-height: 46px; }
    .scs-ed { margin-top: 8px; padding: 8px; gap: 6px; }
    .scs-ed-top { min-height: 38px; }
    .scs-actions { margin-top: 10px; }
  }
</style>