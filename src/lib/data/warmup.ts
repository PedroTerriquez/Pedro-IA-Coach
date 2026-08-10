import { EXERCISE_WARMUP } from './exercise-warmup'
import { IMG_BASE } from './exercise-dictionary'

export const img = (p: string): string => IMG_BASE + p

export const WARMUP_MUSCLE_KEYS: string[] = [...new Set(EXERCISE_WARMUP.map((e) => e.muscle))]

export const MUSCLE_ALIASES: Record<string, string> = {
    'upper chest': 'chest',
    'lower chest': 'chest',
    'mid-back': 'midback',
    'mid back': 'midback',
    'side delts': 'shoulders',
    'side delt': 'shoulders',
    'rear delts': 'shoulders',
    'rear delt': 'shoulders',
    'front delts': 'shoulders',
    'front delt': 'shoulders',
    'delts': 'shoulders',
    'delt': 'shoulders',
    'quads / glutes': 'quads',
    'biceps / brachialis': 'biceps',
    'lower back': 'back',
    'pecho': 'chest',
    'espalda': 'back',
    'hombros': 'shoulders',
    'hombro': 'shoulders',
    'triceps': 'triceps',
    'biceps': 'biceps',
    'cuadriceps': 'quads',
    'cuádriceps': 'quads',
    'femoral': 'hamstrings',
    'gluteos': 'glutes',
    'glúteos': 'glutes',
    'glúteo': 'glutes',
    'glúteo medio': 'glutes',
    'gemelos': 'calves',
    'pantorrillas': 'calves',
    'abdominales': 'abs',
    'abdomen': 'abs',
    'oblicuos': 'abs',
    'core': 'abs',
    'antebrazos': 'forearms',
    'cuello': 'neck',
    'trapecios': 'traps',
    'dorsales': 'lats',
    'dorsal': 'lats',
    'lumbares': 'back',
    'piernas': 'quads',
    'isquiotibiales': 'hamstrings',
    'isquiosurales': 'hamstrings',
    'bíceps': 'biceps',
    'tríceps': 'triceps',
    'trapecio': 'traps',
    'soleo': 'soleus',
    'cadena posterior': 'back',
    'erectores espinales': 'back',
    'romboides': 'midback',
  }

export function resolveMuscles(muscleStr: string): string[] {
    if (!muscleStr) return []
    const s = muscleStr.toLowerCase().trim()

    // Split by comma for compound muscles (e.g. "Pecho, Tríceps")
    // Only commas are compound separators; "/" appears inside parens (e.g. "Hombro (Anterior/Medio)")
    if (s.includes(',')) {
      const parts = s.split(',').map(p => p.trim()).filter(Boolean)
      const resolved = new Set<string>()
      for (const p of parts) {
        const r = resolveOne(p)
        if (r) resolved.add(r)
      }
      if (resolved.size > 0) return [...resolved]
    }

    const r = resolveOne(s)
    return r ? [r] : []
  }

  function resolveOne(name: string) {
    const base = name.replace(/\s*\([^)]*\)/g, '').trim()

    if (MUSCLE_ALIASES[name]) return MUSCLE_ALIASES[name]
    if (base !== name && MUSCLE_ALIASES[base]) return MUSCLE_ALIASES[base]

    const direct = resolveSingle(name)
    if (direct) return direct
    if (base !== name) {
      const baseDirect = resolveSingle(base)
      if (baseDirect) return baseDirect
    }

    const sortedKeys = [...WARMUP_MUSCLE_KEYS].sort((a, b) => b.length - a.length)
    for (const key of sortedKeys) {
      if (name.includes(key) || base.includes(key)) return key
    }

    return null
  }

  function resolveSingle(s: string) {
    const clean = s.replace(/[-\s]+/g, '').toLowerCase()
    if (WARMUP_MUSCLE_KEYS.includes(clean)) return clean
    if (WARMUP_MUSCLE_KEYS.includes(s)) return s
    return null
  }

export function getUniqueWarmupMuscles(muscleNames: string[]) {
    const set = new Set<string>()
    for (const name of muscleNames) {
      const resolved = resolveMuscles(name)
      resolved.forEach((r: string) => set.add(r))
    }
    return [...set]
  }

export const MUSCLE_DISPLAY: Record<string, string> = {
    chest: 'Pecho',
    shoulders: 'Hombros',
    triceps: 'Tríceps',
    biceps: 'Bíceps',
    back: 'Espalda',
    midback: 'Espalda Media',
    lats: 'Dorsales',
    traps: 'Trapecios',
    quads: 'Cuádriceps',
    hamstrings: 'Femorales',
    glutes: 'Glúteos',
    calves: 'Gemelos',
    soleus: 'Sóleo',
    abs: 'Abdominales',
    forearms: 'Antebrazos',
    neck: 'Cuello',
  }
