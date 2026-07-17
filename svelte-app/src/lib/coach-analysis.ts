import { getLogsForDate, getLogsForExercise } from '$lib/storage'
import type { Exercise, ProgramDay } from '$lib/types'

export interface CoachAnalysisResult {
  date: string
  weekIdx: number
  effort: string
  analysis: string
  verdict: string
  _topic: string
  proximo_objetivo: string
  recommendations: string[]
  rotation_topic: string
}

export async function runCoachAnalysis(
  day: ProgramDay,
  effort: string,
  exercises: Exercise[],
  todayDate: string,
  weekIdx: number
): Promise<CoachAnalysisResult> {
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
