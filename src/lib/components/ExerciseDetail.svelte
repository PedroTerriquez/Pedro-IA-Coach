<script lang="ts">
  import { logWeight, getSettings, findOrCreateExerciseByName, swapExerciseForToday, revertExerciseSwapForToday } from '$lib/storage'
import { saveSetEntry, getTodaySets } from '$lib/set-log'
import type { SetEntry } from '$lib/set-log'
  import { toast } from '$lib/stores/ui'
  import { settings } from '$lib/stores/settings'
  import { online } from '$lib/stores/network'
  import { parseRepsDefault, muscleLabel } from '$lib/exercise-utils'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { formatWeight } from '$lib/exercise-history'
  import { restClock, weightsList } from '$lib/session-steps'
  import type { ExerciseLogBlock } from '$lib/types'
  import DetailSheet from './DetailSheet.svelte'
  import ExerciseMedia from './ExerciseMedia.svelte'
  import TitleNav from './TitleNav.svelte'
  import TargetPanel from './TargetPanel.svelte'
  import DetailRow from './DetailRow.svelte'
  import LogDock from './LogDock.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import WeightPanel from './WeightPanel.svelte'
  import BlocksPanel from './BlocksPanel.svelte'
  import ProgressHero from './ProgressHero.svelte'
  import AlternativesTab from './AlternativesTab.svelte'
  import ExerciseCoachChat from './ExerciseCoachChat.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'
  import SearchInput from './SearchInput.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  function getToday(): string {
    const d = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  interface Alternative {
    name: string
    muscle?: string
  }

  interface ExerciseLog {
    id: string
    exerciseId: string
    date: string
    weight: number
    units: string
    sets?: number
    reps?: string
    blocks?: ExerciseLogBlock[]
  }

  interface ExerciseDetail {
    id: string
    name: string
    muscle: string
    imgUrl?: string
    gifUrl?: string
    tips?: string[]
    alternatives?: Alternative[]
    sets: number
    reps: string
    rest: number
    logs?: ExerciseLog[]
    exerciseId?: string
    originalExerciseId?: string
    originalExerciseName?: string
  }

  interface NextExercise {
    name: string
    sets: number
    reps: string
    dictId?: string
  }

  let {
    exercise,
    open,
    accent = 'var(--accent)',
    units = 'kg',
    hasPrev = false,
    hasNext = false,
    isToday = false,
    positionLabel = '',
    nextExercise = null,
    onNavigate = null,
    onClose = null,
    onLog = null,
    onStartRest = null,
    onSwap = null,
    onRevert = null
  }: {
    exercise: ExerciseDetail
    open: boolean
    accent?: string
    units?: string
    hasPrev?: boolean
    hasNext?: boolean
    isToday?: boolean
    /** «Empuje · 1 de 3» when opened from a list; the «k de N» part goes bold */
    positionLabel?: string
    /** The one after this in the list, for «Después: …» */
    nextExercise?: NextExercise | null
    onNavigate?: ((dir: 'prev' | 'next') => void) | null
    onClose?: (() => void) | null
    onLog?: (() => void) | null
    onStartRest?: ((data: any) => void | Promise<void>) | null
    onSwap?: (() => void) | null
    onRevert?: (() => void) | null
  } = $props()

  let todayStr = $derived(getToday())
  let todayLog = $derived(exercise.logs?.find(l => l.date === todayStr) || null)
  let pastLogs = $derived((exercise.logs || []).filter(l => l.date !== todayStr && l.weight > 0))
  let lastLog = $derived(exercise.logs?.length ? exercise.logs[exercise.logs.length - 1] : null)
  let lastPastWeight = $derived(pastLogs.length ? pastLogs[pastLogs.length - 1].weight : 0)
  let prevMax = $derived(pastLogs.length ? Math.max(...pastLogs.map(l => l.weight)) : 0)
  let firstTime = $derived(!(exercise.logs || []).some(l => l.weight > 0))

  let tab = $state<'workout' | 'history' | 'alternatives'>('workout')
  let pendingWeight = $state(0)
  let loggedToday = $state(false)
  let iniciarLoading = false
  let chatOpen = $state(false)
  let query = $state('')

  // Modo serie fusionado
  type SetLoggingMode = 'off' | 'loggingSet' | 'restingNextSet' | 'reviewSets'
  let setLoggingMode = $state<SetLoggingMode>('off')
  let currentSetIndex = $state(1)
  let nextSetWeight = $state(0)
  let nextSetReps = $state(0)
  let reviewEntries = $state<SetEntry[]>([])

  function seedBlocks(): ExerciseLogBlock[] {
    if (todayLog?.blocks?.length) return todayLog.blocks.map(b => ({ ...b }))
    if (todayLog?.sets !== undefined && todayLog?.reps !== undefined) {
      return [{ sets: todayLog.sets, reps: parseRepsDefault(todayLog.reps), weight: todayLog.weight }]
    }
    return [{ sets: exercise.sets || 1, reps: parseRepsDefault(exercise.reps), weight: todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0) }]
  }

  let advanced = $state(false)
  let blocks = $state<ExerciseLogBlock[]>([])
  let savedKey = $state<string | null>(null)

  let currentExerciseKey = $derived(exercise.exerciseId || exercise.id)
  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
  let isSwapped = $derived(!!exercise.originalExerciseId && exercise.originalExerciseId !== currentExerciseKey)
  // The alternatives tab shows when the exercise has curated alternatives, and
  // stays while swapped even if the swapped-in one has none: it's the way back.
  let showAlternativesTab = $derived(((exercise.alternatives?.length ?? 0) > 0) || isSwapped)

  $effect(() => {
    void currentExerciseKey
    const isBlockMode = !!todayLog?.blocks?.length
    const seededBlocks = seedBlocks()
    loggedToday = !!todayLog
    pendingWeight = todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0)
    advanced = isBlockMode
    blocks = seededBlocks
    // savedKey only reflects what is stored, never the live value: reading
    // pendingWeight here would snap the field back on every keystroke.
    savedKey = isBlockMode ? JSON.stringify(seededBlocks) : (loggedToday ? String(todayLog?.weight ?? pendingWeight) : null)
    if (tab === 'alternatives' && !showAlternativesTab) tab = 'workout'
  })

  let totalSets = $derived(blocks.reduce((a, b) => a + (b.sets || 0), 0))
  let topWeight = $derived(blocks.length ? Math.max(...blocks.map(b => b.weight)) : 0)
  let currentKey = $derived(advanced ? JSON.stringify(blocks) : String(pendingWeight))
  let isDirty = $derived(loggedToday && currentKey !== savedKey)
  let registered = $derived(loggedToday && !isDirty)
  let savedWeight = $derived(advanced ? topWeight : pendingWeight)
  let isRecord = $derived(registered && prevMax > 0 && savedWeight > prevMax)
  let savedSets = $derived(todayLog?.sets ?? exercise.sets)
  let restText = $derived(restClock(exercise.rest))
  let canRegister = $derived(advanced ? blocks.length > 0 && topWeight > 0 : pendingWeight > 0)
  let registerLabel = $derived(advanced ? `Registrar ${totalSets} series` : `Registrar ${formatWeight(pendingWeight)} ${units}`)
  let posParts = $derived(splitPosition(positionLabel))

  function splitPosition(label: string): { lead: string; bold: string } {
    const i = label.lastIndexOf(' · ')
    return i === -1 ? { lead: '', bold: label } : { lead: label.slice(0, i + 3), bold: label.slice(i + 3) }
  }

  function nextCaption(): string {
    if (!nextExercise) return ''
    const name = getExerciseDisplayName(nextExercise, $settings.language)
    return `Después: ${name} · ${nextExercise.sets} × ${nextExercise.reps}`
  }

  function dockCaption(): string {
    if (!$online) return 'Sin internet también se guarda en tu teléfono'
    if (registered) return nextCaption()
    if (firstTime && !advanced) return 'Ajusta con − y +, luego registra'
    if (advanced) return `${totalSets} series · ${weightsList(blocks.map(b => b.weight), units)}`
    return nextCaption()
  }

  function close() {
    onClose?.()
  }

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onTouchEnd(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7) return
    if (dx < 0 && hasNext) onNavigate?.('next')
    else if (dx > 0 && hasPrev) onNavigate?.('prev')
  }

  function savedToast(what: string) {
    toast.show($online ? `Guardado · ${what}` : `Guardado en tu teléfono · ${what}`)
  }

  async function saveBlocks() {
    if (!blocks.length) return
    const top = blocks.reduce((best, b) => (b.weight > best.weight ? b : best), blocks[0])
    await logWeight(currentExerciseKey, topWeight, units, totalSets, String(top.reps), undefined, blocks.map(b => ({ ...b })))
    savedToast(`${totalSets} series`)
  }

  // Registrar writes today's single log and overwrites what was there.
  async function saveSingle() {
    if (pendingWeight === 0) return
    await logWeight(currentExerciseKey, pendingWeight, units)
    savedToast(`${formatWeight(pendingWeight)} ${units}`)
  }

  async function handleSave() {
    if (!canRegister) return
    if (advanced) await saveBlocks()
    else await saveSingle()
    savedKey = currentKey
    loggedToday = true
    onLog?.()

    const currentSettings = await getSettings()
    if (!currentSettings.onboarded && (currentSettings.onboardingStep ?? 0) <= 2) {
      await settings.update({ onboardingStep: 3 })
    }
  }

  function enterBlocks() {
    blocks = [{ sets: exercise.sets || 1, reps: parseRepsDefault(exercise.reps), weight: pendingWeight || 0 }]
    advanced = true
  }

  function exitBlocks() {
    pendingWeight = topWeight || pendingWeight || 0
    advanced = false
  }

  async function selectAlternative(alt: Alternative) {
    const originalId = exercise.originalExerciseId || currentExerciseKey
    const newEx = await findOrCreateExerciseByName(alt.name, alt.muscle || exercise.muscle)
    await swapExerciseForToday(originalId, newEx.id)
    tab = 'workout'
    query = ''
    toast.show(`Cambiado a ${getExerciseDisplayName(newEx, $settings.language)} por hoy`)
    onSwap?.()
  }

  async function revertAlternative() {
    const originalId = exercise.originalExerciseId || currentExerciseKey
    await revertExerciseSwapForToday(originalId)
    toast.show(`Volviste a ${exercise.originalExerciseName || ''}`)
    onRevert?.()
  }

  // ── Modo serie fusionado ──

  function startFusedMode() {
    setLoggingMode = 'loggingSet'
    currentSetIndex = 1
    const baseReps = parseRepsDefault(exercise.reps)
    nextSetWeight = lastPastWeight || pendingWeight || 0
    nextSetReps = baseReps
  }

  async function handleSetDone() {
    if (setLoggingMode !== 'loggingSet') return
    const entry: SetEntry = { weight: nextSetWeight, reps: nextSetReps }
    await saveSetEntry(currentExerciseKey, currentSetIndex, entry, units)
    reviewEntries = await getTodaySets(currentExerciseKey)
    currentSetIndex++
    const prevWeight = nextSetWeight
    const prevReps = nextSetReps
    nextSetWeight = prevWeight
    nextSetReps = prevReps
    setLoggingMode = 'restingNextSet'
    if (navigator.vibrate) navigator.vibrate(40)
    await onStartRest?.({
      name: displayName,
      restSec: exercise.rest,
      tag: 'rest-' + Date.now(),
      sets: exercise.sets,
      reps: exercise.reps,
      exerciseId: currentExerciseKey,
      muscle: exercise.muscle,
      imgUrl: exercise.imgUrl,
      gifUrl: exercise.gifUrl,
      units,
      lastWeight: lastLog?.weight || 0,
      maxWeight,
      setIndex: currentSetIndex
    })
  }

  function handleAdjustRest(delta: number) {
    // The actual rest timer adjustment happens in the parent via onStartRest
    // This is a local nudge for the fused mode UI
  }

  function goBackToLogging() {
    setLoggingMode = 'loggingSet'
    currentSetIndex--
  }

  async function startNextSetFromFused() {
    if (setLoggingMode !== 'restingNextSet') return
    const entry: SetEntry = { weight: nextSetWeight, reps: nextSetReps }
    await saveSetEntry(currentExerciseKey, currentSetIndex, entry, units)
    reviewEntries = await getTodaySets(currentExerciseKey)
    currentSetIndex++
    const prevWeight = nextSetWeight
    const prevReps = nextSetReps
    nextSetWeight = prevWeight
    nextSetReps = prevReps
    setLoggingMode = 'restingNextSet'
    if (navigator.vibrate) navigator.vibrate(40)
    await onStartRest?.({
      name: displayName,
      restSec: exercise.rest,
      tag: 'rest-' + Date.now(),
      sets: exercise.sets,
      reps: exercise.reps,
      exerciseId: currentExerciseKey,
      muscle: exercise.muscle,
      imgUrl: exercise.imgUrl,
      gifUrl: exercise.gifUrl,
      units,
      lastWeight: lastLog?.weight || 0,
      maxWeight,
      setIndex: currentSetIndex
    })
  }

  function finishFusedMode() {
    setLoggingMode = 'off'
    currentSetIndex = 1
    nextSetWeight = 0
    nextSetReps = 0
    reviewEntries = []
    onLog?.()
  }

  // The rest starts on the tap and the full-screen timer covers this sheet;
  // the guard only keeps a double tap from counting two sets.
  async function handleIniciar() {
    if (iniciarLoading) return
    iniciarLoading = true
    try {
      if (navigator.vibrate) navigator.vibrate(40)
      // Everything here survives the trip through the notification, so it is
      // also what the full-screen rest timer can show while resting.
      await onStartRest?.({
        name: displayName,
        restSec: exercise.rest,
        tag: 'rest-' + Date.now(),
        sets: exercise.sets,
        reps: exercise.reps,
        exerciseId: currentExerciseKey,
        muscle: exercise.muscle,
        imgUrl: exercise.imgUrl,
        gifUrl: exercise.gifUrl,
        units,
        lastWeight: lastLog?.weight || 0,
        maxWeight
      })
    } finally {
      iniciarLoading = false
    }
  }

  let maxWeight = $derived((exercise.logs || []).reduce((m, l) => Math.max(m, l.weight), 0))
</script>

{#snippet fusedModeContent()}
  {#if setLoggingMode === 'loggingSet'}
    <div class="fused-logging">
      <header class="fused-header">
        <div class="fused-ex-info">
          {#if exercise.imgUrl}
            <img class="fused-thumb" src={exercise.imgUrl} alt="" />
          {:else}
            <div class="fused-thumb placeholder">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>
            </div>
          {/if}
          <div class="fused-ex-meta">
            <div class="fused-ex-name">{displayName}</div>
            {#if lastPastWeight > 0}
              <div class="fused-last">Última vez <b>{formatWeight(lastPastWeight)} {units}</b></div>
            {/if}
          </div>
        </div>
        <div class="fused-chips">
          <button class="fused-chip" type="button" onclick={() => tab = 'history'}>Historial</button>
          <button class="fused-chip" type="button" onclick={() => tab = 'alternatives'}>Alternativas</button>
          <button class="fused-chip coach" type="button" onclick={() => (chatOpen = true)}>Coach IA</button>
        </div>
      </header>

      <section class="fused-progress" aria-label="Progreso de series">
        <div class="fused-progress-label">Serie <b>{currentSetIndex}</b> de <b>{exercise.sets}</b></div>
        <div class="fused-dots" role="img" aria-label={currentSetIndex > 1 ? `${currentSetIndex - 1} de ${exercise.sets} series completadas` : 'Primera serie'}>
          {#each Array(exercise.sets) as _, i (i)}
            <span class="fused-dot" class:done={i + 1 < currentSetIndex} class:current={i + 1 === currentSetIndex}></span>
          {/each}
        </div>
      </section>

      <section class="fused-inputs">
        <div class="fused-weight-group">
          <label class="fused-weight-label">Peso</label>
          <div class="fused-weight-stepper">
            <button class="fused-btn-weight" type="button" aria-label="Menos 5 kg" disabled={nextSetWeight <= 0} onclick={() => nextSetWeight = Math.max(0, +(nextSetWeight - 5).toFixed(1))}>−5</button>
            <input
              type="text"
              class="fused-weight-input"
              inputmode="decimal"
              pattern="[0-9.]*"
              value={nextSetWeight || ''}
              oninput={(e) => { const v = (e.target as HTMLInputElement).value.replace(',', '.').replace(/[^0-9.]/g, ''); nextSetWeight = v === '' ? 0 : parseFloat(v) || 0 }}
              onfocus={(e) => (e.target as HTMLInputElement).select()}
              aria-label="Peso en kg"
            />
            <button class="fused-btn-weight" type="button" aria-label="Más 5 kg" onclick={() => nextSetWeight = +(nextSetWeight + 5).toFixed(1)}>+5</button>
          </div>
          <div class="fused-reps-group">
            <label class="fused-reps-label">Reps</label>
            <div class="fused-reps-stepper">
              <button class="fused-btn-reps" type="button" aria-label="Menos rep" disabled={nextSetReps <= 0} onclick={() => nextSetReps = Math.max(0, nextSetReps - 1)}>−</button>
              <input
                type="number"
                class="fused-reps-input"
                inputmode="numeric"
                min="0"
                value={nextSetReps || ''}
                oninput={(e) => { const v = (e.target as HTMLInputElement).value; nextSetReps = v === '' ? 0 : parseInt(v) || 0 }}
                onfocus={(e) => (e.target as HTMLInputElement).select()}
                aria-label="Repeticiones"
              />
              <button class="fused-btn-reps" type="button" aria-label="Más rep" onclick={() => nextSetReps = nextSetReps + 1}>+</button>
            </div>
          </div>
        </div>
      </section>

      <button class="fused-main-btn" type="button" onclick={handleSetDone} disabled={nextSetWeight <= 0}>
        <span class="fused-btn-text">Serie {currentSetIndex} hecha · descansar</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6l6 6-6 6"/></svg>
      </button>
    </div>
  {:else if setLoggingMode === 'restingNextSet'}
    <div class="fused-resting">
      <section class="fused-timer-section">
        <div class="fused-timer-wrap">
          <div class="fused-ring-container">
            <div class="fused-nudge-minus" onclick={() => handleAdjustRest(-15)}>
              <span>−15 s</span>
            </div>
            <svg class="fused-ring" viewBox="0 0 220 220" aria-hidden="true">
              <circle class="fused-ring-track" cx="110" cy="110" r="100"></circle>
              <circle class="fused-ring-prog" cx="110" cy="110" r="100" pathLength="100" style="stroke-dashoffset: 0;"></circle>
            </svg>
            <div class="fused-ring-center">
              <div class="fused-timer-time">--:--</div>
              <div class="fused-timer-sub">de descanso</div>
            </div>
            <div class="fused-nudge-plus" onclick={() => handleAdjustRest(30)}>
              <span>+30 s</span>
            </div>
          </div>
        </div>
        {#if nextExercise}
          <div class="fused-next-ex">Después: {getExerciseDisplayName(nextExercise, $settings.language)} · {nextExercise.sets} × {nextExercise.reps}</div>
        {/if}
      </section>

      <section class="fused-next-set-inputs">
        <div class="fused-next-weight-group">
          <label class="fused-next-label">Peso próxima serie</label>
          <div class="fused-next-weight-stepper">
            <button class="fused-btn-next-weight" type="button" aria-label="Menos 5 kg" disabled={nextSetWeight <= 0} onclick={() => nextSetWeight = Math.max(0, +(nextSetWeight - 5).toFixed(1))}>−5</button>
            <input
              type="text"
              class="fused-next-weight-input"
              inputmode="decimal"
              pattern="[0-9.]*"
              value={nextSetWeight || ''}
              oninput={(e) => { const v = (e.target as HTMLInputElement).value.replace(',', '.').replace(/[^0-9.]/g, ''); nextSetWeight = v === '' ? 0 : parseFloat(v) || 0 }}
              onfocus={(e) => (e.target as HTMLInputElement).select()}
              aria-label="Peso próxima serie en kg"
            />
            <button class="fused-btn-next-weight" type="button" aria-label="Más 5 kg" onclick={() => nextSetWeight = +(nextSetWeight + 5).toFixed(1)}>+5</button>
          </div>
          <div class="fused-next-reps-group">
            <label class="fused-next-reps-label">Reps</label>
            <div class="fused-next-reps-stepper">
              <button class="fused-btn-next-reps" type="button" aria-label="Menos rep" disabled={nextSetReps <= 0} onclick={() => nextSetReps = Math.max(0, nextSetReps - 1)}>−</button>
              <input
                type="number"
                class="fused-next-reps-input"
                inputmode="numeric"
                min="0"
                value={nextSetReps || ''}
                oninput={(e) => { const v = (e.target as HTMLInputElement).value; nextSetReps = v === '' ? 0 : parseInt(v) || 0 }}
                onfocus={(e) => (e.target as HTMLInputElement).select()}
                aria-label="Repeticiones próxima serie"
              />
              <button class="fused-btn-next-reps" type="button" aria-label="Más rep" onclick={() => nextSetReps = nextSetReps + 1}>+</button>
            </div>
          </div>
        </div>
      </section>

      {#if reviewEntries.length > 0}
        <section class="fused-saved-log">
          {#each reviewEntries.slice(-1) as entry (entry)}
            <div class="fused-saved-entry">
              <svg class="fused-check" width="16" height="12" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="fused-saved-text">Serie {currentSetIndex - 1} guardada · {formatWeight(entry.weight)} {units} × {entry.reps}</span>
              <button class="fused-change-btn" type="button" onclick={goBackToLogging}>Cambiar</button>
            </div>
          {/each}
        </section>
      {/if}

      <button class="fused-main-btn" type="button" onclick={startNextSetFromFused} disabled={nextSetWeight <= 0}>
        <span class="fused-btn-text">Empezar serie {currentSetIndex}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6l6 6-6 6"/></svg>
      </button>
    </div>
  {/if}
{/snippet}

{#snippet position()}
  {#if positionLabel}{posParts.lead}<b>{posParts.bold}</b>{/if}
{/snippet}

{#snippet dock()}
  {#if tab === 'alternatives'}
    <LogDock layout="search">
      <SearchInput value={query} placeholder="Buscar otro ejercicio" oninput={(v) => (query = v)} />
    </LogDock>
  {:else if registered}
    <LogDock caption={dockCaption()} layout="even">
      <Button variant="secondary" size="lg" disabled={!hasNext} onclick={() => onNavigate?.('next')}>
        <span class="one-line">Siguiente</span><Icon name="chev" size={18} />
      </Button>
      <Button variant="primary" size="lg" {accent} onclick={handleIniciar}>
        <Icon name="timer" size={18} /><span class="one-line">Descansar <span class="mono">{restText}</span></span>
      </Button>
    </LogDock>
  {:else}
    <LogDock caption={dockCaption()} layout="timer">
      <Button variant="secondary" size="lg" ariaLabel="Iniciar descanso" onclick={handleIniciar}>
        <Icon name="timer" size={18} /><span class="mono">{restText}</span>
      </Button>
      <Button variant="primary" size="lg" {accent} disabled={!canRegister} onclick={handleSave}>
        <span class="one-line">{registerLabel}</span>
      </Button>
    </LogDock>
  {/if}
{/snippet}

{#snippet overlay()}
  {#if chatOpen}
    <ExerciseCoachChat {exercise} {accent} onclose={() => (chatOpen = false)} />
  {/if}
{/snippet}

{#if open}
  <DetailSheet name="ExerciseDetail" onclose={close} {position} {dock} {overlay} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
    {#if setLoggingMode !== 'off'}
      {@render fusedModeContent()}
    {:else}
      <ExerciseMedia imgUrl={exercise.imgUrl} gifUrl={exercise.gifUrl} searchName={displayName} />
      <TitleNav name={displayName} muscle={muscleLabel(exercise.muscle)} {hasPrev} {hasNext} onprev={() => onNavigate?.('prev')} onnext={() => onNavigate?.('next')} />
      {#if exercise.sets > 0}
        <TargetPanel sets={exercise.sets} reps={exercise.reps} rest={restText} />
      {/if}
      <DetailRow variant="ai" label={$online ? 'Pregúntale al coach' : 'El coach necesita internet'} disabled={!$online} onclick={() => (chatOpen = true)} />
      <DebugAIToggle label="Exercise Coach IA" {accent} />
      <SegmentedControl
        size="tabs"
        options={[
          { label: 'Registrar', value: 'workout' },
          { label: 'Historial', value: 'history' },
          ...(showAlternativesTab ? [{ label: 'Alternativas', value: 'alternatives' }] : [])
        ]}
        bind:value={tab}
      />

      {#if tab === 'workout'}
        {#if firstTime && !loggedToday}
          <div class="first">
            <b>Tu primera vez con {displayName}</b>
            <p>Elige un peso con el que hagas {exercise.reps} repeticiones limpias. Lo puedes cambiar la próxima vez.</p>
          </div>
        {/if}
        {#if advanced}
          <BlocksPanel bind:blocks {units} saved={registered} onsingle={exitBlocks} />
        {:else}
          <WeightPanel bind:weight={pendingWeight} {units} lastWeight={lastPastWeight} sets={exercise.sets} saved={registered} {savedSets} {isRecord} onblocks={enterBlocks} />
        {/if}
      {:else if tab === 'history'}
        <ProgressHero logs={exercise.logs || []} {units} today={todayStr} exerciseName={displayName} />
      {:else if tab === 'alternatives'}
        <AlternativesTab
          alternatives={exercise.alternatives || []}
          {query}
          language={$settings.language}
          {isSwapped}
          originalName={exercise.originalExerciseName || ''}
          currentName={exercise.name}
          onSelect={selectAlternative}
          onRevert={revertAlternative}
          onClearQuery={() => (query = '')}
        />
      {/if}
    {/if}
  </DetailSheet>
{/if}

<style>
  .first { display: flex; flex-direction: column; gap: 6px; padding: 18px; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  .first b { font-size: 17px; letter-spacing: -0.2px; }
  .first p { font-size: 14px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }

  /* ── Modo serie fusionado ── */
  .fused-logging { display: flex; flex-direction: column; gap: 16px; padding: 0 20px 140px; }
  .fused-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding-top: 8px; }
  .fused-ex-info { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .fused-thumb { width: 48px; height: 48px; border-radius: var(--radius-lg); object-fit: cover; background: var(--cv-fill-2); flex-shrink: 0; }
  .fused-thumb.placeholder { display: grid; place-items: center; color: var(--text-tertiary); }
  .fused-ex-meta { min-width: 0; }
  .fused-ex-name { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .fused-last { font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
  .fused-last b { font-family: var(--font-mono); font-weight: 500; color: var(--text-secondary); }
  .fused-chips { display: flex; gap: 8px; flex-shrink: 0; }
  .fused-chip { height: 32px; padding: 0 12px; border-radius: var(--radius-full); border: 0.5px solid var(--border); background: var(--cv-fill-2); font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
  .fused-chip:active { transform: scale(0.95); }
  .fused-chip.coach { border-color: var(--accent); background: rgba(212, 255, 58, 0.12); color: var(--accent); }
  .fused-progress { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px 0 4px; }
  .fused-progress-label { font-size: 13px; color: var(--text-tertiary); }
  .fused-progress-label b { color: var(--text); font-weight: 600; }
  .fused-dots { display: flex; gap: 10px; }
  .fused-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--border); transition: all 0.2s; }
  .fused-dot.done { background: var(--accent); }
  .fused-dot.current { background: var(--text); box-shadow: 0 0 0 3px var(--bg), 0 0 0 5px var(--accent); }
  .fused-inputs { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
  .fused-weight-group { display: flex; flex-direction: column; gap: 8px; }
  .fused-weight-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .fused-weight-stepper { display: grid; grid-template-columns: 72px minmax(0, 1fr) 72px; align-items: center; gap: 12px; }
  .fused-btn-weight { width: 72px; height: 72px; border-radius: 22px; border: 0; background: var(--cv-fill-3); color: var(--text); font-family: var(--font-mono); font-size: 20px; font-weight: 500; display: grid; place-items: center; cursor: pointer; touch-action: manipulation; }
  .fused-btn-weight:disabled { opacity: 0.3; cursor: default; }
  .fused-weight-input { text-align: center; border: 0; background: none; outline: none; padding: 0; color: var(--text); caret-color: var(--accent); font-family: var(--font-mono); font-size: 56px; font-weight: 500; letter-spacing: -0.06em; line-height: 1; width: 100%; min-width: 0; }
  .fused-weight-input::placeholder { color: var(--text-muted); }
  .fused-reps-group { display: flex; flex-direction: column; gap: 8px; }
  .fused-reps-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .fused-reps-stepper { display: flex; align-items: center; justify-content: center; gap: 12px; }
  .fused-btn-reps { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--cv-fill-3); color: var(--text); font-family: var(--font-sans); font-size: 22px; display: grid; place-items: center; cursor: pointer; touch-action: manipulation; }
  .fused-btn-reps:disabled { opacity: 0.3; cursor: default; }
  .fused-reps-input { text-align: center; border: 0; background: none; outline: none; padding: 0; color: var(--text); caret-color: var(--accent); font-family: var(--font-mono); font-size: 24px; font-weight: 500; width: 56px; }
  .fused-main-btn { position: fixed; left: 20px; right: 20px; bottom: calc(env(safe-area-inset-bottom, 0px) + 20px); height: 56px; border-radius: var(--radius-xl); border: 0; background: var(--accent); color: var(--bg); font-family: var(--font-sans); font-size: 17px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; z-index: 50; box-shadow: 0 8px 24px rgba(212, 255, 58, 0.3); }
  .fused-main-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
  .fused-main-btn:active { transform: scale(0.98); }

  .fused-resting { display: flex; flex-direction: column; gap: 20px; padding: 0 20px 140px; min-height: 100%; }
  .fused-timer-section { display: flex; flex-direction: column; align-items: center; gap: 12px; }
  .fused-timer-wrap { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .fused-ring-container { position: relative; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; }
  .fused-ring { width: 220px; height: 220px; transform: rotate(-90deg); }
  .fused-ring-track { fill: none; stroke: var(--border); stroke-width: 12; }
  .fused-ring-prog { fill: none; stroke: var(--accent); stroke-width: 12; stroke-linecap: round; transition: stroke-dashoffset 0.5s linear; }
  .fused-ring-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; pointer-events: none; }
  .fused-timer-time { font-family: var(--font-mono); font-size: 52px; font-weight: 500; letter-spacing: -0.04em; color: var(--text); line-height: 1; }
  .fused-timer-sub { font-size: 14px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
  .fused-nudge-minus, .fused-nudge-plus { position: absolute; top: 50%; transform: translateY(-50%); width: 52px; height: 52px; border-radius: 50%; border: 0.5px solid var(--border); background: var(--cv-fill-2); color: var(--text-secondary); font-family: var(--font-mono); font-size: 11px; font-weight: 500; display: grid; place-items: center; cursor: pointer; touch-action: manipulation; z-index: 10; }
  .fused-nudge-minus { left: -66px; }
  .fused-nudge-plus { right: -66px; }
  .fused-nudge-minus:active, .fused-nudge-plus:active { transform: translateY(-50%) scale(0.92); }
  .fused-next-ex { font-size: 13px; color: var(--text-tertiary); text-align: center; max-width: 280px; }

  .fused-next-set-inputs { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
  .fused-next-weight-group { display: flex; flex-direction: column; gap: 8px; }
  .fused-next-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .fused-next-weight-stepper { display: grid; grid-template-columns: 56px minmax(0, 60px) 56px; align-items: center; gap: 8px; justify-content: center; }
  .fused-btn-next-weight { width: 56px; height: 56px; border-radius: 50%; border: 0; background: var(--cv-fill-3); color: var(--text); font-family: var(--font-mono); font-size: 18px; font-weight: 500; display: grid; place-items: center; cursor: pointer; touch-action: manipulation; }
  .fused-btn-next-weight:disabled { opacity: 0.3; cursor: default; }
  .fused-next-weight-input { text-align: center; border: 0; background: none; outline: none; padding: 0; color: var(--text); caret-color: var(--accent); font-family: var(--font-mono); font-size: 28px; font-weight: 500; width: 60px; }
  .fused-next-reps-group { display: flex; flex-direction: column; gap: 8px; }
  .fused-next-reps-label { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .fused-next-reps-stepper { display: flex; align-items: center; justify-content: center; gap: 8px; }
  .fused-btn-next-reps { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--cv-fill-3); color: var(--text); font-family: var(--font-sans); font-size: 22px; display: grid; place-items: center; cursor: pointer; touch-action: manipulation; }
  .fused-btn-next-reps:disabled { opacity: 0.3; cursor: default; }
  .fused-next-reps-input { text-align: center; border: 0; background: none; outline: none; padding: 0; color: var(--text); caret-color: var(--accent); font-family: var(--font-mono); font-size: 24px; font-weight: 500; width: 44px; }

  .fused-saved-log { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
  .fused-saved-entry { display: flex; align-items: center; gap: 10px; padding: 12px 14px; border-radius: var(--radius-lg); background: var(--cv-fill-1); border: 0.5px solid var(--border); }
  .fused-check { flex-shrink: 0; color: var(--accent); }
  .fused-saved-text { flex: 1; font-size: 14px; color: var(--text-secondary); font-family: var(--font-mono); }
  .fused-saved-text b { font-weight: 500; color: var(--text); }
  .fused-change-btn { height: 32px; padding: 0 12px; border-radius: var(--radius-full); border: 0.5px solid var(--border); background: var(--cv-fill-2); font-family: var(--font-sans); font-size: 12px; font-weight: 500; color: var(--text-secondary); cursor: pointer; }
  .fused-change-btn:active { transform: scale(0.95); }

  @media (max-width: 380px) {
    .fused-nudge-minus { left: -58px; width: 48px; height: 48px; }
    .fused-nudge-plus { right: -58px; width: 48px; height: 48px; }
    .fused-ring-container { width: 200px; height: 200px; }
    .fused-ring { width: 200px; height: 200px; }
  }
</style>
