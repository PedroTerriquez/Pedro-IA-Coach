import { getLogsForDate, getAllLogs, getSettings } from '$lib/storage'
import { PUSH_SERVER_URL } from '$lib/config'
import { buildCoachPrompt } from '$lib/brain/prompts'
import { buildUserProfile, recordIfDebug } from '$lib/ai'
import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
import { computeStreakWeeks } from '$lib/streak'
import type { Exercise, ExerciseLog, Program, ProgramDay } from '$lib/types'

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
  streak_weeks: number
  _provider?: string
}

const ROTATION_TOPICS = ['comparativa', 'racha', 'esfuerzo_volumen', 'recuperacion', 'progreso_global', 'retrospectiva_semanal']

const KG_PER_LB = 0.45359237

type Planned = Map<string, { sets: number; reps: number }>

// Logs can carry different units (kg vs lb) if the user toggled the setting over time.
// Every comparison/sum across logs must go through this so a unit switch never reads as a volume/PR spike.
function toKg(weight: number, units?: string): number {
  return units === 'lb' ? weight * KG_PER_LB : weight
}

function fromKg(weightKg: number, units?: string): number {
  return units === 'lb' ? weightKg / KG_PER_LB : weightKg
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function toReps(reps: unknown): number {
  return typeof reps === 'string' ? parseInt(reps) || 0 : typeof reps === 'number' ? reps : 0
}

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

function isTrained(log: ExerciseLog): boolean {
  return log.weight > 0
}

// Sets/reps the program asks for each exercise: today's day first, then the
// current week, then the rest. A log saved with «Registrar» has only the
// weight, so this fills in the rest.
function plannedByExercise(program: Program | null, weekIdx: number, today: ProgramDay): Planned {
  const planned: Planned = new Map()
  const weeks = program?.weeks || []
  const days = [today, ...[weeks[weekIdx], ...weeks].filter(Boolean).flatMap(w => w.days || [])]
  for (const day of days) {
    for (const ex of day.exercises || []) {
      if (!planned.has(ex.exerciseId)) planned.set(ex.exerciseId, { sets: ex.sets || 0, reps: toReps(ex.reps) })
    }
  }
  return planned
}

function logSets(log: ExerciseLog, planned: Planned): number {
  return log.sets ?? planned.get(log.exerciseId)?.sets ?? 0
}

function logReps(log: ExerciseLog, planned: Planned): number {
  return log.reps !== undefined ? toReps(log.reps) : planned.get(log.exerciseId)?.reps ?? 0
}

// The one volume rule (in kg) for today and for the history alike, so a past
// day isn't worth 0 just because it was logged without sets.
function logVolume(log: ExerciseLog, planned: Planned): number {
  if (Array.isArray(log.blocks) && log.blocks.length > 0) {
    // Blocks don't carry their own units; they inherit the log's unit.
    return log.blocks.reduce((a, b) => a + b.sets * b.reps * toKg(b.weight, log.units), 0)
  }
  return toKg(log.weight, log.units) * logSets(log, planned) * logReps(log, planned)
}

function sumVolume(logs: ExerciseLog[], planned: Planned): number {
  return logs.reduce((a, l) => a + logVolume(l, planned), 0)
}

function countDates(logs: ExerciseLog[]): number {
  return new Set(logs.map(l => l.date)).size
}

function logsBetween(logs: ExerciseLog[], from: Date, to: Date): ExerciseLog[] {
  return logs.filter(l => {
    const d = new Date(l.date + 'T12:00:00Z')
    return d >= from && d < to
  })
}

// Weeks are whole-week totals; the last one is still going (partial), so it
// must never be read as a drop.
function computeWeeklyVolumeHistory(logs: ExerciseLog[], planned: Planned, todayDate: string, displayUnits: string, weeks = 6) {
  const currentMonday = getMonday(new Date(todayDate + 'T12:00:00Z'))
  const result: { week_start: string; volume: number; sessions: number; partial: boolean }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = new Date(currentMonday)
    weekStart.setDate(weekStart.getDate() - w * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const inWeek = logsBetween(logs, weekStart, weekEnd)
    result.push({
      week_start: formatDateYMD(weekStart),
      volume: Math.round(fromKg(sumVolume(inWeek, planned), displayUnits)),
      sessions: countDates(inWeek),
      partial: w === 0,
    })
  }
  return result
}

function computeMonthlyVolumeHistory(logs: ExerciseLog[], planned: Planned, todayDate: string, displayUnits: string, months = 4) {
  const today = new Date(todayDate + 'T12:00:00Z')
  const result: { month: string; volume: number; sessions: number; partial: boolean }[] = []
  for (let m = months - 1; m >= 0; m--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - m, 1)
    const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`
    const inMonth = logs.filter(l => l.date.startsWith(monthKey))
    result.push({
      month: monthKey,
      volume: Math.round(fromKg(sumVolume(inMonth, planned), displayUnits)),
      sessions: countDates(inMonth),
      partial: m === 0,
    })
  }
  return result
}

function groupByDate(logs: ExerciseLog[]): Map<string, ExerciseLog[]> {
  const byDate = new Map<string, ExerciseLog[]>()
  for (const log of logs) byDate.set(log.date, [...(byDate.get(log.date) || []), log])
  return byDate
}

// A past date is "this same day" when most of what was logged then belongs
// to today's day of the program.
function isSameDay(dayLogs: ExerciseLog[], dayIds: Set<string>): boolean {
  const matched = dayLogs.filter(l => dayIds.has(l.exerciseId)).length
  return matched > 0 && matched * 2 >= dayLogs.length
}

// The fair yardstick for today's total_volume: whole sessions of this same day.
function computeSameDaySessions(logs: ExerciseLog[], planned: Planned, day: ProgramDay, todayDate: string, displayUnits: string, count = 4) {
  const dayIds = new Set(day.exercises.map(e => e.exerciseId))
  const past = [...groupByDate(logs.filter(l => l.date < todayDate))]
    .filter(([, dayLogs]) => isSameDay(dayLogs, dayIds))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-count)
  return past.map(([date, dayLogs]) => ({
    date,
    volume: Math.round(fromKg(sumVolume(dayLogs, planned), displayUnits)),
    exercises_logged: dayLogs.length,
  }))
}

function latestLog(logs: ExerciseLog[]): ExerciseLog | null {
  return logs.reduce<ExerciseLog | null>((a, l) => (!a || l.date > a.date ? l : a), null)
}

// The previous session of one exercise, in today's unit.
function lastSession(prevLogs: ExerciseLog[], planned: Planned, units: string) {
  const last = latestLog(prevLogs)
  if (!last) return null
  return {
    date: last.date,
    weight: round1(fromKg(toKg(last.weight, last.units), units)),
    sets: logSets(last, planned),
    reps: logReps(last, planned),
  }
}

function summarizeExercise(todayLog: ExerciseLog, prevLogs: ExerciseLog[], planned: Planned, exercise: Exercise | undefined) {
  const previousBestKg = prevLogs.length > 0 ? Math.max(...prevLogs.map(l => toKg(l.weight, l.units))) : null
  // Strict >: matching (not beating) the previous best is a tie, not a new PR —
  // otherwise the same weight repeated across sessions gets counted as a PR every time.
  // Compared in kg so a kg/lb toggle never masquerades as a new PR (or a spike).
  const isPR = previousBestKg !== null && toKg(todayLog.weight, todayLog.units) > previousBestKg
  const hasBlocks = Array.isArray(todayLog.blocks) && todayLog.blocks.length > 0
  return {
    name: getExerciseDisplayName(exercise || {}) || 'Ejercicio',
    weight: todayLog.weight,
    sets: logSets(todayLog, planned),
    reps: logReps(todayLog, planned),
    blocks: hasBlocks ? todayLog.blocks : undefined,
    // Shown next to today's weight, so in today's unit, not kg.
    previous_best: previousBestKg !== null ? round1(fromKg(previousBestKg, todayLog.units)) : null,
    last_session: lastSession(prevLogs, planned, todayLog.units),
    is_pr: isPR,
  }
}

export async function runCoachAnalysis(
  day: ProgramDay,
  effort: string,
  exercises: Exercise[],
  todayDate: string,
  weekIdx: number,
  daysPerWeek: number,
  program: Program | null = null
): Promise<CoachAnalysisResult | null> {
  const exercisesById = Object.fromEntries(exercises.map(e => [e.id, e]))
  const todayLogs = (await getLogsForDate(todayDate)).filter(isTrained)
  const allLogs = await getAllLogs()
  const trainedLogs = allLogs.filter(isTrained)
  const settings = await getSettings()
  const displayUnits = settings.units || 'kg'
  const planned = plannedByExercise(program, weekIdx, day)

  const exerciseSummaries = todayLogs.map(todayLog => {
    const prevLogs = trainedLogs.filter(l => l.exerciseId === todayLog.exerciseId && l.date < todayDate)
    return summarizeExercise(todayLog, prevLogs, planned, exercisesById[todayLog.exerciseId])
  })
  const prCount = exerciseSummaries.filter(e => e.is_pr).length

  const trainedDates = new Set(trainedLogs.map(l => l.date))
  const rotationHint = ROTATION_TOPICS[trainedDates.size % ROTATION_TOPICS.length]
  // Summed in kg-equivalent regardless of each log's stored unit; shown in the user's unit.
  const roundedVolume = Math.round(fromKg(sumVolume(todayLogs, planned), displayUnits))
  const streakWeeks = computeStreakWeeks(allLogs, daysPerWeek, todayDate)

  try {
    if (!PUSH_SERVER_URL) throw new Error('PUSH_SERVER_URL not configured')

    const userProfile = buildUserProfile(settings)

    const sessionData = {
      date: todayDate,
      day_name: day.name,
      effort,
      units: displayUnits,
      total_volume: roundedVolume,
      pr_count: prCount,
      exercises: exerciseSummaries,
      rotation_hint: rotationHint,
      user_profile: userProfile,
      history: {
        streak_weeks: streakWeeks,
        total_workout_days: trainedDates.size,
        same_day_last_sessions: computeSameDaySessions(trainedLogs, planned, day, todayDate, displayUnits),
        weekly_volume_last_6_weeks: computeWeeklyVolumeHistory(trainedLogs, planned, todayDate, displayUnits),
        monthly_volume_last_4_months: computeMonthlyVolumeHistory(trainedLogs, planned, todayDate, displayUnits),
      },
    }

    const url = `${PUSH_SERVER_URL}/api/ai/coach`
    const reqBody = { sessionData, systemPrompt: buildCoachPrompt('es') }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    })

    const data = await res.json()
    await recordIfDebug('Today Workout IA', url, reqBody, data)
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
      streak_weeks: streakWeeks,
      _provider: data._provider,
    }
  } catch {
    // No connection / AI failure: don't invent a canned analysis, let the caller
    // show a proper "couldn't connect" state instead of fake generic text.
    return null
  }
}
