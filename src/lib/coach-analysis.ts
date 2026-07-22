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
  weekIdx: number,
  language: 'es' | 'en' = 'es'
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
  const analysisTexts: Record<'es' | 'en', Record<string, string>> = {
    es: {
      easy: 'Buen trabajo, pero podrías considerar aumentar el peso la próxima sesión para seguir progresando.',
      good: 'Excelente sesión. Carga adecuada, buen volumen. Sigue así.',
      heavy: 'Buena intensidad. Considera ajustar las cargas si la fatiga se acumula.',
      failure: 'Entrenamiento intenso al fallo. Prioriza la recuperación y ajusta las cargas si es necesario.',
    },
    en: {
      easy: 'Good work, but consider increasing the weight next session to keep progressing.',
      good: 'Excellent session. Solid load, good volume. Keep it up.',
      heavy: 'Good intensity. Consider adjusting loads if fatigue builds up.',
      failure: 'Intense training to failure. Prioritize recovery and adjust loads if needed.',
    },
  }
  const recommendations: Record<'es' | 'en', Record<string, string[]>> = {
    es: {
      easy: ['Aumenta el peso en 2.5-5 kg', 'Reduce repeticiones si subes peso', 'Mantén la técnica'],
      good: ['Sigue progresando', 'Mantén el rango de repeticiones', 'Buen control de carga'],
      heavy: ['Monitorea fatiga', 'Considera deload la próxima semana', 'Prioriza sueño y recuperación'],
      failure: ['Toma un día extra de descanso', 'Reduce carga 10-20%', 'Enfócate en técnica'],
    },
    en: {
      easy: ['Increase weight by 2.5-5 kg', 'Reduce reps if you go up in weight', 'Maintain technique'],
      good: ['Keep progressing', 'Maintain your rep range', 'Good load control'],
      heavy: ['Monitor fatigue', 'Consider a deload next week', 'Prioritize sleep and recovery'],
      failure: ['Take an extra rest day', 'Reduce load 10-20%', 'Focus on technique'],
    },
  }
  const lang = language === 'en' ? 'en' : 'es'
  const effortKey = effort as keyof typeof analysisTexts.es
  const defaultRecs = lang === 'en'
    ? ['Keep training', 'Stay consistent', 'Listen to your body']
    : ['Sigue entrenando', 'Mantén la constancia', 'Escucha a tu cuerpo']
  const fallbackAnalysis = lang === 'en' ? 'Session completed. Good work.' : 'Sesión completada. Buen trabajo.'
  const nextGoalPR = lang === 'en'
    ? `You hit ${prCount} PR${prCount > 1 ? 's' : ''} — aim to beat ${prCount > 1 ? 'them' : 'it'} in 2 weeks`
    : `Lograste ${prCount} PR${prCount > 1 ? 's' : ''} — apunta a superarlos en 2 semanas`
  const nextGoalVolume = lang === 'en'
    ? `Aim for ${Math.round(volume * 1.05)} kg of total volume next time`
    : `Acumula ${Math.round(volume * 1.05)} kg de volumen total la próxima vez`
  const nextGoalDefault = lang === 'en' ? 'Stay consistent this week' : 'Mantén la constancia esta semana'
  return {
    date: todayDate,
    weekIdx,
    effort,
    analysis: analysisTexts[lang][effortKey] || fallbackAnalysis,
    verdict: verdicts[Math.floor(Math.random() * verdicts.length)],
    _topic: effort === 'good' ? 'progreso_global' : effort === 'heavy' ? 'recuperacion' : effort === 'failure' ? 'recuperacion' : 'comparativa',
    proximo_objetivo: prCount > 0 ? nextGoalPR : volume > 0 ? nextGoalVolume : nextGoalDefault,
    recommendations: recommendations[lang][effortKey] || defaultRecs,
    rotation_topic: effort === 'good' ? 'progreso' : 'recuperación',
  }
}
