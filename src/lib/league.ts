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

// ── Leaderboard v2 («Mi semana» + la carrera) ──

// "Cierra en 2d 14h": time left until next Monday 00:00, local.
export function closesIn(now: Date): string {
  const end = parseDate(mondayOf(toLocalDateStr(now)))
  end.setDate(end.getDate() + 7)
  const mins = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 60000))
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  if (d > 0) return `Cierra en ${d}d ${h}h`
  if (h > 0) return `Cierra en ${h}h`
  return `Cierra en ${mins % 60} min`
}

// Minutes trained each day of this week, Monday → Sunday.
export function dayMinutes(sessions: { date: string; seconds: number }[], today: string): number[] {
  const monday = mondayOf(today)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  return days.map((day) => Math.floor(sessions.filter((s) => s.date === day).reduce((sum, s) => sum + (s.seconds || 0), 0) / 60))
}

const MIN_BAR = 8
const BAR_SCALE_MIN = 60

// Bar height (%) per day: relative to the week's longest day, never less than an
// hour, so a short session doesn't fill the bar. A day trained without timed
// minutes still shows a sliver.
export function dayBars(minutes: number[], days: DayState[]): number[] {
  const scale = Math.max(BAR_SCALE_MIN, ...minutes)
  return minutes.map((m, i) => (m > 0 ? Math.max(MIN_BAR, Math.round((m / scale) * 100)) : days[i] === 'done' ? MIN_BAR : 0))
}

export interface Goal { kind: 'chase' | 'lead'; username: string; minutes: number; pct: number }

// What sits under «Mi semana»: minutes to pass the one above, or my lead.
export function leagueGoal(league: LeagueEntry[]): Goal | null {
  const me = league.find((e) => e.isMe)
  if (!me || league.length < 2) return null
  if (me.position === 1) return { kind: 'lead', username: league[1].username, minutes: me.minutes - league[1].minutes, pct: 100 }
  const above = league[me.position - 2]
  const pct = above.minutes > 0 ? Math.round((me.minutes / above.minutes) * 100) : 0
  return { kind: 'chase', username: above.username, minutes: above.minutes - me.minutes + 1, pct }
}

// Bar width (%) of a row in the race: relative to the leader.
export function raceBar(entry: LeagueEntry, league: LeagueEntry[]): number {
  const top = league[0]?.minutes || 0
  return top > 0 ? Math.round((entry.minutes / top) * 100) : 0
}

// ── Flechas «▲1 desde ayer» ──
// The phone keeps a photo of the positions of the day it last opened Amigos
// (`today`) and of the previous day it did (`before`). Arrows compare with
// `before` only inside the same league week.

export interface PositionsPhoto { date: string; positions: Record<string, number> }
export interface LeagueSnapshot { today: PositionsPhoto; before: PositionsPhoto | null }

function positionsOf(league: LeagueEntry[]): Record<string, number> {
  return Object.fromEntries(league.map((e) => [e.username, e.position]))
}

export function nextSnapshot(prev: LeagueSnapshot | null, league: LeagueEntry[], today: string): LeagueSnapshot {
  const photo = { date: today, positions: positionsOf(league) }
  if (!prev || prev.today.date > today) return { today: photo, before: null }
  if (prev.today.date === today) return { today: photo, before: prev.before }
  return { today: photo, before: prev.today }
}

// Places gained since the photo (positive = up); users new to the league get none.
export function positionMoves(snapshot: LeagueSnapshot | null, league: LeagueEntry[], today: string): Record<string, number> {
  const before = snapshot?.before
  if (!before || before.date < mondayOf(today) || before.date >= today) return {}
  const moves: Record<string, number> = {}
  for (const e of league) {
    const was = before.positions[e.username]
    if (was && was !== e.position) moves[e.username] = was - e.position
  }
  return moves
}

const WEEKDAY_LOWER = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

// "desde ayer" / "desde el martes": the day the arrows compare with.
export function movesSince(snapshot: LeagueSnapshot | null, today: string): string {
  const date = snapshot?.before?.date
  if (!date) return ''
  return date === addDays(today, -1) ? 'desde ayer' : `desde el ${WEEKDAY_LOWER[weekDayIndex(date)]}`
}

export function moveLabel(move: number | undefined): string {
  if (!move) return ''
  return `${move > 0 ? '▲' : '▼'}${Math.abs(move)}`
}

function dayMonth(dateStr: string, withMonth: boolean): string {
  const d = parseDate(dateStr)
  return withMonth ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : String(d.getDate())
}

// "5–11 oct" (or "28 sep–4 oct" across months)
export function weekRange(today: string): string {
  const monday = mondayOf(today)
  const sunday = addDays(monday, 6)
  const sameMonth = monday.slice(0, 7) === sunday.slice(0, 7)
  return `${dayMonth(monday, !sameMonth)}–${dayMonth(sunday, true)}`
}

// "5–11 oct · cierra el domingo"
export function weekEyebrow(today: string): string {
  const idx = weekDayIndex(today)
  const tail = idx === 0 ? 'empieza la semana' : idx === 6 ? 'cierra hoy' : 'cierra el domingo'
  return `${weekRange(today)} · ${tail}`
}

// "18:42" — hand-written for the same reason as formatSavedAt
export function formatHour(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// "5 oct, 18:42" — written by hand so it does not change with the phone's locale.
export function formatSavedAt(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${formatHour(ts)}`
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
