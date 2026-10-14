import type { Program, ProgramDay, ProgramExercise, ProgramWeek } from '$lib/types'
import * as Storage from '$lib/storage'
import { dayDurationMin, plural, weekdayName } from '$lib/program-utils'

// The editor works on names instead of exercise ids; ids are resolved on save.
export interface DraftExercise { name: string; sets: number; reps: string; rest: number }
export interface DraftDay { name: string; weekday?: number; exercises: DraftExercise[] }
export interface DraftWeek { name: string; tag: string; days: DraftDay[] }

export const NEW_EXERCISE: DraftExercise = { name: '', sets: 3, reps: '10', rest: 60 }
export const WEEK_TAGS = ['Base', 'Carga', 'Descarga']
export const REST_STEP = 15

export function emptyDraft(): DraftWeek[] {
  return [{ name: 'Semana 1', tag: '', days: [] }]
}

function validWeekday(w: unknown): number | undefined {
  return typeof w === 'number' && w >= 1 && w <= 7 ? Math.round(w) : undefined
}

export function toDraft(program: Program, idToName: Record<string, string>): DraftWeek[] {
  return program.weeks.map(w => ({
    name: w.name,
    tag: w.tag || '',
    days: w.days.map(d => ({
      name: d.name,
      weekday: validWeekday(d.weekday),
      exercises: d.exercises.map(ex => ({ name: idToName[ex.exerciseId] || '', sets: ex.sets, reps: ex.reps, rest: ex.rest })),
    })),
  }))
}

/** "Lunes · ≈ 10 min · 1 ejercicio" (no weekday → starts at the duration) */
export function dayMeta(day: DraftDay): string {
  const parts = [weekdayName(day.weekday), `≈ ${dayDurationMin(day.exercises)} min`, plural(day.exercises.length, 'ejercicio', 'ejercicios')]
  return parts.filter(Boolean).join(' · ')
}

export function exerciseSummary(ex: DraftExercise): string {
  return `${ex.sets} × ${ex.reps} · ${ex.rest} s`
}

/** Suggestions from your own exercises for the "Editar ejercicio del día" name field */
export function suggestExercises<T extends { name: string }>(query: string, all: T[], max = 4): T[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return all.filter(e => e.name.toLowerCase().includes(q) && e.name.toLowerCase() !== q).slice(0, max)
}

async function resolveDay(d: DraftDay, nameToId: Record<string, string>): Promise<ProgramDay> {
  const exercises: ProgramExercise[] = []
  for (const ex of d.exercises) {
    const exName = ex.name.trim()
    if (!exName) continue
    let exId = nameToId[exName.toLowerCase()]
    if (!exId) {
      exId = (await Storage.findOrCreateExerciseByName(exName, '')).id
      nameToId[exName.toLowerCase()] = exId
    }
    exercises.push({ exerciseId: exId, sets: ex.sets, reps: ex.reps, rest: ex.rest })
  }
  const weekday = validWeekday(d.weekday)
  return { name: d.name, subtitle: '', exercises, ...(weekday ? { weekday } : {}) }
}

/** Resolves names to exercise ids (creating the missing ones) and builds the weeks to save */
export async function resolveDraft(weeks: DraftWeek[]): Promise<ProgramWeek[]> {
  const exs = await Storage.getExercises()
  const nameToId: Record<string, string> = {}
  for (const e of exs) nameToId[e.name.toLowerCase()] = e.id
  const resolved: ProgramWeek[] = []
  for (const w of weeks) {
    const days: ProgramDay[] = []
    for (const d of w.days) days.push(await resolveDay(d, nameToId))
    resolved.push({ name: w.name, subtitle: '', tag: w.tag, days })
  }
  return resolved
}
