import { isTrained, streakThreshold } from '$lib/streak'
import { mondayOf, toLocalDateStr } from '$lib/calendar-utils'

// The weekly league of the Amigos tab. Pure: every function takes `today`
// ("YYYY-MM-DD", local) so the week never depends on the clock or on
// `settings.weekStart` — the league has to be the same Monday–Sunday for everyone.

export interface FriendData {
  username: string
  streak?: number
  exercisedToday?: boolean
  gymTime?: number
  lastUpdate?: string
}

export interface LeagueEntry {
  username: string
  streak: number
  minutes: number
  today: boolean
  isMe: boolean
  position: number
  lastUpdate: number
}

export type DayState = 'done' | 'today' | 'off'
export interface WeekProgress { done: number; needed: number; left: number }
export interface PhrasePart { text: string; bold?: boolean }
type Log = { date: string; weight?: number; exerciseId?: string }

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const AVATAR_HUES = [25, 55, 200, 230, 260, 290, 320, 350, 175]

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(dateStr: string, n: number): string {
  const d = parseDate(dateStr)
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d)
}

// Local calendar day of a Worker timestamp; '' when it is missing or unreadable.
function localDay(iso: string | undefined): string {
  const t = iso ? new Date(iso) : null
  return t && !isNaN(t.getTime()) ? toLocalDateStr(t) : ''
}

function weekDayIndex(today: string): number {
  return (parseDate(today).getDay() + 6) % 7
}

// A friend who has not opened the app since last week still carries last week's
// minutes on the Worker. Unknown dates count as old too.
export function isStale(lastUpdate: string | undefined, today: string): boolean {
  const day = localDay(lastUpdate)
  return !day || day < mondayOf(today)
}

// `exercisedToday` is only as fresh as the friend's last sync.
export function trainedToday(friend: FriendData, today: string): boolean {
  return friend.exercisedToday === true && localDay(friend.lastUpdate) === today
}

function friendEntry(friend: FriendData, today: string): LeagueEntry {
  const stale = isStale(friend.lastUpdate, today)
  return {
    username: friend.username,
    streak: friend.streak || 0,
    minutes: stale ? 0 : Math.floor((friend.gymTime || 0) / 60),
    today: trainedToday(friend, today),
    isMe: false,
    position: 0,
    lastUpdate: friend.lastUpdate ? new Date(friend.lastUpdate).getTime() || 0 : 0,
  }
}

function myEntry(me: FriendData): LeagueEntry {
  return {
    username: me.username,
    streak: me.streak || 0,
    minutes: Math.floor((me.gymTime || 0) / 60),
    today: me.exercisedToday === true,
    isMe: true,
    position: 0,
    lastUpdate: Date.now(),
  }
}

function byMinutesThenRecent(a: LeagueEntry, b: LeagueEntry): number {
  return b.minutes - a.minutes || b.lastUpdate - a.lastUpdate
}

export function buildLeague(me: FriendData, friends: FriendData[], today: string): LeagueEntry[] {
  const seen = new Set([me.username])
  const others = friends.filter((f) => f.username && !seen.has(f.username) && !!seen.add(f.username))
  return [myEntry(me), ...others.map((f) => friendEntry(f, today))]
    .sort(byMinutesThenRecent)
    .map((entry, i) => ({ ...entry, position: i + 1 }))
}

function trainedDays(logs: Log[]): Set<string> {
  return new Set(logs.filter(isTrained).map((l) => l.date))
}

// Monday → Sunday. Days after today are never marked, whatever the logs say.
export function weekDays(logs: Log[], today: string): DayState[] {
  const trained = trainedDays(logs)
  const monday = mondayOf(today)
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(monday, i)
    if (day <= today && trained.has(day)) return 'done'
    return day === today ? 'today' : 'off'
  })
}

export function weekProgress(logs: Log[], daysPerWeek: number, today: string): WeekProgress {
  const done = weekDays(logs, today).filter((d) => d === 'done').length
  const needed = streakThreshold(daysPerWeek)
  return { done, needed, left: Math.max(0, needed - done) }
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

const weeks = (n: number) => plural(n, 'semana', 'semanas')
const workouts = (n: number) => plural(n, 'entreno', 'entrenos')
const missing = (n: number, capital = false) => `${capital ? 'T' : 't'}e ${n === 1 ? 'falta' : 'faltan'} `

function daysLeftPart(today: string): PhrasePart[] {
  const left = 7 - weekDayIndex(today)
  return [{ text: left === 1 ? 'Te queda ' : 'Te quedan ' }, { text: plural(left, 'día', 'días'), bold: true }]
}

function soloPhrase(streak: number, p: WeekProgress): PhrasePart[] {
  const head: PhrasePart[] = [{ text: 'Llevas ' }, { text: workouts(p.done), bold: true }, { text: ' esta semana. ' }]
  if (p.left === 0) return [...head, { text: `Ya sumaste tu semana ${streak}.` }]
  return [...head, { text: missing(p.left, true) }, { text: String(p.left), bold: true }, { text: ` para sumar tu semana ${streak + 1}.` }]
}

function chasePhrase(league: LeagueEntry[], me: LeagueEntry, today: string): PhrasePart[] {
  const above = league[me.position - 2]
  const gap = { text: `${Math.max(1, above.minutes - me.minutes)} min`, bold: true }
  if (league.length === 2) {
    return [{ text: `${above.username} va adelante por ` }, gap, { text: '. ' }, ...daysLeftPart(today), { text: ' para alcanzarlo.' }]
  }
  return [{ text: 'Vas ' }, { text: `#${me.position} de ${league.length}`, bold: true }, { text: '. Con ' }, gap, { text: ` más pasas a ${above.username}.` }]
}

// The one line under the week card. First matching rule wins (table in
// docs/superpowers/specs/2026-10-07-amigos-v2-liga-semanal-design.md). Returned
// as parts because usernames are someone else's text: never rendered as HTML.
export function weekPhrase(input: {
  streak: number
  best: number
  progress: WeekProgress
  league: LeagueEntry[]
  today: string
}): PhrasePart[] {
  const { streak, best, progress: p, league, today } = input
  if (streak === 0 && best > 0) {
    return [{ text: 'Volviste. Tu mejor racha es de ' }, { text: weeks(best), bold: true }, { text: `; ${missing(p.left)}` }, { text: workouts(p.left), bold: true }, { text: ' para empezar otra.' }]
  }
  if (streak === 0) {
    return [{ text: missing(p.left, true) }, { text: workouts(p.left), bold: true }, { text: ' esta semana para tu primera semana de racha.' }]
  }
  if (p.done === 0) {
    return [{ text: 'Tu racha de ' }, { text: weeks(streak), bold: true }, { text: ` sigue viva. ${missing(p.left, true)}` }, { text: workouts(p.left), bold: true }, { text: ` esta semana para llegar a ${streak + 1}.` }]
  }
  const me = league.find((e) => e.isMe)
  if (!me || league.length < 2) return soloPhrase(streak, p)
  if (me.position === 1) return [{ text: 'Vas ' }, { text: 'primero', bold: true }, { text: ' esta semana. Bien hecho.' }]
  return chasePhrase(league, me, today)
}

function dayMonth(dateStr: string, withMonth: boolean): string {
  const d = parseDate(dateStr)
  return withMonth ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : String(d.getDate())
}

// "5–11 oct · cierra el domingo"
export function weekEyebrow(today: string): string {
  const monday = mondayOf(today)
  const sunday = addDays(monday, 6)
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7)
  const idx = weekDayIndex(today)
  const tail = idx === 0 ? 'empieza la semana' : idx === 6 ? 'cierra hoy' : 'cierra el domingo'
  return `${dayMonth(monday, !sameMonth)}–${dayMonth(sunday, true)} · ${tail}`
}

// "5 oct, 18:42" — written by hand so it does not change with the phone's locale.
export function formatSavedAt(ts: number): string {
  const d = new Date(ts)
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hhmm}`
}

export function streakLabel(streak: number): string {
  return streak > 0 ? `${streak} ${streak === 1 ? 'semana seguida' : 'semanas seguidas'}` : 'Empezando racha'
}

// Same user → same muted hue on every phone (FNV-1a over the lowercased name).
export function avatarHue(username: string): number {
  let h = 2166136261
  for (const c of username.toLowerCase()) {
    h ^= c.charCodeAt(0)
    h = Math.imul(h, 16777619)
  }
  return AVATAR_HUES[(h >>> 0) % AVATAR_HUES.length]
}
