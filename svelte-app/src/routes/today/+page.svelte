<script lang="ts">
  import { resolvePanelItems } from '$lib/data/warmup-components'

  import { onMount } from 'svelte'
  import * as Storage from '$lib/storage'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { getLogsForDate, logWeight } from '$lib/storage'
  import { sendPushNotification, notifyWatch } from '$lib/push'
  import { storeRestPending, checkPendingRest, _checkRestTimer } from '$lib/rest-timer'
  import { runCoachAnalysis } from '$lib/coach-analysis'
  import Warmup from '$lib/components/Warmup.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import PhaseCard from '$lib/components/PhaseCard.svelte'
  import LockedCard from '$lib/components/LockedCard.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import GlowCard from '$lib/components/GlowCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import CoachResultCard from '$lib/components/CoachResultCard.svelte'
  import RestDayView from '$lib/components/RestDayView.svelte'
  import OnboardingView from '$lib/components/OnboardingView.svelte'
  import PhaseHeader from '$lib/components/PhaseHeader.svelte'
  import EffortSelector from '$lib/components/EffortSelector.svelte'
  import Button from '$lib/components/Button.svelte'
  import StreakOverlay from '$lib/components/StreakOverlay.svelte'
  import TrainingCard from '$lib/components/TrainingCard.svelte'
  import type { Exercise, ExerciseLog, Program, ProgramDay, ProgramExercise, Settings } from '$lib/types'

  let phase = $state<'loading' | 'warmup' | 'training' | 'stretch' | 'complete'>('loading')
  let todayExercises = $state<any[]>([])
  let warmupItems = $state<any[]>([])
  let stretchItems = $state<any[]>([])
  let program = $state<Program | null>(null)
  let weekInfo = $state<any>(null)
  let todayExDone = $state(0)
  let startedAt = $state<number | null>(null)
  let endedAt = $state<number | null>(null)
  let coachCardMode = $state(false)
  let coachLoading = $state(false)
  let coachResult = $state<any>(null)
  let showCoach = $state(false)
  let showWarmup = $state(false)
  let showStretch = $state(false)
  let exercises = $state<Exercise[]>([])
  let allLogs = $state<ExerciseLog[]>([])
  let effortModalShow = $state(false)
  let streakModalShow = $state(false)
  let streakCount = $state(0)
  let effortValue = $state<string | null>(null)
  let coachDay = $state<any>(null)
  let coachEffort = $state<string | null>(null)
  let loaded = $state(false)
  let noProgram = $state(false)
  let warmupDone = $state(false)
  let stretchDone = $state(false)
  let completionToastShown = $state(false)
  let sessionDate = $state('')
  let todayDate = $state('')
  let weightInputs = $state<Record<string, number>>({})

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)

  function openTrainingDetail() {
    if (hasWarmup && !warmupDone) return
    if (todayExercises.length === 0) return
    detailExercises = todayExercises
    detailIdx = 0
    showDetail = true
  }

  function openExerciseDetail(ex: any) {
    detailExercises = [ex]
    detailIdx = 0
    showDetail = true
  }

  async function onStartRest(data: { name: string; restSec: number; tag: string; sets: number; reps: string; exerciseId: string }) {
    const { name, restSec, tag, sets, reps, exerciseId } = data
    await storeRestPending({ name, restSec, tag, exerciseId, sets, reps })
    const pushCache = await caches.open('push-pending')
    await pushCache.put('/pending', new Response(JSON.stringify({
      kind: 'start',
      exerciseData: { name, restSec, sets, reps, exerciseId }
    })))
    const ok = await sendPushNotification(name, `${sets}×${reps} · Tap para iniciar descanso`, tag, { exerciseId })
    if (!ok) await notifyWatch(name, `${sets}×${reps} · Tap para iniciar descanso`, tag)
  }

  function onDetailClose() {
    showDetail = false
    detailExercises = []
    loadTodayLogs()
  }

  function onDetailLog() {
    loadTodayLogs()
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) {
      detailIdx++
    } else if (dir === 'prev' && detailIdx > 0) {
      detailIdx--
    }
  }

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  const now = new Date()
  const jsDay = now.getDay()
  const detectedDayIdx = (jsDay + 6) % 7
  const DAYS_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const dateStr = `${monthNames[now.getMonth()]} ${now.getDate()} · ${now.getFullYear()}`
  const weekDayName = dayNames[jsDay]

  let programs: Program[] = $state([])
  let weekIdx = $state(0)
  let day: ProgramDay | null = $state(null)
  let weekObj: any = $state(null)
  let exercisesById = $derived(Object.fromEntries((exercises || []).map(e => [e.id, e])))
  let isRestDay = $derived(!day || (day as any).name === 'Rest' || (day as any).name === 'Descanso')
  let exercisesTotal = $derived((day as any)?.exercises?.length || 0)
  let hasWarmup = $derived(warmupItems.length > 0)
  let hasStretch = $derived(stretchItems.length > 0)
  let totalSteps = $derived((hasWarmup ? 1 : 0) + exercisesTotal + (hasStretch ? 1 : 0))
  let doneSteps = $derived(0)

  let timerDisplay = $state('')
  let timerSweepPct = $state(0)

  let effortShown = $state(false)
  let streakShown = $state('')

  onMount(async () => {
    const [exs, progs, logs, s] = await Promise.all([
      Storage.getExercises(),
      Storage.getPrograms(),
      Storage.getAllLogs(),
      Storage.getSettings()
    ])
    exercises = exs
    programs = progs
    allLogs = logs
    program = programs.find(p => p.id === s.activeProgramId) || null
    weekIdx = s.currentWeekIdx || 0
    weekObj = program?.weeks?.[weekIdx]
    const toLocal = (date: Date) => {
      const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      return d.toISOString().slice(0, 10)
    }
    todayDate = toLocal(new Date())
    sessionDate = todayDate

    // Rest timer listeners must be registered regardless of program state
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
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocusCheck, { passive: true })

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocusCheck)
    }

    checkPendingRest()
    _checkRestTimer()

    if (!program && exercises.length === 0) {
      noProgram = true
      loaded = true
      return cleanup
    }

    if (!program || !weekObj) {
      loaded = true
      return cleanup
    }

    const order = (s.rescheduleWeekOrder?.[`${program.id}-week-${weekIdx}`] as unknown as number[]) || [0, 1, 2, 3, 4, 5, 6]
    const originalDayIdx = order[detectedDayIdx < order.length ? detectedDayIdx : 0]
    day = weekObj.days[originalDayIdx] || null

    if (!day || day.name === 'Rest' || day.name === 'Descanso') {
      isRestDay
      loaded = true
      return cleanup
    }

    const exercisesByIdMap = Object.fromEntries(exs.map(e => [e.id, e]))
    const warmupMuscles = day.exercises.map(ex => {
      const resolved = { ...ex, ...(exercisesByIdMap[ex.exerciseId] || {}) }
      return resolved.muscle
    }).filter(Boolean)
    warmupItems = resolvePanelItems(warmupMuscles, 'warmup')
    stretchItems = resolvePanelItems(warmupMuscles, 'stretch')

    if (s.sessionState?.date === todayDate) {
      const p = s.sessionState.phase || 1
      const exDone = s.sessionState.todayExDone || 0
      todayExDone = exDone
      if (p >= 2) warmupDone = true
      if (p >= 3) phase = 'training'
      if (p >= 4) { stretchDone = true; phase = 'stretch' }
      if (exDone >= day.exercises.length && p >= 3) phase = 'stretch'
      if (p >= 4 && hasStretch) stretchDone = true
      if (p >= 5) { phase = 'complete'; showCoach = true }
    }

    if (s.lastCoachAnalysis?.date === todayDate && s.lastCoachAnalysis?.weekIdx === weekIdx) {
      coachCardMode = true
      coachEffort = s.lastCoachAnalysis.effort || 'good'
      coachDay = day
    }

    if (warmupDone || phase !== 'loading') phase = phase === 'loading' ? (warmupDone ? 'training' : 'warmup') : phase

    if (phase === 'loading') phase = hasWarmup ? 'warmup' : 'training'

    // Restore showStretch when phase is stretch
    if (phase === 'stretch') showStretch = stretchItems.length > 0

    todayExercises = day.exercises.map(ex => ({
      ...ex,
      ...(exercisesByIdMap[ex.exerciseId] || {})
    }))

    loadTodayLogs()

    loaded = true

    return cleanup
  })

  async function loadTodayLogs() {
    const logs = await getLogsForDate(todayDate)
    const count = day ? day.exercises.filter(ex =>
      logs.some(l => l.exerciseId === ex.exerciseId && l.weight > 0)
    ).length : 0
    if (count !== todayExDone) {
      todayExDone = count
      persistPhase()
    }
    for (const log of logs) {
      if (log.weight > 0) {
        weightInputs[log.exerciseId] = log.weight
      }
    }
    if (count >= exercisesTotal && exercisesTotal > 0 && !completionToastShown && !stretchDone && !showDetail) {
      completionToastShown = true
      phase = 'stretch'
      stretchDone = false
      showStretch = hasStretch
      if (!hasStretch) {
        phase = 'complete'
        showCoach = true
        showEffortAfterStreak()
      }
      persistPhase()
    }
  }

  function persistPhase() {
    if (!program) return
    let p = 1
    if (warmupDone) p = 2
    if (todayExDone >= exercisesTotal && warmupDone) p = 3
    if (stretchDone) p = 4
    if (showCoach) p = 5
    const s = { ...$settings, sessionState: { date: todayDate, phase: p, todayExDone } }
    Storage.saveSettings(s)
    settings.update({ sessionState: { date: todayDate, phase: p, todayExDone } } as any)
  }

  function onWarmupComplete() {
    warmupDone = true
    phase = 'training'
    showWarmup = false
    persistPhase()
    if ($settings.hasWatch) {
      toast.show('Inicia tu Smart Watch')
    }
  }

  function onStretchComplete() {
    stretchDone = true
    phase = 'complete'
    showStretch = false
    showCoach = true
    persistPhase()
    showEffortAfterStreak()
  }

  async function onExerciseCheck(ex: ProgramExercise, e: Event) {
    const checked = (e.target as HTMLInputElement).checked
    if (!checked) return
    const weight = weightInputs[ex.exerciseId] || 0
    if (weight > 0) {
      await logWeight(ex.exerciseId, weight, units)
    }
    todayExDone++
    persistPhase()
    if (todayExDone >= exercisesTotal) {
      completionToastShown = true
      phase = 'stretch'
      stretchDone = false
      showStretch = hasStretch
      if (!hasStretch) {
        phase = 'complete'
        showCoach = true
        showEffortAfterStreak()
      }
      persistPhase()
    }
  }

  async function showEffortAfterStreak() {
    const s = await Storage.getSettings()
    if (s.streakShownDate !== todayDate) {
      const streak = await computeStreak(todayDate)
      streakCount = Math.max(1, streak)
      streakModalShow = true
    } else {
      showEffortSelector()
    }
  }

  function onStreakDone() {
    streakModalShow = false
    Storage.saveSettings({ ...$settings, streakShownDate: todayDate } as Settings).then(() => {
      settings.update({ streakShownDate: todayDate } as any)
    })
    showEffortSelector()
  }

  function showEffortSelector() {
    effortModalShow = true
  }

  async function onEffort(effort: string) {
    effortModalShow = false
    coachEffort = effort
    effortValue = effort
    coachLoading = true
    coachCardMode = true
    coachDay = day
    try {
      const result = await runCoachAnalysis(day!, effort, exercises, todayDate, weekIdx)
      coachResult = result
      coachLoading = false
      const s = await Storage.getSettings()
      s.lastCoachAnalysis = { ...result, date: todayDate, effort: coachEffort, weekIdx }
      await Storage.saveCoachAnalysis(s.lastCoachAnalysis)
      settings.update({ lastCoachAnalysis: s.lastCoachAnalysis } as any)
    } catch {
      coachLoading = false
    }
  }

  function resetDay() {
    coachCardMode = false
    coachLoading = false
    coachResult = null
    coachDay = null
    coachEffort = null
    effortValue = null
    phase = 'warmup'
    warmupDone = false
    stretchDone = false
    todayExDone = 0
    showCoach = false
    showWarmup = false
    showStretch = false
    startedAt = null
    endedAt = null
    completionToastShown = false
    weightInputs = {}
    const s = { ...$settings }
    delete s.lastCoachAnalysis
    s.sessionState = null
    Storage.saveSettings(s)
    settings.update({ lastCoachAnalysis: null, sessionState: null } as any)
  }

  function getMonday(date: Date) {
    const d = new Date(date)
    const monOffset = (d.getDay() + 6) % 7
    d.setDate(d.getDate() - monOffset)
    d.setHours(12, 0, 0, 0)
    return d
  }

  function formatDate(d: Date) { return d.toISOString().slice(0, 10) }

  async function computeStreak(todayDateStr: string) {
    const all = allLogs.length > 0 ? allLogs : await Storage.getAllLogs()
    const trained = new Set<string>()
    for (const log of all) {
      if (log.weight && log.weight > 0) trained.add(log.date)
    }
    const today = new Date(todayDateStr + 'T12:00:00Z')
    const currentMonday = getMonday(today)
    let streak = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentMonday)
      d.setDate(currentMonday.getDate() + i)
      if (d > today) break
      if (trained.has(formatDate(d))) streak++
    }
    let weekStart = new Date(currentMonday)
    weekStart.setDate(weekStart.getDate() - 7)
    while (true) {
      let count = 0
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart)
        d.setDate(weekStart.getDate() + i)
        if (trained.has(formatDate(d))) count++
      }
      if (count >= 4) { streak += 7; weekStart.setDate(weekStart.getDate() - 7) }
      else break
    }
    return streak
  }

  let timerInterval: ReturnType<typeof setInterval> | null = null

  $effect(() => {
    if ((doneSteps > 0 || todayExDone > 0) && !startedAt) startedAt = Date.now()
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    if (startedAt && !endedAt) {
      timerInterval = setInterval(() => {
        const totalSec = Math.floor((Date.now() - startedAt!) / 1000)
        const hh = Math.floor(totalSec / 3600)
        const mm = Math.floor((totalSec % 3600) / 60)
        const ss = totalSec % 60
        const pad = (n: number) => String(n).padStart(2, '0')
        timerDisplay = hh > 0 ? `${hh}:${pad(mm)}` : `${pad(mm)}:${pad(ss)}`
        timerSweepPct = (totalSec % 3600) / 3600
      }, 1000)
    }
    return () => { if (timerInterval) clearInterval(timerInterval) }
  })

  $effect(() => {
    if (streakModalShow) {
      const t = setTimeout(() => { onStreakDone() }, 2600)
      return () => clearTimeout(t)
    }
  })

  let doneStepsVal = $derived((warmupDone ? 1 : 0) + (phase === 'stretch' || phase === 'complete' || stretchDone ? exercisesTotal : todayExDone) + (stretchDone || showCoach ? 1 : 0))
</script>

<div class="page today-page">
  {#if !loaded}
    <EmptyState message="Cargando..." />
  {:else if noProgram}
    <OnboardingView {accent} />
  {:else if isRestDay}
    <RestDayView {weekObj} {weekIdx} />
  {:else}
    {#if phase === 'warmup' && !showWarmup}
      <PhaseHeader
        {accent}
        dayName={day?.name || ''}
        daySubtitle={day?.subtitle || ''}
        weekName={weekObj?.name || ''}
        weekTag={weekObj?.tag || ''}
      />

      <div class="phase-list">
        {#if hasWarmup}
          <PhaseCard
            phaseLabel="Fase 01"
            title="Calentamiento"
            subtitle="Activación dinámica"
            count={warmupItems.length}
            status="active"
            {accent}
            onclick={() => showWarmup = true}
          />
        {/if}

        {#if todayExercises.length > 0}
          <PhaseCard
            phaseLabel="Fase 02"
            title="Entrenamiento"
            subtitle={day?.subtitle || `${exercisesTotal} ejercicios`}
            count={exercisesTotal}
            countLabel="ejercicios"
            status={todayExDone >= exercisesTotal ? 'completed' : (hasWarmup && !warmupDone) ? 'locked' : 'active'}
            {accent}
            disabled={hasWarmup && !warmupDone}
            progress={{ done: todayExDone, total: exercisesTotal }}
            onclick={openTrainingDetail}
          />
        {/if}

        {#if hasStretch}
          {#if stretchDone}
            <PhaseCard
              phaseLabel="Fase 03"
              title="Estiramiento"
              subtitle="Enfriamiento estático"
              count={stretchItems.length}
              status="completed"
              accent="#c89bff"
              phaseColor="#c89bff"
              onclick={() => showStretch = true}
            />
          {:else if !warmupDone}
            <LockedCard
              title="Termina el calentamiento primero"
              subtitle="Tus estiramientos aparecerán cuando completes todos los ejercicios."
            />
          {:else if todayExDone < exercisesTotal}
            <LockedCard
              title="Termina el entrenamiento primero"
              subtitle="Completa los {exercisesTotal - todayExDone} ejercicio(s) restante(s) para ver tus estiramientos."
            />
          {:else}
            <PhaseCard
              phaseLabel="Fase 03"
              title="Estiramiento"
              subtitle="Enfriamiento estático"
              count={stretchItems.length}
              status="active"
              accent="#c89bff"
              phaseColor="#c89bff"
              onclick={() => showStretch = true}
            />
          {/if}
        {/if}
      </div>
    {/if}

    {#if phase === 'training' && warmupDone && day && !showWarmup && !showStretch && !showCoach && !coachCardMode}
      <PhaseHeader
        {accent}
        dayName={day?.name || ''}
        daySubtitle={day?.subtitle || ''}
        weekName={weekObj?.name || ''}
        weekTag={weekObj?.tag || ''}
        showLiveDot
        showTimer={!!startedAt && !endedAt}
        {timerDisplay}
        {timerSweepPct}
      />

      {#if todayExercises.length > 0}
        <TrainingCard
          {day}
          {accent}
          {todayExDone}
          {exercisesTotal}
          {exercisesById}
          onclick={openTrainingDetail}
        />
      {/if}
    {/if}

    {#if showCoach || coachCardMode}
      <CoachResultCard analysis={coachResult} {accent} loading={coachLoading} exerciseCount={day?.exercises?.length || 0} onclick={resetDay} />
      <Button variant="ghost" fullWidth onclick={resetDay}>
        <Icon name="restart" size={14} color="rgba(255,255,255,0.6)" />
        Reiniciar día
      </Button>
    {/if}
  {/if}
</div>

{#if showWarmup && warmupItems.length > 0}
  <Warmup items={warmupItems} mode="warmup" {accent} onComplete={onWarmupComplete} />
{/if}

{#if showStretch && stretchItems.length > 0}
  <Warmup items={stretchItems} mode="stretch" {accent} onComplete={onStretchComplete} />
{/if}

{#if showDetail && detailExercises.length > 0}
  <ExerciseDetail exercise={detailExercises[detailIdx]} open={showDetail} {accent} {units} hasPrev={detailIdx > 0} hasNext={detailIdx < detailExercises.length - 1} onNavigate={onDetailNavigate} onClose={onDetailClose} onLog={onDetailLog} onStartRest={onStartRest} />
{/if}

<CenterDialog open={effortModalShow} onclose={() => effortModalShow = false}>
  <EffortSelector {accent} onselect={onEffort} />
</CenterDialog>

{#if streakModalShow}
  <StreakOverlay count={streakCount} {accent} />
{/if}

<style>
  .today-page { height: 100%; box-sizing: border-box; padding: 58px 16px 104px; display: flex; flex-direction: column; }
  .phase-list { flex: 1; min-height: 0; margin-top: 16px; display: flex; flex-direction: column; gap: 11px; }
</style>
