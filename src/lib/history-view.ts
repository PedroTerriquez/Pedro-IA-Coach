import type { Exercise, ExerciseLog } from '$lib/types'
import { muscleLabel } from '$lib/exercise-utils'
import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
import { formatWeight, dayMonth } from '$lib/exercise-history'
import { isTrained } from '$lib/streak'
import { plural, WEEKDAY_NAMES } from '$lib/program-utils'
import { calKey, calStripTime, calDowMon, calDayDiff } from '$lib/calendar-utils'

// Historial v2: what the calendar, the day panel, the exercise list and the
// dock show. The page only wires these to the components.

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DAY_MARK = '__day__'
const RECENT_DAYS = 6

export type CellState = 'done' | 'rest' | 'missed' | 'future' | 'none'
export type PanelKind = 'first' | 'done' | 'marked' | 'today' | 'missed' | 'rest' | 'future' | 'none'

/** The record `makeDayStatusFn` returns for a date */
export interface DayRec {
  date: Date
  day: { name: string; exercises: any[] } | undefined
  isRest: boolean
  exercises: { exerciseId: string; sets: number; reps: string; muscle?: string }[]
  status: CellState
  logs: ExerciseLog[]
}

export interface PanelRow {
  exerciseId: string
  name: string
  sub: string
  imgUrl: string
  right: string
  sets: number
  reps: string
}

export interface CalendarCell {
  date: Date
  day: number
  state: CellState
  sel: boolean
  now: boolean
}

export interface Progress {
  last: number
  delta: number
  lastDate: string
  points: number[]
}

// ── Names and muscles ──

/** «Hombro (Anterior), Tríceps» → «Hombro»: the one muscle a row and a filter go by */
export function primaryMuscle(muscle?: string): string {
  const first = (muscle || '').split(/[,/]/)[0].replace(/\(.*\)/, '').trim()
  return muscleLabel(first)
}

function musclesOf(rows: { muscle?: string }[]): string {
  return [...new Set(rows.map(r => primaryMuscle(r.muscle)).filter(Boolean))].join(' · ')
}

/** «Pecho · Hombro · 3 ejercicios» */
export function rowsSummary(rows: { muscle?: string }[]): string {
  return [musclesOf(rows), plural(rows.length, 'ejercicio', 'ejercicios')].filter(Boolean).join(' · ')
}

function resolved(exerciseId: string, exercisesMap: Record<string, Exercise>, extra: object = {}): any {
  return { ...extra, ...(exercisesMap[exerciseId] || {}), exerciseId }
}

// ── The day ──

/** «3 × 10 · 3 × 12» for blocks, «4 × 8» for one weight, '' when the log has neither */
function setsDetail(log: ExerciseLog): string {
  if (log.blocks?.length) return log.blocks.map(b => `${b.sets} × ${b.reps}`).join(' · ')
  return log.sets && log.reps ? `${log.sets} × ${log.reps}` : ''
}

/**
 * What was logged that day — the alternative when one replaced the planned
 * exercise — in the program's order, extras at the end.
 */
export function dayEntries(rec: DayRec, exercisesMap: Record<string, Exercise>, language?: string): PanelRow[] {
  const order = rec.exercises.map(e => e.exerciseId)
  const rank = (id: string) => (order.includes(id) ? order.indexOf(id) : order.length)
  return rec.logs
    .filter(l => l.exerciseId !== DAY_MARK && l.weight > 0)
    .sort((a, b) => rank(a.exerciseId) - rank(b.exerciseId))
    .map(log => {
      const ex = resolved(log.exerciseId, exercisesMap)
      return {
        exerciseId: log.exerciseId,
        name: getExerciseDisplayName(ex, language) || 'Ejercicio',
        sub: [primaryMuscle(ex.muscle), setsDetail(log)].filter(Boolean).join(' · '),
        imgUrl: resolveExerciseMedia(ex).imgUrl || '',
        right: `${formatWeight(log.weight)} ${log.units || 'kg'}`,
        sets: log.sets || 0,
        reps: log.reps || '',
      }
    })
}

/** What the program had that day, without weights */
export function plannedRows(rec: DayRec, exercisesMap: Record<string, Exercise>, language?: string): PanelRow[] {
  return rec.exercises.map(pe => {
    const ex = resolved(pe.exerciseId, exercisesMap, pe)
    return {
      exerciseId: pe.exerciseId,
      name: getExerciseDisplayName(ex, language) || 'Ejercicio',
      sub: primaryMuscle(ex.muscle),
      imgUrl: resolveExerciseMedia(ex).imgUrl || '',
      right: `${pe.sets} × ${String(pe.reps || '').replace('-', '–')}`,
      sets: pe.sets,
      reps: pe.reps,
    }
  })
}

/** Which panel a selected day gets */
export function panelKind(rec: DayRec, today: Date, firstRun: boolean): PanelKind {
  const isToday = calKey(rec.date) === calKey(today)
  if (firstRun && isToday) return 'first'
  if (rec.status === 'done') return rec.logs.some(l => l.exerciseId !== DAY_MARK && l.weight > 0) ? 'done' : 'marked'
  if (rec.status === 'missed') return isToday ? 'today' : 'missed'
  return rec.status
}

/** «Martes 6 oct» */
export function dayLabel(date: Date): string {
  return `${WEEKDAY_NAMES[calDowMon(date)]} ${date.getDate()} ${MON[date.getMonth()]}`
}

// ── The month ──

export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function addMonths(month: Date, n: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + n, 1)
}

/** «Octubre.» */
export function monthTitle(month: Date): string {
  return `${MONTHS[month.getMonth()]}.`
}

/** First and last month the arrows reach: the oldest log's month and this one */
export function monthBounds(logs: ExerciseLog[], today: Date): { first: Date; last: Date } {
  const last = monthStart(today)
  const oldest = logs.filter(isTrained).map(l => l.date).sort()[0]
  if (!oldest) return { first: last, last }
  const [y, m] = oldest.split('-').map(Number)
  const first = new Date(y, m - 1, 1)
  return { first: first < last ? first : last, last }
}

/** The last trained day up to today, or today when nothing was trained */
export function initialDay(logsByDate: Map<number, ExerciseLog[]>, today: Date): Date {
  const todayKey = calKey(today)
  let best = 0
  for (const [key, logs] of logsByDate) {
    if (key <= todayKey && key > best && logs.some(isTrained)) best = key
  }
  if (!best) return calStripTime(today)
  return new Date(Math.floor(best / 10000), Math.floor(best / 100) % 100 - 1, best % 100)
}

/** Blank cells before the 1st (the grid starts on Monday) and one cell per day */
export function calendarCells(month: Date, statusOf: ((d: Date) => CellState) | null, selected: Date, today: Date): { lead: number; cells: CalendarCell[] } {
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cells: CalendarCell[] = []
  for (let d = 1; d <= days; d++) {
    const date = new Date(month.getFullYear(), month.getMonth(), d)
    cells.push({
      date,
      day: d,
      state: statusOf ? statusOf(date) : 'none',
      sel: !!statusOf && calKey(date) === calKey(selected),
      now: calKey(date) === calKey(today),
    })
  }
  return { lead: calDowMon(month), cells }
}

/** «● 4 entrenos este mes» */
export function monthCountLabel(cells: CalendarCell[]): string {
  const n = cells.filter(c => c.state === 'done').length
  return n ? `● ${plural(n, 'entreno', 'entrenos')} este mes` : 'Aún sin entrenos este mes'
}

// ── Exercises ──

/** «hoy», «ayer», «hace 3 días» up to 6, then «12 oct» */
export function whenLabel(date: string, today: Date): string {
  const [y, m, d] = date.split('-').map(Number)
  const diff = calDayDiff(today, new Date(y, m - 1, d))
  if (diff <= 0) return 'hoy'
  if (diff === 1) return 'ayer'
  if (diff <= RECENT_DAYS) return `hace ${diff} días`
  return dayMonth(date)
}

/** Last weight, how much it went up since the first, and the chart's points */
export function exerciseProgress(logs: ExerciseLog[]): Progress | null {
  const sorted = logs.filter(l => l.weight > 0).sort((a, b) => a.date.localeCompare(b.date))
  if (!sorted.length) return null
  const last = sorted[sorted.length - 1]
  return {
    last: last.weight,
    delta: last.weight - sorted[0].weight,
    lastDate: last.date,
    points: sorted.map(l => l.weight),
  }
}

/** «+25 kg» / «−5 kg»; nothing when it didn't move */
export function deltaLabel(delta: number, units: string): string {
  if (!delta) return ''
  return `${delta > 0 ? '+' : '−'}${formatWeight(Math.abs(delta))} ${units}`
}

/** Exercises with at least one log, the most recently logged first */
export function progressRows(exercises: Exercise[], logs: ExerciseLog[]): { exercise: Exercise; progress: Progress }[] {
  const byId = new Map<string, ExerciseLog[]>()
  for (const l of logs) {
    if (!byId.has(l.exerciseId)) byId.set(l.exerciseId, [])
    byId.get(l.exerciseId)!.push(l)
  }
  return exercises
    .map(exercise => ({ exercise, progress: exerciseProgress(byId.get(exercise.id) || []) }))
    .filter((r): r is { exercise: Exercise; progress: Progress } => !!r.progress)
    .sort((a, b) => b.progress.lastDate.localeCompare(a.progress.lastDate))
}

/** «7 ejercicios · lo último arriba», or «1 de Pecho» with a filter */
export function listLabel(count: number, muscle: string): string {
  return muscle ? `${count} de ${muscle}` : `${plural(count, 'ejercicio', 'ejercicios')} · lo último arriba`
}

// ── Dock ──

export interface HistoryDockInput {
  tab: 'days' | 'exercises'
  hasProgram: boolean
  hasLogs: boolean
  offline: boolean
  kind: PanelKind
  justMarked: boolean
}

export interface HistoryDock {
  caption: string
  action: 'you' | 'today' | null
  label: string
}

const OFFLINE_CAPTION = 'Tu historial está guardado en tu teléfono'

export function historyDock(i: HistoryDockInput): HistoryDock {
  if (i.justMarked) return { caption: 'Listo. Ya cuenta en tu semana.', action: null, label: '' }
  const offline = i.offline ? (i.tab === 'days' && i.kind === 'missed' ? 'Marcar funciona sin internet' : OFFLINE_CAPTION) : ''
  if (!i.hasProgram && (i.tab === 'days' || !i.hasLogs)) {
    return { caption: offline || 'Se elige en Tú → Programas', action: 'you', label: 'Elegir un programa' }
  }
  if (!i.hasLogs) return { caption: offline, action: 'today', label: 'Ir a entrenar' }
  return { caption: offline, action: null, label: '' }
}
