// «Añadir alternativa» (Tú · Nuevo 03): search the dictionary and the user's own
// exercises, accent- and case-insensitive. Pure: no storage, no DOM.
import { EXERCISE_DICTIONARY, normalizeExerciseName, resolveExerciseMedia, searchExerciseEntries } from '$lib/data/exercise-dictionary'
import { muscleLabel } from '$lib/exercise-utils'
import type { Exercise } from '$lib/types'

export interface AltCandidate {
  name: string
  muscle: string
  imgUrl: string
  fromDictionary: boolean
  /** Already an alternative of this exercise: shown dimmed, can't be picked */
  had: boolean
}

const LIMIT = 40

type DictEntry = (typeof EXERCISE_DICTIONARY)[number]

function fromEntry(entry: DictEntry): Omit<AltCandidate, 'had'> {
  return {
    name: entry.es,
    muscle: entry.muscle,
    imgUrl: resolveExerciseMedia({ name: entry.es, dictId: `dict_${entry.id}` }).imgUrl,
    fromDictionary: true,
  }
}

function fromExercise(ex: Exercise): Omit<AltCandidate, 'had'> {
  return { name: ex.name, muscle: muscleLabel(ex.muscle), imgUrl: resolveExerciseMedia(ex).imgUrl, fromDictionary: false }
}

function matchesAll(name: string, tokens: string[]): boolean {
  const n = normalizeExerciseName(name)
  return tokens.every(t => n.includes(t))
}

function sameMuscle(muscle: string, target: string): boolean {
  return !!target && normalizeExerciseName(muscle).includes(target)
}

function userMatches(exercises: Exercise[], tokens: string[]): Exercise[] {
  return tokens.length ? exercises.filter(ex => matchesAll(ex.name, tokens)) : exercises
}

function dictionaryMatches(query: string, tokens: string[]): DictEntry[] {
  return tokens.length ? searchExerciseEntries(query, LIMIT) : [...EXERCISE_DICTIONARY]
}

/** Photo of an alternative: the user's own exercise with that name first, then the dictionary */
export function alternativeImage(name: string, exercises: Exercise[]): string {
  const key = normalizeExerciseName(name)
  const own = exercises.find(ex => normalizeExerciseName(ex.name) === key)
  return resolveExerciseMedia(own ?? { name }).imgUrl
}

export function searchAlternatives(query: string, exercise: Exercise, exercises: Exercise[]): AltCandidate[] {
  const tokens = normalizeExerciseName(query).split(' ').filter(Boolean)
  const own = normalizeExerciseName(exercise.name)
  const had = new Set((exercise.alternatives || []).map(a => normalizeExerciseName(a.name)))
  const seen = new Set<string>([own])
  const out: AltCandidate[] = []

  const candidates = [
    ...userMatches(exercises, tokens).map(fromExercise),
    ...dictionaryMatches(query, tokens).map(fromEntry),
  ]
  for (const c of candidates) {
    const key = normalizeExerciseName(c.name)
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ ...c, had: had.has(key) })
  }

  if (tokens.length) return out.slice(0, LIMIT)
  const target = normalizeExerciseName(muscleLabel(exercise.muscle))
  const first = out.filter(c => sameMuscle(c.muscle, target))
  const rest = out.filter(c => !sameMuscle(c.muscle, target))
  return [...first, ...rest].slice(0, LIMIT)
}
