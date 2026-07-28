<script lang="ts">
  import { logWeight, getSettings, saveSettings } from '$lib/storage'
  import { toast } from '$lib/stores/ui'
  import { parseRepsDefault } from '$lib/exercise-utils'
  import type { ExerciseLogBlock } from '$lib/types'
  import Sheet from './Sheet.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import CoachChat from './CoachChat.svelte'
  import ExerciseHero from './ExerciseHero.svelte'
  import WorkoutTab from './WorkoutTab.svelte'
  import HistoryTab from './HistoryTab.svelte'
  import Icon from './Icon.svelte'

  function getToday(): string {
    const d = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  interface Alternative {
    name: string
    reason: string
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
  }

  let {
    exercise,
    open,
    accent = 'var(--accent)',
    units = 'kg',
    hasPrev = false,
    hasNext = false,
    onNavigate = null,
    onClose = null,
    onLog = null,
    onStartRest = null
  }: {
    exercise: ExerciseDetail
    open: boolean
    accent?: string
    units?: string
    hasPrev?: boolean
    hasNext?: boolean
    onNavigate?: ((dir: 'prev' | 'next') => void) | null
    onClose?: (() => void) | null
    onLog?: (() => void) | null
    onStartRest?: ((data: any) => void) | null
  } = $props()

  let todayStr = $derived(getToday())
  let todayLog = $derived(exercise.logs?.find(l => l.date === todayStr) || null)
  let lastLog = $derived(exercise.logs?.length ? exercise.logs[exercise.logs.length - 1] : null)

  let tab = $state<'workout' | 'history'>('workout')
  let pendingWeight = $state(todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0))
  let loggedToday = $state(!!todayLog)
  let iniciarLoading = $state(false)
  let showGif = $state(true)

  let chatOpen = $state(false)

  function seedBlocks(): ExerciseLogBlock[] {
    if (todayLog?.blocks?.length) return todayLog.blocks.map(b => ({ ...b }))
    if (todayLog?.sets !== undefined && todayLog?.reps !== undefined) {
      return [{ sets: todayLog.sets, reps: parseRepsDefault(todayLog.reps), weight: todayLog.weight }]
    }
    return [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0) }]
  }

  let advanced = $state(!!todayLog?.blocks?.length)
  let blocks = $state<ExerciseLogBlock[]>(seedBlocks())
  let savedKey = $state<string | null>(advanced ? JSON.stringify(blocks) : (loggedToday ? String(pendingWeight) : null))

  let currentExerciseKey = $derived(exercise.exerciseId || exercise.id)
  $effect(() => {
    void currentExerciseKey
    const isBlockMode = !!todayLog?.blocks?.length
    const seededBlocks = seedBlocks()
    loggedToday = !!todayLog
    pendingWeight = todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0)
    advanced = isBlockMode
    blocks = seededBlocks
    savedKey = isBlockMode ? JSON.stringify(seededBlocks) : (loggedToday ? String(pendingWeight) : null)
  })

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

  let totalSets = $derived(blocks.reduce((a, b) => a + (b.sets || 0), 0))
  let topWeight = $derived(blocks.length ? Math.max(...blocks.map(b => b.weight)) : 0)
  let currentKey = $derived(advanced ? JSON.stringify(blocks) : String(pendingWeight))
  let isDirty = $derived(loggedToday && currentKey !== savedKey)
  let isLoggedState = $derived(loggedToday && !isDirty)

  async function handleSave() {
    if (advanced) {
      if (!blocks.length) return
      const top = blocks.reduce((best, b) => (b.weight > best.weight ? b : best), blocks[0])
      await logWeight(exercise.exerciseId || exercise.id, topWeight, units, totalSets, String(top.reps), undefined, blocks.map(b => ({ ...b })))
      pendingWeight = topWeight
      toast.show(`✅ ${blocks.length} bloque${blocks.length > 1 ? 's' : ''} · máx ${topWeight}${units} registrado`)
    } else {
      if (pendingWeight === 0) return
      await logWeight(exercise.exerciseId || exercise.id, pendingWeight, units)
      toast.show(`✅ ${pendingWeight}${units} registrado`)
    }
    savedKey = currentKey
    loggedToday = true
    onLog?.()

    const s = await getSettings()
    if (!s.onboarded && (s.onboardingStep ?? 0) <= 2) {
      await saveSettings({ ...s, onboardingStep: 3 })
    }
  }

  async function handleClear() {
    loggedToday = false
    pendingWeight = lastLog ? lastLog.weight : 0
    advanced = false
    blocks = [{ sets: exercise.sets, reps: parseRepsDefault(exercise.reps), weight: lastLog ? lastLog.weight : 0 }]
    savedKey = null
  }

  async function handleIniciar() {
    if (iniciarLoading) return
    iniciarLoading = true
    try {
      if (navigator.vibrate) navigator.vibrate(40)
      onStartRest?.({
        name: exercise.name,
        restSec: exercise.rest,
        tag: 'rest-' + Date.now(),
        sets: exercise.sets,
        reps: exercise.reps,
        exerciseId: exercise.exerciseId || exercise.id
      })
    } finally {
      iniciarLoading = false
    }
  }

  let allLogData = $derived(exercise.logs || [])
  let maxWeight = $derived(allLogData.length ? Math.max(...allLogData.map(l => l.weight)) : 0)
  let weightCount = $derived(allLogData.filter(l => l.weight > 0).length)
  let firstLog = $derived(allLogData.length ? allLogData[0] : null)
  let totalGain = $derived(firstLog && lastLog ? lastLog.weight - firstLog.weight : 0)
  let pctChange = $derived(firstLog ? ((totalGain / firstLog.weight) * 100).toFixed(1) : '0')
  let reversedLogs = $derived([...allLogData].reverse())
</script>

{#if open}
  <Sheet bind:open={open} onclose={close}>
    <div class="detail-scroll" data-component="ExerciseDetail" ontouchstart={onTouchStart} ontouchend={onTouchEnd}>
        <!-- Navigation pills -->
        <div class="nav-pills">
          <div class="nav-pill-row">
            <button class="pill-btn pill-prev" disabled={!hasPrev} onclick={() => onNavigate?.('prev')} aria-label="Anterior">
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M10 5H1m0 0l4-4M1 5l4 4" stroke={hasPrev ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="pill-label-col">
                <span class="pill-label">Anterior</span>
                <span class="pill-name">Anterior</span>
              </div>
            </button>
            <button class="iniciar-btn" style="background:{accent}" onclick={handleIniciar} disabled={iniciarLoading}>
              {#if iniciarLoading}
                <span class="iniciar-icon">⏳</span> Enviando...
              {:else}
                <span class="iniciar-icon">⚡</span> Iniciar
              {/if}
            </button>
            <button class="pill-btn pill-next" disabled={!hasNext} onclick={() => onNavigate?.('next')} aria-label="Siguiente">
              <div class="pill-label-col pill-label-col-end">
                <span class="pill-label">Siguiente</span>
                <span class="pill-name">Siguiente</span>
              </div>
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M1 5h9m0 0L6 1m4 4L6 9" stroke={hasNext ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Hero -->
        <ExerciseHero {exercise} {accent} {loggedToday} bind:showGif={showGif} />

        <!-- Prescription strip -->
        <div class="strip-wrap">
          <div class="strip-grid">
            <div class="strip-cell">
              <div class="strip-label">series</div>
              <div class="strip-value">{exercise.sets}</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">reps</div>
              <div class="strip-value">{exercise.reps}</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">desc.</div>
              <div class="strip-value">{exercise.rest}s</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">última</div>
              <div class="strip-value" style="color:{lastLog && lastLog.weight > 0 ? accent : '#fafafa'}">{lastLog && lastLog.weight > 0 ? `${lastLog.weight}${units}` : '—'}</div>
            </div>
          </div>
        </div>

        <!-- Tab selector -->
        <SegmentedControl
          options={[
            { label: 'Registrar', value: 'workout' },
            { label: 'Historial', value: 'history' }
          ]}
          bind:value={tab}
          {accent}
        />

        <!-- Workout tab -->
        {#if tab === 'workout'}
          <WorkoutTab
            {exercise}
            {accent}
            {units}
            {loggedToday}
            {isDirty}
            {isLoggedState}
            bind:pendingWeight
            bind:blocks
            bind:advanced
            onSave={handleSave}
            onClear={handleClear}
          />

        <!-- History tab -->
        {:else if tab === 'history'}
          <HistoryTab
            {allLogData}
            {reversedLogs}
            {maxWeight}
            {lastLog}
            {totalGain}
            {pctChange}
            {weightCount}
            {accent}
            {units}
            {todayStr}
          />
        {/if}
      </div>

      <!-- Coach FAB -->
      <button id="coach-fab" class="coach-fab" style="border-color:{accent}3a;background:{accent}1a;color:{accent}" onclick={() => chatOpen = true}>
        <Icon name="coach" size={17} />
        Coach IA
      </button>

    {#if chatOpen}
      <CoachChat {exercise} {accent} onclose={() => chatOpen = false} />
    {/if}
  </Sheet>
{/if}

<style>
  .detail-scroll {
    overflow-y: auto;
    color: var(--text);
    padding-bottom: 60px;
  }
  .nav-pills {
    padding: 10px 14px 0;
  }
  .nav-pill-row {
    display: flex;
    gap: 8px;
  }
  .pill-btn {
    flex: 1;
    min-width: 0;
    background: rgba(255,255,255,0.02);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
    cursor: pointer;
    color: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 9px;
    opacity: 1;
  }
  .pill-btn:disabled {
    cursor: default;
    opacity: 0.45;
  }
  .pill-prev {
    flex-direction: row;
  }
  .pill-next {
    flex-direction: row-reverse;
  }
  .pill-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pill-label-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .pill-label-col-end {
    align-items: flex-end;
  }
  .pill-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    font-weight: 600;
    line-height: 1;
  }
  .pill-name {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.75);
    letter-spacing: -0.1px;
    line-height: 1.25;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pill-btn:disabled .pill-label,
  .pill-btn:disabled .pill-name {
    color: rgba(255,255,255,0.3);
  }
  .iniciar-btn {
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.1px;
    touch-action: manipulation;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .iniciar-btn:disabled {
    background: var(--border-medium);
    cursor: default;
    opacity: 0.5;
  }
  .iniciar-icon {
    font-size: 15px;
    line-height: 1;
  }
  .strip-wrap {
    padding: 14px 20px 0;
  }
  .strip-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--surface);
    border-radius: 14px;
    border: 0.5px solid var(--border);
    overflow: hidden;
  }
  .strip-cell {
    padding: 11px 6px;
    text-align: center;
    border-right: 0.5px solid rgba(255,255,255,0.05);
  }
  .strip-cell:last-child {
    border-right: none;
  }
  .strip-label {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
  }
  .strip-value {
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1;
  }

  /* Coach FAB */
  .coach-fab {
    position: absolute;
    bottom: 14px;
    left: 14px;
    padding: 0 16px 0 13px;
    height: 40px;
    border-radius: 9999px;
    border: 0.5px solid;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    z-index: 200;
    font-family: var(--font-sans);
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }

</style>
