<script lang="ts">
  import { logWeight, getSettings, findOrCreateExerciseByName, swapExerciseForToday, revertExerciseSwapForToday } from '$lib/storage'
  import { toast, restMinimized, seriesConfirmed } from '$lib/stores/ui'
  import { restBannerState, cancelRestTimer } from '$lib/rest-timer'
  import { settings } from '$lib/stores/settings'
  import { online } from '$lib/stores/network'
  import { tick } from 'svelte'
  import { parseRepsDefault, muscleLabel } from '$lib/exercise-utils'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { formatWeight } from '$lib/exercise-history'
  import { restClock } from '$lib/session-steps'
  import { persistSets, expandBlocks, type SetEntry } from '$lib/set-log'
  import { getAutoFilledSets } from '$lib/series-mode'
  import { plural } from '$lib/program-utils'
  import type { ExerciseLogBlock } from '$lib/types'
  import SeriesConfirmSheet from './SeriesConfirmSheet.svelte'
  import DetailSheet from './DetailSheet.svelte'
  import ExerciseMedia from './ExerciseMedia.svelte'
  import TitleNav from './TitleNav.svelte'
  import TargetPanel from './TargetPanel.svelte'
  import DetailRow from './DetailRow.svelte'
  import LogDock from './LogDock.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import WeightPanel from './WeightPanel.svelte'
  import LoggedPanel from './LoggedPanel.svelte'
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
    onRevert = null,
    onFinish = null
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
    /** Given once every exercise is done: the last one's «Siguiente» becomes «Terminar entrenamiento» */
    onFinish?: (() => void) | null
  } = $props()

  let todayStr = $derived(getToday())
  let todayLog = $derived(exercise.logs?.find(l => l.date === todayStr) || null)
  let pastLogs = $derived((exercise.logs || []).filter(l => l.date !== todayStr && l.weight > 0))
  let lastLog = $derived(exercise.logs?.length ? exercise.logs[exercise.logs.length - 1] : null)
  let lastPastWeight = $derived(pastLogs.length ? pastLogs[pastLogs.length - 1].weight : 0)
  let firstTime = $derived(!(exercise.logs || []).some(l => l.weight > 0))

  let tab = $state<'workout' | 'history' | 'alternatives'>('workout')
  let pendingWeight = $state(0)
  let loggedToday = $state(false)
  let iniciarLoading = false
  let chatOpen = $state(false)
  // «Cómo se hace»: the exercise's own steps (its tips), folded until tapped
  let howOpen = $state(false)
  let howSteps = $derived((exercise.tips || []).map(t => t.trim()).filter(Boolean))
  let query = $state('')

  // Today's sets as registered: the read-only «Registrado hoy», changed only
  // through «Confirma tus series» (the timer's screen)
  let loggedSets = $state<SetEntry[]>([])
  let setsOpen = $state(false)
  let setsSeed = $state<SetEntry[]>([])

  let currentExerciseKey = $derived(exercise.exerciseId || exercise.id)
  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
  let isSwapped = $derived(!!exercise.originalExerciseId && exercise.originalExerciseId !== currentExerciseKey)
  // The alternatives tab shows when the exercise has curated alternatives, and
  // stays while swapped even if the swapped-in one has none: it's the way back.
  let showAlternativesTab = $derived(((exercise.alternatives?.length ?? 0) > 0) || isSwapped)

  $effect(() => {
    void currentExerciseKey
    loggedToday = !!todayLog
    pendingWeight = todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0)
    loggedSets = setsOfLog(todayLog)
    if (tab === 'alternatives' && !showAlternativesTab) tab = 'workout'
  })

  let registered = $derived(loggedToday)
  let topWeight = $derived(loggedSets.reduce((m, s) => Math.max(m, s.weight), 0))
  let prevBest = $derived(pastLogs.reduce<ExerciseLog | null>((b, l) => (!b || l.weight > b.weight ? l : b), null))
  let recordIdx = $derived(prevBest && topWeight > prevBest.weight ? loggedSets.findIndex(s => s.weight === topWeight) : -1)
  let restText = $derived(restClock(exercise.rest))
  let canRegister = $derived(pendingWeight > 0)
  let registerLabel = $derived(`Registrar ${formatWeight(pendingWeight)} ${units}`)
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
    if (firstTime) return 'Ajusta con − y +, luego registra'
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

  // A log's sets, one per row. A plain «75 kg» log (Registrar with one weight)
  // stores no reps: its sets are the plan's, at the prescribed reps.
  function setsOfLog(log: ExerciseLog | null): SetEntry[] {
    if (!log) return []
    if (log.blocks?.length) return expandBlocks(log.blocks)
    const reps = parseInt(String(log.reps ?? '').match(/\d+/)?.[0] || '0', 10) || parseRepsDefault(exercise.reps)
    const count = Math.max(1, Math.round(log.sets ?? (exercise.sets || 1)))
    return Array.from({ length: count }, () => ({ weight: log.weight, reps }))
  }

  // The best before, as the record strip says it: «82.5 × 8», or «82.5 kg»
  function beforeText(log: ExerciseLog | null): string {
    if (!log) return ''
    const top = log.blocks?.length ? log.blocks.reduce((b, x) => (x.weight > b.weight ? x : b)) : null
    const reps = top ? top.reps : parseInt(String(log.reps ?? '').match(/\d+/)?.[0] || '0', 10)
    return reps ? `${formatWeight(log.weight)} × ${reps}` : `${formatWeight(log.weight)} ${units}`
  }

  // Just saved: the sheet scrolls so the whole panel sits above the dock
  async function revealLogged() {
    await tick()
    document.querySelector('[data-component="LoggedPanel"]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  // Registrar writes today's single log and overwrites what was there.
  async function saveSingle() {
    if (pendingWeight === 0) return
    await logWeight(currentExerciseKey, pendingWeight, units)
    savedToast(`${formatWeight(pendingWeight)} ${units}`)
  }

  // Registrar is the last word on today's log: this exercise's rest (running or
  // at zero, minimized) ends first, or coming back to the app it would write
  // its own series over what was just registered.
  async function endOwnRest() {
    if (ownRest) await cancelRestTimer($restBannerState.tag)
  }

  async function handleSave() {
    if (!canRegister) return
    await endOwnRest()
    await saveSingle()
    loggedSets = setsOfLog({ weight: pendingWeight } as ExerciseLog)
    loggedToday = true
    revealLogged()
    await afterRegister()
  }

  // What every registration does next: the list reloads, onboarding moves on
  async function afterRegister() {
    onLog?.()
    const currentSettings = await getSettings()
    if (!currentSettings.onboarded && (currentSettings.onboardingStep ?? 0) <= 2) {
      await settings.update({ onboardingStep: 3 })
    }
  }

  // «Series con pesos distintos» / «Editar series»: today's sets as logged,
  // else the plan at the weight on screen, up to the planned number of sets
  function openSets() {
    const logged = loggedToday ? loggedSets : []
    setsSeed = getAutoFilledSets(currentExerciseKey, exercise.sets || 1, exercise.reps, pendingWeight, logged).sets
    setsOpen = true
  }

  async function saveSets(sets: SetEntry[]) {
    await endOwnRest()
    await persistSets(currentExerciseKey, sets, units)
    // Until the list reloads, the detail shows what was just written
    loggedSets = sets.map(s => ({ ...s }))
    pendingWeight = Math.max(...sets.map(s => s.weight))
    loggedToday = true
    setsOpen = false
    savedToast(plural(sets.length, 'serie', 'series'))
    revealLogged()
    await afterRegister()
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

  // Another exercise starts with its steps folded
  $effect(() => {
    void currentExerciseKey
    howOpen = false
  })

  // The minimized rest banner over the bottom of the screen
  let restShown = $derived($restBannerState.visible && $restMinimized && $restBannerState.phase !== 'done')

  // A rest of this exercise already up (running or at zero, maybe minimized)
  let ownRest = $derived($restBannerState.visible && $restBannerState.exerciseId === currentExerciseKey)

  // «Confirma tus series» saved for this exercise: on to the next one
  $effect(() => {
    if ($seriesConfirmed !== currentExerciseKey) return
    seriesConfirmed.set(null)
    if (hasNext) onNavigate?.('next')
  })

  // The rest starts on the tap and the full-screen timer covers this sheet;
  // the guard only keeps a double tap from counting two sets. With this
  // exercise's rest already up, the button reopens it where it was.
  async function handleIniciar() {
    if (ownRest) { restMinimized.set(false); return }
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
      {#if !hasNext && onFinish}
        <Button variant="secondary" size="lg" onclick={onFinish}>
          <span class="one-line">Terminar entrenamiento</span><Icon name="chev" size={18} />
        </Button>
      {:else}
        <Button variant="secondary" size="lg" disabled={!hasNext} onclick={() => onNavigate?.('next')}>
          <span class="one-line">Siguiente</span><Icon name="chev" size={18} />
        </Button>
      {/if}
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
  {#if setsOpen}
    <div class="sets" class:above-rest={restShown} style="--rt:{accent}" role="dialog" aria-label="Confirma tus series">
      <SeriesConfirmSheet
        name={displayName}
        reps={exercise.reps}
        {units}
        entries={setsSeed}
        status="Registrar"
        origLabel={loggedToday ? 'antes' : 'sugerido'}
        onsave={saveSets}
        onclose={() => (setsOpen = false)}
      />
    </div>
  {/if}
{/snippet}

{#if open}
  <DetailSheet name="ExerciseDetail" onclose={close} {position} {dock} {overlay} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
    <ExerciseMedia imgUrl={exercise.imgUrl} gifUrl={exercise.gifUrl} searchName={displayName} />
    <TitleNav name={displayName} muscle={muscleLabel(exercise.muscle)} {hasPrev} {hasNext} onprev={() => onNavigate?.('prev')} onnext={() => onNavigate?.('next')} />
    {#if exercise.sets > 0}
      <TargetPanel sets={exercise.sets} reps={exercise.reps} rest={restText} />
    {/if}
    {#if howSteps.length}
      <DetailRow label="Cómo se hace" count={plural(howSteps.length, 'paso', 'pasos')} bind:open={howOpen}>
        <ol class="how">
          {#each howSteps as s, i}<li><span>{i + 1}</span>{s}</li>{/each}
        </ol>
      </DetailRow>
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
      {#if loggedToday}
        <LoggedPanel sets={loggedSets} {units} target={exercise.reps} {recordIdx} before={beforeText(prevBest)} onedit={openSets} />
      {:else}
        <WeightPanel bind:weight={pendingWeight} {units} lastWeight={lastPastWeight} sets={exercise.sets} onblocks={openSets} />
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
  </DetailSheet>
{/if}

<style>
  /* «Confirma tus series» over the whole detail, as the timer shows it */
  .sets {
    position: fixed; inset: 0; z-index: 10;
    display: flex; flex-direction: column;
    padding: calc(env(safe-area-inset-top, 0px) + 14px) 20px calc(env(safe-area-inset-bottom, 0px) + 26px);
    background: radial-gradient(120% 70% at 50% 0%, color-mix(in srgb, var(--rt) 9%, transparent), transparent 62%), var(--bg);
    font-family: var(--font-sans);
  }
  /* A minimized rest banner sits at the bottom: «Guardar» goes above it */
  .sets.above-rest { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 130px); }
  /* Numbers under the row's icon, so the text takes the full width */
  .how { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: -4px 0 -6px -40px; }
  .how li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; font-size: 14px; line-height: 1.4; color: var(--text-secondary); text-wrap: pretty; }
  .how li span { width: 24px; height: 24px; border-radius: 50%; background: var(--cv-fill-3); display: grid; place-items: center; font-family: var(--font-mono); font-size: 12px; color: var(--text); }
  .first { display: flex; flex-direction: column; gap: 6px; padding: 18px; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  .first b { font-size: 17px; letter-spacing: -0.2px; }
  .first p { font-size: 14px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
