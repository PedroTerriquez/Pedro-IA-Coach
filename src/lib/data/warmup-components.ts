import { getUniqueWarmupMuscles, MUSCLE_DISPLAY, img } from './warmup'
import { EXERCISE_WARMUP } from './exercise-warmup'

const GENERIC_WARMUP: { name: string; imgUrl: string; tag: string; desc: string }[] = [
  { name: 'Círculos de Brazos', imgUrl: img('Arm_Circles/0.jpg'), tag: 'calentar', desc: 'De pie con brazos extendidos. Haz círculos adelante 15 s, luego inverso.' },
  { name: 'Rotación de Tronco', imgUrl: img('Torso_Rotation/0.jpg'), tag: 'calentar', desc: 'Pies al ancho de hombros, rota torso a cada lado. 15 reps.' },
  { name: 'Estiramiento de Gato', imgUrl: img('Cat_Stretch/0.jpg'), tag: 'calentar', desc: 'En cuatro patas, alterna redondear y arquear espalda. 10 reps.' },
  { name: 'Oruga', imgUrl: img('Inchworm/0.jpg'), tag: 'calentar', desc: 'Inclínate, camina manos a plancha, camina pies a manos, levántate. 8 reps.' },
  { name: 'Zancada con Giro', imgUrl: img('Crossover_Reverse_Lunge/0.jpg'), tag: 'calentar', desc: 'Da un paso largo atrás cruzado, baja rodilla trasera. 8 reps cada lado.' },
  { name: 'Estocadas Divididas', imgUrl: img('Split_Squats/0.jpg'), tag: 'calentar', desc: 'Pies separados, baja rodilla trasera al piso. 8 reps cada lado.' },
  { name: 'Mejor Estiramiento del Mundo', imgUrl: img('Worlds_Greatest_Stretch/0.jpg'), tag: 'estirar', desc: 'Desde plancha, pie al lado de la mano, rota torso. Sostén 15 s cada lado.' },
  { name: 'Postura de Niño', imgUrl: img('Childs_Pose/0.jpg'), tag: 'estirar', desc: 'Rodillas al piso, siéntate sobre talones, brazos al frente. Sostén 20-30 s.' },
  { name: 'Espinal Acostado', imgUrl: img('Spinal_Stretch/0.jpg'), tag: 'estirar', desc: 'Acostado, gira rodillas dobladas a un lado, brazos abiertos. Sostén 20 s cada lado.' },
]

const GENERIC_WARMUP_ONLY = GENERIC_WARMUP.filter(x => x.tag === 'calentar')
const GENERIC_STRETCH_ONLY = GENERIC_WARMUP.filter(x => x.tag === 'estirar')

/** Stable per-day hash so the pick (and the saved marks by index) survive a reload */
function dailyIndex(key: string, size: number): number {
  const seed = new Date().toDateString() + key
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h) % size
}

/** Stretch only: muscles stretched by the same moves share one zone (one move covers them all) */
const STRETCH_ZONE: Record<string, string> = { midback: 'back', lats: 'back', neck: 'traps', soleus: 'calves' }

const ZONE_DISPLAY: Record<string, string> = { back: 'Espalda', traps: 'Cuello y trapecios', calves: 'Pantorrillas' }

function zoneOf(key: string, mode: string): string {
  return mode === 'stretch' ? STRETCH_ZONE[key] || key : key
}

function zoneLabel(zone: string, mode: string): string {
  return (mode === 'stretch' && ZONE_DISPLAY[zone]) || MUSCLE_DISPLAY[zone] || zone
}

function zonePool(zone: string, mode: string) {
  const tag = zoneLabel(zone, mode)
  return EXERCISE_WARMUP
    .filter((ex) => ex.kind === mode && zoneOf(ex.muscle, mode) === zone)
    .map((ex) => ({ ...ex, name: ex.es, imgUrl: ex.image || '', tag }))
}

/** One random move per zone, fixed for the day so saved marks (by index) survive a reload.
 *  The zone's other moves ride along as `options` («Otra opción» in the sheet). */
function moveForZone(zone: string, mode: string) {
  const options = zonePool(zone, mode)
  if (!options.length) return []
  const pick = dailyIndex(zone, options.length)
  return [{ ...options[pick], options, pick }]
}

export function resolvePanelItems(muscles: string[], mode: string) {
  const zones = [...new Set(getUniqueWarmupMuscles(muscles).map((k) => zoneOf(k, mode)))]
  const items = zones.flatMap((zone) => moveForZone(zone, mode))
  return items.length > 0 ? items : (mode === 'warmup' ? GENERIC_WARMUP_ONLY : GENERIC_STRETCH_ONLY)
}
