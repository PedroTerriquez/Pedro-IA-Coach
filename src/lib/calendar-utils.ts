import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'

export function calStripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function calKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()
}

export function calDowMon(d: Date): number {
  return (d.getDay() + 6) % 7
}

export function calMonday(d: Date): Date {
  const m = calStripTime(d)
  m.setDate(m.getDate() - calDowMon(m))
  return m
}

export function calAddDays(d: Date, n: number): Date {
  const x = calStripTime(d)
  x.setDate(x.getDate() + n)
  return x
}

export function toLocalDateStr(date: Date): string {
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 10)
}

export function calDayDiff(a: Date, b: Date): number {
  return Math.round((calStripTime(a).getTime() - calStripTime(b).getTime()) / 86400000)
}

export function makeDayStatusFn(
  today: Date,
  logsByDate: Map<number, any[]>,
  program: any,
  weeks: number,
  weekIdx: number,
  exercisesMap?: Record<string, any>,
  language?: string
): (date: Date) => any {
  const t = calStripTime(today)
  const todayMonday = calMonday(t)
  const startDate = calAddDays(todayMonday, -7 * 9)

  return function (date: Date) {
    date = calStripTime(date)
    const dow = calDowMon(date)
    const weekDiff = Math.round((calMonday(date).getTime() - todayMonday.getTime()) / (7 * 86400000))
    const wi = ((weekIdx + weekDiff) % weeks + weeks) % weeks
    const day = program.weeks[wi]?.days[dow]
    const isRest = !day || day.name === 'Descanso'
    let raw: any[] = (day && day.exercises && day.exercises.length) ? day.exercises : []
    if (!isRest && !raw.length) raw = program.weeks[0]?.days[dow]?.exercises || []
    const exercises = raw.map((e: any) => {
      if (e.name) return e
      const resolved = exercisesMap?.[e.exerciseId]
      if (resolved?.name) return { ...e, name: resolved.name, muscle: resolved.muscle || e.muscle }
      const display = getExerciseDisplayName(resolved || e)
      return { ...e, name: display || e.name || 'Ejercicio', muscle: (resolved as any)?.muscle || e.muscle }
    })

    const key = calKey(date)
    const logs = logsByDate.get(key) || []
    const hasWeight = logs.some((l: any) => l.weight > 0 && l.exerciseId !== '__day__')
    const hasDayMark = logs.some((l: any) => l.exerciseId === '__day__')

    let status: string
    if (hasWeight || hasDayMark) status = 'done'
    else if (date > t) status = 'future'
    else if (date < startDate) status = 'none'
    else if (isRest) status = 'rest'
    else status = 'missed'

    return { date, dow, weekIdx: wi, day, isRest, exercises, status, logs }
  }
}

export function computeWeekStreak(today: Date, logsByDate: Map<number, any[]>): number {
  const t = calStripTime(today)
  const thisMonday = calMonday(t)
  let count = 0

  for (let w = 0; w < 200; w++) {
    const weekStart = calAddDays(thisMonday, -w * 7)
    const weekEnd = calAddDays(weekStart, 6)

    if (weekStart > t) continue

    const effectiveEnd = weekEnd > t ? t : weekEnd

    let total = 0
    for (let d = calStripTime(weekStart); d <= effectiveEnd; d = calAddDays(d, 1)) {
      const logs = logsByDate.get(calKey(d)) || []
      if (logs.some((l: any) => l.weight > 0 || l.exerciseId === '__day__')) total++
    }

    if (total >= 4) {
      count++
    } else if (weekEnd <= t) {
      break
    }
  }

  return count
}

export function computeBestWeekStreak(startDate: Date, today: Date, logsByDate: Map<number, any[]>): number {
  const t = calStripTime(today)
  const s = calStripTime(startDate)
  const startMonday = calMonday(s)
  const thisMonday = calMonday(t)
  let best = 0, cur = 0

  for (let w = 0; ; w++) {
    const weekStart = calAddDays(startMonday, w * 7)
    if (weekStart > thisMonday) break

    const weekEnd = calAddDays(weekStart, 6)
    const effectiveEnd = weekEnd > t ? t : weekEnd

    let total = 0
    for (let d = weekStart; d <= effectiveEnd; d = calAddDays(d, 1)) {
      const logs = logsByDate.get(calKey(d)) || []
      if (logs.some((l: any) => l.weight > 0 || l.exerciseId === '__day__')) total++
    }

    if (total >= 4) {
      cur++
      best = Math.max(best, cur)
    } else if (weekEnd <= t) {
      cur = 0
    }
  }

  return best
}
