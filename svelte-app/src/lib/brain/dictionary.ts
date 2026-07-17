import { EXERCISE_DICTIONARY } from '../data/exercise-dictionary'

export function buildAIDictionary(exerciseNames: string[] | null = null): { es: string }[] {
  if (!exerciseNames) return []
  const nameSet = new Set(exerciseNames)
  return EXERCISE_DICTIONARY
    .filter((e: any) => nameSet.has(e.es) || nameSet.has(e.en))
    .map((e: any) => ({ es: e.es }))
}

export function buildImportDictionary(): { es: string; en: string; aliases: string[] }[] {
  return EXERCISE_DICTIONARY.map((e: any) => ({
    es: e.es,
    en: e.en,
    aliases: e.aliases || [],
  }))
}
