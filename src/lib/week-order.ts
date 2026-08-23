// Weekday → calendar-slot mapping for program weeks.
// A ProgramDay may declare `weekday` (1=Lunes … 7=Domingo). Days without a
// weekday fall back to sequential placement (legacy behavior: day[0] = Monday).

export const DEFAULT_ORDER = [0, 1, 2, 3, 4, 5, 6]

export function buildWeekdayOrder(days: { weekday?: number }[]): number[] {
  const order: number[] = Array(7).fill(-1)
  const used = new Set<number>()
  // Pass 1: explicit weekdays win (first occurrence on duplicate weekday)
  days.forEach((d, i) => {
    const wd = d?.weekday
    if (typeof wd === 'number' && wd >= 1 && wd <= 7 && order[wd - 1] === -1) {
      order[wd - 1] = i
      used.add(i)
    }
  })
  // Pass 2: days without weekday → earliest free slots
  let slot = 0
  days.forEach((_, i) => {
    if (used.has(i)) return
    while (slot < 7 && order[slot] !== -1) slot++
    if (slot < 7) {
      order[slot] = i
      used.add(i)
      slot++
    }
  })
  // Pass 3: remaining slots get unused indices — indices >= days.length mean "free"
  let next = 0
  for (let s = 0; s < 7; s++) {
    if (order[s] === -1) {
      while (next < 7 && used.has(next)) next++
      if (next < 7) {
        order[s] = next
        used.add(next)
        next++
      } else {
        order[s] = s
      }
    }
  }
  return order
}

export function resolveWeekOrder(
  week: { days?: { weekday?: number }[] } | null | undefined,
  override?: number[] | null | undefined
): number[] {
  if (override && override.length === 7) return override
  const days = week?.days || []
  if (days.some(d => d && typeof (d as any).weekday === 'number')) {
    return buildWeekdayOrder(days)
  }
  return DEFAULT_ORDER
}
