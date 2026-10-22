<script lang="ts">
  import { logWeight, getSettings, findOrCreateExerciseByName, swapExerciseForToday, revertExerciseSwapForToday } from '$lib/storage'
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
  let prevMax = $derived(pastLogs.length ? Math.max(...pastLogs.map(l => l.weight)) : 0)
  let firstTime = $derived(!(exercise.logs || []).some(l => l.weight > 0))

  let tab = $state<'workout' | 'history' | 'alternatives'>('workout')
  let pendingWeight = $state(0)
  let loggedToday = $state(false)
  let iniciarLoading = false
  let chatOpen = $state(false)
  let query = $state('')

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
{/snippet}

{#if open}
  <DetailSheet name="ExerciseDetail" onclose={close} {position} {dock} {overlay} ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
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
  </DetailSheet>
{/if}

<style>
  .first { display: flex; flex-direction: column; gap: 6px; padding: 18px; border-radius: var(--radius-xl); background: var(--cv-fill-1); }
  .first b { font-size: 17px; letter-spacing: -0.2px; }
  .first p { font-size: 14px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
