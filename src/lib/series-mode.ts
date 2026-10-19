import type { SetEntry } from './set-log'

export interface AutoFillResult {
  sets: SetEntry[]
  autoFlags: boolean[]  // true = this set was auto-filled
}

/**
 * Given the sets already registered today for an exercise, fill up to the
 * planned number of sets by repeating the last known set (or a fallback
 * built from lastWeight + prescribed reps). Returns the filled sets and a
 * parallel array of boolean flags marking which sets were auto-filled.
 */
export function getAutoFilledSets(
  _exerciseId: string,
  plannedSets: number,
  plannedReps: string,
  lastWeight: number,
  currentSets: SetEntry[]
): AutoFillResult {
  const reps = parseInt(String(plannedReps).match(/\d+/)?.[0] || '0', 10)
  const fallback: SetEntry = { weight: lastWeight || 0, reps }
  const filled = [...currentSets]
  const autoFlags = currentSets.map(() => false)
  
  while (filled.length < plannedSets) {
    const prev = filled[filled.length - 1] || fallback
    filled.push({ ...prev })
    autoFlags.push(true)
  }
  
  return { sets: filled, autoFlags }
}

/**
 * Returns 1-based indexes of sets that haven't been registered yet.
 */
export function findMissingSets(currentSets: SetEntry[], plannedSets: number): number[] {
  const missing: number[] = []
  for (let i = currentSets.length; i < plannedSets; i++) missing.push(i + 1)
  return missing
}

/**
 * Adds an ephemeral `_auto` flag to each set for UI rendering (not persisted).
 */
export function withAutoFlag(sets: SetEntry[], autoFlags: boolean[]): (SetEntry & { _auto?: boolean })[] {
  return sets.map((s, i) => ({ ...s, _auto: autoFlags[i] }))
}