<script lang="ts">
  import type { SetEntry } from '$lib/set-log'

  // "Confirma tus series": what the full-screen timer turns into once the rest
  // of the last serie is over. One row per serie; the selected one is edited
  // whole (peso + reps) in the thumb-zone panel. It renders the inside of the
  // timer's shell, so `--rt` and the page padding come from the parent.
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
    entries: SetEntry[]
    onsave?: (sets: SetEntry[]) => void | Promise<void>
    onclose?: () => void
  } = $props()

  const WEIGHT_STEPS = [1.25, 2.5, 5]
  const HOLD_START_MS = 380
  const HOLD_MIN_MS = 70

  type Field = 'weight' | 'reps'

  // `orig` is what was registered while resting; `sets` is the working copy.
  const orig: SetEntry[] = entries.map(e => ({ ...e }))
  let sets = $state<SetEntry[]>(entries.map(e => ({ ...e })))
  let sel = $state(0)
  let stepKg = $state(2.5)
  let saving = $state(false)
  let holdId: ReturnType<typeof setTimeout> | null = null
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

  function bump(field: Field, dir: number) {
    const delta = dir * (field === 'weight' ? stepKg : 1)
    sets[sel][field] = Math.max(0, +(sets[sel][field] + delta).toFixed(2))
    buzz()
  }

  // Holding − / + keeps stepping, faster the longer you hold.
  function holdStart(e: PointerEvent, field: Field, dir: number) {
    e.preventDefault()
    holdStop()
    bump(field, dir)
    let delay = HOLD_START_MS
    const repeat = () => {
      bump(field, dir)
      delay = Math.max(HOLD_MIN_MS, delay * 0.8)
      holdId = setTimeout(repeat, delay)
    }
    holdId = setTimeout(repeat, delay)
  }

  function holdStop() {
    if (holdId) { clearTimeout(holdId); holdId = null }
  }

  // Pointer taps are handled on pointerdown; this only catches the keyboard.
  function keyStep(e: MouseEvent, field: Field, dir: number) {
    if (e.detail === 0) bump(field, dir)
  }

  function typed(e: Event, field: Field) {
    const v = parseFloat((e.target as HTMLInputElement).value.replace(',', '.'))
    if (!isNaN(v) && v >= 0) sets[sel][field] = field === 'reps' ? Math.round(v) : v
  }

  function selectAll(e: FocusEvent) {
    (e.target as HTMLInputElement).select()
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

  $effect(() => holdStop)
</script>

<header class="rs-top">
  <button class="rs-close" type="button" aria-label="Cerrar" onclick={onclose}>
    <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
  </button>
  <span class="rs-status">Completado</span>
  <span class="rs-top-gap"></span>
</header>

<section class="rs-head">
  <span class="rs-eyebrow">{name}</span>
  <h1 class="rs-title">Confirma tus series</h1>
  <div class="rs-meta">
    <span>objetivo <b>{target}</b> reps</span>
    <span>volumen <b class="rs-vol">{volume.toLocaleString('es-MX')} {units}</b></span>
  </div>
</section>

<section class="rs-rows" bind:this={rowsEl}>
  {#each sets as s, i}
    <button class="rs-row" class:is-sel={i === sel} type="button" aria-label="Serie {i + 1}" aria-pressed={i === sel} onclick={() => select(i)}>
      <span class="rs-n">{i + 1}</span>
      <span class="rs-val">{fmt(s.weight)}<small>{units}</small><i>×</i>{s.reps}<small>reps</small></span>
      {#if isEdited(i)}
        <span class="rs-st ed">editada</span>
      {:else if isLow(i)}
        <span class="rs-st low">{s.reps - minReps} rep</span>
      {:else}
        <span class="rs-st ok">
          <svg width="12" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          en rango
        </span>
      {/if}
    </button>
  {/each}
</section>

{#if current}
  <section class="rs-ed" aria-live="polite">
    <div class="rs-ed-top">
      <div>
        <div class="rs-ed-title">Serie {sel + 1} de {sets.length}</div>
        <div class="rs-ed-prev">Registrado: {fmt(orig[sel].weight)} {units} × {orig[sel].reps}</div>
      </div>
      {#if isEdited(sel)}
        <button class="rs-reset" type="button" onclick={reset}>Restablecer</button>
      {/if}
    </div>

    {#snippet line(field: Field, label: string, unit: string, mode: 'decimal' | 'numeric')}
      <div class="rs-line">
        <button class="rs-b" type="button" aria-label="Menos {label.toLowerCase()}"
          onpointerdown={(e) => holdStart(e, field, -1)} onpointerup={holdStop} onpointerleave={holdStop} onpointercancel={holdStop}
          onclick={(e) => keyStep(e, field, -1)}>−</button>
        <div class="rs-mid">
          <span class="rs-lab">{label}</span>
          <label class="rs-iv">
            <input class="rs-in" class:is-ed={current[field] !== orig[sel][field]} type="text" inputmode={mode} enterkeyhint="next"
              aria-label={label} value={fmt(current[field])} oninput={(e) => typed(e, field)} onfocus={selectAll} />
            <span class="rs-u">{unit}</span>
          </label>
        </div>
        <button class="rs-b" type="button" aria-label="Más {label.toLowerCase()}"
          onpointerdown={(e) => holdStart(e, field, 1)} onpointerup={holdStop} onpointerleave={holdStop} onpointercancel={holdStop}
          onclick={(e) => keyStep(e, field, 1)}>+</button>
      </div>
    {/snippet}
    {@render line('weight', 'Peso', units, 'decimal')}
    {@render line('reps', 'Reps', 'reps', 'numeric')}

    <div class="rs-steps">
      <span>Paso de peso</span>
      {#each WEIGHT_STEPS as s}
        <button class="rs-step" class:is-on={s === stepKg} type="button" aria-pressed={s === stepKg} onclick={() => stepKg = s}>±{s}</button>
      {/each}
    </div>

    <div class="rs-foot">
      <button class="rs-pill" type="button" disabled={isLast} onclick={copyDown}>Copiar a las siguientes</button>
      <button class="rs-pill rs-pill-next" type="button" onclick={nextSet}>
        {isLast ? 'Listo' : 'Siguiente serie'}
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </section>
{/if}

<footer class="rs-actions">
  <button class="rs-save" type="button" disabled={saving} onclick={save}>
    {saveLabel}
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>
</footer>

<style>
  .rs-top { display: flex; align-items: center; justify-content: space-between; height: 44px; flex-shrink: 0; }
  .rs-close {
    width: 44px; height: 44px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.04);
    color: var(--text-secondary); display: grid; place-items: center; cursor: pointer;
  }
  .rs-close:active { transform: scale(0.92); }
  .rs-top-gap { width: 44px; }
  .rs-status {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase; color: var(--rt);
  }
  .rs-status::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: var(--rt); box-shadow: 0 0 10px var(--rt);
  }

  .rs-head { flex-shrink: 0; padding: 6px 2px 12px; display: flex; flex-direction: column; gap: 4px; }
  .rs-eyebrow {
    font-family: var(--font-mono); font-size: 12px; font-weight: 600; letter-spacing: 1.8px;
    text-transform: uppercase; color: var(--rt);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .rs-title { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.7px; line-height: 1.1; color: var(--text); }
  .rs-meta { white-space: nowrap; display: flex; gap: 14px; margin-top: 6px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }
  .rs-meta b { color: var(--text); font-weight: 500; }

  .rs-rows { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scrollbar-width: none; }
  .rs-rows::-webkit-scrollbar { display: none; }
  .rs-row {
    position: relative; flex-shrink: 0; display: grid; grid-template-columns: 32px 1fr auto; align-items: center; gap: 12px;
    min-height: 54px; padding: 0 14px 0 10px; border-radius: var(--radius-md);
    border: 1px solid rgba(255,255,255,0.06); background: var(--surface); color: var(--text);
    text-align: left; cursor: pointer; font: inherit; -webkit-tap-highlight-color: transparent;
    transition: border-color 0.15s, background 0.15s;
  }
  .rs-row.is-sel { border-color: color-mix(in srgb, var(--rt) 60%, transparent); background: color-mix(in srgb, var(--rt) 7%, var(--surface)); }
  .rs-n {
    width: 28px; height: 28px; border-radius: 50%; display: grid; place-items: center;
    font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    color: var(--text-secondary); background: rgba(255,255,255,0.05);
  }
  .rs-row.is-sel .rs-n { background: var(--rt); color: #0a0a0a; }
  .rs-val { font-family: var(--font-mono); font-size: 20px; font-weight: 500; letter-spacing: -0.8px; display: flex; align-items: baseline; gap: 5px; }
  .rs-val small { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); }
  .rs-val i { font-style: normal; color: var(--text-muted); font-size: 15px; margin: 0 3px; }
  .rs-st {
    display: flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
    letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-muted); white-space: nowrap;
  }
  .rs-st.ok { color: var(--text-tertiary); }
  .rs-st.low { color: #ffb84d; }
  .rs-st.ed { color: var(--rt); }
  .rs-st.ed::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--rt); }

  .rs-ed {
    flex-shrink: 0; margin-top: 12px; border-radius: var(--radius-2xl); border: 0.5px solid var(--border-medium);
    background: linear-gradient(180deg, #1c1c1c, #151515); padding: 12px; display: flex; flex-direction: column; gap: 8px;
  }
  .rs-ed-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 44px; padding-left: 4px; }
  .rs-ed-title { font-size: 17px; font-weight: 600; letter-spacing: -0.3px; color: var(--text); }
  .rs-ed-prev { white-space: nowrap; margin-top: 2px; font-family: var(--font-mono); font-size: 11px; color: var(--text-tertiary); }
  .rs-reset {
    height: 44px; padding: 0 12px; border-radius: var(--radius-full); border: 0; background: transparent;
    color: var(--text-secondary); font-family: var(--font-sans); font-size: 13px; font-weight: 500; cursor: pointer;
  }
  .rs-line {
    display: grid; grid-template-columns: 56px minmax(0, 1fr) 56px; align-items: center; gap: 8px; padding: 4px;
    border-radius: var(--radius-xl); background: rgba(0,0,0,0.28); border: 0.5px solid var(--border);
  }
  .rs-b {
    height: 56px; border-radius: 16px; border: 0.5px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.08);
    color: var(--text); font-family: var(--font-mono); font-size: 26px; line-height: 1; display: grid; place-items: center;
    cursor: pointer; padding: 0; touch-action: manipulation; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; transition: transform 0.1s, background 0.1s;
  }
  .rs-b:active { transform: scale(0.93); background: color-mix(in srgb, var(--rt) 24%, transparent); }
  .rs-mid { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 0; }
  .rs-lab { font-family: var(--font-mono); font-size: 9px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); }
  .rs-iv { width: 100%; display: flex; align-items: baseline; justify-content: center; gap: 5px; min-width: 0; }
  .rs-in {
    width: 100%; max-width: 120px; min-width: 0; background: transparent; border: 0; outline: none; text-align: right;
    font-family: var(--font-mono); font-size: 30px; font-weight: 500; letter-spacing: -1.4px; line-height: 1;
    color: var(--text); padding: 0;
  }
  .rs-in.is-ed { color: var(--rt); }
  .rs-u { flex-shrink: 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); width: 34px; }
  .rs-steps { display: flex; align-items: center; gap: 6px; padding-left: 4px; }
  .rs-steps > span { white-space: nowrap; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); margin-right: auto; }
  .rs-step {
    height: 44px; min-width: 58px; padding: 0 10px; border-radius: var(--radius-full); border: 0.5px solid var(--border-medium);
    background: transparent; color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; font-weight: 500; cursor: pointer;
  }
  .rs-step.is-on { background: rgba(255,255,255,0.12); color: var(--text); border-color: transparent; }
  .rs-foot { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .rs-pill {
    height: 48px; border-radius: var(--radius-full); border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.05);
    color: var(--text); font-family: var(--font-sans); font-size: 14px; font-weight: 500; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; min-width: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .rs-pill:disabled { opacity: 0.35; cursor: default; }
  .rs-pill:not(:disabled):active { background: rgba(255,255,255,0.1); }

  .rs-actions { flex-shrink: 0; margin-top: 14px; display: flex; flex-direction: column; }
  .rs-save {
    height: 60px; border-radius: var(--radius-xl); border: 0.5px solid transparent;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    font-family: var(--font-sans); font-size: 18px; font-weight: 600; letter-spacing: -0.3px;
    background: var(--rt); color: #0a0a0a; cursor: pointer; transition: transform 0.12s;
  }
  .rs-save:active { transform: scale(0.98); }
  .rs-save:disabled { opacity: 0.6; }

  /* Narrow phones: the two pills and the step chips have to share 280px. */
  @media (max-width: 360px) {
    .rs-foot { grid-template-columns: 1.3fr 1fr; }
    .rs-pill { font-size: 11.5px; letter-spacing: -0.2px; }
    .rs-pill svg { display: none; }
    .rs-step { min-width: 48px; padding: 0 6px; }
    .rs-line { grid-template-columns: 48px minmax(0, 1fr) 48px; }
  }

  /* Short phones (SE-class): the editor gives back height so at least one
     row of series stays visible above it. */
  @media (max-height: 720px) {
    .rs-head { padding: 2px 2px 8px; gap: 2px; }
    .rs-title { font-size: 22px; }
    .rs-meta { margin-top: 2px; }
    .rs-row { min-height: 46px; }
    .rs-ed { margin-top: 8px; padding: 8px; gap: 6px; }
    .rs-ed-top { min-height: 38px; }
    .rs-b { height: 44px; font-size: 22px; }
    .rs-in { font-size: 24px; }
    .rs-step { height: 36px; }
    .rs-pill { height: 42px; }
    .rs-actions { margin-top: 10px; }
    .rs-save { height: 50px; font-size: 16px; }
  }
</style>
