import type { ProgramDay, ProgramWeek } from '$lib/types'
import { trainedToday, formatHour, type DayState, type FriendData, type PhrasePart } from '$lib/league'
import { WEEKDAY_NAMES, dayDurationMin } from '$lib/program-utils'
import { mondayOf } from '$lib/calendar-utils'

// Plan v2 (Plan · Nuevo): pure rules of the week view. `order[calIdx]` is the
// index of the program day shown on that weekday (Mon=0); an index past
// `week.days` is a free slot.

export interface NextWorkout { calIdx: number; day: ProgramDay }
export interface PlanDock { train: string | null; caption: string }
export interface StripSocial { avatars: string[]; parts: PhrasePart[]; invite: boolean }
export type DayRowState = 'pending' | 'done' | 'rest' | 'moved'
export interface DayRowView { weekday: string; date: number; title: string; sub: string; meta: string; state: DayRowState }

export function isRestDay(day: ProgramDay | null | undefined): boolean {
  return !day || day.name === 'Rest' || day.name === 'Descanso'
}

export function slotDay(week: ProgramWeek | undefined, order: number[], calIdx: number): ProgramDay | null {
  const idx = order[calIdx]
  return week && idx < week.days.length ? week.days[idx] : null
}

export function isWorkoutSlot(week: ProgramWeek | undefined, order: number[], calIdx: number): boolean {
  return !isRestDay(slotDay(week, order, calIdx))
}

/** Days already trained stay where they are: Mover and «Me salté un día» skip them */
export function fixedSlots(week: ProgramWeek | undefined, order: number[], days: DayState[]): boolean[] {
  return order.map((_, i) => days[i] === 'done' && isWorkoutSlot(week, order, i))
}

/** «Me salté un día»: every pending slot from `from` on takes the previous pending slot's day */
export function shiftPending(order: number[], from: number, fixed: boolean[]): number[] {
  const slots = order.map((_, i) => i).filter((i) => i >= from && !fixed[i])
  const next = [...order]
  slots.forEach((slot, k) => { next[slot] = order[slots[(k - 1 + slots.length) % slots.length]] })
  return next
}

/** Weekday a moved workout came from, or -1 when it sits on its own day */
export function movedFrom(week: ProgramWeek | undefined, order: number[], naturalOrder: number[], calIdx: number): number {
  if (!isWorkoutSlot(week, order, calIdx)) return -1
  const natural = naturalOrder.indexOf(order[calIdx])
  return natural !== -1 && natural !== calIdx ? natural : -1
}

export function nextWorkout(week: ProgramWeek | undefined, order: number[], after: number): NextWorkout | null {
  for (let i = after + 1; i < order.length; i++) {
    const day = slotDay(week, order, i)
    if (!isRestDay(day)) return { calIdx: i, day: day as ProgramDay }
  }
  return null
}

/** «Hoy Empuje pasa al jueves»: what «Me salté un día» does to today's workout */
export function shiftEffectLabel(week: ProgramWeek | undefined, before: number[], after: number[], todayIdx: number): string {
  const day = todayIdx >= 0 ? slotDay(week, before, todayIdx) : null
  if (isRestDay(day)) return ''
  const to = after.indexOf(before[todayIdx])
  return to !== todayIdx ? `Hoy ${day?.name} pasa al ${WEEKDAY_NAMES[to].toLowerCase()}.` : ''
}

/** «Se movió del miércoles» */
export function movedLabel(calIdx: number): string {
  return `Se movió del ${WEEKDAY_NAMES[calIdx].toLowerCase()}`
}

export const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Day of the month of each weekday, Monday first, for the week holding `today` */
export function weekDates(today: string): number[] {
  const [y, m, d] = mondayOf(today).split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => new Date(y, m - 1, d + i).getDate())
}

/** «3 ej · 65 min» */
export function dayMeta(day: ProgramDay): string {
  return `${day.exercises.length} ej · ${dayDurationMin(day.exercises)} min`
}

function daySub(i: { state: DayState; from: number; past: boolean; firstWeek: boolean; muscles: string }): string {
  if (i.state === 'done') return 'Hecho'
  if (i.from !== -1) return movedLabel(i.from)
  if (i.firstWeek && i.past) return 'Ya pasó · empieza cuando quieras'
  return i.muscles
}

function rowState(state: DayState, from: number): DayRowState {
  if (state === 'done') return 'done'
  return from !== -1 ? 'moved' : 'pending'
}

/** What a DayRow shows for one weekday */
export function dayRowView(i: {
  calIdx: number
  day: ProgramDay | null
  date: number
  state: DayState
  from: number
  past: boolean
  firstWeek: boolean
  muscles: string
}): DayRowView {
  const weekday = WEEKDAY_SHORT[i.calIdx]
  if (isRestDay(i.day)) return { weekday, date: i.date, title: 'Descanso', sub: '', meta: '', state: 'rest' }
  const day = i.day as ProgramDay
  return { weekday, date: i.date, title: day.name, sub: daySub(i), meta: dayMeta(day), state: rowState(i.state, i.from) }
}

/** «Ana», «Ana y Luis», «Ana, Luis y Mariana», «Ana, Luis y 2 más» */
export function namesPhrase(names: string[]): string {
  if (names.length <= 1) return names[0] || ''
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
  return `${names.slice(0, 2).join(', ')} y ${names.length - 2} más`
}

function trainedLine(names: string[], me: boolean, weekComplete: boolean): PhrasePart[] {
  const who = { text: namesPhrase(names), bold: true }
  if (me) return [{ text: 'Entrenaste hoy con ' }, who, { text: '. Ver la liga' }]
  const verb = names.length === 1 ? ' entrenó hoy' : ' ya entrenaron hoy'
  return [who, { text: verb + (weekComplete ? '. Tú ya cumpliste la semana' : '') }]
}

/** Footer of the week strip: a door to Amigos with what the app already knows */
export function stripSocial(i: {
  friends: FriendData[]
  today: string
  trainedMe: boolean
  weekComplete: boolean
  offline: boolean
  savedAt: number | null
}): StripSocial {
  if (i.friends.length === 0) {
    return { avatars: [], parts: [{ text: 'Invita a un amigo y suman juntos cada semana' }], invite: true }
  }
  const trained = i.friends.filter((f) => trainedToday(f, i.today)).map((f) => f.username)
  const avatars = (trained.length ? trained : i.friends.map((f) => f.username)).slice(0, 3)
  if (i.offline && i.savedAt) {
    return { avatars, parts: [{ text: `Liga actualizada a las ${formatHour(i.savedAt)}. Se refresca al volver la señal` }], invite: false }
  }
  if (trained.length) return { avatars, parts: trainedLine(trained, i.trainedMe, i.weekComplete), invite: false }
  return { avatars, parts: [{ text: 'Nadie de tu liga ha entrenado hoy. Ver la liga' }], invite: false }
}

function nextCaption(next: NextWorkout | null, todayIdx: number, minutes: number): string {
  if (!next) return 'No quedan entrenos esta semana'
  const when = next.calIdx === todayIdx + 1 ? 'Mañana' : WEEKDAY_NAMES[next.calIdx]
  return `${when}: ${next.day.name} · ${minutes} min`
}

/** What the dock offers: train today's workout, or say what comes next */
export function planDock(i: {
  todayDay: ProgramDay | null
  todayDone: boolean
  firstWeek: boolean
  offline: boolean
  done: number
  total: number
  todayIdx: number
  next: NextWorkout | null
  nextMinutes: number
  nextWeekNumber: number | null
}): PlanDock {
  if (!isRestDay(i.todayDay) && !i.todayDone) {
    const train = i.firstWeek ? 'Empezar mi primer entreno' : `Entrenar ${i.todayDay?.name}`
    const caption = i.offline
      ? 'Tu plan vive en tu teléfono: funciona sin internet'
      : i.firstWeek ? 'Toca cualquier día para ver sus ejercicios' : ''
    return { train, caption }
  }
  if (i.total > 0 && i.done >= i.total) {
    const starts = i.nextWeekNumber ? `la semana ${i.nextWeekNumber}` : 'otra semana'
    return { train: null, caption: `${i.done} de ${i.total} hechos. El lunes empieza ${starts}.` }
  }
  return { train: null, caption: nextCaption(i.next, i.todayIdx, i.nextMinutes) }
}
