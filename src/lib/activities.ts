import type { Activity, GymSession, SportKey } from '$lib/types'
import { mondayOf } from '$lib/calendar-utils'

// Hoy · «Otra actividad» (Nuevo · Hoy actividades): sports done outside the
// program. Their minutes add to the league and an activity makes the day count
// as trained for the streak. Pure: the pages read the store and call these.

export interface Sport {
  key: SportKey
  name: string
  /** Asks for km (and shows pace or speed); otherwise for kcal */
  dist: boolean
  /** Tint of its button and icon (oklch hue) */
  hue: number
  /** 24×24 stroke paths */
  icon: string
}

/** What the sheet hands back to save */
export interface ActivityDraft { sport: SportKey; minutes: number; km?: number; kcal?: number; name?: string }

export const SPORTS: Sport[] = [
  { key: 'correr', name: 'Correr', dist: true, hue: 125, icon: '<circle cx="14.5" cy="4.5" r="2"/><path d="M7 20.5l3.5-5 3 2.5v3.5"/><path d="M5 11.5l3.5-3 4 .6 2.4 3.4 3.1 1"/><path d="M10.5 15.5l2-6.4"/>' },
  { key: 'nadar', name: 'Nadar', dist: true, hue: 230, icon: '<circle cx="16.5" cy="6" r="2"/><path d="M5 12.5l4-3.2 4 3.2 3-2"/><path d="M2.5 17.5c1.6 0 1.6-1.5 3.2-1.5s1.6 1.5 3.2 1.5 1.6-1.5 3.1-1.5 1.6 1.5 3.2 1.5 1.6-1.5 3.2-1.5 1.6 1.5 3.1 1.5"/>' },
  { key: 'bici', name: 'Bici', dist: true, hue: 55, icon: '<circle cx="5.5" cy="16" r="3.8"/><circle cx="18.5" cy="16" r="3.8"/><path d="M5.5 16l3.8-7h5.4l3.8 7M9.3 9l3.2 7H5.5M13.2 5.5h2.3"/>' },
  { key: 'padel', name: 'Pádel', dist: false, hue: 95, icon: '<path d="M10 2.8a6.4 6.6 0 110 13.2 6.4 6.6 0 010-13.2z"/><path d="M14.3 14.3L20.5 20.5"/><circle cx="19" cy="5" r="1.6"/><path d="M8 8h.01M12 8h.01M10 11h.01"/>' },
  { key: 'crossfit', name: 'CrossFit', dist: false, hue: 25, icon: '<path d="M8.5 9.5V8a3.5 3.5 0 017 0v1.5"/><circle cx="12" cy="15" r="6"/>' },
  { key: 'otra', name: 'Otra', dist: false, hue: 300, icon: '<path d="M12 3.5l2.2 5.3 5.3 2.2-5.3 2.2L12 18.5l-2.2-5.3L4.5 11l5.3-2.2z"/><path d="M19 17v4M17 19h4"/>' },
]

export function sportOf(key: SportKey): Sport {
  return SPORTS.find(s => s.key === key) || SPORTS[SPORTS.length - 1]
}

/** «Correr», or what «Otra» was called («Yoga») */
export function activityName(a: Pick<Activity, 'sport' | 'name'>): string {
  return (a.sport === 'otra' && a.name?.trim()) || sportOf(a.sport).name
}

/** A typed number («5,2» too); 0 when empty or not positive */
export function num(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'))
  return isFinite(n) && n > 0 ? n : 0
}

function mmss(min: number): string {
  const s = Math.round(min * 60)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export interface ActivityResult { label: string; value: string; unit: string }

/** Pace (Correr, Nadar) or speed (Bici) out of minutes and km; null until both are there */
export function activityResult(sport: SportKey, minutes: unknown, km: unknown): ActivityResult | null {
  const t = num(minutes)
  const d = num(km)
  if (!t || !d || !sportOf(sport).dist) return null
  if (sport === 'correr') return { label: 'Ritmo', value: mmss(t / d), unit: '/km' }
  if (sport === 'nadar') return { label: 'Ritmo', value: mmss(t / (d * 10)), unit: '/100 m' }
  return { label: 'Velocidad', value: (d / (t / 60)).toFixed(1), unit: 'km/h' }
}

/** The result's name before there is one: «Ritmo» or «Velocidad» */
export function resultLabel(sport: SportKey): string {
  return sport === 'bici' ? 'Velocidad' : 'Ritmo'
}

/** «5.2 km · 6:09 /km», «480 kcal» or «Solo tiempo» */
export function activitySub(a: Pick<Activity, 'sport' | 'minutes' | 'km' | 'kcal'>): string {
  const parts: string[] = []
  if (sportOf(a.sport).dist) {
    if (num(a.km)) parts.push(`${num(a.km)} km`)
    const r = activityResult(a.sport, a.minutes, a.km)
    if (r) parts.push(`${r.value} ${r.unit}`)
  } else if (num(a.kcal)) {
    parts.push(`${num(a.kcal)} kcal`)
  }
  return parts.length ? parts.join(' · ') : 'Solo tiempo'
}

export function totalMinutes(list: Pick<Activity, 'minutes'>[]): number {
  return list.reduce((sum, a) => sum + num(a.minutes), 0)
}

/** The streak and the week count an activity day as trained: one «__day__» mark per day */
export function activityDayMarks(list: Pick<Activity, 'date'>[]): { date: string; exerciseId: string; weight: number }[] {
  return [...new Set(list.map(a => a.date))].map(date => ({ date, exerciseId: '__day__', weight: 0 }))
}

export function activitySeconds(list: Pick<Activity, 'minutes' | 'weekStart'>[], monday: string): number {
  return list.filter(a => a.weekStart === monday).reduce((sum, a) => sum + num(a.minutes) * 60, 0)
}

/** Gym (session clock) + activities (typed): the week's league seconds */
export function leagueWeekSeconds(sessions: Pick<GymSession, 'seconds' | 'weekStart'>[], list: Pick<Activity, 'minutes' | 'weekStart'>[], monday: string): number {
  const gym = sessions.filter(g => g.weekStart === monday).reduce((sum, g) => sum + (g.seconds || 0), 0)
  return gym + activitySeconds(list, monday)
}

/** Activity minutes each day of `today`'s week, Monday → Sunday */
export function activityDayMinutes(list: Pick<Activity, 'date' | 'minutes'>[], today: string): number[] {
  const [y, m, d] = mondayOf(today).split('-').map(Number)
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(y, m - 1, d + i)
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
    return totalMinutes(list.filter(a => a.date === key))
  })
}

/** «2 h 32» or «45 min» */
export function hoursLabel(min: number): string {
  const m = Math.round(min)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
}

/** What the coach hears about the day's other activities */
export function activitiesForCoach(list: Activity[]): { sport: string; minutes: number; km?: number; kcal?: number }[] {
  return list.map(a => ({
    sport: activityName(a),
    minutes: num(a.minutes),
    ...(num(a.km) ? { km: num(a.km) } : {}),
    ...(num(a.kcal) ? { kcal: num(a.kcal) } : {}),
  }))
}
