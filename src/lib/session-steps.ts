import { muscleLabel } from './exercise-utils'
import { shortDate, formatWeight } from './exercise-history'
import type { ExerciseLog } from './types'

// Pure logic of Hoy v2: the done rule, the three steps of the session and what
// the dock asks for next. The page only gathers the data and renders it.

export type ExerciseState = 'pending' | 'now' | 'done'

export interface ExerciseStatus {
  state: ExerciseState
  setsDone: number
}

/**
 * Done = today's log has weight and came from Registrar (no `sets`) or covers
 * every planned set. Fewer sets (logged from the rest timer) = in progress.
 */
export function exerciseStatus(planned: { sets: number }, todayLog?: ExerciseLog | null): ExerciseStatus {
  if (!todayLog || !(todayLog.weight > 0)) return { state: 'pending', setsDone: 0 }
  if (todayLog.sets == null) return { state: 'done', setsDone: planned.sets }
  if (todayLog.sets >= planned.sets) return { state: 'done', setsDone: todayLog.sets }
  return todayLog.sets > 0 ? { state: 'now', setsDone: todayLog.sets } : { state: 'pending', setsDone: 0 }
}

export function isTrainingDone(statuses: ExerciseStatus[]): boolean {
  return statuses.length > 0 && statuses.every(s => s.state === 'done')
}

/** First exercise that isn't done, or -1 */
export function firstPending(statuses: ExerciseStatus[]): number {
  return statuses.findIndex(s => s.state !== 'done')
}

/** First move not marked with Hecho, or -1 */
export function firstUnmarked(marks: number[], total: number): number {
  for (let i = 0; i < total; i++) if (!marks.includes(i)) return i
  return -1
}

export type SessionStage = 'warmup' | 'training' | 'training_done' | 'stretch' | 'finish' | 'complete'

/** Logging every exercise counts as past the warmup even if it was skipped */
export function sessionStage(f: { warmupDone: boolean; trainingDone: boolean; trainingCompleted: boolean; stretchDone: boolean; complete: boolean }): SessionStage {
  if (f.complete) return 'complete'
  if (!f.warmupDone && !f.trainingDone) return 'warmup'
  if (!f.trainingDone) return 'training'
  if (!f.trainingCompleted) return 'training_done'
  if (!f.stretchDone) return 'stretch'
  return 'finish'
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// ── Header ──

/** «Mié 7 oct · Semana 1 · Volumen» (the week tag stays out) */
export function sessionEyebrow(date: string, week: { name?: string; subtitle?: string } | null): string {
  const parts = [shortDate(date), week?.name, week?.subtitle].filter(Boolean)
  return parts.join(' · ')
}

/** «Pecho · Hombro»: the day's muscles in Spanish, once each */
export function dayMuscles(exercises: { muscle?: string }[]): string {
  const labels = exercises.map(e => muscleLabel(e.muscle)).filter(Boolean)
  return [...new Set(labels)].join(' · ')
}

/** «00:11» while the session runs (h:mm past an hour) */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${hh}:${pad(mm)}` : `${pad(mm)}:${pad(total % 60)}`
}

// ── Detail sheet opened from a list ──

/** «Empuje · 1 de 3» */
export function detailPosition(dayName: string, idx: number, total: number): string {
  return [dayName, `${idx + 1} de ${total}`].filter(Boolean).join(' · ')
}

/** What comes after `idx` in the list, for the dock's «Después: …» */
export function nextInList<T>(list: T[], idx: number): T | null {
  return list[idx + 1] ?? null
}

/** «2:00» */
export function restClock(sec: number): string {
  const s = Math.max(0, Math.round(sec || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** «75 y 80 kg» */
export function weightsList(weights: number[], units: string): string {
  const unique = [...new Set(weights.map(formatWeight))]
  const text = unique.length > 1 ? `${unique.slice(0, -1).join(', ')} y ${unique[unique.length - 1]}` : unique[0] || '0'
  return `${text} ${units}`
}

// ── Rows ──

export type RowState = 'done' | 'now' | 'next' | ''

export interface StepRow {
  name: string
  sub: string
  right: string
  imgUrl: string
  state: RowState
  /** In-progress exercise: one mark per planned set, `on` already done */
  pips?: { total: number; on: number }
}

export interface SessionExercise {
  name: string
  muscle?: string
  imgUrl?: string
  sets: number
  reps: string
  status: ExerciseStatus
  todayWeight: number
  lastWeight: number
}

export interface SessionMove {
  name: string
  tag?: string
  imgUrl?: string
  gif?: string
}

function lastPart(lastWeight: number, units: string): string {
  return lastWeight > 0 ? `Última ${formatWeight(lastWeight)} ${units}` : ''
}

function exerciseSub(ex: SessionExercise, units: string): string {
  const muscle = muscleLabel(ex.muscle)
  if (ex.status.state === 'done') return `Hoy ${ex.status.setsDone} × ${formatWeight(ex.todayWeight)} ${units}`
  if (ex.status.state === 'now') return [`Serie ${ex.status.setsDone + 1} de ${ex.sets}`, lastPart(ex.lastWeight, units)].filter(Boolean).join(' · ')
  return [muscle, lastPart(ex.lastWeight, units)].filter(Boolean).join(' · ')
}

export function exerciseRow(ex: SessionExercise, isNext: boolean, units: string): StepRow {
  const state: RowState = ex.status.state === 'done' ? 'done' : ex.status.state === 'now' ? 'now' : isNext ? 'next' : ''
  return {
    name: ex.name,
    sub: exerciseSub(ex, units),
    right: state === 'done' ? '' : `${ex.sets} × ${ex.reps}`,
    imgUrl: ex.imgUrl || '',
    state,
    pips: state === 'now' ? { total: ex.sets, on: ex.status.setsDone } : undefined,
  }
}

/** Moves only show their muscle: the dose lives in the sheet */
export function moveRow(move: SessionMove, marked: boolean, isNext: boolean): StepRow {
  return {
    name: move.name,
    sub: move.tag || '',
    right: '',
    imgUrl: move.imgUrl || move.gif || '',
    state: marked ? 'done' : isNext ? 'next' : '',
  }
}

// ── Phases ──

export type PhaseKey = 'warmup' | 'training' | 'stretch'
export type PhaseState = 'open' | 'done' | 'later'

export interface PhaseView {
  key: PhaseKey
  num: number
  name: string
  state: PhaseState
  /** Subtitle of the folded «Después» row */
  sub: string
  done: number
  total: number
  rows: StepRow[]
}

export interface PhasesInput {
  stage: SessionStage
  warmup: { moves: SessionMove[]; marks: number[]; done: boolean }
  stretch: { moves: SessionMove[]; marks: number[]; done: boolean }
  exercises: SessionExercise[]
  units: string
}

function phaseState(key: PhaseKey, done: boolean, stage: SessionStage): PhaseState {
  if (done) return 'done'
  return stage === key ? 'open' : 'later'
}

function movePhase(key: 'warmup' | 'stretch', name: string, prefix: string, p: PhasesInput): Omit<PhaseView, 'num'> {
  const { moves, marks, done } = p[key]
  const state = phaseState(key, done, p.stage)
  const next = state === 'open' ? firstUnmarked(marks, moves.length) : -1
  return {
    key,
    name,
    state,
    sub: `${prefix} · ${plural(moves.length, 'movimiento')}`,
    done: marks.length,
    total: moves.length,
    rows: moves.map((m, i) => moveRow(m, marks.includes(i), i === next)),
  }
}

function trainingPhase(p: PhasesInput): Omit<PhaseView, 'num'> {
  const statuses = p.exercises.map(e => e.status)
  const done = isTrainingDone(statuses)
  const state = phaseState('training', done, p.stage)
  const next = state === 'open' ? firstPending(statuses) : -1
  const muscles = dayMuscles(p.exercises)
  return {
    key: 'training',
    name: 'Entrenamiento',
    state,
    sub: [muscles, plural(p.exercises.length, 'ejercicio')].filter(Boolean).join(' · '),
    done: statuses.filter(s => s.state === 'done').length,
    total: p.exercises.length,
    rows: p.exercises.map((e, i) => exerciseRow(e, i === next, p.units)),
  }
}

/** The steps that exist today, numbered in order */
export function buildPhases(p: PhasesInput): PhaseView[] {
  const list = [
    p.warmup.moves.length ? movePhase('warmup', 'Calentamiento', 'Activación dinámica', p) : null,
    p.exercises.length ? trainingPhase(p) : null,
    p.stretch.moves.length ? movePhase('stretch', 'Estiramiento', 'Enfriamiento', p) : null,
  ].filter((x): x is Omit<PhaseView, 'num'> => !!x)
  return list.map((ph, i) => ({ ...ph, num: i + 1 }))
}

// ── Dock ──

export type DockTarget =
  | { kind: 'warmup' | 'stretch' | 'exercise'; idx: number }
  | { kind: 'finish' }

export interface DockStep {
  caption: string
  label: string
  target: DockTarget
}

export interface DockInput {
  stage: SessionStage
  warmup: { moves: SessionMove[]; marks: number[] }
  stretch: { moves: SessionMove[]; marks: number[] }
  exercises: SessionExercise[]
  firstEver: boolean
  offline: boolean
}

export const OFFLINE_DOCK_CAPTION = 'Sin internet también se guarda todo en tu teléfono.'

function continueMoves(kind: 'warmup' | 'stretch', moves: SessionMove[], marks: number[]): DockStep {
  const free = firstUnmarked(marks, moves.length)
  const idx = free === -1 ? moves.length - 1 : free
  return { caption: `Movimiento ${idx + 1} de ${moves.length}`, label: `Seguir con ${moves[idx].name}`, target: { kind, idx } }
}

function warmupStep(i: DockInput): DockStep {
  const { moves, marks } = i.warmup
  if (marks.length) return continueMoves('warmup', moves, marks)
  const caption = i.firstEver
    ? `Tu primer entreno. Empieza suave: ${plural(moves.length, 'movimiento')}.`
    : `${plural(moves.length, 'movimiento')}, uno a la vez`
  return { caption, label: 'Empezar calentamiento', target: { kind: 'warmup', idx: 0 } }
}

function trainingStep(i: DockInput): DockStep | null {
  const idx = firstPending(i.exercises.map(e => e.status))
  if (idx === -1) return null
  const ex = i.exercises[idx]
  const target: DockTarget = { kind: 'exercise', idx }
  if (ex.status.state === 'now') return { caption: '', label: `Registrar serie ${ex.status.setsDone + 1} de ${ex.name}`, target }
  return { caption: `Ejercicio ${idx + 1} de ${i.exercises.length} · ${plural(ex.sets, 'serie')}`, label: `Empezar con ${ex.name}`, target }
}

function stretchStep(i: DockInput): DockStep {
  const { moves, marks } = i.stretch
  if (marks.length) return continueMoves('stretch', moves, marks)
  return { caption: `Último paso · ${plural(moves.length, 'movimiento')}`, label: 'Empezar estiramiento', target: { kind: 'stretch', idx: 0 } }
}

function trainingDoneStep(i: DockInput): DockStep {
  const doneCount = i.exercises.filter(e => e.status.state === 'done').length
  return { caption: `Entrenamiento completado · ${plural(doneCount, 'ejercicio')}`, label: 'Terminar entrenamiento', target: { kind: 'finish' } }
}

function stageStep(i: DockInput): DockStep | null {
  if (i.stage === 'warmup' && i.warmup.moves.length) return warmupStep(i)
  if (i.stage === 'training') return trainingStep(i)
  if (i.stage === 'training_done') return trainingDoneStep(i)
  if (i.stage === 'stretch' && i.stretch.moves.length) return stretchStep(i)
  if (i.stage === 'finish') return { caption: 'Lo último de hoy', label: 'Terminar sesión', target: { kind: 'finish' } }
  return null
}

/** The single next step of the session; null once it's over */
export function dockStep(i: DockInput): DockStep | null {
  const step = stageStep(i)
  if (!step) return null
  return i.offline ? { ...step, caption: OFFLINE_DOCK_CAPTION } : step
}
