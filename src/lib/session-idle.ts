import type { ExerciseLog, SessionState } from '$lib/types'
import { shortDate } from '$lib/exercise-history'

// A session left open: the last set was never logged, the app stayed closed for
// hours and the clock kept counting. After IDLE_MS without activity (a set, a
// move marked, a rest) the session counts as ended at the last activity plus
// TAIL_MS, the time the last set took.

export const IDLE_MS = 45 * 60 * 1000
export const TAIL_MS = 3 * 60 * 1000

/** One exercise of an open session still to register */
export interface PendingExercise {
  exerciseId: string
  name: string
  imgUrl: string
  sets: number
  reps: string
  /** Today's weight if some sets were logged, else the last time's */
  weight: number
  lastWeight: number
}

export function lastActivity(ss: SessionState): number {
  return ss.lastActivityAt || ss.startedAt || 0
}

/** Started, never ended */
export function isOpen(ss: SessionState | null | undefined): ss is SessionState {
  return !!ss?.startedAt && !ss.endedAt
}

export function isIdle(ss: SessionState | null | undefined, now: number): boolean {
  return isOpen(ss) && now - lastActivity(ss) > IDLE_MS
}

/** Left open on an earlier day */
export function isStale(ss: SessionState | null | undefined, today: string): ss is SessionState {
  return isOpen(ss) && ss.date !== today
}

/** When the session counts as ended: the last activity plus the last set */
export function idleEnd(ss: SessionState): number {
  return lastActivity(ss) + TAIL_MS
}

export function idleSeconds(ss: SessionState): number {
  return Math.max(0, Math.round((idleEnd(ss) - (ss.startedAt || 0)) / 1000))
}

export function idleMinutes(ss: SessionState): number {
  return Math.max(1, Math.round(idleSeconds(ss) / 60))
}

/** «18:42» */
export function clockTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** «Ayer · Jue 12 nov · Empuje», or without «Ayer» further back */
export function staleEyebrow(ss: SessionState, today: string): string {
  const yesterday = addDays(today, -1)
  return [ss.date === yesterday ? 'Ayer' : '', shortDate(ss.date), ss.dayName].filter(Boolean).join(' · ')
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Last weight logged for the exercise before `date` */
export function lastWeightBefore(logs: ExerciseLog[], exerciseId: string, date: string): number {
  const past = logs
    .filter(l => l.exerciseId === exerciseId && l.date < date && l.weight > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
  return past.length ? past[past.length - 1].weight : 0
}

/** «Press Banca, Press Militar y Elevaciones Laterales» */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
}
