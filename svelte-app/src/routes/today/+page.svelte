<script module lang="ts">
  declare function getExerciseDisplayName(ex: any): string
  declare function resolvePanelItems(muscles: string[], mode: string): any[]
  declare function resolveExerciseMedia(exercise: any): { imgUrl: string; gifUrl: string | null }
  declare const RECOVERY_TIPS: { icon: string; title: string; body: string }[]
  declare function mountWarmupDetail(opts: any): void
</script>

<script lang="ts">
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

<div class="page" style="height:100%;box-sizing:border-box;padding:58px 16px 104px;display:flex;flex-direction:column">
  {#if !loaded}
    <div style="padding:60px 20px;text-align:center;font-size:13px;color:rgba(255,255,255,0.4)">Cargando...</div>
  {:else if noProgram}
    <div style="flex:1;display:flex;flex-direction:column;padding:58px 20px 0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:{accent};text-transform:uppercase;font-weight:600">Bienvenido</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:1;margin-top:6px">Entrenemos.</div>
      <div style="margin-top:20px;padding:24px;border-radius:22px;background:linear-gradient(155deg,#1a1a1a 0%,#0e0e0e 100%);border:0.5px solid rgba(255,255,255,0.08);position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:{accent};opacity:0.08;filter:blur(60px);pointer-events:none"></div>
        <div style="position:relative;z-index:1">
          <div style="width:40px;height:40px;border-radius:12px;background:{accent}1a;display:flex;align-items:center;justify-content:center;font-size:20px;margin-bottom:14px;border:0.5px solid {accent}33">🔒</div>
          <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.6px;line-height:1.15">Tus datos, solo en tu teléfono</div>
          <div style="margin-top:10px;font-size:13.5px;color:rgba(255,255,255,0.6);line-height:1.55">Esta app no almacena nada en servidores. Todo lo que registras — ejercicios, pesos, programas — vive únicamente en este celular.</div>
          <div style="margin-top:18px;padding:14px;border-radius:14px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.06)">
            <div style="display:flex;align-items:center;gap:8px;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.2px">
              <span>📋</span>
              <span>No pierdas tu progreso</span>
            </div>
            <div style="margin-top:6px;font-size:12.5px;color:rgba(255,255,255,0.5);line-height:1.5">Haz un respaldo cada 2 semanas desde <strong style="color:{accent}">Perfil → Datos → Exportar</strong>. Así siempre podrás recuperar tu historial si algo le pasa al teléfono.</div>
          </div>
          <button id="empty-state-start" style="margin-top:20px;width:100%;padding:15px;border-radius:14px;border:none;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;letter-spacing:-0.2px" onclick={() => goto('/you')}>
            Comenzar
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
          </button>
        </div>
      </div>
      <div style="margin-top:auto;text-align:center;padding:24px 0 30px">
        <div style="font-size:12px;color:rgba(255,255,255,0.3);font-family:'JetBrains Mono',monospace;letter-spacing:1px">Toca Comenzar para configurar tu rutina</div>
      </div>
    </div>
  {:else if isRestDay}
    <div style="padding:58px 20px 0">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:{accent};text-transform:uppercase;font-weight:600">Hoy</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:1;margin-top:6px">Descanso.</div>
    </div>
    <div style="padding:20px;margin-top:8px">
      <div style="padding:28px;border-radius:24px;background:linear-gradient(155deg,#1a1a1a 0%,#0e0e0e 100%);border:0.5px solid rgba(255,255,255,0.08);position:relative;overflow:hidden">
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border-radius:50%;background:#9bd1ff;opacity:0.1;filter:blur(60px)"></div>
        <div style="position:relative;z-index:1">
          <span class="pill" style="background:rgba(155,209,255,0.15);color:#9bd1ff">DESCANSO</span>
          <div style="margin-top:12px;font-family:'Space Grotesk',sans-serif;font-size:30px;font-weight:700;color:#fafafa;letter-spacing:-1px;line-height:1.1">La recuperación es donde creces.</div>
          <div style="margin-top:8px;font-size:13px;color:rgba(255,255,255,0.55);line-height:1.5">Sin pesas hoy. Tómalo con calma{weekObj ? ' y prepara tu cuerpo para la ' + (weekIdx >= 2 ? 'Semana A' : 'próxima sesión') : ''}.</div>
        </div>
      </div>
    </div>
    <div style="margin-top:18px;margin-bottom:12px">
      <div class="section-label" style="--accent:#9bd1ff">Lista de recuperación</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;padding:0 20px">
      {#each RECOVERY_TIPS as tip}
        <div style="display:flex;gap:14px;padding:14px;background:#141414;border-radius:16px;border:0.5px solid rgba(255,255,255,0.06);align-items:center">
          <div style="font-size:26px">{tip.icon}</div>
          <div style="flex:1">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:#fafafa">{tip.title}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.55);margin-top:2px">{tip.body}</div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    {#if phase === 'warmup' && !showWarmup}
      <div style="flex-shrink:0;padding:0 4px 2px">
        <div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:{accent};text-transform:uppercase;font-weight:600">
          <span style="width:6px;height:6px;border-radius:50%;background:{accent};box-shadow:0 0 8px {accent};animation:pulse 2s infinite;display:inline-block"></span>
          Hoy en el gimnasio
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:7px">
          <div style="font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:0.98">{day?.name || ''}</div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            {#if weekObj}
              <span class="pill" style="background:{accent}1c;color:{accent};margin-bottom:4px">{weekObj.name}{weekObj.tag ? ' · ' + weekObj.tag : ''}</span>
            {/if}
          </div>
        </div>
        <div style="margin-top:5px;font-size:13px;color:rgba(255,255,255,0.5)">{day?.subtitle || ''}</div>
      </div>

      <div style="flex:1;min-height:0;margin-top:16px;display:flex;flex-direction:column;gap:11px">
        {#if hasWarmup}
          <div data-phase="warmup" style="flex:1;min-height:0;position:relative;overflow:hidden;border-radius:22px;cursor:pointer;padding:18px 18px 16px;box-sizing:border-box;background:#141414;border:0.5px solid {accent}66;box-shadow:0 8px 28px {accent}12;display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.3s, box-shadow 0.3s, background 0.3s" onclick={() => showWarmup = true}>
            <div style="position:absolute;top:-70px;left:-40px;width:200px;height:200px;border-radius:50%;background:{accent};opacity:0.07;filter:blur(60px);pointer-events:none"></div>
            <div style="position:absolute;right:-18px;bottom:-22px;opacity:0.05;color:{accent};pointer-events:none">
              <svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M10 17.5c3.31 0 6-2.69 6-6 0-2.5-1.5-4.5-3-6-1 1.5-2 2-2 2s-1-2.5-1-5c-2 1.5-6 4-6 9 0 3.31 2.69 6 6 6z" stroke="{accent}" stroke-width="1.4" stroke-linejoin="round" fill="{accent}" fill-opacity="0.12"/></svg>
            </div>
            <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600">
                <span>Fase 01</span>
              </div>
              <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:{accent}1a;border:0.5px solid {accent}40;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;color:{accent}"><span style="width:5px;height:5px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent};display:inline-block"></span>Sigue</span>
            </div>
            <div style="position:relative;z-index:1">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">Calentamiento</div>
              <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Activación dinámica</div>
            </div>
            <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
              <div style="min-width:0">
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.3px;color:rgba(255,255,255,0.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{warmupItems.length} movimientos</div>
              </div>
              <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:{accent};box-shadow:0 8px 22px {accent}55;border:0">
                <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="#0a0a0a"/></svg>
              </div>
            </div>
          </div>
        {/if}

        {#if todayExercises.length > 0}
          <div data-phase="training" style="flex:1;min-height:0;position:relative;overflow:hidden;border-radius:22px;cursor:pointer;padding:18px 18px 16px;box-sizing:border-box;background:#141414;border:0.5px solid {hasWarmup && !warmupDone ? 'rgba(255,255,255,0.08)' : `${accent}66`};box-shadow:{hasWarmup && !warmupDone ? 'none' : `0 8px 28px ${accent}12`};display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.3s, box-shadow 0.3s, background 0.3s;opacity:{hasWarmup && !warmupDone ? 0.55 : 1}" onclick={openTrainingDetail}>
            {#if !(hasWarmup && !warmupDone)}
              <div style="position:absolute;top:-70px;left:-40px;width:200px;height:200px;border-radius:50%;background:{accent};opacity:0.07;filter:blur(60px);pointer-events:none"></div>
            {/if}
            <div style="position:absolute;right:-18px;bottom:-22px;opacity:0.05;color:{accent};pointer-events:none">
              <svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M3 7v6M5.5 5.5v9M14.5 5.5v9M17 7v6M5.5 10h9" stroke="{accent}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600">
                <span>Fase 02</span>
              </div>
              {#if todayExDone >= exercisesTotal}
                <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border-radius:9999px;background:{accent};font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:#0a0a0a;box-shadow:0 4px 12px {accent}55"><svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Completado</span>
              {:else if !(hasWarmup && !warmupDone)}
                <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:{accent}1a;border:0.5px solid {accent}40;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;color:{accent}"><span style="width:5px;height:5px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent};display:inline-block"></span>Sigue</span>
              {/if}
            </div>
            <div style="position:relative;z-index:1">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">Entrenamiento</div>
              <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{day?.subtitle || `${exercisesTotal} ejercicios`}</div>
            </div>
            <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
              <div style="min-width:0">
                <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.3px;color:rgba(255,255,255,0.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{day?.subtitle || `${exercisesTotal} ejercicios`}</div>
                <div style="margin-top:7px;display:flex;align-items:center;gap:7px">
                  <div style="width:64px;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden">
                    <div style="height:100%;border-radius:2px;background:{accent};width:{exercisesTotal > 0 ? (todayExDone / exercisesTotal) * 100 : 0}%;transition:width 0.4s"></div>
                  </div>
                  <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:{todayExDone > 0 ? accent : 'rgba(255,255,255,0.45)'};letter-spacing:0.4px">{todayExDone}/{exercisesTotal}</span>
                </div>
              </div>
              <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:{hasWarmup && !warmupDone ? 'rgba(255,255,255,0.05)' : accent};border:{hasWarmup && !warmupDone ? '0.5px solid rgba(255,255,255,0.08)' : '0'};box-shadow:{hasWarmup && !warmupDone ? 'none' : `0 8px 22px ${accent}55`};transition:all 0.2s">
                {#if hasWarmup && !warmupDone}
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="rgba(255,255,255,0.25)"/></svg>
                {:else if todayExDone >= exercisesTotal}
                  <svg width="22" height="17" viewBox="0 0 22 17" fill="none"><path d="M1 9l6.5 6.5L21 1.5" stroke="{accent}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {:else}
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="#0a0a0a"/></svg>
                {/if}
              </div>
            </div>
          </div>
        {/if}

        {#if hasStretch}
          {#if stretchDone}
            <div data-phase="stretch" style="flex:1;min-height:0;position:relative;overflow:hidden;border-radius:22px;cursor:pointer;padding:18px 18px 16px;box-sizing:border-box;background:linear-gradient(150deg, #c89bff1f 0%, #131313 60%);border:1px solid #c89bff;box-shadow:0 0 0 4px #c89bff12, 0 10px 30px #c89bff1a;display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.3s, box-shadow 0.3s, background 0.3s" onclick={() => showStretch = true}>
              <div style="position:absolute;right:-18px;bottom:-22px;opacity:0.16;color:#c89bff;pointer-events:none">
                <svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M10 17c3.5-2 7-5 7-9 0-1-.5-2-1.5-3-3 2-7 4-7 9 0 1 .5 2 1.5 3z" stroke="#c89bff" stroke-width="1.4" stroke-linejoin="round" fill="#c89bff" fill-opacity="0.12"/><path d="M10 17c-3.5-2-7-5-7-9 0-1 .5-2 1.5-3 3 2 7 4 7 9 0 1-.5 2-1.5 3z" stroke="#c89bff" stroke-width="1.4" stroke-linejoin="round" fill="#c89bff" fill-opacity="0.05"/></svg>
              </div>
              <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px">
                <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:#c89bff;font-weight:600"><span>Fase 03</span></div>
                <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px 4px 7px;border-radius:9999px;background:#c89bff;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;color:#0a0a0a;box-shadow:0 4px 12px #c89bff55"><svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>Completado</span>
              </div>
              <div style="position:relative;z-index:1">
                <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">Estiramiento</div>
                <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Enfriamiento estático</div>
              </div>
              <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
                <div style="min-width:0">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.3px;color:rgba(255,255,255,0.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{stretchItems.length} movimientos</div>
                </div>
                <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:1.5px solid #c89bff;box-shadow:none">
                  <svg width="22" height="17" viewBox="0 0 22 17" fill="none"><path d="M1 9l6.5 6.5L21 1.5" stroke="#c89bff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </div>
              </div>
            </div>
          {:else if !warmupDone}
            <div id="today-locked-warmup-stretch" style="flex:1;min-height:0;border-radius:22px;padding:18px 18px 16px;box-sizing:border-box;background:rgba(255,255,255,0.02);border:0.5px dashed rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/></svg>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:-0.2px;line-height:1.3">Termina el calentamiento primero</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.4">Tus estiramientos aparecerán cuando completes todos los ejercicios.</div>
            </div>
          {:else if todayExDone < exercisesTotal}
            <div id="today-locked-training-stretch" style="flex:1;min-height:0;border-radius:22px;padding:18px 18px 16px;box-sizing:border-box;background:rgba(255,255,255,0.02);border:0.5px dashed rgba(255,255,255,0.12);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;text-align:center">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/><path d="M5 7V5a3 3 0 016 0v2" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/></svg>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:600;color:rgba(255,255,255,0.5);letter-spacing:-0.2px;line-height:1.3">Termina el entrenamiento primero</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.4">Completa los {exercisesTotal - todayExDone} ejercicio(s) restante(s) para ver tus estiramientos.</div>
            </div>
          {:else}
            <div data-phase="stretch" style="flex:1;min-height:0;position:relative;overflow:hidden;border-radius:22px;cursor:pointer;padding:18px 18px 16px;box-sizing:border-box;background:#141414;border:0.5px solid #c89bff66;box-shadow:0 8px 28px #c89bff12;display:flex;flex-direction:column;justify-content:space-between;transition:border-color 0.3s, box-shadow 0.3s, background 0.3s" onclick={() => showStretch = true}>
              <div style="position:absolute;top:-70px;left:-40px;width:200px;height:200px;border-radius:50%;background:#c89bff;opacity:0.07;filter:blur(60px);pointer-events:none"></div>
              <div style="position:absolute;right:-18px;bottom:-22px;opacity:0.05;color:#c89bff;pointer-events:none">
                <svg width="150" height="150" viewBox="0 0 20 20" fill="none"><path d="M10 17c3.5-2 7-5 7-9 0-1-.5-2-1.5-3-3 2-7 4-7 9 0 1 .5 2 1.5 3z" stroke="#c89bff" stroke-width="1.4" stroke-linejoin="round" fill="#c89bff" fill-opacity="0.12"/><path d="M10 17c-3.5-2-7-5-7-9 0-1 .5-2 1.5-3 3 2 7 4 7 9 0 1-.5 2-1.5 3z" stroke="#c89bff" stroke-width="1.4" stroke-linejoin="round" fill="#c89bff" fill-opacity="0.05"/></svg>
              </div>
              <div style="position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;gap:8px">
                <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600"><span>Fase 03</span></div>
                <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:#c89bff1a;border:0.5px solid #c89bff40;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;color:#c89bff"><span style="width:5px;height:5px;border-radius:50%;background:#c89bff;box-shadow:0 0 6px #c89bff;display:inline-block"></span>Sigue</span>
              </div>
              <div style="position:relative;z-index:1">
                <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">Estiramiento</div>
                <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Enfriamiento estático</div>
              </div>
              <div style="position:relative;z-index:1;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
                <div style="min-width:0">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:0.3px;color:rgba(255,255,255,0.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{stretchItems.length} movimientos</div>
                </div>
                <div style="width:56px;height:56px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:#c89bff;box-shadow:0 8px 22px #c89bff55;border:0">
                  <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill="#0a0a0a"/></svg>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>
    {/if}

    {#if phase === 'training' && warmupDone && day && !showWarmup && !showStretch && !showCoach && !coachCardMode}
      <div style="flex-shrink:0;padding:0 4px 2px">
        <div style="display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.8px;color:{accent};text-transform:uppercase;font-weight:600">
          <span style="width:6px;height:6px;border-radius:50%;background:{accent};box-shadow:0 0 8px {accent};animation:pulse 2s infinite;display:inline-block"></span>
          Hoy en el gimnasio
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-top:7px">
          <div style="font-family:'Space Grotesk',sans-serif;font-size:42px;font-weight:700;color:#fafafa;letter-spacing:-1.8px;line-height:0.98">{day?.name || ''}</div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            {#if weekObj}
              <span class="pill" style="background:{accent}1c;color:{accent};margin-bottom:4px">{weekObj.name}{weekObj.tag ? ' · ' + weekObj.tag : ''}</span>
            {/if}
            {#if startedAt && !endedAt}
              <div style="width:64px;height:64px;position:relative;flex-shrink:0;background:transparent;border:0;padding:0">
                <svg width="64" height="64" style="transform:rotate(-90deg);position:absolute;inset:0">
                  <circle cx="32" cy="32" r="27" stroke="rgba(255,255,255,0.08)" stroke-width="5" fill="none"/>
                  <circle cx="32" cy="32" r="27" stroke="{accent}cc" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="{timerSweepPct * 169.65} 169.65" style="transition:stroke-dasharray 0.6s linear"/>
                </svg>
                <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:500;color:#fafafa;letter-spacing:-0.4px;line-height:1;font-variant-numeric:tabular-nums">{timerDisplay || '—'}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45);margin-top:3px">Tiempo</div>
                </div>
              </div>
            {/if}
          </div>
        </div>
        <div style="margin-top:5px;font-size:13px;color:rgba(255,255,255,0.5)">{day?.subtitle || ''}</div>
      </div>

      {#if todayExercises.length > 0}
        <div data-phase="training" style="flex-shrink:0;margin-top:16px;display:flex;flex-direction:column;border-radius:22px;cursor:pointer;padding:18px 18px 16px;background:#141414;border:0.5px solid {accent}66;box-shadow:0 8px 28px {accent}12" onclick={openTrainingDetail}>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600">
              <span>Fase 02</span>
            </div>
            <span style="display:inline-flex;align-items:center;gap:5px;padding:4px 9px;border-radius:9999px;background:{accent}1a;border:0.5px solid {accent}40;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;font-weight:600;color:{accent}"><span style="width:5px;height:5px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent};display:inline-block"></span>Sigue</span>
          </div>
          <div style="margin-top:8px">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:27px;font-weight:700;color:#fafafa;letter-spacing:-0.8px;line-height:1">Entrenamiento</div>
            <div style="margin-top:4px;font-size:12.5px;color:rgba(255,255,255,0.5)">{exercisesTotal} ejercicios</div>
          </div>
          <div style="margin-top:12px;display:flex;align-items:center;gap:7px">
            <div style="flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,0.1);overflow:hidden">
              <div style="height:100%;border-radius:2px;background:{accent};width:{exercisesTotal > 0 ? (todayExDone / exercisesTotal) * 100 : 0}%;transition:width 0.4s"></div>
            </div>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:{todayExDone > 0 ? accent : 'rgba(255,255,255,0.45)'};letter-spacing:0.4px">{todayExDone}/{exercisesTotal}</span>
          </div>
          {#if todayExercises.length > 0}
            <div style="margin-top:14px;display:flex;flex-direction:column;gap:6px;position:relative;z-index:1">
              {#each day.exercises as ex (ex.exerciseId)}
                {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                <div style="display:flex;align-items:center;gap:12px;padding:8px 0;{day.exercises.indexOf(ex) < day.exercises.length - 1 ? 'border-bottom:0.5px solid rgba(255,255,255,0.04)' : ''}">
                  <div style="width:44px;height:44px;flex-shrink:0;border-radius:10px;background:#0a0a0a;overflow:hidden">
                    {#if imgUrl}
                      <img src={imgUrl} alt="" style="width:100%;height:100%;object-fit:cover">
                    {:else}
                      <div style="width:100%;height:100%;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.018) 0 10px,rgba(255,255,255,0.05) 10px 20px)"></div>
                    {/if}
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{getExerciseDisplayName(resolved) || resolved.name}</div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px">{resolved.muscle || ''}</div>
                  </div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:rgba(255,255,255,0.7);flex-shrink:0;white-space:nowrap">{ex.sets}<span style="color:rgba(255,255,255,0.35);margin:0 2px">×</span>{ex.reps}</div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
    {/if}

    {#if showCoach || coachCardMode}
      <div style="flex:1;min-height:0;overflow-y:auto;margin-top:16px;">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">
          <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
            <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:#fafafa;letter-spacing:-1px;line-height:1">{day?.exercises?.length || 0}</div>
            <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">Ejercicios</div>
          </div>
          <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
            <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:#fafafa;letter-spacing:-1px;line-height:1">—</div>
            <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">Volumen</div>
          </div>
          <div style="background:#141414;border-radius:16px;padding:14px 12px;border:0.5px solid rgba(255,255,255,0.06);text-align:center">
            <div style="font-family:'JetBrains Mono',monospace;font-size:26px;font-weight:500;color:#fafafa;letter-spacing:-1px;line-height:1">0</div>
            <div style="margin-top:6px;font-family:'JetBrains Mono',monospace;font-size:8.5px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.45)">PRs</div>
          </div>
        </div>
        {#if coachLoading}
          <div style="margin-top:14px;border-radius:20px;padding:18px;background:linear-gradient(165deg,#181818 0%,#111 100%);border:0.5px solid {accent}2e;position:relative;overflow:hidden">
            <div style="position:absolute;top:-50px;right:-40px;width:180px;height:180px;border-radius:50%;background:{accent};opacity:0.08;filter:blur(55px);pointer-events:none"></div>
            <div style="position:relative;z-index:1">
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:20px;text-align:center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation:spin 1s linear infinite"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
                </div>
                <span style="font-size:13px;color:rgba(255,255,255,0.55)">Analizando tu entrenamiento…</span>
              </div>
            </div>
          </div>
        {:else if coachResult}
          <div id="coach-card-regen" style="margin-top:14px;border-radius:20px;padding:18px;background:linear-gradient(165deg,#181818 0%,#111 100%);border:0.5px solid {accent}2e;position:relative;overflow:hidden;cursor:pointer;transition:border-color 0.15s">
            <div style="position:absolute;top:-50px;right:-40px;width:180px;height:180px;border-radius:50%;background:{accent};opacity:0.08;filter:blur(55px);pointer-events:none"></div>
            <div style="position:relative;z-index:1">
              <div style="display:flex;align-items:center;gap:7px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.6px;text-transform:uppercase;color:{accent};font-weight:600">
                <span style="width:22px;height:22px;border-radius:7px;background:{accent}1f;display:inline-flex;align-items:center;justify-content:center">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><circle cx="12" cy="12" r="10"/></svg>
                </span>
                Resumen del coach
              </div>
              <div style="margin-top:12px;font-size:14.5px;line-height:1.55;color:rgba(255,255,255,0.9);font-family:'Space Grotesk',sans-serif;letter-spacing:-0.1px">{coachResult.analysis || ''}</div>
              {#if coachResult.proximo_objetivo}
                <div style="margin-top:14px;padding:12px 14px;border-radius:14px;border:0.5px solid {accent}3a;background:{accent}0d">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:9.5px;letter-spacing:1.4px;text-transform:uppercase;color:{accent};font-weight:600;margin-bottom:6px">Próximo Objetivo</div>
                  <div style="font-size:16px;line-height:1.5;color:{accent};font-family:'Space Grotesk',sans-serif;font-weight:600;letter-spacing:-0.4px">{coachResult.proximo_objetivo}</div>
                </div>
              {/if}
              {#if coachResult.recommendations?.length > 0}
                <div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:14px">
                  {#each coachResult.recommendations.slice(0, 5) as rec}
                    <span style="display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:9999px;background:{accent}16;border:0.5px solid {accent}3a;font-family:'Space Grotesk',sans-serif;font-size:11.5px;font-weight:600;color:{accent}"><span style="width:4px;height:4px;border-radius:50%;background:{accent};display:inline-block"></span>{rec}</span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/if}
        <button id="coach-card-reset" style="margin-top:16px;width:100%;padding:13px;border-radius:12px;cursor:pointer;background:transparent;border:0.5px solid rgba(255,255,255,0.12);color:rgba(255,255,255,0.6);font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;letter-spacing:-0.1px;display:flex;align-items:center;justify-content:center;gap:7px" onclick={resetDay}>
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

{#if effortModalShow}
  <div id="effort-overlay" style="position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:24px">
    <div style="background:#141414;border-radius:24px;padding:28px 24px;max-width:340px;width:100%;border:0.5px solid rgba(255,255,255,0.08);box-shadow:0 20px 60px rgba(0,0,0,0.5);animation:fadeUp 0.25s ease-out">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:32px;margin-bottom:8px">🧑‍🏫</div>
        <div style="font-family:'Space Grotesk',sans-serif;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.3px">¿Cómo sentiste la sesión?</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.5);margin-top:6px">Esto ayuda a Pedro a darte mejor feedback</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        {#each [['easy', '💪', 'Fácil', 'Podía más, para subir peso'], ['good', '👍', 'Justo', 'Peso correcto, lo planeado'], ['heavy', '😮‍💨', 'Pesado', 'Me costó trabajo'], ['failure', '🛑', 'Al fallo', 'Llegué al fallo muscular, no daba más']] as [eff, emoji, label, desc]}
          <button class="effort-btn" data-effort={eff} style="padding:14px;border-radius:14px;border:0.5px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.04);cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;color:inherit;transition:all 0.15s;width:100%" onclick={() => onEffort(eff)}>
            <div style="width:40px;height:40px;border-radius:10px;background:{accent}1a;display:flex;align-items:center;justify-content:center;font-size:20px;border:0.5px solid {accent}33">{emoji}</div>
            <div>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa">{label}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:2px">{desc}</div>
            </div>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

{#if streakModalShow}
  <div id="streak-overlay" style="position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn 0.3s ease">
    <div style="display:flex;flex-direction:column;align-items:center">
      <div style="font-size:80px;line-height:1;animation:flameBounce 0.6s ease infinite alternate">🔥</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:96px;font-weight:700;color:#fafafa;letter-spacing:-4px;line-height:1;margin-top:4px">{streakCount}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.5);margin-top:6px">Días consecutivos</div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:17px;font-weight:600;color:{accent};margin-top:14px;opacity:1">¡Sigue así!</div>
    </div>
  </div>
{/if}

{#if streakModalShow}
  <div style="display:none"></div>
{/if}
