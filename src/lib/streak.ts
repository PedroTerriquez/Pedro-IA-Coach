import type { Program } from '$lib/types'

const FALLBACK_DAYS_PER_WEEK = 4

// A day only counts as a training day if the week's program lists exercises for it.
// Rest/empty days (e.g. a "Descanso" day or a leftover slot with no exercises) are excluded.
export function trainingDaysPerWeek(program: Program | null | undefined, weekIdx: number): number {
  const week = program?.weeks?.[weekIdx]
  if (!week) return 0
  return week.days.filter(d => (d.exercises || []).length > 0).length
}

// A week counts as completed when the user trained on at least daysPerWeek - 1 of the
// planned days (6/week → 5 sessions count, 5/week → 4, 4/week → 3). Without an active
// program we fall back to the historical threshold of 4 sessions.
export function streakThreshold(daysPerWeek: number): number {
  if (daysPerWeek <= 0) return FALLBACK_DAYS_PER_WEEK
  return Math.max(1, daysPerWeek - 1)
}

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toLocalDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isTrained(log: { weight?: number; exerciseId?: string }): boolean {
  return (log.weight !== undefined && log.weight > 0) || log.exerciseId === '__day__'
}

function trainedDates(logs: { date: string; weight?: number; exerciseId?: string }[]): Set<string> {
  const trained = new Set<string>()
  for (const log of logs) {
    if (isTrained(log)) trained.add(log.date)
  }
  return trained
}

function countTrainedInWeek(trained: Set<string>, weekStart: Date, effectiveEnd: Date): number {
  let count = 0
  for (let d = weekStart; d <= effectiveEnd; d = addDays(d, 1)) {
    if (trained.has(toLocalDateStr(d))) count++
  }
  return count
}

// Current week counts toward the streak only once it reaches the threshold; a partial
// current week never breaks it. A fully missed past week (below threshold) ends the run.
export function computeStreakWeeks(
  logs: { date: string; weight?: number; exerciseId?: string }[],
  daysPerWeek: number,
  todayDate: string
): number {
  const trained = trainedDates(logs)
  const today = parseLocalDate(todayDate)
  if (isNaN(today.getTime())) return 0
  const threshold = streakThreshold(daysPerWeek)
  const currentMonday = getMonday(today)
  let weeks = 0
  for (let w = 0; w < 520; w++) {
    const weekStart = addDays(currentMonday, -w * 7)
    const weekEnd = addDays(weekStart, 6)
    const effectiveEnd = weekEnd > today ? today : weekEnd
    if (countTrainedInWeek(trained, weekStart, effectiveEnd) >= threshold) {
      weeks++
    } else if (weekEnd <= today) {
      break
    }
  }
  return weeks
}

// Longest run of consecutive completed weeks across all history (partial current week
// included if it already meets the threshold, otherwise it just doesn't add to the run).
export function computeBestStreakWeeks(
  logs: { date: string; weight?: number; exerciseId?: string }[],
  daysPerWeek: number,
  todayDate: string
): number {
  const trained = trainedDates(logs)
  const today = parseLocalDate(todayDate)
  if (isNaN(today.getTime())) return 0
  const threshold = streakThreshold(daysPerWeek)
  const currentMonday = getMonday(today)
  let earliest = currentMonday
  for (const dateStr of trained) {
    const d = parseLocalDate(dateStr)
    if (d < earliest) earliest = d
  }
  const startMonday = getMonday(earliest)
  let best = 0
  let cur = 0
  for (let w = 0; ; w++) {
    const weekStart = addDays(startMonday, w * 7)
    if (weekStart > currentMonday) break
    const weekEnd = addDays(weekStart, 6)
    const effectiveEnd = weekEnd > today ? today : weekEnd
    if (countTrainedInWeek(trained, weekStart, effectiveEnd) >= threshold) {
      cur++
      best = Math.max(best, cur)
    } else if (weekEnd <= today) {
      cur = 0
    }
  }
  return best
}
