<script lang="ts">
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { resolvePanelItems } from '$lib/data/warmup-components'
  import { RECOVERY_TIPS } from '$lib/data/recovery'

  import { onMount } from 'svelte'
  import * as Storage from '$lib/storage'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { getLogsForDate, getLogsForExercise, logWeight } from '$lib/storage'
  import { goto } from '$app/navigation'
  import { subscribePush, sendPushNotification, notifyWatch } from '$lib/push'
  import { scheduleRestTimer, cancelRestTimer, getRestPending, storeRestPending, checkPendingRest, _checkRestTimer } from '$lib/rest-timer'
  import Warmup from '$lib/components/Warmup.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
  import SectionLabel from '$lib/components/SectionLabel.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import StatBlock from '$lib/components/StatBlock.svelte'
  import PhaseCard from '$lib/components/PhaseCard.svelte'
  import LockedCard from '$lib/components/LockedCard.svelte'
  import GlowCard from '$lib/components/GlowCard.svelte'
  import CenterDialog from '$lib/components/CenterDialog.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
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
      const result = await runCoachAnalysis(day!, effort, exercises)
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

  async function runCoachAnalysis(day: ProgramDay, effort: string, exercises: Exercise[]) {
    let volume = 0
    let prCount = 0
    try {
      const todayLogs = await getLogsForDate(todayDate)
      for (const log of todayLogs) {
        if (!log.weight) continue
        const progEx = day.exercises.find(e => e.exerciseId === log.exerciseId)
        const sets = log.sets ?? progEx?.sets ?? 0
        let reps: any = log.reps ?? progEx?.reps ?? 0
        if (typeof reps === 'string') reps = parseInt(reps) || 0
        volume += log.weight * sets * reps
      }
      const exIds = [...new Set(todayLogs.map(l => l.exerciseId))]
      for (const exId of exIds) {
        const todayLog = todayLogs.find(l => l.exerciseId === exId && l.weight > 0)
        if (!todayLog) continue
        const allExLogs = await getLogsForExercise(exId)
        const prevLogs = allExLogs.filter(l => l.date !== todayDate && l.weight > 0)
        if (prevLogs.length > 0 && todayLog.weight > 0 && todayLog.weight >= Math.max(...prevLogs.map(l => l.weight))) prCount++
      }
    } catch {}
    const verdicts = ['positive', 'neutral', 'warning']
    const analysisTexts: Record<string, string> = {
      easy: 'Buen trabajo, pero podrías considerar aumentar el peso la próxima sesión para seguir progresando.',
      good: 'Excelente sesión. Carga adecuada, buen volumen. Sigue así.',
      heavy: 'Buena intensidad. Considera ajustar las cargas si la fatiga se acumula.',
      failure: 'Entrenamiento intenso al fallo. Prioriza la recuperación y ajusta las cargas si es necesario.',
    }
    const recommendations: Record<string, string[]> = {
      easy: ['Aumenta el peso en 2.5-5 kg', 'Reduce repeticiones si subes peso', 'Mantén la técnica'],
      good: ['Sigue progresando', 'Mantén el rango de repeticiones', 'Buen control de carga'],
      heavy: ['Monitorea fatiga', 'Considera deload la próxima semana', 'Prioriza sueño y recuperación'],
      failure: ['Toma un día extra de descanso', 'Reduce carga 10-20%', 'Enfócate en técnica'],
    }
    const effortKey = effort as keyof typeof analysisTexts
    const defaultRecs = ['Sigue entrenando', 'Mantén la constancia', 'Escucha a tu cuerpo']
    return {
      date: todayDate,
      weekIdx,
      effort,
      analysis: analysisTexts[effortKey] || 'Sesión completada. Buen trabajo.',
      verdict: verdicts[Math.floor(Math.random() * verdicts.length)],
      _topic: effort === 'good' ? 'progreso_global' : effort === 'heavy' ? 'recuperacion' : effort === 'failure' ? 'recuperacion' : 'comparativa',
      proximo_objetivo: prCount > 0 ? `Lograste ${prCount} PR${prCount > 1 ? 's' : ''} — apunta a superarlos en 2 semanas` : volume > 0 ? `Acumula ${Math.round(volume * 1.05)} kg de volumen total la próxima vez` : 'Mantén la constancia esta semana',
      recommendations: recommendations[effortKey] || defaultRecs,
      rotation_topic: effort === 'good' ? 'progreso' : 'recuperación',
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
    <div class="no-program-wrapper">
      <div class="eyebrow">Bienvenido</div>
      <div class="hero-title">Entrenemos.</div>
      <GlowCard blobColor={accent} padding="24px">
        <div class="onboard-icon" style="background:{accent}1a;border-color:{accent}33">🔒</div>
        <div class="onboard-heading">Tus datos, solo en tu teléfono</div>
        <div class="onboard-desc">Esta app no almacena nada en servidores. Todo lo que registras — ejercicios, pesos, programas — vive únicamente en este celular.</div>
        <div class="onboard-backup-card">
          <div class="onboard-backup-title">
            <span>📋</span>
            <span>No pierdas tu progreso</span>
          </div>
          <div class="onboard-backup-desc">Haz un respaldo cada 2 semanas desde <strong style="color:{accent}">Perfil → Datos → Exportar</strong>. Así siempre podrás recuperar tu historial si algo le pasa al teléfono.</div>
        </div>
        <button id="empty-state-start" class="btn-onboard" style="background:{accent};color:#0a0a0a" onclick={() => goto('/you')}>
          Comenzar
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
        </button>
      </GlowCard>
      <div class="bottom-spacer">
        <div class="hint-text">Toca Comenzar para configurar tu rutina</div>
      </div>
    </div>
  {:else if isRestDay}
    <div class="page-top">
      <div class="eyebrow">Hoy</div>
      <div class="hero-title">Descanso.</div>
    </div>
    <div class="rest-card-wrapper">
      <GlowCard blobColor="#9bd1ff" padding="28px">
        <span class="pill" style="background:rgba(155,209,255,0.15);color:#9bd1ff">DESCANSO</span>
        <div class="rest-title">La recuperación es donde creces.</div>
        <div class="rest-desc">Sin pesas hoy. Tómalo con calma{weekObj ? ' y prepara tu cuerpo para la ' + (weekIdx >= 2 ? 'Semana A' : 'próxima sesión') : ''}.</div>
      </GlowCard>
    </div>
    <div class="recovery-header">
      <div class="section-label" style="--accent:#9bd1ff">Lista de recuperación</div>
    </div>
    <div class="tip-list">
      {#each RECOVERY_TIPS as tip}
        <div class="recovery-card">
          <div class="recovery-icon">{tip.icon}</div>
          <div class="flex-1">
            <div class="recovery-title">{tip.title}</div>
            <div class="recovery-desc">{tip.body}</div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    {#if phase === 'warmup' && !showWarmup}
      <div class="phase-header">
        <SectionLabel {accent}>Hoy en el gimnasio</SectionLabel>
        <div class="hero-row">
          <div class="hero-title">{day?.name || ''}</div>
          <div class="hero-actions">
            {#if weekObj}
              <span class="pill" style="background:{accent}1c;color:{accent}">{weekObj.name}{weekObj.tag ? ' · ' + weekObj.tag : ''}</span>
            {/if}
          </div>
        </div>
        <div class="hero-subtitle">{day?.subtitle || ''}</div>
      </div>

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
      <div class="phase-header">
        <div class="eyebrow-row">
          <span class="live-dot" style="background:{accent};box-shadow:0 0 8px {accent}"></span>
          Hoy en el gimnasio
        </div>
        <div class="hero-row">
          <div class="hero-title">{day?.name || ''}</div>
          <div class="hero-actions">
            {#if weekObj}
              <span class="pill" style="background:{accent}1c;color:{accent}">{weekObj.name}{weekObj.tag ? ' · ' + weekObj.tag : ''}</span>
            {/if}
            {#if startedAt && !endedAt}
              <div class="timer-wrapper">
                <svg width="64" height="64" class="timer-ring" style="transform:rotate(-90deg)">
                  <circle cx="32" cy="32" r="27" stroke="rgba(255,255,255,0.08)" stroke-width="5" fill="none"/>
                  <circle cx="32" cy="32" r="27" stroke="{accent}cc" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="{timerSweepPct * 169.65} 169.65" style="transition:stroke-dasharray 0.6s linear"/>
                </svg>
                <div class="timer-inner">
                  <div class="timer-value">{timerDisplay || '—'}</div>
                  <div class="timer-label">Tiempo</div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div class="hero-subtitle">{day?.subtitle || ''}</div>
      </div>

      {#if todayExercises.length > 0}
        <div data-phase="training" role="button" tabindex="0" class="training-card" style="border-color:{accent}66;box-shadow:0 8px 28px {accent}12" onclick={openTrainingDetail} onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTrainingDetail() } }}>
          <div class="between-row">
            <div class="phase-label">Fase 02</div>
            <span class="status-pill" style="background:{accent}1a;border-color:{accent}40;color:{accent}"><span class="live-dot-sm" style="background:{accent};box-shadow:0 0 6px {accent}"></span>Sigue</span>
          </div>
          <div class="training-card-body">
            <div class="training-title">Entrenamiento</div>
            <div class="training-subtitle">{exercisesTotal} ejercicios</div>
          </div>
          <div class="progress-row">
            <div class="progress-track">
              <div class="progress-fill" style="background:{accent};width:{exercisesTotal > 0 ? (todayExDone / exercisesTotal) * 100 : 0}%"></div>
            </div>
            <span class="progress-count" style="color:{todayExDone > 0 ? accent : 'rgba(255,255,255,0.45)'}">{todayExDone}/{exercisesTotal}</span>
          </div>
          {#if todayExercises.length > 0}
            <div class="exercise-list">
              {#each day.exercises as ex (ex.exerciseId)}
                {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                <ExerciseRow
                  name={getExerciseDisplayName(resolved) || resolved.name}
                  muscle={resolved.muscle || ''}
                  {imgUrl}
                  sets={ex.sets}
                  reps={ex.reps}
                  {accent}
                  onclick={() => openExerciseDetail(resolved)}
                />
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if showCoach || coachCardMode}
      <div class="coach-scroll">
        <div class="stats-grid">
          <StatBlock value={day?.exercises?.length || 0} label="Ejercicios" {accent} />
          <StatBlock value="—" label="Volumen" {accent} />
          <StatBlock value={0} label="PRs" {accent} />
        </div>
        {#if coachLoading}
          <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px">
            <div class="loading-row">
              <div class="loading-spinner-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
              </div>
              <span class="loading-text">Analizando tu entrenamiento…</span>
            </div>
          </GlowCard>
        {:else if coachResult}
          <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px" onclick={resetDay}>
            <div id="coach-card-regen">
              <div class="coach-header" style="color:{accent}">
                <span class="coach-header-icon" style="background:{accent}1f">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><circle cx="12" cy="12" r="10"/></svg>
                </span>
                Resumen del coach
              </div>
              <div class="analysis-text">{coachResult.analysis || ''}</div>
              {#if coachResult.proximo_objetivo}
                <div class="objective-box" style="border-color:{accent}3a;background:{accent}0d">
                  <div class="objective-label" style="color:{accent}">Próximo Objetivo</div>
                  <div class="objective-text" style="color:{accent}">{coachResult.proximo_objetivo}</div>
                </div>
              {/if}
              {#if coachResult.recommendations?.length > 0}
                <div class="rec-chips">
                  {#each coachResult.recommendations.slice(0, 5) as rec}
                    <span class="rec-chip" style="background:{accent}16;border-color:{accent}3a;color:{accent}"><span class="rec-dot" style="background:{accent}"></span>{rec}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </GlowCard>
        {/if}
        <button id="coach-card-reset" class="btn-reset" onclick={resetDay}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M13 8a5 5 0 11-1.5-3.6M13 2v3h-3" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Reiniciar día
        </button>
      </div>
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
  <div class="dialog-center">
    <div class="dialog-emoji">🧑‍🏫</div>
    <div class="dialog-title">¿Cómo sentiste la sesión?</div>
    <div class="dialog-desc">Esto ayuda a Pedro a darte mejor feedback</div>
  </div>
  <div class="stack">
    {#each [['easy', '💪', 'Fácil', 'Podía más, para subir peso'], ['good', '👍', 'Justo', 'Peso correcto, lo planeado'], ['heavy', '😮‍💨', 'Pesado', 'Me costó trabajo'], ['failure', '🛑', 'Al fallo', 'Llegué al fallo muscular, no daba más']] as [eff, emoji, label, desc]}
      <button class="effort-btn" data-effort={eff} onclick={() => onEffort(eff)}>
        <div class="effort-emoji" style="background:{accent}1a;border-color:{accent}33">{emoji}</div>
        <div>
          <div class="effort-label">{label}</div>
          <div class="effort-desc">{desc}</div>
        </div>
      </button>
    {/each}
  </div>
</CenterDialog>

{#if streakModalShow}
  <div class="streak-overlay">
    <div class="stack-center">
      <div class="streak-flame">🔥</div>
      <div class="streak-count">{streakCount}</div>
      <div class="streak-subtitle">Días consecutivos</div>
      <div class="streak-encourage" style="color:{accent}">¡Sigue así!</div>
    </div>
  </div>
{/if}

<style>
  .today-page { height: 100%; box-sizing: border-box; padding: 58px 16px 104px; display: flex; flex-direction: column; }
  .eyebrow { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .hero-title { font-family: 'Space Grotesk', sans-serif; font-size: 42px; font-weight: 700; color: #fafafa; letter-spacing: -1.8px; line-height: 1; margin-top: 6px; }
  .hero-subtitle { margin-top: 5px; font-size: 13px; color: rgba(255,255,255,0.5); }
  .hero-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 7px; }
  .hero-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .eyebrow-row { display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
  .live-dot-sm { width: 5px; height: 5px; border-radius: 50%; display: inline-block; }
  .phase-header { flex-shrink: 0; padding: 0 4px 2px; }
  .phase-list { flex: 1; min-height: 0; margin-top: 16px; display: flex; flex-direction: column; gap: 11px; }
  .page-top { padding: 58px 20px 0; }
  .rest-card-wrapper { padding: 20px; margin-top: 8px; }
  .rest-title { margin-top: 12px; font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 700; color: #fafafa; letter-spacing: -1px; line-height: 1.1; }
  .rest-desc { margin-top: 8px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.5; }
  .recovery-header { margin-top: 18px; margin-bottom: 12px; }
  .tip-list { display: flex; flex-direction: column; gap: 10px; padding: 0 20px; }
  .recovery-card { display: flex; gap: 14px; padding: 14px; background: #141414; border-radius: 16px; border: 0.5px solid rgba(255,255,255,0.06); align-items: center; }
  .recovery-icon { font-size: 26px; }
  .recovery-title { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600; color: #fafafa; }
  .recovery-desc { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; }
  .no-program-wrapper { flex: 1; display: flex; flex-direction: column; padding: 58px 20px 0; }
  .onboard-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; border: 0.5px solid; }
  .onboard-heading { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; color: #fafafa; letter-spacing: -0.6px; line-height: 1.15; }
  .onboard-desc { margin-top: 10px; font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.55; }
  .onboard-backup-card { margin-top: 18px; padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 0.5px solid rgba(255,255,255,0.06); }
  .onboard-backup-title { display: flex; align-items: center; gap: 8px; font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.2px; }
  .onboard-backup-desc { margin-top: 6px; font-size: 12.5px; color: rgba(255,255,255,0.5); line-height: 1.5; }
  .btn-onboard { margin-top: 20px; width: 100%; padding: 15px; border-radius: 14px; border: none; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: -0.2px; }
  .bottom-spacer { margin-top: auto; text-align: center; padding: 24px 0 30px; }
  .hint-text { font-size: 12px; color: rgba(255,255,255,0.3); font-family: 'JetBrains Mono', monospace; letter-spacing: 1px; }
  .flex-1 { flex: 1; }
  .training-card { flex-shrink: 0; margin-top: 16px; display: flex; flex-direction: column; border-radius: 22px; cursor: pointer; padding: 18px 18px 16px; background: #141414; border: 0.5px solid; }
  .between-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .phase-label { display: flex; align-items: center; gap: 7px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,0.42); font-weight: 600; }
  .status-pill { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 9999px; border: 0.5px solid; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; font-weight: 600; }
  .training-card-body { margin-top: 8px; }
  .training-title { font-family: 'Space Grotesk', sans-serif; font-size: 27px; font-weight: 700; color: #fafafa; letter-spacing: -0.8px; line-height: 1; }
  .training-subtitle { margin-top: 4px; font-size: 12.5px; color: rgba(255,255,255,0.5); }
  .progress-row { margin-top: 12px; display: flex; align-items: center; gap: 7px; }
  .progress-track { flex: 1; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 2px; transition: width 0.4s; }
  .progress-count { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.4px; }
  .exercise-list { margin-top: 14px; display: flex; flex-direction: column; gap: 6px; position: relative; z-index: 1; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .coach-scroll { flex: 1; min-height: 0; overflow-y: auto; margin-top: 16px; }
  .loading-row { display: flex; align-items: center; gap: 10px; }
  .loading-spinner-wrap { width: 20px; text-align: center; }
  .spinner { animation: spin 1s linear infinite; }
  .loading-text { font-size: 13px; color: rgba(255,255,255,0.55); }
  .coach-header { display: flex; align-items: center; gap: 7px; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 600; }
  .coach-header-icon { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; }
  .analysis-text { margin-top: 12px; font-size: 14.5px; line-height: 1.55; color: rgba(255,255,255,0.9); font-family: 'Space Grotesk', sans-serif; letter-spacing: -0.1px; }
  .objective-box { margin-top: 14px; padding: 12px 14px; border-radius: 14px; border: 0.5px solid; }
  .objective-label { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .objective-text { font-size: 16px; line-height: 1.5; font-family: 'Space Grotesk', sans-serif; font-weight: 600; letter-spacing: -0.4px; }
  .rec-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
  .rec-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9999px; border: 0.5px solid; font-family: 'Space Grotesk', sans-serif; font-size: 11.5px; font-weight: 600; }
  .rec-dot { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }
  .btn-reset { margin-top: 16px; width: 100%; padding: 13px; border-radius: 12px; cursor: pointer; background: transparent; border: 0.5px solid rgba(255,255,255,0.12); color: rgba(255,255,255,0.6); font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 600; letter-spacing: -0.1px; display: flex; align-items: center; justify-content: center; gap: 7px; }
  .timer-wrapper { width: 64px; height: 64px; position: relative; flex-shrink: 0; background: transparent; border: 0; padding: 0; }
  .timer-ring { position: absolute; inset: 0; }
  .timer-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .timer-value { font-family: 'JetBrains Mono', monospace; font-size: 13px; font-weight: 500; color: #fafafa; letter-spacing: -0.4px; line-height: 1; font-variant-numeric: tabular-nums; }
  .timer-label { font-family: 'JetBrains Mono', monospace; font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-top: 3px; }
  .dialog-center { text-align: center; margin-bottom: 20px; }
  .dialog-emoji { font-size: 32px; margin-bottom: 8px; }
  .dialog-title { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; color: #fafafa; letter-spacing: -0.3px; }
  .dialog-desc { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 6px; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .effort-btn { padding: 14px; border-radius: 14px; border: 0.5px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.04); cursor: pointer; text-align: left; display: flex; align-items: center; gap: 12px; color: inherit; transition: all 0.15s; width: 100%; }
  .effort-emoji { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; border: 0.5px solid; flex-shrink: 0; }
  .effort-label { font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; color: #fafafa; }
  .effort-desc { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .streak-overlay { position: fixed; inset: 0; z-index: 300; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fadeIn 0.3s ease; }
  .stack-center { display: flex; flex-direction: column; align-items: center; }
  .streak-flame { font-size: 80px; line-height: 1; animation: flameBounce 0.6s ease infinite alternate; }
  .streak-count { font-family: 'Space Grotesk', sans-serif; font-size: 96px; font-weight: 700; color: #fafafa; letter-spacing: -4px; line-height: 1; margin-top: 4px; }
  .streak-subtitle { font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 6px; }
  .streak-encourage { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 600; margin-top: 14px; opacity: 1; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes flameBounce { from { transform: translateY(0); } to { transform: translateY(-8px); } }
</style>
