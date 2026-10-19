import { mondayOf, calAddDays, toLocalDateStr } from './calendar-utils'
import type { ExerciseLogBlock } from './types'

// Pure helpers for the Historial tab of the exercise detail (Detalle v2 · 03):
// the record, the "Subiste …" line and the sessions grouped by week.

export interface HistoryLog {
  id?: string
  date: string
  weight: number
  sets?: number
  reps?: string
  blocks?: ExerciseLogBlock[]
}

export interface WeekGroup<T extends HistoryLog = HistoryLog> {
  label: string
  logs: T[]
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTH_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** «Mié 7 oct» */
export function shortDate(iso: string): string {
  const d = parseDate(iso)
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`
}

/** «7 oct», for the ends of the chart */
export function dayMonth(iso: string): string {
  const d = parseDate(iso)
  return `${d.getDate()} ${MON[d.getMonth()]}`
}

/** «24 de agosto» */
function dayOfMonthLong(iso: string): string {
  const d = parseDate(iso)
  return `${d.getDate()} de ${MONTH_LONG[d.getMonth()]}`
}

export function formatWeight(n: number): string {
  return String(Number.isInteger(n) ? n : +n.toFixed(1))
}

export function sortByDate<T extends HistoryLog>(logs: T[]): T[] {
  return logs.filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date) || String(a.id).localeCompare(String(b.id)))
}

/** The session where the heaviest weight was first reached */
export function recordOf<T extends HistoryLog>(logs: T[]): T | null {
  return sortByDate(logs).reduce<T | null>((best, l) => (!best || l.weight > best.weight ? l : best), null)
}

/** «Subiste {Δ} {u} desde el {d de mes}.» — nothing when it didn't go up or there is one session */
export function gainSentence(logs: HistoryLog[], units: string): string {
  const sorted = sortByDate(logs)
  if (sorted.length < 2) return ''
  const first = sorted[0]
  const delta = sorted[sorted.length - 1].weight - first.weight
  if (delta <= 0) return ''
  return `Subiste ${formatWeight(delta)} ${units} desde el ${dayOfMonthLong(first.date)}.`
}

function weekRangeLabel(monday: string): string {
  const start = parseDate(monday)
  const end = calAddDays(start, 6)
  const sameMonth = start.getMonth() === end.getMonth()
  const from = sameMonth ? `${start.getDate()}` : `${start.getDate()} ${MON[start.getMonth()]}`
  return `${from} – ${end.getDate()} ${MON[end.getMonth()]}`
}

function weekLabel(monday: string, today: string): string {
  const thisMonday = mondayOf(today)
  if (monday === thisMonday) return 'Esta semana'
  if (monday === toLocalDateStr(calAddDays(parseDate(thisMonday), -7))) return 'Semana pasada'
  return weekRangeLabel(monday)
}

/** Newest first, one group per Monday-to-Sunday week */
export function groupByWeek<T extends HistoryLog>(logs: T[], today: string): WeekGroup<T>[] {
  const groups: WeekGroup<T>[] = []
  let lastMonday = ''
  for (const log of sortByDate(logs).reverse()) {
    const monday = mondayOf(log.date)
    if (monday !== lastMonday) groups.push({ label: weekLabel(monday, today), logs: [] })
    groups[groups.length - 1].logs.push(log)
    lastMonday = monday
  }
  return groups
}

/** «Récord», the blocks, «{series} × {reps}» or nothing */
export function sessionLine(log: HistoryLog, record: HistoryLog | null): string {
  if (record && log === record) return 'Récord'
  if (log.blocks?.length) return log.blocks.map(b => `${b.sets} × ${b.reps}`).join(' · ')
  if (log.sets && log.reps) return `${log.sets} × ${log.reps}`
  return ''
}

/** Weight change against the session right before it (oldest one: null) */
export function deltaPrev(log: HistoryLog, logs: HistoryLog[]): number | null {
  const sorted = sortByDate(logs)
  const i = sorted.indexOf(log)
  if (i <= 0) return null
  return +(log.weight - sorted[i - 1].weight).toFixed(1)
}

export function formatDelta(delta: number | null): string {
  if (delta === null) return ''
  if (delta === 0) return '='
  return delta > 0 ? `+${formatWeight(delta)}` : `−${formatWeight(-delta)}`
}
