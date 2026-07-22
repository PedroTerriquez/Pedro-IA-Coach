export const BODY_PARTS: Record<string, string[]> = {
  Chest: ['Pecho', 'Hombro frontal', 'Codo', 'Muñeca'],
  Back: ['Hombro posterior', 'Codo', 'Muñeca', 'Lumbar'],
  Shoulders: ['Hombro', 'Cuello', 'Codo'],
  Biceps: ['Bíceps', 'Codo', 'Antebrazo'],
  Triceps: ['Tríceps', 'Codo', 'Hombro'],
  Legs: ['Cuádriceps', 'Rodilla', 'Isquios', 'Cadera', 'Tobillo', 'Glúteo'],
  Quads: ['Cuádriceps', 'Rodilla', 'Cadera'],
  Hamstrings: ['Isquios', 'Cadera', 'Rodilla'],
  Glutes: ['Glúteo', 'Cadera', 'Lumbar'],
  Calves: ['Pantorrilla', 'Tobillo', 'Aquiles'],
  Abs: ['Abdomen', 'Lumbar', 'Cuello'],
}

const DEFAULT_BODY_PARTS = ['Hombro', 'Codo', 'Muñeca', 'Rodilla', 'Lumbar']

export function bodyPartsFor(muscle: string): string[] {
  return BODY_PARTS[muscle] || DEFAULT_BODY_PARTS
}
