import { EXERCISE_DICTIONARY } from '../data/exercise-dictionary'

type DictEntry = { es: string; en: string; aliases: string[] }

export function buildAIDictionary(exerciseNames?: string[] | null): DictEntry[] {
  if (!exerciseNames) {
    return EXERCISE_DICTIONARY.map((e: any) => ({
      es: e.es,
      en: e.en,
      aliases: e.aliases || [],
    }))
  }
  const nameSet = new Set(exerciseNames)
  return EXERCISE_DICTIONARY
    .filter((e: any) => nameSet.has(e.es) || nameSet.has(e.en))
    .map((e: any) => ({ es: e.es, en: e.en, aliases: e.aliases || [] }))
}

export function buildFilteredDictionary(exerciseNames: string[]): DictEntry[] {
  const nameSet = new Set(exerciseNames)
  return EXERCISE_DICTIONARY
    .filter((e: any) => nameSet.has(e.es) || nameSet.has(e.en))
    .map((e: any) => ({ es: e.es, en: e.en, aliases: e.aliases || [] }))
}
