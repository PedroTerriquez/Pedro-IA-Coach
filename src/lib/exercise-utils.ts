export function parseRepsDefault(rep: string | number): number {
  if (typeof rep === 'number') return rep
  const m = String(rep).match(/(\d+)(?:\s*-\s*(\d+))?/)
  if (!m) return 8
  return parseInt(m[2] || m[1], 10)
}

// Muscles are stored as free text, often in English from the dictionary or
// old imports. This only translates for display; the stored value is untouched.
const MUSCLE_ES: Record<string, string> = {
  chest: 'Pecho',
  back: 'Espalda',
  lats: 'Espalda',
  'upper back': 'Espalda',
  'lower back': 'Lumbar',
  shoulders: 'Hombro',
  shoulder: 'Hombro',
  delts: 'Hombro',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearms: 'Antebrazo',
  quadriceps: 'Cuádriceps',
  quads: 'Cuádriceps',
  hamstrings: 'Femoral',
  glutes: 'Glúteo',
  calves: 'Pantorrilla',
  abs: 'Abdomen',
  core: 'Abdomen',
  abdominals: 'Abdomen',
  legs: 'Pierna',
  traps: 'Trapecio',
  'full body': 'Cuerpo completo',
}

export function muscleLabel(muscle?: string): string {
  const raw = (muscle || '').trim()
  return MUSCLE_ES[raw.toLowerCase()] || raw
}
