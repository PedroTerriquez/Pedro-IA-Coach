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
  { name: 'Abrazo de Rodillas al Pecho', imgUrl: img('Hug_Knees_To_Chest/0.jpg'), tag: 'estirar', desc: 'Acostado, abraza rodillas al pecho, mece suavemente. Sostén 20-30 s.' },
  { name: 'Postura de Niño', imgUrl: img('Childs_Pose/0.jpg'), tag: 'estirar', desc: 'Rodillas al piso, siéntate sobre talones, brazos al frente. Sostén 20-30 s.' },
  { name: 'Espinal Acostado', imgUrl: img('Spinal_Stretch/0.jpg'), tag: 'estirar', desc: 'Acostado, gira rodillas dobladas a un lado, brazos abiertos. Sostén 20 s cada lado.' },
  { name: 'Media Langosta', imgUrl: img('One_Half_Locust/0.jpg'), tag: 'estirar', desc: 'Acostado boca abajo, levanta una pierna y brazo opuesto. Sostén 15 s cada lado.' },
  { name: 'Superman', imgUrl: img('Superman/0.jpg'), tag: 'estirar', desc: 'Acostado boca abajo, levanta brazos y piernas simultáneamente. Sostén 15 s.' },
]

const GENERIC_WARMUP_ONLY = GENERIC_WARMUP.filter(x => x.tag === 'calentar')
const GENERIC_STRETCH_ONLY = GENERIC_WARMUP.filter(x => x.tag === 'estirar')

export function resolvePanelItems(muscles: string[], mode: string) {
  const keys: string[] = getUniqueWarmupMuscles(muscles)
  const items: any[] = []
  if (keys.length > 0) {
    keys.forEach((key: string) => {
      EXERCISE_WARMUP
        .filter((ex) => ex.kind === mode && ex.muscle === key)
        .forEach((ex) =>
          items.push({
            ...ex,
            name: ex.es,
            imgUrl: ex.image || '',
            tag: MUSCLE_DISPLAY[key] || key,
          })
        )
    })
  }
  return items.length > 0 ? items : (mode === 'warmup' ? GENERIC_WARMUP_ONLY : GENERIC_STRETCH_ONLY)
}
