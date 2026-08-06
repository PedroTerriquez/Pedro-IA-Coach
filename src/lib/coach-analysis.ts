import { getLogsForDate, getLogsForExercise, getAllLogs, getSettings } from '$lib/storage'
import { PUSH_SERVER_URL } from '$lib/config'
import { buildCoachPrompt } from '$lib/brain/prompts'
import { buildUserProfile } from '$lib/ai'
import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
import type { Exercise, ExerciseLog, ProgramDay } from '$lib/types'

export interface CoachAnalysisResult {
  date: string
  weekIdx: number
  effort: string
  analysis: string
  verdict: string
  proximo_objetivo: string
  recommendations: string[]
  rotation_topic: string
  total_volume: number
  pr_count: number
  streak_days: number
  _provider?: string
}

const ROTATION_TOPICS = ['comparativa', 'racha', 'esfuerzo_volumen', 'recuperacion', 'progreso_global', 'retrospectiva_semanal']

function getMonday(date: Date): Date {
  const d = new Date(date)
  const monOffset = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - monOffset)
  d.setHours(12, 0, 0, 0)
  return d
}

function formatDateYMD(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function logVolume(log: ExerciseLog): number {
  if (Array.isArray(log.blocks) && log.blocks.length > 0) {
    return log.blocks.reduce((a, b) => a + b.sets * b.reps * b.weight, 0)
  }
  const reps = typeof log.reps === 'string' ? parseInt(log.reps) || 0 : (log.reps ?? 0)
  return log.weight * (log.sets ?? 0) * reps
}

function computeWeeklyVolumeHistory(logs: ExerciseLog[], todayDate: string, weeks = 6): { week_start: string; volume: number }[] {
  const today = new Date(todayDate + 'T12:00:00Z')
  const currentMonday = getMonday(today)
  const result: { week_start: string; volume: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(currentMonday)
    weekStart.setDate(weekStart.getDate() - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    let volume = 0
    for (const log of logs) {
      if (log.weight <= 0) continue
      const d = new Date(log.date + 'T12:00:00Z')
      if (d >= weekStart && d < weekEnd) volume += logVolume(log)
    }
    result.push({ week_start: formatDateYMD(weekStart), volume: Math.round(volume) })
  }
  return result
}

function computeMonthlyVolumeHistory(logs: ExerciseLog[], todayDate: string, months = 4): { month: string; volume: number }[] {
  const today = new Date(todayDate + 'T12:00:00Z')
  const result: { month: string; volume: number }[] = []
  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    let volume = 0
    for (const log of logs) {
      if (log.weight <= 0) continue
      const d = new Date(log.date + 'T12:00:00Z')
      if (d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()) volume += logVolume(log)
    }
    result.push({ month: monthKey, volume: Math.round(volume) })
  }
  return result
}

function computeStreakDays(logs: ExerciseLog[], todayDate: string): number {
  const trained = new Set<string>()
  for (const log of logs) {
    if (log.weight > 0) trained.add(log.date)
  }
  const today = new Date(todayDate + 'T12:00:00Z')
  const currentMonday = getMonday(today)
  let streak = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(currentMonday)
    d.setDate(currentMonday.getDate() + i)
    if (d > today) break
    if (trained.has(formatDateYMD(d))) streak++
  }
  let weekStart = new Date(currentMonday)
  weekStart.setDate(weekStart.getDate() - 7)
  while (true) {
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(weekStart.getDate() + i)
      if (trained.has(formatDateYMD(d))) count++
    }
    if (count >= 4) { streak += 7; weekStart.setDate(weekStart.getDate() - 7) }
    else break
  }
  return streak
}

export async function runCoachAnalysis(
  day: ProgramDay,
  effort: string,
  exercises: Exercise[],
  todayDate: string,
  weekIdx: number
): Promise<CoachAnalysisResult | null> {
  const exercisesById = Object.fromEntries(exercises.map(e => [e.id, e]))
  const todayLogs = await getLogsForDate(todayDate)
  const allLogs = await getAllLogs()

  let volume = 0
  let prCount = 0
  const exerciseSummaries: any[] = []
  const exIds = [...new Set(todayLogs.map(l => l.exerciseId))]
  for (const exId of exIds) {
    const todayLog = todayLogs.find(l => l.exerciseId === exId && l.weight > 0)
    if (!todayLog) continue
    const progEx = day.exercises.find(e => e.exerciseId === exId)
    const sets = todayLog.sets ?? progEx?.sets ?? 0
    let reps: any = todayLog.reps ?? progEx?.reps ?? 0
    if (typeof reps === 'string') reps = parseInt(reps) || 0
    const hasBlocks = Array.isArray(todayLog.blocks) && todayLog.blocks.length > 0
    volume += hasBlocks
      ? todayLog.blocks!.reduce((a, b) => a + b.sets * b.reps * b.weight, 0)
      : todayLog.weight * sets * reps

    const allExLogs = await getLogsForExercise(exId)
    const prevLogs = allExLogs.filter(l => l.date !== todayDate && l.weight > 0)
    const previousBest = prevLogs.length > 0 ? Math.max(...prevLogs.map(l => l.weight)) : null
    // Strict >: matching (not beating) the previous best is a tie, not a new PR —
    // otherwise the same weight repeated across sessions gets counted as a PR every time.
    const isPR = previousBest !== null && todayLog.weight > previousBest
    if (isPR) prCount++

    exerciseSummaries.push({
      name: getExerciseDisplayName(exercisesById[exId] || {}) || 'Ejercicio',
      weight: todayLog.weight,
      sets,
      reps,
      blocks: hasBlocks ? todayLog.blocks : undefined,
      previous_best: previousBest,
      is_pr: isPR,
    })
  }

  const trainedDates = new Set(allLogs.filter(l => l.weight > 0).map(l => l.date))
  const rotationHint = ROTATION_TOPICS[trainedDates.size % ROTATION_TOPICS.length]
  const roundedVolume = Math.round(volume)
  const streakDays = computeStreakDays(allLogs, todayDate)

  try {
    if (!PUSH_SERVER_URL) throw new Error('PUSH_SERVER_URL not configured')

    const settings = await getSettings()
    const userProfile = buildUserProfile(settings)

    const sessionData = {
      date: todayDate,
      day_name: day.name,
      effort,
      total_volume: roundedVolume,
      pr_count: prCount,
      exercises: exerciseSummaries,
      rotation_hint: rotationHint,
      user_profile: userProfile,
      history: {
        streak_days: streakDays,
        total_workout_days: trainedDates.size,
        weekly_volume_last_6_weeks: computeWeeklyVolumeHistory(allLogs, todayDate),
        monthly_volume_last_4_months: computeMonthlyVolumeHistory(allLogs, todayDate),
      },
    }

    const res = await fetch(`${PUSH_SERVER_URL}/api/ai/coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionData, systemPrompt: buildCoachPrompt('es') })
    })

    const data = await res.json()
    if (!res.ok || data.error || !data.analysis) throw new Error(data.error || `AI coach failed: ${res.status}`)

    return {
      date: todayDate,
      weekIdx,
      effort,
      analysis: data.analysis,
      verdict: data.verdict || 'neutral',
      proximo_objetivo: data.proximo_objetivo || '',
      recommendations: data.recommendations || [],
      rotation_topic: data.rotation_topic || rotationHint,
      total_volume: roundedVolume,
      pr_count: prCount,
      streak_days: streakDays,
      _provider: data._provider,
    }
  } catch {
    // No connection / AI failure: don't invent a canned analysis, let the caller
    // show a proper "couldn't connect" state instead of fake generic text.
    return null
  }
}
