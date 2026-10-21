<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import { getTodaySets, saveSetEntry, persistSets, type SetEntry } from '$lib/set-log'
  import type { RestTimerData } from '$lib/rest-timer'
  import { getAutoFilledSets, withAutoFlag, type AutoFillResult } from '$lib/series-mode'
  import SeriesConfirmSheet from './SeriesConfirmSheet.svelte'
  import WeightRepsStepper from './WeightRepsStepper.svelte'

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

  async function close() {
    await commitShownSet()
    onclose?.()
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
  function getDotClass(n: number): string {
    if (n < setNo) return 'ms-dot done'
    if (n === setNo) return 'ms-dot current'
    return 'ms-dot pending'
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
          <button class="sms-icon-btn" type="button" aria-label="Minimizar descanso" onclick={onminimize}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
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
          <button class="sms-skip" type="button" aria-label="Saltar descanso" onclick={onskip}>
            Saltar
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M4 3.2l8 5.8-8 5.8V3.2z" fill="currentColor"/><rect x="12.5" y="3" width="2" height="12" rx="1" fill="currentColor"/></svg>
          </button>
        {:else if phase === 'saved'}
          <button class="sms-skip" type="button" aria-label="Terminar ejercicio" onclick={close}>
            Terminar
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none"><path d="M4.5 4.5l9 9m0-9l-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </button>
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
              <div class="sms-done-mark">
                <svg width="54" height="42" viewBox="0 0 14 11" fill="none" aria-hidden="true"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="sms-done-label">Listo para la serie {setNo + 1}</div>
            {:else}
              <div class="sms-time">{fmtClock(remainingMs)}</div>
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
          <div class="sms-serie-label">
            Serie <b>{setNo}</b> de <b>{timer.sets}</b>
          </div>
          <div class="sms-dots">
            {#each dots as n}
              <span class={getDotClass(n)}></span>
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
              <div class="sms-ex-sub"><span class="sms-chip">{timer.muscle}</span></div>
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
            <button class="btn btn-pri btn-lg" type="button" onclick={commitSet}>
              Registrar
            </button>
          </div>
        {:else if phase === 'registering' && weightRepsMinimized}
          <!-- Minimized weight/reps - compact bar showing saved values -->
          <div class="sms-minimized" onclick={expandWeightReps}>
            <span class="sms-min-check">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span class="sms-min-info">
              <b>Serie {setNo} registrada</b>
              <span>{committedWeight > 0 ? fmtNum(committedWeight) : '—'} {units} × {committedReps > 0 ? committedReps : '—'}</span>
            </span>
            <span class="sms-min-expand">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5v14"/></svg>
            </span>
          </div>
        {:else if phase === 'saved'}
          <!-- Saved set display -->
          <div class="sms-log">
            <span class="sms-log-check">
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </span>
            <span>
              <b>Serie {justSavedSetNo} guardada</b>
              <span>{committedWeight > 0 ? fmtNum(committedWeight) : '—'} {units} × {committedReps > 0 ? committedReps : '—'}</span>
            </span>
            <button class="chipb" type="button" onclick={startEditSavedSet}>Cambiar</button>
          </div>
          
          <div class="sms-dock">
            <button class="btn btn-pri btn-lg" type="button" onclick={next}>
              Empezar serie {justSavedSetNo + 1}
            </button>
          </div>
        {/if}
      </section>

      <footer class="sms-actions">
        {#if phase === 'registering'}
          <button class="sms-act sms-act-restart" type="button" onclick={restart}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
            Reiniciar descanso
          </button>
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
  .sms-icon-btn {
    width: 38px; height: 38px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.04);
    color: var(--text-secondary); display: grid; place-items: center; cursor: pointer;
  }
  .sms-icon-btn:active { transform: scale(0.92); }
  .sms-top-gap { width: 38px; }
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
  .sms-skip {
    height: 38px; padding: 0 16px; border-radius: var(--radius-full);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.04);
    color: var(--text-secondary); font-size: 14px; font-weight: 500;
    display: flex; align-items: center; gap: 6px; cursor: pointer;
  }
  .sms-skip:active { transform: scale(0.96); }

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
  .sms-chip {
    font-family: var(--font-mono); font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase;
    color: var(--text-tertiary); border: 0.5px solid var(--border-medium); border-radius: var(--radius-full);
    padding: 3px 9px;
  }

  /* Modo serie weight/reps section */
  .sms-weight {
    display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 8px 0 0;
  }
  .sms-weight-row {
    display: grid; grid-template-columns: 56px minmax(0,1fr) 56px; align-items: center; gap: 8px;
    padding: 6px; border-radius: 24px; background: rgba(255,255,255,0.04); width: 100%; max-width: 320px;
  }
  .sms-weight-value {
    font-family: var(--font-mono); font-size: 120px; font-weight: 500; letter-spacing: -0.07em; line-height: 0.9; color: var(--text);
    text-align: center;
  }
  .sms-weight-value small {
    font-family: var(--font-sans); font-size: 22px; color: var(--text-tertiary); letter-spacing: 0; margin-left: 6px; font-weight: 500;
  }
  .sms-btn {
    height: 56px; width: 56px; border-radius: 16px; background: rgba(255,255,255,0.08);
    display: grid; place-items: center; color: var(--text); border: none; cursor: pointer;
    transition: transform 0.1s, background 0.1s;
  }
  .sms-btn:active { transform: scale(0.93); background: color-mix(in srgb, var(--rt) 24%, transparent); }
  .sms-btn svg { flex-shrink: 0; }

  .sms-reps { display: grid; grid-template-columns: 56px minmax(0,1fr) 56px; align-items: center; gap: 8px; padding: 6px; border-radius: 24px; background: rgba(255,255,255,0.04); width: 100%; max-width: 320px; }
  .sms-reps-btn { height: 56px; width: 56px; border-radius: 16px; background: rgba(255,255,255,0.08); display: grid; place-items: center; color: var(--text); border: none; cursor: pointer; }
  .sms-reps-btn:active { transform: scale(0.93); background: color-mix(in srgb, var(--rt) 24%, transparent); }
  .sms-reps-value { text-align: center; font-family: var(--font-mono); font-size: 24px; font-weight: 500; letter-spacing: -0.04em; color: var(--text); }
  .sms-reps-value small { font-family: var(--font-sans); font-size: 14px; color: var(--text-tertiary); margin-left: 5px; letter-spacing: 0; }

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

  .chipb {
    height: 44px; padding: 0 16px; border-radius: 999px; background: rgba(255,255,255,0.06);
    font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px; color: var(--text-secondary);
    border: none; cursor: pointer;
  }
  .chipb:active { background: rgba(255,255,255,0.12); }

  .sms-dock { padding-top: 20px; }
  .sms-dock .btn { width: 100%; }

  .sms-actions { flex-shrink: 0; margin-top: 14px; display: flex; flex-direction: column; gap: 10px; }
  .sms-act {
    height: 56px; border-radius: var(--radius-xl);
    border: 0.5px solid var(--border-medium); background: rgba(255,255,255,0.045);
    color: var(--text); font-family: var(--font-mono); font-size: 16px; font-weight: 500;
    letter-spacing: -0.3px; cursor: pointer;
    transition: background 0.15s, transform 0.12s var(--ease-smooth);
  }
  .sms-act:active { transform: scale(0.97); background: rgba(255,255,255,0.09); }
  .sms-act-restart {
    display: flex; align-items: center; justify-content: center; gap: 9px;
    font-family: var(--font-sans); font-size: 16px; font-weight: 500; color: var(--rt);
    border-color: color-mix(in srgb, var(--rt) 26%, transparent);
    background: color-mix(in srgb, var(--rt) 7%, transparent);
  }

  .btn {
    height: 56px; border-radius: 18px; font-size: 17px; font-weight: 600;
    display: flex; align-items: center; justify-content: center; gap: 9px; cursor: pointer;
    transition: transform 0.12s, background 0.15s;
  }
  .btn:active { transform: scale(0.97); }
  .btn-pri { background: var(--rt); color: var(--bg); border-color: transparent; box-shadow: 0 8px 26px -12px var(--rt); }
  .btn-pri:active { background: color-mix(in srgb, var(--rt) 85%, #000); }
  .btn-lg { height: 56px; font-size: 17px; font-weight: 600; }
  .btn-sec { background: rgba(255,255,255,0.045); color: var(--text); border-color: var(--border-medium); }

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
    .sms-weight-value { font-size: 96px; }
    .sms-weight-value small { font-size: 18px; }
    .sms-btn { height: 64px; }
    .sms-reps { grid-template-columns: 48px minmax(0,1fr) 48px; }
    .sms-reps-btn { height: 48px; width: 48px; }
    .sms-reps-value { font-size: 20px; }
    .sms-actions { margin-top: 10px; }
    .sms-act { height: 48px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .sms, .sms-status::before, .is-ending .sms-time { animation: none; }
  }
</style>