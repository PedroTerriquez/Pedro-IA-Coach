import type { Program, ProgramExercise } from '$lib/types'

/** Seconds a set takes before its rest — the "30 s" of the day-duration rule */
const SET_WORK_SEC = 30

/**
 * Day duration (glossary): every set counts 30 s of work plus its rest,
 * summed over the day and rounded to the minute. Always computed, never stored.
 */
export function dayDurationMin(exercises: Pick<ProgramExercise, 'sets' | 'rest'>[] = []): number {
  const seconds = exercises.reduce((sum, ex) => sum + (Number(ex.sets) || 0) * (SET_WORK_SEC + (Number(ex.rest) || 0)), 0)
  return Math.round(seconds / 60)
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

export function programExerciseCount(program: Program): number {
  return program.weeks.reduce((s, w) => s + w.days.reduce((sd, d) => sd + d.exercises.length, 0), 0)
}

/** "2 semanas · 30 ejercicios" */
export function programMeta(program: Program): string {
  return `${plural(program.weeks.length, 'semana', 'semanas')} · ${plural(programExerciseCount(program), 'ejercicio', 'ejercicios')}`
}

export const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** weekday is 1=Lunes … 7=Domingo */
export function weekdayName(weekday?: number): string {
  return weekday && weekday >= 1 && weekday <= 7 ? WEEKDAY_NAMES[weekday - 1] : ''
}
