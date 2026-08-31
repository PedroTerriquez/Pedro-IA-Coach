import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
import { computeStreakWeeks, computeBestStreakWeeks } from '$lib/streak'
import { resolveWeekOrder } from '$lib/week-order'

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

export function mondayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return toLocalDateStr(calMonday(new Date(y, m - 1, d)))
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
  language?: string,
  rescheduleOrders?: Record<string, number[]>
): (date: Date) => any {
  const t = calStripTime(today)
  const todayMonday = calMonday(t)
  const startDate = calAddDays(todayMonday, -7 * 9)

  const orderCache = new Map<number, number[]>()
  const orderFor = (wi: number): number[] => {
    if (!orderCache.has(wi)) {
      const key = program?.id ? `${program.id}-week-${wi}` : ''
      orderCache.set(wi, resolveWeekOrder(program?.weeks?.[wi], key ? rescheduleOrders?.[key] : undefined))
    }
    return orderCache.get(wi)!
  }

  return function (date: Date) {
    date = calStripTime(date)
    const dow = calDowMon(date)
    const weekDiff = Math.round((calMonday(date).getTime() - todayMonday.getTime()) / (7 * 86400000))
    const wi = ((weekIdx + weekDiff) % weeks + weeks) % weeks
    const day = program.weeks[wi]?.days?.[orderFor(wi)[dow]]
    const isRest = !day || day.name === 'Descanso'
    let raw: any[] = (day && day.exercises && day.exercises.length) ? day.exercises : []
    if (!isRest && !raw.length) raw = program.weeks[0]?.days?.[orderFor(0)[dow]]?.exercises || []
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

export function computeWeekStreak(today: Date, logsByDate: Map<number, any[]>, daysPerWeek = 4): number {
  const logs: any[] = []
  for (const group of logsByDate.values()) logs.push(...group)
  return computeStreakWeeks(logs, daysPerWeek, toLocalDateStr(today))
}

export function computeBestWeekStreak(today: Date, logsByDate: Map<number, any[]>, daysPerWeek = 4): number {
  const logs: any[] = []
  for (const group of logsByDate.values()) logs.push(...group)
  return computeBestStreakWeeks(logs, daysPerWeek, toLocalDateStr(today))
}
