import type { ProgramOverrides } from '$lib/ai'

// Choices of the "Con el coach" sheet. Values are what the generator prompt expects.
export const DAYS_OPTIONS = [3, 4, 5, 6]
export const EQUIPMENT_OPTIONS = [{ v: 'gym', l: 'Gimnasio' }, { v: 'mancuernas', l: 'Mancuernas' }, { v: 'calistenia', l: 'Calistenia' }]
export const FOCUS_OPTIONS = [
  { v: 'full', l: 'Cuerpo completo' }, { v: 'chest', l: 'Pecho' }, { v: 'back', l: 'Espalda' }, { v: 'legs', l: 'Piernas' },
  { v: 'shoulders', l: 'Hombros' }, { v: 'arms', l: 'Brazos' }, { v: 'core', l: 'Abdomen' },
]
export const LIMIT_OPTIONS = ['Espalda', 'Hombro', 'Rodilla', 'Cadera', 'Cuello', 'Muñeca', 'Codo', 'Tobillo']

export interface SetupChoices {
  days: number | null
  equipment: string | null
  focus: string[]
  limits: string[]
}

export function emptyChoices(): SetupChoices {
  return { days: null, equipment: null, focus: [], limits: [] }
}

export function toggleIn(list: string[], v: string): string[] {
  return list.includes(v) ? list.filter(x => x !== v) : [...list, v]
}

export function choicesToOverrides(c: SetupChoices): ProgramOverrides {
  const o: ProgramOverrides = {}
  if (c.days) o.daysPerWeek = c.days
  if (c.equipment) o.equipment = c.equipment
  if (c.focus.length) o.focus = c.focus
  if (c.limits.length) o.limitations = c.limits
  return o
}

/** Tags shown at the top of the chat: what the user picked */
export function choicesToTags(c: SetupChoices): string[] {
  const tags: string[] = []
  if (c.days) tags.push(`${c.days} días`)
  const eq = EQUIPMENT_OPTIONS.find(e => e.v === c.equipment)
  if (eq) tags.push(eq.l)
  for (const f of c.focus) tags.push(FOCUS_OPTIONS.find(o => o.v === f)?.l || f)
  for (const l of c.limits) tags.push(`Cuidar ${l.toLowerCase()}`)
  return tags
}
