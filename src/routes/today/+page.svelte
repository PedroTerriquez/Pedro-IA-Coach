<script lang="ts">
  import { resolvePanelItems } from '$lib/data/warmup-components'
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { base } from '$app/paths'
  import { onMount, untrack } from 'svelte'
  import * as Storage from '$lib/storage'
  import { settings } from '$lib/stores/settings'
  import { online } from '$lib/stores/network'
  import { restMinimized, toast } from '$lib/stores/ui'
  import { getLogsForDate, recordGymSession, getWeeklyGymSeconds } from '$lib/storage'
  import { mondayOf } from '$lib/calendar-utils'
  import { startRestFromExercise, checkPendingRest, _checkRestTimer, restBannerState } from '$lib/rest-timer'
  import { SET_LOG_EVENT } from '$lib/set-log'
  import { runCoachAnalysis } from '$lib/coach-analysis'
  import { computeStreakWeeks, trainingDaysPerWeek } from '$lib/streak'
  import { resolveWeekOrder } from '$lib/week-order'
  import { syncUserToWorker } from '$lib/push'
  import { uploadSnapshot } from '$lib/cloud'
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
  import IconButton from '$lib/components/IconButton.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import CenterToast from '$lib/components/CenterToast.svelte'
  import OpenSessionSheet from '$lib/components/OpenSessionSheet.svelte'
  import SessionClockSheet from '$lib/components/SessionClockSheet.svelte'
  import OtherActivityChip from '$lib/components/OtherActivityChip.svelte'
  import ActivityRow from '$lib/components/ActivityRow.svelte'
  import ActivitySheet from '$lib/components/ActivitySheet.svelte'
  import GymQuestionSheet from '$lib/components/GymQuestionSheet.svelte'
  import KcalSheet from '$lib/components/KcalSheet.svelte'
  import ActionToast from '$lib/components/ActionToast.svelte'
  import { activityName, activityDayMarks, activitiesForCoach, leagueWeekSeconds, num, totalMinutes, type ActivityDraft } from '$lib/activities'
  import { weekDays } from '$lib/league'
  import { fixedSlots, shiftPending, slotDay, isRestDay as isRestSlot, nextWorkout } from '$lib/plan-week'
  import { WEEKDAY_NAMES } from '$lib/program-utils'
  import {
    isIdle, isStale, idleEnd, idleSeconds, idleMinutes, clockTime, staleEyebrow, lastActivity,
    lastWeightBefore as lastWeightOn, leagueSeconds, type PendingExercise,
  } from '$lib/session-idle'
  import { armIdleReminder, cancelIdleReminder } from '$lib/session-reminder'
  import type { Activity, Exercise, ExerciseLog, Program, ProgramDay, SessionState, Settings } from '$lib/types'

  // Pulse line: fits a watch, a phone or any workout app
  const PULSE_SVG = `<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 12h4l2.5-6 5 12 2.5-6h5"/></svg>`
  const WORKOUT_APP_TOAST = { iconSvg: PULSE_SVG, message: 'Si quieres, inicia tu reloj o app', subtext: 'Así este entreno también queda guardado ahí.', duration: 2000 }

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
  let lastActivityAt = $state<number | null>(null)
  let pausedAt = $state<number | null>(null)
  let clockSheetOpen = $state(false)
  // A session left open on an earlier day: its time is already saved, the
  // sheet only confirms what was left unregistered
  let staleSession = $state<SessionState | null>(null)
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

  // ── Other activities (Nuevo · Hoy actividades) ──
  let activities = $state<Activity[]>([])
  let gymKcal = $state(0)
  let activitySheet = $state<{ editing: Activity | null } | null>(null)
  let askAbout = $state<Activity | null>(null)
  let kcalSheet = $state<{ effort: string } | null>(null)
  let actionToast = $state<{ message: string; undo: () => void } | null>(null)
  let actionToastTimer: ReturnType<typeof setTimeout> | null = null
  // The week as Hoy reads it: today's slot, the program's own layout and today's
  // workout skipped with «Saltarlo esta semana»
  let weekOrder = $state<number[]>([])
  let naturalOrder = $state<number[]>([])
  let skipped = $state(false)

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
  // The banner only shows a running rest; one at zero, minimized, leaves the dock
  let restShown = $derived($restBannerState.visible && $restMinimized && $restBannerState.phase !== 'done')
  let liveSession = $derived<SessionState>({ date: todayDate, phase: 0, todayExDone: 0, startedAt, endedAt, lastActivityAt, pausedAt })
  // 45 min without activity: the clock freezes at the last activity + 3 min
  let idle = $derived(!complete && isIdle(liveSession, nowMs))
  let showIdleSheet = $derived(loaded && idle && !staleSession && !showDetail && !moveSheet)
  let clockRunning = $derived(!!startedAt && !endedAt)
  let clock = $derived(startedAt ? formatClock((pausedAt ?? (idle ? idleEnd(liveSession) : nowMs)) - startedAt) : '')
  let sessionMinutes = $derived(durationMinutes())
  let eyebrow = $derived(complete
    ? `Hoy · terminado${sessionMinutes !== null ? ` en ${sessionMinutes} min` : ''}`
    : sessionEyebrow(todayDate, weekObj))
  let todayIdx = $derived(todayDate ? weekdayIdx(todayDate) : 0)
  let restSub = $derived(restSubtitle())
  let activityMinutes = $derived(totalMinutes(activities))
  // Before the gym starts, the day's activities are the dock's news
  let dockCaption = $derived(step && activities.length && !startedAt && $online
    ? `${activityMinutes} min de actividad ya suman a tu semana`
    : step?.caption ?? '')

  function isRestName(name?: string): boolean {
    return !name || name === 'Rest' || name === 'Descanso'
  }

  function weekdayIdx(date: string): number {
    const [y, m, d] = date.split('-').map(Number)
    return (new Date(y, m - 1, d).getDay() + 6) % 7
  }

  // «Saltaste Empuje esta semana», «Empuje pasó a mañana» or «Mañana: Tirón»
  function restSubtitle(): string {
    if (skipped && day) return `Saltaste ${day.name} esta semana`
    const week = weekObj
    if (!week || !weekOrder.length) return ''
    const natural = slotDay(week, naturalOrder, todayIdx)
    if (!isRestSlot(natural)) {
      const to = weekOrder.indexOf(naturalOrder[todayIdx])
      if (to > todayIdx) return `${natural!.name} pasó ${to === todayIdx + 1 ? 'a mañana' : `al ${WEEKDAY_NAMES[to].toLowerCase()}`}`
    }
    const next = nextWorkout(week, weekOrder, todayIdx)
    return next?.calIdx === todayIdx + 1 ? `Mañana: ${next.day.name}` : ''
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
    await loadActivities()
    skipped = s.skippedDay?.date === todayDate
    await closeStaleSession(s.sessionState)

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
    weekOrder = order
    naturalOrder = resolveWeekOrder(weekObj, null)
    const todayDay: ProgramDay | null = weekObj.days?.[order[(new Date().getDay() + 6) % 7]] || null
    day = todayDay
    if (!todayDay || isRestName(todayDay.name) || skipped) {
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
      // Saved before the last activity existed: count from now, never idle at once
      lastActivityAt = ss.lastActivityAt || (startedAt ? Date.now() : null)
      pausedAt = ss.pausedAt || null
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
    // Coming back to Hoy after the training shows the toast again, but the
    // end of the exercises (time, league, cloud) happens once.
    const firstEnd = !endedAt
    if (!endedAt) endedAt = clockNow()
    persistPhase()
    if (firstEnd) onExercisesDone()
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
    lastActivityAt = startedAt
    armIdleReminder(lastActivityAt)
    persistPhase()
  }

  // A set logged, a move marked or a rest started: the session is alive
  function markActivity() {
    if (!startedAt || endedAt) return
    if (pausedAt) unpause()
    lastActivityAt = Date.now()
    armIdleReminder(lastActivityAt)
  }

  // Now, as the clock sees it: frozen while paused
  function clockNow(): number {
    return pausedAt ?? Date.now()
  }

  // ── Session clock: pause / resume / reset (asked first in SessionClockSheet) ──

  function pauseClock() {
    if (!startedAt || endedAt || pausedAt) return
    pausedAt = Date.now()
    cancelIdleReminder(lastActivityAt)
    persistPhase()
  }

  // The pause doesn't count: the start moves forward by it
  function unpause() {
    if (startedAt && pausedAt) startedAt += Date.now() - pausedAt
    pausedAt = null
  }

  function resumeClock() {
    unpause()
    lastActivityAt = Date.now()
    armIdleReminder(lastActivityAt)
    persistPhase()
  }

  // Back to 00:00; a paused clock stays paused until the next set
  function resetClock() {
    if (!startedAt || endedAt) return
    const now = Date.now()
    cancelIdleReminder(lastActivityAt)
    startedAt = now
    if (pausedAt) pausedAt = now
    lastActivityAt = now
    nowMs = now
    if (!pausedAt) armIdleReminder(now)
    persistPhase()
  }

  // Once the session ends, the «¿Terminaste?» push has nothing to ask
  $effect(() => {
    if (endedAt) cancelIdleReminder(untrack(() => lastActivityAt))
  })

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
      date: todayDate, phase: currentPhaseNumber(), todayExDone, startedAt, endedAt, lastActivityAt, pausedAt,
      warmupMarks: [...warmupMarks], stretchMarks: [...stretchMarks],
      planned: todayExercises.map(ex => ({ exerciseId: ex.exerciseId, sets: ex.sets, reps: String(ex.reps ?? '') })),
      dayName: day?.name || '',
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
    markActivity()
    persistPhase()
  }

  function finishMoves(mode: MoveMode) {
    if (mode === 'warmup') onWarmupComplete()
    else onStretchComplete()
  }

  function onWarmupComplete() {
    warmupDone = true
    persistPhase()
    centerToast = WORKOUT_APP_TOAST
  }

  function onStretchComplete() {
    stretchDone = true
    if (!endedAt) endedAt = clockNow()
    persistPhase()
    uploadSnapshot().catch(() => {})
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
    markActivity()
    loadTodayLogs()
    refreshExerciseLogs()
  }

  function startRest(data: Parameters<typeof startRestFromExercise>[0]) {
    markActivity()
    persistPhase()
    return startRestFromExercise(data)
  }

  // «Terminar entrenamiento» from the last exercise: straight to the first stretch move
  function finishFromDetail() {
    showDetail = false
    completionToastShown = true
    const firstEnd = !endedAt
    if (!endedAt) endedAt = clockNow()
    trainingCompleted = true
    persistPhase()
    if (firstEnd) onExercisesDone()
    if (hasStretch) openMoves('stretch', 0)
    else finishSession()
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
    if (!endedAt) endedAt = clockNow()
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
  }

  // The exercises are over (stretching or not): today's gym time counts now,
  // friends see it, and the cloud copy goes up. None of it blocks the UI.
  async function onExercisesDone() {
    try {
      await saveTodayGymTime()
      await syncLeague()
    } catch {}
    uploadSnapshot().catch(() => {})
  }

  async function saveTodayGymTime() {
    if (!startedAt || !endedAt) return
    await recordGymSession(todayDate, leagueSeconds(Math.round((endedAt - startedAt) / 1000)))
  }

  async function syncLeague() {
    const s = await Storage.getSettings()
    if (!PUSH_SERVER_URL || !s.username) return
    const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
    const streak = await computeStreak(todayDate)
    const [sessions, acts] = await Promise.all([Storage.getAllGymSessions(), Storage.getAllActivities()])
    const exercisedToday = all.some(l => l.date === todayDate && l.weight > 0) || acts.some(a => a.date === todayDate)
    const gymTime = leagueWeekSeconds(sessions, acts, mondayOf(todayDate))
    syncUserToWorker(s.username, streak, exercisedToday, gymTime).catch(() => {})
  }

  // ── Session left open ──

  function pendingToday(): PendingExercise[] {
    return sessionExercises
      .map((ex, i) => ({ ex, i }))
      .filter(({ ex }) => ex.status.state !== 'done')
      .map(({ ex, i }) => ({
        exerciseId: todayExercises[i].exerciseId, name: ex.name, imgUrl: ex.imgUrl || '',
        sets: ex.sets, reps: String(ex.reps ?? ''), weight: ex.todayWeight || ex.lastWeight, lastWeight: ex.lastWeight,
      }))
  }

  function doneToday(): string[] {
    return sessionExercises.filter(ex => ex.status.state === 'done').map(ex => ex.name)
  }

  async function logConfirmed(confirmed: { item: PendingExercise; weight: number }[], date?: string) {
    for (const { item, weight } of confirmed) {
      await Storage.logWeight(item.exerciseId, weight, units, item.sets, item.reps, date)
    }
  }

  // «Guardar así»: the session ends at the last activity + 3 min, then the
  // usual end (racha → esfuerzo → resumen) without stretching
  async function saveIdleSession(confirmed: { item: PendingExercise; weight: number }[]) {
    completionToastShown = true
    endedAt = idleEnd(liveSession)
    trainingCompleted = true
    await logConfirmed(confirmed)
    await loadTodayLogs()
    refreshExerciseLogs()
    onExercisesDone()
    finishSession()
  }

  // «Sigo entrenando»: the clock goes on from where it froze, the pause doesn't count
  function continueIdleSession() {
    const now = Date.now()
    if (startedAt) startedAt += now - idleEnd(liveSession)
    lastActivityAt = now
    armIdleReminder(now)
    persistPhase()
  }

  // Opened on a later day: yesterday's time counts at once, up to its last activity
  async function closeStaleSession(ss: SessionState | null | undefined) {
    if (!isStale(ss, todayDate)) return
    staleSession = ss
    cancelIdleReminder(ss.lastActivityAt)
    await recordGymSession(ss.date, leagueSeconds(idleSeconds(ss)))
  }

  function stalePending(ss: SessionState): PendingExercise[] {
    const dayLogs = allLogs.filter(l => l.date === ss.date)
    return (ss.planned || [])
      .filter(p => exerciseStatus(p, todayLogFor(p.exerciseId, dayLogs)).state !== 'done')
      .map(p => {
        const ex = exercises.find(e => e.id === p.exerciseId)
        const lastWeight = lastWeightOn(allLogs, p.exerciseId, ss.date)
        return {
          exerciseId: p.exerciseId, name: ex ? getExerciseDisplayName(ex, $settings.language) : p.exerciseId,
          imgUrl: ex ? (ex.imgUrl || resolveExerciseMedia(ex).imgUrl || '') : '',
          sets: p.sets, reps: p.reps, weight: todayLogFor(p.exerciseId, dayLogs)?.weight || lastWeight, lastWeight,
        }
      })
  }

  function staleDone(ss: SessionState): string[] {
    const ids = [...new Set(allLogs.filter(l => l.date === ss.date && l.weight > 0).map(l => l.exerciseId))]
    return ids.map(id => exercises.find(e => e.id === id)).filter((e): e is Exercise => !!e)
      .map(e => getExerciseDisplayName(e, $settings.language))
  }

  async function saveStaleSession(confirmed: { item: PendingExercise; weight: number }[]) {
    const ss = staleSession
    if (!ss) return
    staleSession = null
    await logConfirmed(confirmed, ss.date)
    const stored = await Storage.getSettings()
    if (stored.sessionState?.date === ss.date) await settings.update({ sessionState: null } as any)
    await refreshExerciseLogs()
    try { await syncLeague() } catch {}
    uploadSnapshot().catch(() => {})
  }

  function onStreakDone() {
    streakModalShow = false
    // Merged onto what's stored: saving the in-memory store whole could put
    // back a stale sessionState over what was just persisted
    settings.update({ streakShownDate: todayDate } as any)
    effortModalShow = true
  }

  // The effort, then the calories (optional), then the coach
  function onEffort(effort: string) {
    effortModalShow = false
    effortValue = effort
    kcalSheet = { effort }
  }

  async function runAnalysis(effort: string) {
    coachLoading = true
    coachCardMode = true
    coachError = false
    coachResult = null
    try {
      const result = await runCoachAnalysis(day!, effort, exercises, todayDate, weekIdx, trainingDaysPerWeek(program, weekIdx), program, {
        kcal: gymKcal || undefined,
        other_activities_today: activitiesForCoach(activities),
      })
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
    pausedAt = null
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
    const marks = activityDayMarks(await Storage.getAllActivities())
    return computeStreakWeeks([...all, ...marks], trainingDaysPerWeek(program, weekIdx), todayDateStr)
  }

  // ── Other activities ──

  async function loadActivities() {
    activities = await Storage.getActivitiesForDate(todayDate)
    gymKcal = (await Storage.getGymSession(todayDate))?.kcal || 0
  }

  // «Mar 17 nov» for the sheets
  function sheetEyebrow(): string {
    return sessionEyebrow(todayDate, null)
  }

  function openActivity(editing: Activity | null = null) {
    actionToast = null
    activitySheet = { editing }
  }

  // The gym's question comes once a day, before the session starts
  function shouldAsk(): boolean {
    return !!day && !isRestDay && !skipped && !complete && !startedAt && $settings.activityAskDate !== todayDate
  }

  async function saveActivity(draft: ActivityDraft) {
    const editing = activitySheet?.editing
    activitySheet = null
    const saved = await Storage.saveActivity(editing
      ? { ...draft, id: editing.id, date: editing.date, createdAt: editing.createdAt }
      : { ...draft, date: todayDate })
    await loadActivities()
    if (!editing && shouldAsk()) {
      askAbout = saved
      settings.update({ activityAskDate: todayDate } as any)
    }
    afterActivityChange()
  }

  async function removeActivity() {
    const editing = activitySheet?.editing
    activitySheet = null
    if (!editing) return
    await Storage.deleteActivity(editing.id)
    await loadActivities()
    afterActivityChange()
    showActionToast('Actividad eliminada', async () => {
      await Storage.saveActivity(editing)
      await loadActivities()
      afterActivityChange()
    })
  }

  // The league, friends and the cloud copy hear about it at once
  function afterActivityChange() {
    syncLeague().catch(() => {})
    uploadSnapshot().catch(() => {})
  }

  function showActionToast(message: string, undo: () => void) {
    if (actionToastTimer) clearTimeout(actionToastTimer)
    actionToast = { message, undo }
    actionToastTimer = setTimeout(() => (actionToast = null), 5000)
  }

  function undoAction() {
    const undo = actionToast?.undo
    actionToast = null
    undo?.()
  }

  // ── «¿Y <workout>?» ──

  function rescheduleKey(): string {
    return program ? `${program.id}-week-${weekIdx}` : ''
  }

  async function saveWeekOrder(order: number[] | null) {
    const stored = await Storage.getSettings()
    const rs = { ...((stored.rescheduleWeekOrder || {}) as Record<string, number[]>) }
    const key = rescheduleKey()
    if (order && order.some((v, i) => v !== naturalOrder[i])) rs[key] = [...order]
    else delete rs[key]
    await settings.update({ rescheduleWeekOrder: rs as any })
  }

  // «Pasarlo a mañana»: what Plan's «Me salté un día» does, from today on
  async function moveWorkout() {
    askAbout = null
    const name = day?.name || ''
    const before = [...weekOrder]
    const gymDone = weekDays(allLogs, todayDate)
    const shifted = shiftPending(before, todayIdx, fixedSlots(weekObj, before, gymDone))
    if (shifted.every((v, i) => v === before[i])) {
      toast.show('No quedan días por correr esta semana')
      return
    }
    const stored = await Storage.getSettings()
    const previous = ((stored.rescheduleWeekOrder || {}) as Record<string, number[]>)[rescheduleKey()] || null
    await saveWeekOrder(shifted)
    await loadSession()
    showActionToast(`${name} pasa a mañana`, async () => {
      await saveWeekOrder(previous)
      await loadSession()
    })
  }

  // «Saltarlo esta semana»: the workout stays where it is, not done
  async function skipWorkout() {
    askAbout = null
    const name = day?.name || ''
    await settings.update({ skippedDay: { date: todayDate, dayName: name } } as any)
    skipped = true
    showActionToast(`${name} saltado esta semana`, async () => {
      await settings.update({ skippedDay: null } as any)
      skipped = false
      await loadSession()
    })
  }

  // ── Calories of the gym ──

  function openKcalEdit() {
    kcalSheet = { effort: '' }
  }

  async function saveKcal(kcal: number) {
    const effort = kcalSheet?.effort || ''
    kcalSheet = null
    await Storage.setGymKcal(todayDate, kcal)
    gymKcal = kcal
    uploadSnapshot().catch(() => {})
    if (effort) runAnalysis(effort)
  }

  async function removeKcal() {
    kcalSheet = null
    const previous = gymKcal
    await Storage.setGymKcal(todayDate, 0)
    gymKcal = 0
    showActionToast('Calorías quitadas', async () => {
      await Storage.setGymKcal(todayDate, previous)
      gymKcal = previous
    })
  }

  function skipKcal() {
    const effort = kcalSheet?.effort || ''
    kcalSheet = null
    if (effort) runAnalysis(effort)
  }

  function kcalBack() {
    kcalSheet = null
    effortModalShow = true
  }
</script>

<div class="screen" id="today">
  {#if !loaded}
    <EmptyState message="Cargando..." />
  {:else if noProgram}
    <FirstRunView />
  {:else if isRestDay || skipped}
    <RestDayView
      eyebrow={sessionEyebrow(todayDate, weekObj) || 'Hoy'}
      sub={restSub}
      {activities}
      {accent}
      onadd={() => openActivity()}
      onedit={(a) => openActivity(a)}
    />
  {:else if day}
    <PageHeader {eyebrow} title="{day.name}." sub={dayMuscles(todayExercises)}>
      {#snippet action()}
        {#if clockRunning && idle}
          <div class="clock idle" data-component="SessionClock"><b><span class="pz" aria-hidden="true"><i></i><i></i></span>{clock}</b><span>Sin actividad desde {clockTime(idleEnd(liveSession))}</span></div>
        {:else if clockRunning}
          <button class="clock tap" class:paused={!!pausedAt} data-component="SessionClock"
            aria-label={pausedAt ? `Reloj en pausa, ${clock}. Abrir reloj de sesión` : `Reloj de sesión, ${clock}. Abrir`}
            onclick={() => (clockSheetOpen = true)}>
            <b>{#if pausedAt}<span class="pz" aria-hidden="true"><i></i><i></i></span>{:else}<i class="dot" style="background:{accent}"></i>{/if}{clock}</b>
            <span class="lb">{pausedAt ? 'En pausa' : 'en sesión'}<Icon name="down" size={12} /></span>
          </button>
        {:else}
          <OtherActivityChip onclick={() => openActivity()} />
        {/if}
      {/snippet}
    </PageHeader>

    {#snippet logged()}
      {#if activities.length}
        <section class="logged" data-component="LoggedActivities">
          <span class="k">Registrado hoy</span>
          {#each activities as a (a.id)}<ActivityRow activity={a} onedit={() => openActivity(a)} />{/each}
        </section>
      {/if}
    {/snippet}

    {#if complete}
      <SessionSummary
        analysis={coachResult}
        loading={coachLoading}
        error={coachError}
        minutes={sessionMinutes}
        {units}
        kcal={gymKcal}
        onkcal={coachLoading ? null : openKcalEdit}
        onask={() => (effortModalShow = true)}
        onreset={resetDay}
        extra={logged}
      />
    {:else}
      {@render logged()}
      <SessionSteps {phases} onrow={onRow} />
    {/if}

    {#if step && !restShown}
      <NextStepDock caption={dockCaption}>
        <Button variant="primary" size="lg" {accent} onclick={() => goToStep(step.target)}>
          <span class="one-line">{step.label}</span><Icon name="arrow" size={18} />
        </Button>
      </NextStepDock>
    {/if}
  {/if}

  <div class="footer-bar">
    <IconButton size="sm" icon="restart" label="Recargar" onclick={() => location.reload()} />
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
    onStartRest={startRest}
    onSwap={refreshAfterSwap}
    onRevert={refreshAfterSwap}
    onFinish={trainingDone ? finishFromDetail : null}
  />
{/if}

{#if staleSession}
  <OpenSessionSheet
    eyebrow={staleEyebrow(staleSession, todayDate)}
    endTime={clockTime(idleEnd(staleSession))}
    lastTime={clockTime(lastActivity(staleSession))}
    minutes={idleMinutes(staleSession)}
    pending={stalePending(staleSession)}
    doneNames={staleDone(staleSession)}
    {units}
    {accent}
    onsave={saveStaleSession}
  />
{:else if showIdleSheet}
  <OpenSessionSheet
    endTime={clockTime(idleEnd(liveSession))}
    lastTime={clockTime(lastActivity(liveSession))}
    minutes={idleMinutes(liveSession)}
    pending={pendingToday()}
    doneNames={doneToday()}
    {units}
    {accent}
    onsave={saveIdleSession}
    oncontinue={continueIdleSession}
  />
{/if}

<SessionClockSheet
  bind:open={clockSheetOpen}
  paused={!!pausedAt}
  {clock}
  since={startedAt ? clockTime(startedAt) : ''}
  pausedSince={pausedAt ? clockTime(pausedAt) : ''}
  {accent}
  onpause={pauseClock}
  onresume={resumeClock}
  onreset={resetClock}
/>

<EffortSheet bind:open={effortModalShow} onselect={onEffort} onskip={() => (effortModalShow = false)} />

{#if activitySheet}
  <ActivitySheet
    eyebrow={sheetEyebrow()}
    editing={activitySheet.editing}
    {accent}
    onsave={saveActivity}
    ondelete={removeActivity}
    onclose={() => (activitySheet = null)}
  />
{/if}

{#if askAbout && day}
  <GymQuestionSheet
    saved={activityName(askAbout)}
    minutes={num(askAbout.minutes)}
    dayName={day.name}
    onlater={() => (askAbout = null)}
    onmove={moveWorkout}
    onskip={skipWorkout}
  />
{/if}

{#if kcalSheet}
  <KcalSheet
    effort={kcalSheet.effort}
    current={gymKcal}
    {accent}
    onsave={saveKcal}
    onskip={skipKcal}
    onback={kcalBack}
    onremove={removeKcal}
    onclose={() => (kcalSheet = null)}
  />
{/if}

<ActionToast visible={!!actionToast} message={actionToast?.message ?? ''} action="Deshacer" id="today-action-toast" onaction={undoAction} />

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
  .clock > span { font-size: 12px; color: var(--text-tertiary); }
  /* The whole block is the tap target (≥ 52 px), same footprint as before */
  .clock.tap {
    border: 0; background: none; color: inherit; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent;
    display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 2px;
    min-height: 52px; min-width: 72px; margin: 0 -10px 16px 0; padding: 6px 10px 6px 14px; border-radius: 16px; transition: background 0.15s;
  }
  .clock.tap:active { background: var(--cv-fill-2); }
  .clock.tap b { display: flex; align-items: center; gap: 8px; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .clock.tap .lb { display: flex; align-items: center; gap: 3px; white-space: nowrap; }
  .clock.paused b { background: var(--text); color: var(--bg); border-radius: 9999px; padding: 3px 12px 3px 10px; gap: 7px; }
  .clock.paused .lb { color: var(--text); font-weight: 600; }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  @media (max-width: 340px) {
    .clock.tap b { font-size: 18px; }
    .clock.paused b { padding: 3px 10px 3px 8px; gap: 6px; }
    .clock.paused .pz i { height: 10px; }
  }
  .clock.idle { padding-bottom: 2px; }
  .clock.idle b { color: var(--text-secondary); display: flex; align-items: center; justify-content: flex-end; gap: 7px; }
  .clock.idle > span { display: block; width: 96px; margin-left: auto; line-height: 1.3; text-wrap: balance; }
  .pz { display: flex; gap: 3px; }
  .pz i { width: 3px; height: 12px; border-radius: 1px; background: currentColor; }
  .footer-bar { display: flex; justify-content: flex-end; }
  .logged { display: flex; flex-direction: column; gap: 10px; }
  .k { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  :global(.one-line) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
