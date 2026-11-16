// Guided stretch: how long to hold a move and whether it goes once per side,
// read from its dose sentence («Sostén 20 a 30 segundos por cada pierna»).

export const PREP_SECONDS = 5
const DEFAULT_HOLD = 30
const MIN_HOLD = 15
const MAX_HOLD = 45

const PER_SIDE = /(cada|por) (lado|pierna|brazo)|lado contrario|brazo opuesto|alterna de pierna|cambia de (lado|pierna)/i

/** The longest number of seconds the sentence names, kept within 15–45 s */
export function holdSeconds(text = ''): number {
  if (!/seg|\d\s*s\b/i.test(text)) return DEFAULT_HOLD
  const nums = (text.match(/\d+/g) || []).map(Number)
  if (!nums.length) return DEFAULT_HOLD
  return Math.min(MAX_HOLD, Math.max(MIN_HOLD, Math.max(...nums)))
}

/** 2 when the move is held once on each side, else 1 */
export function sidesOf(text = ''): number {
  return PER_SIDE.test(text) ? 2 : 1
}

/** «0:30» */
export function clockText(seconds: number): string {
  const s = Math.max(0, seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
