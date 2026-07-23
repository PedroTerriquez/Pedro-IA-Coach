import { getLogsForDate, getLogsForExercise, getAllLogs, getSettings } from '$lib/storage'
import { PUSH_SERVER_URL } from '$lib/config'
import { buildCoachPrompt } from '$lib/brain/prompts'
import { buildUserProfile } from '$lib/ai'
import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
import type { Exercise, ProgramDay } from '$lib/types'

export interface CoachAnalysisResult {
  date: string
  weekIdx: number
  effort: string
  analysis: string
  verdict: string
  proximo_objetivo: string
  recommendations: string[]
  rotation_topic: string
  _provider?: string
}

const ROTATION_TOPICS = ['comparativa', 'racha', 'esfuerzo_volumen', 'recuperacion', 'progreso_global', 'retrospectiva_semanal']

const FALLBACK_ANALYSIS: Record<string, string> = {
  easy: 'Buen trabajo, pero podrías considerar aumentar el peso la próxima sesión para seguir progresando.',
  good: 'Excelente sesión. Carga adecuada, buen volumen. Sigue así.',
  heavy: 'Buena intensidad. Considera ajustar las cargas si la fatiga se acumula.',
  failure: 'Entrenamiento intenso al fallo. Prioriza la recuperación y ajusta las cargas si es necesario.',
}

const FALLBACK_RECS: Record<string, string[]> = {
  easy: ['Aumenta el peso en 2.5-5 kg', 'Reduce repeticiones si subes peso', 'Mantén la técnica'],
  good: ['Sigue progresando', 'Mantén el rango de repeticiones', 'Buen control de carga'],
  heavy: ['Monitorea fatiga', 'Considera deload la próxima semana', 'Prioriza sueño y recuperación'],
  failure: ['Toma un día extra de descanso', 'Reduce carga 10-20%', 'Enfócate en técnica'],
}

function fallbackResult(date: string, weekIdx: number, effort: string, rotationHint: string): CoachAnalysisResult {
  const effortKey = effort as keyof typeof FALLBACK_ANALYSIS
  return {
    date,
    weekIdx,
    effort,
    analysis: FALLBACK_ANALYSIS[effortKey] || 'Sesión completada. Buen trabajo.',
    verdict: 'neutral',
    proximo_objetivo: 'Mantén la constancia esta semana',
    recommendations: FALLBACK_RECS[effortKey] || ['Sigue entrenando', 'Mantén la constancia', 'Escucha a tu cuerpo'],
    rotation_topic: rotationHint,
  }
}

export async function runCoachAnalysis(
  day: ProgramDay,
  effort: string,
  exercises: Exercise[],
  todayDate: string,
  weekIdx: number
): Promise<CoachAnalysisResult> {
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
    volume += todayLog.weight * sets * reps

    const allExLogs = await getLogsForExercise(exId)
    const prevLogs = allExLogs.filter(l => l.date !== todayDate && l.weight > 0)
    const previousBest = prevLogs.length > 0 ? Math.max(...prevLogs.map(l => l.weight)) : null
    const isPR = previousBest !== null && todayLog.weight >= previousBest
    if (isPR) prCount++

    exerciseSummaries.push({
      name: getExerciseDisplayName(exercisesById[exId] || {}) || 'Ejercicio',
      weight: todayLog.weight,
      sets,
      reps,
      previous_best: previousBest,
      is_pr: isPR,
    })
  }

  const trainedDates = new Set(allLogs.filter(l => l.weight > 0).map(l => l.date))
  const rotationHint = ROTATION_TOPICS[trainedDates.size % ROTATION_TOPICS.length]

  try {
    if (!PUSH_SERVER_URL) throw new Error('PUSH_SERVER_URL not configured')

    const settings = await getSettings()
    const userProfile = buildUserProfile(settings)

    const sessionData = {
      date: todayDate,
      day_name: day.name,
      effort,
      total_volume: Math.round(volume),
      pr_count: prCount,
      exercises: exerciseSummaries,
      rotation_hint: rotationHint,
      user_profile: userProfile,
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
      _provider: data._provider,
    }
  } catch {
    return fallbackResult(todayDate, weekIdx, effort, rotationHint)
  }
}
