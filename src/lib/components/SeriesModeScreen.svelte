<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import { getTodaySets, saveSetEntry, persistSets, type SetEntry } from '$lib/set-log'
  import type { RestTimerData } from '$lib/rest-timer'
  import { getAutoFilledSets, withAutoFlag, type AutoFillResult } from '$lib/series-mode'
  import SeriesConfirmSheet from './SeriesConfirmSheet.svelte'
  import WeightRepsStepper from './WeightRepsStepper.svelte'
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'
  import FilterChip from './FilterChip.svelte'
  import Tag from './Tag.svelte'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  let {
    visible = false,
    timer,
    accent = 'var(--accent)',
    onskip = undefined,
    onminimize = undefined,
    onadjust = undefined,
    onrestart = undefined,
    onnext = undefined,
    onclose = undefined
  }: {
    visible: boolean
    timer: RestTimerData
    accent?: string
    onskip?: () => void
    onminimize?: () => void
    onadjust?: (deltaSec: number) => void
    onrestart?: () => void
    onnext?: () => void | Promise<void>
    onclose?: () => void
  } = $props()

  const WEIGHT_STEP = 5
  const REPS_STEP = 1

  // Derived from the clock, not ticked down from 0: a fresh rest must never
  // read as "done" on its first render, before the first tick.
  let now = $state(Date.now())
  let remainingMs = $derived(Math.max(0, timer.endTime - now))
  let tickId: ReturnType<typeof setInterval> | null = null

  // Per-set log: the set you just finished is the one you register while you
  // rest. Everything is read back from today's log, so the detail sheet and
  // the timer always show the same thing.
  let entries = $state<SetEntry[]>([])
  let weight = $state(0)
  let reps = $state(0)
  let saved = $state(false)
  let loadedKey = ''
  let saveId: ReturnType<typeof setTimeout> | null = null
  let pending: { exerciseId: string; setNo: number; units: string; entry: SetEntry } | null = null
  // While the next rest is being armed, the old one still reads as done: it must
  // not be taken for a rest that just ended (that bounced back to "Empezar serie").
  let advancing = $state(false)

  // Committed values for display in saved phase
  let committedWeight = $state(0)
  let committedReps = $state(0)

  // Auto-fill tracking
  let autoFillResult = $state<AutoFillResult | null>(null)
  let autoFlags = $state<boolean[]>([])

  // Phase: 'registering' (during rest), 'saved' (rest done, shows saved set), 'confirm' (last set, show confirm sheet)
  let phase = $state<'registering' | 'saved' | 'confirm'>('registering')
  let justSavedSetNo = $state(0)

  // Weight/Reps section minimized state (after tapping Registrar)
  let weightRepsMinimized = $state(false)

  let displayName = $derived(getExerciseDisplayName({ name: timer.name }) || timer.name)
  // Consider rest done when parent says so, OR when our local countdown reaches 0
  // (fallback for test environments where parent store may not update phase)
  let isDone = $derived(timer.phase === 'done' || (timer.phase === 'resting' && remainingMs <= 0))
  let isLastSet = $derived(timer.sets > 0 && (timer.setIndex || 0) >= timer.sets)
  let isSummary = $derived(isDone && isLastSet)
  let units = $derived(timer.units || 'kg')
  let setIndex = $derived(timer.setIndex || 0)
  let setNo = $derived(Math.max(1, setIndex))
  let dots = $derived(Array.from({ length: Math.max(timer.sets || 0, setIndex) }, (_, i) => i + 1))
  let media = $derived(timer.gifUrl || timer.imgUrl || '')

  function fmtNum(n: number): string {
    return Number.isInteger(n) ? String(n) : String(+n.toFixed(1))
  }

  function fmtClock(ms: number) {
    const total = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  function ringOffset(ms: number) {
    const dur = timer.restSec * 1000
    const pct = dur > 0 ? Math.max(0, Math.min(1, ms / dur)) : 0
    return 100 * (1 - pct)
  }

  function adjust(deltaSec: number) {
    if (navigator.vibrate) navigator.vibrate(20)
    onadjust?.(deltaSec)
  }

  function restart() {
    if (navigator.vibrate) navigator.vibrate(30)
    onrestart?.()
  }

  // Commit the currently shown set (called on "Siguiente serie" or when closing)
  async function commitShownSet() {
    if (saveId) { clearTimeout(saveId); saveId = null }
    pending = null
    if (!timer.exerciseId || !(weight > 0) || !(reps > 0)) return
    entries = await saveSetEntry(timer.exerciseId, setNo, { reps, weight }, units)
    saved = true
  }

  // Seeds the two fields: whatever this set already has, else the previous set
  // of today, else the last workout's weight and the prescribed reps.
  async function loadSets() {
    const list = await getTodaySets(timer.exerciseId)
    const mine = list[setNo - 1]
    const prev = list[setNo - 2] || list[list.length - 1]
    entries = list
    weight = mine?.weight ?? prev?.weight ?? timer.lastWeight ?? 0
    reps = mine?.reps || prev?.reps || parseRepsDefault(timer.reps)
    saved = !!mine

    // Compute auto-fill for the full planned sets
    autoFillResult = getAutoFilledSets(
      timer.exerciseId,
      timer.sets,
      timer.reps,
      timer.lastWeight ?? 0,
      list
    )
    autoFlags = autoFillResult.autoFlags
  }

  // Debounced commit on field changes
  function commit() {
    saved = false
    pending = { exerciseId: timer.exerciseId, setNo, units, entry: { reps, weight } }
    if (saveId) clearTimeout(saveId)
    saveId = setTimeout(flush, 450)
  }

  async function flush() {
    if (saveId) { clearTimeout(saveId); saveId = null }
    const p = pending
    pending = null
    if (!p || !p.exerciseId || !(p.entry.weight > 0) || !(p.entry.reps > 0)) return
    const list = await saveSetEntry(p.exerciseId, p.setNo, p.entry, p.units)
    if (p.exerciseId === timer.exerciseId && p.setNo === setNo) {
      entries = list
      saved = true
    }
  }

  // Called when rest finishes (phase becomes 'done')
  async function onRestDone() {
    if (phase === 'registering') {
      // Save the set that was being registered
      await commitShownSet()
      justSavedSetNo = setNo
      phase = 'saved'

      // If this was the last set, go to confirm phase
      if (isLastSet) {
        phase = 'confirm'
      }
      // Refresh auto-flags after commit
      await refreshAutoFlags()
    }
  }

  // Called when user taps "Serie N hecha · descansar" during rest - just commits the set
  async function commitSet() {
    await commitShownSet()
    committedWeight = weight
    committedReps = reps
    
    // If this is the last set, go directly to confirm phase
    if (isLastSet) {
      phase = 'confirm'
    } else {
      // Minimize the weight/reps section instead of switching to 'saved' phase
      weightRepsMinimized = true
    }
    // Refresh auto-flags after commit
    await refreshAutoFlags()
  }

  function expandWeightReps() {
    weightRepsMinimized = false
  }

  async function refreshAutoFlags() {
    if (!timer.exerciseId) return
    // Retry a few times to ensure DB write is visible
    for (let attempt = 0; attempt < 5; attempt++) {
      const list = await getTodaySets(timer.exerciseId)
      if (list.length >= (timer.setIndex || 1)) {
        autoFillResult = getAutoFilledSets(
          timer.exerciseId,
          timer.sets,
          timer.reps,
          timer.lastWeight ?? 0,
          list
        )
        autoFlags = autoFillResult.autoFlags
        return
      }
      await new Promise(r => setTimeout(r, 50))
    }
    // Fallback: use whatever we got
    const list = await getTodaySets(timer.exerciseId)
    autoFillResult = getAutoFilledSets(
      timer.exerciseId,
      timer.sets,
      timer.reps,
      timer.lastWeight ?? 0,
      list
    )
    autoFlags = autoFillResult.autoFlags
  }

  // Called when user taps "Empezar serie N+1" in saved phase
  async function next() {
    if (advancing) return
    advancing = true
    if (navigator.vibrate) navigator.vibrate(40)
    // Expand weight/reps immediately so the stepper shows while the next rest arms
    weightRepsMinimized = false
    phase = 'registering'
    try {
      await onnext?.()
    } finally {
      advancing = false
    }
  }

  // «Terminar»: keeps the shown set and goes straight to «Confirma tus series»
  async function finish() {
    await commitShownSet()
    phase = 'confirm'
    await refreshAutoFlags()
  }

  function stepWeight(delta: number) {
    weight = Math.max(0, +(weight + delta).toFixed(1))
    if (navigator.vibrate) navigator.vibrate(10)
    commit()
  }

  function stepReps(delta: number) {
    reps = Math.max(1, Math.min(100, Math.round(reps + delta)))
    if (navigator.vibrate) navigator.vibrate(10)
    commit()
  }

  function inputWeight(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9.]/g, '')
    weight = raw === '' ? 0 : parseFloat(raw)
    commit()
  }

  function inputReps(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9]/g, '')
    reps = raw === '' ? 0 : parseInt(raw, 10)
    commit()
  }

  // Handle "Cambiar" - switch to inline edit mode for the just-saved set
  function startEditSavedSet() {
    // The saved set is already in entries, just switch to registering phase
    // to allow editing. We'll re-save on next commit.
    phase = 'registering'
    saved = false
  }

  // Flush on unmount
  $effect(() => () => { flush() })

  // Load sets when exercise/set changes
  $effect(() => {
    const key = `${timer.exerciseId}#${setNo}`
    if (!visible || !timer.exerciseId || key === loadedKey) return
    loadedKey = key
    // Don't set phase here - next() handles phase transition
    // This avoids race condition where effect runs before next() sets weightRepsMinimized=false
    loadSets()
  })

  // This screen lives in the layout and outlasts each rest: a rest for another
  // set or exercise starts over on its fields, never on the last one's
  // «Confirma tus series» or «Serie guardada». (+30 s / Reiniciar keep the set.)
  let shownSetKey = ''
  $effect.pre(() => {
    const key = `${timer.exerciseId}#${timer.setIndex || 0}`
    if (!visible || !timer.exerciseId || key === shownSetKey) return
    shownSetKey = key
    phase = 'registering'
    weightRepsMinimized = false
  })

  // Track rest timer phase changes
  $effect(() => {
    if (!visible) return
    if (isDone && phase === 'registering' && !advancing) {
      onRestDone()
    } else if (!isDone && phase !== 'registering' && phase !== 'saved' && phase !== 'confirm') {
      // New rest started (only reset if not in a terminal phase)
      phase = 'registering'
    }
  })

  // Tick for countdown
  $effect(() => {
    if (tickId) { clearInterval(tickId); tickId = null }
    if (!visible || timer.endTime <= 0) return
    now = Date.now()
    tickId = setInterval(() => {
      now = Date.now()
    }, 1000)
    return () => { if (tickId) clearInterval(tickId) }
  })

  // Series marks: done = accent, current = white, pending = muted
  function getDotState(n: number): 'done' | 'current' | 'pending' {
    if (n < setNo) return 'done'
    if (n === setNo) return 'current'
    return 'pending'
  }
</script>

{#if visible && (remainingMs > 0 || isDone)}
  <div class="sms" class:is-ending={remainingMs <= 10000 && remainingMs > 0} class:is-done={isDone} data-component="SeriesModeScreen" data-phase={phase} style="--rt:{accent}" role="dialog" aria-label={phase === 'confirm' ? 'Confirma tus series' : phase === 'saved' ? 'Serie guardada' : 'Descanso'}>
    
    {#if phase === 'confirm'}
      <SeriesConfirmSheet
        name={displayName}
        reps={timer.reps}
        {units}
        entries={withAutoFlag(entries, autoFlags)}
        onsave={(sets) => {
          persistSets(timer.exerciseId, sets, units)
          onclose?.()
        }}
        onclose={onclose}
      />
    {:else}
      <header class="sms-top">
        {#if phase === 'registering'}
          <IconButton size="sm" variant="filled" icon="down" label="Minimizar descanso" onclick={onminimize} />
        {:else}
          <span class="sms-top-gap"></span>
        {/if}
        
        <span class="sms-status">
          {#if phase === 'registering'}
            Descanso
          {:else if phase === 'saved'}
            Descanso terminado
          {/if}
        </span>
        
        {#if phase === 'registering'}
          <Button variant="secondary" size="pill" ariaLabel="Saltar descanso" onclick={onskip}>Saltar<Icon name="skip" size={16} /></Button>
        {:else if phase === 'saved'}
          <Button variant="secondary" size="pill" ariaLabel="Terminar ejercicio" onclick={finish}>Terminar<Icon name="x" size={16} /></Button>
        {/if}
      </header>

      <section class="sms-clock">
        {#if phase === 'registering'}
          <button class="sms-nudge sms-nudge-minus" type="button" aria-label="−15 s" onclick={() => adjust(-15)}>
            <span class="sms-nudge-n">−15</span><span class="sms-nudge-u">s</span>
          </button>
        {/if}
        
        <div class="sms-ring-wrap">
          <svg class="sms-ring" viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r="100" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8"/>
            <circle cx="110" cy="110" r="100" fill="none" stroke="#fafafa" stroke-width="8" stroke-linecap="round" pathLength="100" stroke-dasharray="100" stroke-dashoffset={isDone ? 0 : ringOffset(remainingMs)} transform="rotate(-90 110 110)"/>
          </svg>
          <div class="sms-center">
            {#if phase === 'saved'}
              <div class="sms-done-mark"><Icon name="check" size={54} /></div>
              <div class="sms-done-label">Listo para la serie {setNo + 1}</div>
            {:else}
              <div class="sms-time" data-testid={TID.seriesTime}>{fmtClock(remainingMs)}</div>
              <div class="sms-total">de {fmtClock(timer.restSec * 1000)}</div>
            {/if}
          </div>
        </div>
        
        {#if phase === 'registering'}
          <button class="sms-nudge sms-nudge-plus" type="button" aria-label="+30 s" onclick={() => adjust(30)}>
            <span class="sms-nudge-n">+30</span><span class="sms-nudge-u">s</span>
          </button>
        {/if}
      </section>

      {#if dots.length}
        <section class="sms-serie">
          <div class="sms-serie-label" data-testid={TID.seriesLabel}>
            Serie <b>{setNo}</b> de <b>{timer.sets}</b>
          </div>
          <div class="sms-dots">
            {#each dots as n}
              <span class="ms-dot {getDotState(n)}" data-testid={TID.seriesDot} data-state={getDotState(n)}></span>
            {/each}
          </div>
        </section>
      {/if}

      <section class="sms-card">
        <div class="sms-card-head">
          <div class="sms-thumb">
            {#if media}
              <img src={media} alt="" />
            {:else}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>
            {/if}
          </div>
          <div class="sms-ex">
            <div class="sms-ex-name">{displayName}</div>
            {#if timer.muscle}
              <div class="sms-ex-sub"><Tag>{timer.muscle}</Tag></div>
            {/if}
          </div>
        </div>

        {#if phase === 'registering' && !weightRepsMinimized}
          <!-- Weight & Reps Input (Modo serie style) -->
          <WeightRepsStepper
            editable
            {weight}
            {reps}
            {units}
            weightStep={WEIGHT_STEP}
            repsStep={REPS_STEP}
            onWeightChange={stepWeight}
            onRepsChange={stepReps}
            origWeight={weight}
            origReps={reps}
          />
          
          <div class="sms-dock">
            <Button variant="primary" size="lg" accent="var(--rt)" onclick={commitSet}>Registrar</Button>
          </div>
        {:else if phase === 'registering' && weightRepsMinimized}
          <!-- Minimized weight/reps - compact bar showing saved values -->
          <div class="sms-minimized" onclick={expandWeightReps}>
            <span class="sms-min-check"><Icon name="check" size={16} /></span>
            <span class="sms-min-info">
              <b>Serie {setNo} registrada</b>
              <span>{committedWeight > 0 ? fmtNum(committedWeight) : '—'} {units} × {committedReps > 0 ? committedReps : '—'}</span>
            </span>
            <span class="sms-min-expand"><Icon name="plus" size={18} /></span>
          </div>
        {:else if phase === 'saved'}
          <!-- Saved set display -->
          <div class="sms-log">
            <span class="sms-log-check"><Icon name="check" size={16} /></span>
            <span>
              <b>Serie {justSavedSetNo} guardada</b>
              <span>{committedWeight > 0 ? fmtNum(committedWeight) : '—'} {units} × {committedReps > 0 ? committedReps : '—'}</span>
            </span>
            <FilterChip variant="choice" onclick={startEditSavedSet}>Cambiar</FilterChip>
          </div>

          <div class="sms-dock">
            <Button variant="primary" size="lg" accent="var(--rt)" onclick={next}>Empezar serie {justSavedSetNo + 1}</Button>
          </div>
        {/if}
      </section>

      <footer class="sms-actions">
        {#if phase === 'registering'}
          <Button variant="secondary" size="lg" onclick={restart}><Icon name="restart" size={18} />Reiniciar descanso</Button>
        {/if}
      </footer>
    {/if}
  </div>
{/if}

<style>
  .sms {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    padding:
      calc(env(safe-area-inset-top, 0px) + 14px)
      20px
      calc(env(safe-area-inset-bottom, 0px) + 26px);
    background:
      radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--rt) 9%, transparent), transparent 62%),
      radial-gradient(90% 50% at 50% 100%, rgba(255,255,255,0.03), transparent 70%),
      var(--bg);
    font-family: var(--font-sans);
    animation: sms-in 0.35s var(--ease-smooth);
  }

  .sms-top { display: flex; align-items: center; justify-content: space-between; height: 44px; flex-shrink: 0; }
  .sms-top-gap { width: 44px; }
  .sms-status {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--font-mono); font-size: 11px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase; color: var(--rt);
  }
  .sms-status::before {
    content: ""; width: 7px; height: 7px; border-radius: 50%;
    background: var(--rt); box-shadow: 0 0 10px var(--rt);
    animation: sms-blink 1.4s ease-in-out infinite;
  }
  .is-done .sms-status::before { animation: none; }

  .sms-clock { position: relative; flex: 1; min-height: 0; display: grid; place-items: center; }
  .sms-nudge {
    position: absolute; top: 50%; transform: translateY(-50%);
    width: 52px; height: 52px; border-radius: 50%;
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.045);
    color: var(--text); cursor: pointer; padding: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
    transition: background 0.15s, transform 0.12s var(--ease-smooth);
  }
  .sms-nudge-n { font-family: var(--font-mono); font-size: 13px; font-weight: 500; letter-spacing: -0.4px; line-height: 1; }
  .sms-nudge-u { font-family: var(--font-mono); font-size: 8px; letter-spacing: 0.8px; color: var(--text-muted); line-height: 1; }
  .sms-nudge:active { transform: translateY(-50%) scale(0.94); background: rgba(255,255,255,0.09); }
  .sms-nudge-minus { left: 0; }
  .sms-nudge-plus { right: 0; }
  
  .sms-ring-wrap {
    position: relative;
    height: 100%;
    max-height: min(220px, calc(100vw - 100px));
    width: auto;
    aspect-ratio: 1;
    display: grid;
    place-items: center;
    container-type: size;
  }
  .sms-ring { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
  .sms-center { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .sms-time {
    font-family: var(--font-mono); font-size: clamp(42px, 20vw, 84px); font-weight: 500;
    letter-spacing: -0.055em; line-height: 0.92; color: var(--text);
    font-variant-numeric: tabular-nums;
  }
  .sms-total {
    font-family: var(--font-mono); font-size: 12px; letter-spacing: 1.6px;
    text-transform: uppercase; color: var(--text-muted);
  }
  @container (min-width: 0px) {
    .sms-time { font-size: 27cqw; }
    .sms-total { font-size: max(9px, 4cqw); }
  }
  .sms-done-mark { color: var(--rt); display: grid; place-items: center; }
  .sms-done-label {
    margin-top: 12px; font-family: var(--font-mono); font-size: 13px; letter-spacing: 0.6px;
    color: var(--text-secondary); text-align: center;
  }

  .sms-serie { flex-shrink: 0; display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 4px 0 20px; }
  .sms-serie-label { font-size: 15px; color: var(--text-secondary); letter-spacing: -0.2px; }
  .sms-serie-label b { color: var(--text); font-weight: 600; }
  .sms-dots { display: flex; gap: 9px; flex-wrap: wrap; justify-content: center; }
  .ms-dot { width: 30px; height: 5px; border-radius: 3px; background: rgba(255,255,255,0.1); }
  .ms-dot.done { background: var(--rt); box-shadow: 0 0 12px color-mix(in srgb, var(--rt) 70%, transparent); }
  .ms-dot.current { background: #fafafa; box-shadow: 0 0 12px #fafafa; }
  .ms-dot.pending { background: rgba(255,255,255,0.1); }

  .sms-card {
    flex-shrink: 0;
    border-radius: var(--radius-2xl);
    border: 0.5px solid var(--border);
    background: linear-gradient(180deg, rgba(26,26,26,0.9), rgba(20,20,20,0.9));
    padding: 16px;
  }
  .sms-card-head { display: flex; align-items: center; gap: 13px; }
  .sms-thumb {
    width: 54px; height: 54px; flex-shrink: 0; border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--rt) 8%, var(--surface-2));
    border: 0.5px solid var(--border-medium);
    display: grid; place-items: center; color: var(--rt); overflow: hidden;
  }
  .sms-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .sms-ex { min-width: 0; }
  .sms-ex-name {
    font-size: 19px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.15; color: var(--text);
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .sms-ex-sub { margin-top: 5px; display: flex; align-items: center; gap: 7px; }

  .sms-log {
    display: grid; grid-template-columns: 28px minmax(0,1fr) auto; align-items: center; gap: 12px; padding: 12px 8px 12px 14px; border-radius: 20px; background: rgba(255,255,255,0.04);
  }
  .sms-log-check { color: var(--rt); display: grid; place-items: center; }
  .sms-log b { display: block; font-size: 16px; color: var(--text); }
  .sms-log span span { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }

  /* Minimized weight/reps section */
  .sms-minimized {
    display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px; background: rgba(255,255,255,0.04);
    cursor: pointer; transition: background 0.15s;
  }
  .sms-minimized:active { background: rgba(255,255,255,0.08); }
  .sms-min-check { color: var(--rt); display: grid; place-items: center; flex-shrink: 0; }
  .sms-min-info { flex: 1; min-width: 0; }
  .sms-min-info b { display: block; font-size: 16px; color: var(--text); }
  .sms-min-info span { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
  .sms-min-expand { color: var(--text-muted); flex-shrink: 0; opacity: 0.6; }

  .sms-dock { padding-top: 20px; }

  .sms-actions { flex-shrink: 0; margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }

  .is-ending { --rt: #ff5b4d; }
  .is-ending .sms-time { color: #ff5b4d; animation: sms-blink 1s ease-in-out infinite; }

  @keyframes sms-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
  @keyframes sms-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

  @media (max-height: 720px) {
    .sms { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px); }
    .sms-nudge { width: 44px; height: 44px; }
    .sms-nudge-n { font-size: 12px; }
    .sms-ring-wrap { max-height: min(220px, calc(100vw - 88px)); }
    .sms-serie { gap: 8px; padding: 0 0 10px; }
    .sms-serie-label { font-size: 14px; }
    .sms-card { padding: 12px; }
    .sms-thumb { width: 46px; height: 46px; }
    .sms-ex-name { font-size: 17px; }
    .sms-actions { margin-top: 10px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sms, .sms-status::before, .is-ending .sms-time { animation: none; }
  }
</style>