<script lang="ts">
  import { resolvePanelItems } from '$lib/data/warmup-components'
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { base } from '$app/paths'
  import { onMount } from 'svelte'
  import * as Storage from '$lib/storage'
  import { settings } from '$lib/stores/settings'
  import { online } from '$lib/stores/network'
  import { restMinimized } from '$lib/stores/ui'
  import { getLogsForDate, recordGymSession, getWeeklyGymSeconds } from '$lib/storage'
  import { mondayOf } from '$lib/calendar-utils'
  import { startRestFromExercise, checkPendingRest, _checkRestTimer, restBannerState } from '$lib/rest-timer'
  import { SET_LOG_EVENT } from '$lib/set-log'
  import { runCoachAnalysis } from '$lib/coach-analysis'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { resolveWeekOrder } from '$lib/week-order'
  import { syncUserToWorker } from '$lib/push'
  import { PUSH_SERVER_URL } from '$lib/config'
  import {
    exerciseStatus, isTrainingDone, firstPending, sessionStage, sessionEyebrow, dayMuscles, formatClock,
    buildPhases, dockStep, detailPosition, nextInList,
    type SessionExercise, type PhaseKey, type DockTarget,
  } from '$lib/session-steps'
  import MovementSheet from '$lib/components/MovementSheet.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import PageHeader from '$lib/components/PageHeader.svelte'
  import SessionSteps from '$lib/components/SessionSteps.svelte'
  import NextStepDock from '$lib/components/NextStepDock.svelte'
  import SessionSummary from '$lib/components/SessionSummary.svelte'
  import StreakScreen from '$lib/components/StreakScreen.svelte'
  import EffortSheet from '$lib/components/EffortSheet.svelte'
  import FirstRunView from '$lib/components/FirstRunView.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import RestDayView from '$lib/components/RestDayView.svelte'
  import Button from '$lib/components/Button.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import CenterToast from '$lib/components/CenterToast.svelte'
  import type { Exercise, ExerciseLog, Program, ProgramDay, Settings } from '$lib/types'

  // Port literal del TOAST_SVG_WATCH del legacy (components/ui.js pre-migración)
  const WATCH_SVG = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none"><rect x="14" y="6" width="44" height="60" rx="13" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="20" y="16" width="32" height="30" rx="6" fill="currentColor" fill-opacity="0.06"/><circle cx="36" cy="30" r="5" fill="currentColor" fill-opacity="0.2"/><path d="M30 28h12v2H30z" fill="currentColor"/><path d="M30 32h8v2H30z" fill="currentColor" fill-opacity="0.5"/><circle cx="36" cy="54" r="3" fill="currentColor" fill-opacity="0.15"/><rect x="28" y="3" width="16" height="4" rx="2" fill="currentColor" fill-opacity="0.12"/></svg>`

  type CenterToastData = {
    imageSrc?: string
    iconSvg?: string
    message: string
    subtext?: string
    timeLabel?: string
    duration: number
  }

  type MoveMode = 'warmup' | 'stretch'

  let loaded = $state(false)
  let noProgram = $state(false)
  let program = $state<Program | null>(null)
  let weekIdx = $state(0)
  let weekObj: any = $state(null)
  let day: ProgramDay | null = $state(null)
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let todayLogs = $state<ExerciseLog[]>([])
  let todayExercises = $state<any[]>([])
  let todaySwapsMap = $state<Record<string, string>>({})
  let todayDate = $state('')
  let warmupItems = $state<any[]>([])
  let stretchItems = $state<any[]>([])

  let warmupDone = $state(false)
  let stretchDone = $state(false)
  let trainingCompleted = $state(false)
  let showCoach = $state(false)
  let warmupMarks = $state<number[]>([])
  let stretchMarks = $state<number[]>([])
  let startedAt = $state<number | null>(null)
  let endedAt = $state<number | null>(null)
  let completionToastShown = $state(false)
  let centerToast = $state<CenterToastData | null>(null)
  let nowMs = $state(Date.now())

  let moveSheet = $state<{ mode: MoveMode; startIdx: number } | null>(null)
  let showDetail = $state(false)
  let detailIdx = $state(0)

  let streakModalShow = $state(false)
  let streakCount = $state(0)
  let effortModalShow = $state(false)
  let effortValue = $state<string | null>(null)
  let coachCardMode = $state(false)
  let coachLoading = $state(false)
  let coachError = $state(false)
  let coachResult = $state<any>(null)

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')
  let isRestDay = $derived(isRestName((day as ProgramDay | null)?.name))
  let hasWarmup = $derived(warmupItems.length > 0)
  let hasStretch = $derived(stretchItems.length > 0)

  let statuses = $derived(todayExercises.map(ex => exerciseStatus(ex, todayLogFor(ex.exerciseId, todayLogs))))
  let trainingDone = $derived(isTrainingDone(statuses))
  let complete = $derived(showCoach || coachCardMode)
  let stage = $derived(sessionStage({
    warmupDone: warmupDone || !hasWarmup,
    trainingDone,
    trainingCompleted,
    stretchDone: stretchDone || !hasStretch,
    complete,
  }))
  let sessionExercises = $derived<SessionExercise[]>(todayExercises.map((ex, i) => toSessionExercise(ex, i)))
  let phases = $derived(buildPhases({
    stage,
    warmup: { moves: warmupItems, marks: warmupMarks, done: warmupDone },
    stretch: { moves: stretchItems, marks: stretchMarks, done: stretchDone },
    exercises: sessionExercises,
    units,
  }))
  let step = $derived(dockStep({
    stage,
    warmup: { moves: warmupItems, marks: warmupMarks },
    stretch: { moves: stretchItems, marks: stretchMarks },
    exercises: sessionExercises,
    firstEver: allLogs.length === 0,
    offline: !$online,
  }))
  let restShown = $derived($restBannerState.visible && $restMinimized)
  let clockRunning = $derived(!!startedAt && !endedAt)
  let clock = $derived(startedAt ? formatClock(nowMs - startedAt) : '')
  let sessionMinutes = $derived(durationMinutes())
  let eyebrow = $derived(complete
    ? `Hoy · terminado${sessionMinutes !== null ? ` en ${sessionMinutes} min` : ''}`
    : sessionEyebrow(todayDate, weekObj))

  function isRestName(name?: string): boolean {
    return !name || name === 'Rest' || name === 'Descanso'
  }

  function todayLogFor(exerciseId: string, logs: ExerciseLog[]): ExerciseLog | null {
    return logs.find(l => l.exerciseId === exerciseId) || null
  }

  function lastWeightBefore(logs: ExerciseLog[]): number {
    const past = logs.filter(l => l.date !== todayDate && l.weight > 0)
    return past.length ? past[past.length - 1].weight : 0
  }

  function toSessionExercise(ex: any, i: number): SessionExercise {
    const todayLog = todayLogFor(ex.exerciseId, todayLogs)
    return {
      name: getExerciseDisplayName(ex, $settings.language),
      muscle: ex.muscle,
      imgUrl: ex.imgUrl || resolveExerciseMedia(ex).imgUrl,
      sets: ex.sets,
      reps: ex.reps,
      status: statuses[i],
      todayWeight: todayLog?.weight || 0,
      lastWeight: lastWeightBefore(ex.logs || []),
    }
  }

  function durationMinutes(): number | null {
    if (startedAt && endedAt) return Math.max(1, Math.round((endedAt - startedAt) / 60000))
    const sec = coachResult?.sessionDurationSec
    return typeof sec === 'number' ? Math.max(1, Math.round(sec / 60)) : null
  }

  // originalExerciseId/originalExerciseName let ExerciseDetail's "Volver a B" action
  // know what to revert even once the slot is already showing D.
  function buildTodayExercises(currentDay: ProgramDay, currentExercises: Exercise[], currentLogs: ExerciseLog[]) {
    const byId = Object.fromEntries(currentExercises.map(e => [e.id, e]))
    return currentDay.exercises.map(ex => {
      const displayId = todaySwapsMap[ex.exerciseId] || ex.exerciseId
      return {
        ...ex,
        exerciseId: displayId,
        originalExerciseId: ex.exerciseId,
        originalExerciseName: byId[ex.exerciseId]?.name || '',
        ...(byId[displayId] || {}),
        logs: logsForExercise(displayId, currentLogs)
      }
    })
  }

  function logsForExercise(exerciseId: string, source: ExerciseLog[]): ExerciseLog[] {
    return source
      .filter(l => l.exerciseId === exerciseId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
  }

  async function refreshAfterSwap() {
    const [s, exs] = await Promise.all([Storage.getSettings(), Storage.getExercises()])
    todaySwapsMap = (s.todaySwaps && s.todaySwaps.date === todayDate) ? s.todaySwaps.swaps : {}
    exercises = exs
    if (day) todayExercises = buildTodayExercises(day, exercises, allLogs)
    loadTodayLogs()
  }

  async function refreshExerciseLogs() {
    allLogs = await Storage.getAllLogs()
    todayExercises = todayExercises.map(ex => ({ ...ex, logs: logsForExercise(ex.exerciseId, allLogs) }))
  }

  function toLocal(date: Date) {
    const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  onMount(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        checkPendingRest()
        _checkRestTimer()
      }
    }
    const onFocusCheck = () => {
      checkPendingRest()
      _checkRestTimer()
    }
    const onSWMessage = (e: MessageEvent) => {
      if (e.data?.type === 'rest-start') {
        checkPendingRest()
        _checkRestTimer()
      }
    }
    // The full-screen rest timer registers sets while it is on top of this
    // page, so it tells us when today's logs changed.
    const onSetLogged = () => onDetailLog()
    const tick = setInterval(() => (nowMs = Date.now()), 1000)

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocusCheck, { passive: true })
    navigator.serviceWorker?.addEventListener('message', onSWMessage)
    window.addEventListener(SET_LOG_EVENT, onSetLogged)

    loadSession()

    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocusCheck)
      navigator.serviceWorker?.removeEventListener('message', onSWMessage)
      window.removeEventListener(SET_LOG_EVENT, onSetLogged)
    }
  })

  async function loadSession() {
    const [exs, progs, logs, s] = await Promise.all([
      Storage.getExercises(),
      Storage.getPrograms(),
      Storage.getAllLogs(),
      Storage.getSettings()
    ])
    exercises = exs
    allLogs = logs
    program = progs.find(p => p.id === s.activeProgramId) || null
    weekIdx = s.currentWeekIdx || 0
    weekObj = program?.weeks?.[weekIdx]
    todayDate = toLocal(new Date())
    todaySwapsMap = (s.todaySwaps && s.todaySwaps.date === todayDate) ? s.todaySwaps.swaps : {}

    checkPendingRest()
    _checkRestTimer()

    if (!program && exercises.length === 0) {
      noProgram = true
      loaded = true
      return
    }
    if (!program || !weekObj) {
      loaded = true
      return
    }

    const order = resolveWeekOrder(
      weekObj,
      (s.rescheduleWeekOrder as Record<string, number[]> | undefined)?.[`${program.id}-week-${weekIdx}`]
    )
    const todayDay: ProgramDay | null = weekObj.days?.[order[(new Date().getDay() + 6) % 7]] || null
    day = todayDay
    if (!todayDay || isRestName(todayDay.name)) {
      loaded = true
      return
    }

    todayExercises = buildTodayExercises(todayDay, exs, logs)
    const muscles = todayExercises.map(ex => ex.muscle).filter(Boolean)
    warmupItems = resolvePanelItems(muscles, 'warmup')
    stretchItems = resolvePanelItems(muscles, 'stretch')
    restoreSession(s)
    await loadTodayLogs()
    loaded = true
  }

  function restoreSession(s: Settings) {
    const ss = s.sessionState
    if (ss?.date === todayDate) {
      const p = ss.phase || 1
      startedAt = ss.startedAt || null
      endedAt = ss.endedAt || null
      warmupMarks = ss.warmupMarks || []
      stretchMarks = ss.stretchMarks || []
      warmupDone = p >= 2
      trainingCompleted = p >= 3
      stretchDone = p >= 4
      showCoach = p >= 5
    }
    if (s.lastCoachAnalysis?.date === todayDate && s.lastCoachAnalysis?.weekIdx === weekIdx) {
      coachCardMode = true
      coachResult = s.lastCoachAnalysis
    }
  }

  async function loadTodayLogs() {
    todayLogs = await getLogsForDate(todayDate)
    const current = todayExercises.map(ex => exerciseStatus(ex, todayLogFor(ex.exerciseId, todayLogs)))
    if (current.some(st => st.state !== 'pending')) startSessionTimer()
    persistPhase()
    if (isTrainingDone(current) && !completionToastShown && !stretchDone && !showDetail) onTrainingDone()
  }

  // Session time stops when the exercises are done — stretching is not counted.
  function onTrainingDone() {
    completionToastShown = true
    if (!endedAt) endedAt = Date.now()
    persistPhase()
    if (!hasStretch) {
      finishSession()
      return
    }
    centerToast = {
      imageSrc: `${base}/images/pedro.png`,
      message: 'Estira bb',
      subtext: 'Ya no tienes 20 añitos',
      timeLabel: startedAt ? formatElapsed(startedAt, endedAt) : '',
      duration: 3000,
    }
  }

  function startSessionTimer() {
    if (startedAt) return
    startedAt = Date.now()
    persistPhase()
  }

  function formatElapsed(startMs: number, endMs: number): string {
    const sec = Math.max(0, Math.floor((endMs - startMs) / 1000))
    const mm = Math.floor(sec / 60)
    const ss = sec % 60
    return mm > 0 ? `${mm} min ${ss} seg` : `${ss} seg`
  }

  function currentPhaseNumber(): number {
    let p = 1
    if (warmupDone) p = 2
    if (trainingCompleted) p = 3
    if (stretchDone) p = 4
    if (showCoach) p = 5
    return p
  }

  function persistPhase() {
    if (!program || !todayDate) return
    const todayExDone = statuses.filter(st => st.state === 'done').length
    // Plain arrays: IndexedDB can't clone the $state proxies
    const sessionState = {
      date: todayDate, phase: currentPhaseNumber(), todayExDone, startedAt, endedAt,
      warmupMarks: [...warmupMarks], stretchMarks: [...stretchMarks],
    }
    // Merge onto what's stored, never onto the in-memory store: it can be stale
    // (e.g. missing todaySwaps) and would wipe today's alternative.
    settings.update({ sessionState } as any)
  }

  // ── Warmup / stretch sheet ──

  function openMoves(mode: MoveMode, idx: number) {
    startSessionTimer()
    moveSheet = { mode, startIdx: idx }
  }

  function markMove(mode: MoveMode, idx: number) {
    if (mode === 'warmup' && !warmupMarks.includes(idx)) warmupMarks = [...warmupMarks, idx]
    if (mode === 'stretch' && !stretchMarks.includes(idx)) stretchMarks = [...stretchMarks, idx]
    persistPhase()
  }

  function finishMoves(mode: MoveMode) {
    if (mode === 'warmup') onWarmupComplete()
    else onStretchComplete()
  }

  function onWarmupComplete() {
    warmupDone = true
    persistPhase()
    if ($settings.hasWatch) {
      centerToast = { iconSvg: WATCH_SVG, message: 'Inicia tu Smart Watch', duration: 2000 }
    }
  }

  function onStretchComplete() {
    stretchDone = true
    if (!endedAt) endedAt = Date.now()
    persistPhase()
  }

  function moveNextStep(mode: MoveMode) {
    if (mode === 'stretch') return { label: 'Terminar sesión', caption: 'Lo último de hoy' }
    const idx = firstPending(statuses)
    const caption = `Después: Entrenamiento · ${todayExercises.length} ${todayExercises.length === 1 ? 'ejercicio' : 'ejercicios'}`
    return { label: idx === -1 ? 'Listo' : `Empezar con ${sessionExercises[idx].name}`, caption }
  }

  function startAfterMoves(mode: MoveMode) {
    moveSheet = null
    if (mode === 'stretch') {
      finishSession()
      return
    }
    const idx = firstPending(statuses)
    if (idx !== -1) openExerciseDetailAt(idx)
  }

  // ── Exercise detail ──

  function openExerciseDetailAt(idx: number) {
    if (todayExercises.length === 0) return
    startSessionTimer()
    detailIdx = idx
    showDetail = true
  }

  function onDetailClose() {
    showDetail = false
    loadTodayLogs()
  }

  function onDetailLog() {
    loadTodayLogs()
    refreshExerciseLogs()
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < todayExercises.length - 1) detailIdx++
    else if (dir === 'prev' && detailIdx > 0) detailIdx--
  }

  // ── Dock and rows ──

  function goToStep(target: DockTarget) {
    if (target.kind === 'finish') {
      if (stage === 'training_done') {
        trainingCompleted = true
        persistPhase()
      } else {
        finishSession()
      }
    } else if (target.kind === 'exercise') openExerciseDetailAt(target.idx)
    else openMoves(target.kind, target.idx)
  }

  function onRow(key: PhaseKey, idx: number) {
    if (key === 'training') openExerciseDetailAt(idx)
    else openMoves(key, idx)
  }

  // ── End of the session ──

  function finishSession() {
    showCoach = true
    if (!endedAt) endedAt = Date.now()
    persistPhase()
    showEffortAfterStreak()
  }

  async function showEffortAfterStreak() {
    const s = await Storage.getSettings()
    if (s.streakShownDate !== todayDate) {
      streakCount = Math.max(1, await computeStreak(todayDate))
      streakModalShow = true
    } else {
      effortModalShow = true
    }
    // Session just completed: record today's gym time (startedAt → endedAt) into
    // the weekly accumulator, then push fresh streak + weekly gym time to friends.
    if (startedAt && endedAt) {
      await recordGymSession(todayDate, Math.max(0, Math.round((endedAt - startedAt) / 1000)))
    }
    if (PUSH_SERVER_URL && s.username) {
      const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
      const streak = await computeStreak(todayDate)
      const exercisedToday = all.some(l => l.date === todayDate && l.weight > 0)
      const gymTime = await getWeeklyGymSeconds(mondayOf(todayDate))
      syncUserToWorker(s.username, streak, exercisedToday, gymTime).catch(() => {})
    }
  }

  function onStreakDone() {
    streakModalShow = false
    Storage.saveSettings({ ...$settings, streakShownDate: todayDate } as Settings).then(() => {
      settings.update({ streakShownDate: todayDate } as any)
    })
    effortModalShow = true
  }

  async function onEffort(effort: string) {
    effortModalShow = false
    effortValue = effort
    coachLoading = true
    coachCardMode = true
    coachError = false
    coachResult = null
    try {
      const result = await runCoachAnalysis(day!, effort, exercises, todayDate, weekIdx, trainingDaysPerWeek(program, weekIdx))
      coachLoading = false
      if (!result) {
        coachError = true
        return
      }
      const analysis = {
        ...result,
        date: todayDate,
        effort,
        weekIdx,
        sessionDurationSec: startedAt ? Math.round(((endedAt ?? Date.now()) - startedAt) / 1000) : undefined,
      }
      await Storage.saveCoachAnalysis(analysis)
      settings.update({ lastCoachAnalysis: analysis } as any)
      coachResult = analysis
    } catch {
      coachLoading = false
      coachError = true
    }
  }

  function resetDay() {
    coachCardMode = false
    coachLoading = false
    coachResult = null
    coachError = false
    effortValue = null
    warmupDone = false
    trainingCompleted = false
    stretchDone = false
    showCoach = false
    warmupMarks = []
    stretchMarks = []
    moveSheet = null
    startedAt = null
    endedAt = null
    completionToastShown = false
    centerToast = null
    const s = { ...$settings }
    delete s.lastCoachAnalysis
    s.sessionState = null
    Storage.saveSettings(s)
    settings.update({ lastCoachAnalysis: null, sessionState: null } as any)
  }

  async function computeStreak(todayDateStr: string) {
    const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
    return computeStreakWeeks(all, trainingDaysPerWeek(program, weekIdx), todayDateStr)
  }
</script>

<div class="screen" id="today">
  {#if !loaded}
    <EmptyState message="Cargando..." />
  {:else if noProgram}
    <FirstRunView />
  {:else if isRestDay}
    <RestDayView {weekObj} {weekIdx} />
  {:else if day}
    <PageHeader {eyebrow} title="{day.name}." sub={dayMuscles(todayExercises)}>
      {#snippet action()}
        {#if clockRunning}
          <div class="clock" data-component="SessionClock"><b>{clock}</b><span>en sesión</span></div>
        {/if}
      {/snippet}
    </PageHeader>

    {#if complete}
      <SessionSummary
        analysis={coachResult}
        loading={coachLoading}
        error={coachError}
        minutes={sessionMinutes}
        {units}
        onask={() => (effortModalShow = true)}
        onreset={resetDay}
      />
    {:else}
      <SessionSteps {phases} onrow={onRow} />
    {/if}

    {#if step && !restShown}
      <NextStepDock caption={step.caption}>
        <Button variant="primary" size="lg" {accent} onclick={() => goToStep(step.target)}>
          <span class="one-line">{step.label}</span><Icon name="arrow" size={18} />
        </Button>
      </NextStepDock>
    {/if}
  {/if}

  <div class="footer-bar">
    <Button variant="ghost" onclick={() => location.reload()}>↻</Button>
  </div>
</div>

{#if moveSheet}
  {@const mode = moveSheet.mode}
  <MovementSheet
    items={mode === 'warmup' ? warmupItems : stretchItems}
    {mode}
    startIdx={moveSheet.startIdx}
    marks={mode === 'warmup' ? warmupMarks : stretchMarks}
    nextStep={moveNextStep(mode)}
    onMark={(idx) => markMove(mode, idx)}
    onFinish={() => finishMoves(mode)}
    onStartNext={() => startAfterMoves(mode)}
    onClose={() => (moveSheet = null)}
  />
{/if}

{#if showDetail && todayExercises.length > 0}
  <ExerciseDetail
    exercise={todayExercises[detailIdx]}
    open={showDetail}
    {accent}
    {units}
    hasPrev={detailIdx > 0}
    hasNext={detailIdx < todayExercises.length - 1}
    positionLabel={detailPosition(day?.name || '', detailIdx, todayExercises.length)}
    nextExercise={nextInList(todayExercises, detailIdx)}
    isToday={true}
    onNavigate={onDetailNavigate}
    onClose={onDetailClose}
    onLog={onDetailLog}
    onStartRest={startRestFromExercise}
    onSwap={refreshAfterSwap}
    onRevert={refreshAfterSwap}
  />
{/if}

<EffortSheet bind:open={effortModalShow} onselect={onEffort} onskip={() => (effortModalShow = false)} />

{#if streakModalShow}
  <StreakScreen count={streakCount} oncontinue={onStreakDone} />
{/if}

{#if centerToast}
  <CenterToast
    imageSrc={centerToast.imageSrc}
    iconSvg={centerToast.iconSvg}
    message={centerToast.message}
    subtext={centerToast.subtext}
    timeLabel={centerToast.timeLabel}
    duration={centerToast.duration}
    {accent}
    onclose={() => centerToast = null}
  />
{/if}

<style>
  #today { padding: calc(var(--safe-top) + 56px) 20px 104px; display: flex; flex-direction: column; gap: 28px; }
  /* The day's name stays on one line; a long one ends in «…» */
  #today :global(.page-header-title) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #today :global(.page-header-eyebrow) { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .clock { text-align: right; padding-bottom: 26px; flex-shrink: 0; }
  .clock b { display: block; font-family: var(--font-mono); font-size: 22px; font-weight: 500; letter-spacing: -0.04em; }
  .clock span { font-size: 12px; color: var(--text-tertiary); }
  .footer-bar { display: flex; justify-content: flex-end; }
  :global(.one-line) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
