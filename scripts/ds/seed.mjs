// Realistic Spanish sample data for the design-system cards.
const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export const todayIdx = () => (new Date().getDay() + 6) % 7

// Same media findOrCreateExerciseByName() would copy from the dictionary entry.
const MEDIA = {
  'press-banca-barra': ['Barbell_Bench_Press_-_Medium_Grip', 'pectorals/barbell-bench-press'],
  'press-militar-barra': ['Barbell_Shoulder_Press', 'delts/barbell-seated-overhead-press'],
  'elevaciones-laterales-mancuernas': ['Side_Lateral_Raise', 'delts/dumbbell-lateral-raise'],
  'remo-barra': ['Bent_Over_Barbell_Row', 'upper-back/barbell-bent-over-row'],
  'jalon-pecho-lat-pulldown': ['Wide-Grip_Lat_Pulldown', 'lats/cable-pulldown'],
  'curl-barra-ez': ['EZ-Bar_Curl', 'biceps/barbell-curl'],
}
const ex = (id, name, dictId, muscle, tips, alternatives) => ({
  id, name, dictId, muscle, tips, alternatives,
  imgUrl: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${MEDIA[dictId][0]}/0.jpg`,
  gifUrl: `https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/${MEDIA[dictId][1]}.gif`,
})

export const exercises = [
  ex('ex-bench', 'Press Banca', 'press-banca-barra', 'Chest',
    ['Hombros atrás y abajo', 'No rebotes la barra en el pecho', 'Pies firmes en el piso'],
    [{ name: 'Press Banca con Mancuernas', reason: 'Más rango de movimiento' }, { name: 'Press Banca Declinado', reason: 'Menos carga en el hombro' }]),
  ex('ex-military', 'Press Militar', 'press-militar-barra', 'Shoulders',
    ['Core apretado', 'No arquees la espalda', 'La barra baja a la clavícula'],
    [{ name: 'Elevaciones Laterales', reason: 'Aísla el deltoides medio' }]),
  ex('ex-lateral', 'Elevaciones Laterales', 'elevaciones-laterales-mancuernas', 'Shoulders',
    ['Codos ligeramente flexionados', 'Sube hasta la altura del hombro'],
    [{ name: 'Elevaciones Laterales en Polea', reason: 'Tensión constante' }]),
  ex('ex-row', 'Remo con Barra', 'remo-barra', 'Back',
    ['Espalda neutra', 'Lleva la barra al ombligo', 'No uses impulso'],
    [{ name: 'Remo en T', reason: 'Menos carga lumbar' }]),
  ex('ex-pulldown', 'Jalón al Pecho', 'jalon-pecho-lat-pulldown', 'Back',
    ['Pecho arriba', 'Codos hacia las costillas'],
    [{ name: 'Dominadas Asistidas', reason: 'Mismo patrón, peso corporal' }]),
  ex('ex-curl', 'Curl con Barra EZ', 'curl-barra-ez', 'Biceps',
    ['Codos pegados al torso', 'Baja controlado'],
    [{ name: 'Curl Martillo', reason: 'Más braquial' }]),
]

const pe = (exerciseId, sets, reps, rest) => ({ exerciseId, sets, reps, rest })
const REST = { name: 'Descanso', subtitle: '', exercises: [] }
const PUSH = { name: 'Empuje', subtitle: 'Pecho · Hombro', exercises: [pe('ex-bench', 4, '8-10', 120), pe('ex-military', 3, '10-12', 90), pe('ex-lateral', 3, '12-15', 60)] }
const PULL = { name: 'Jalón', subtitle: 'Espalda · Bíceps', exercises: [pe('ex-row', 4, '8-10', 120), pe('ex-pulldown', 3, '10-12', 90), pe('ex-curl', 3, '12', 60)] }

/** 7 days, Mon→Sun. `today` decides what lands on today's weekday. */
function week(name, tag, today) {
  const days = [PUSH, PULL, REST, PUSH, PULL, REST, REST].map((d) => ({ ...d }))
  days[todayIdx()] = { ...today }
  return { name, subtitle: '', tag, days }
}

export const program = (today = PUSH) => ({
  id: 'prog-ppl',
  name: 'Empuje / Jalón',
  weeks: [week('Semana 1 · Volumen', 'BUILD', today), week('Semana 2 · Fuerza', 'STRENGTH', today)],
})
export const restDayProgram = () => program(REST)
export const secondProgram = () => ({ id: 'prog-full', name: 'Full Body 3 días', weeks: [week('Semana única', 'BASE', PULL)] })

export const settings = (over = {}) => ({
  id: 'settings', activeProgramId: 'prog-ppl', currentWeekIdx: 0, units: 'kg', accentColor: '#d4ff3a',
  hasWatch: true, userName: 'Pedro', username: 'Pedro', height: '178', weight: '82', sex: 'Masculino', age: '31',
  goal: 'hipertrofia', experience: 'intermedio', occupation: 'Ingeniero', pushSubscribed: false, pushServerUrl: '',
  sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es', onboarded: true, ...over,
})

const BASE_KG = { 'ex-bench': 60, 'ex-military': 35, 'ex-lateral': 8, 'ex-row': 55, 'ex-pulldown': 50, 'ex-curl': 25 }

function monday(weeksAgo) {
  const d = new Date()
  d.setDate(d.getDate() - todayIdx() - weeksAgo * 7)
  return d
}

/** Every planned session of the last six weeks (and this week up to yesterday), slowly progressing. */
function history() {
  const exerciseLogs = []
  const gymSessions = []
  const plan = program().weeks[0].days
  for (let w = 6; w >= 0; w--) {
    const start = monday(w)
    for (let i = 0; i < (w === 0 ? todayIdx() : 7); i++) {
      if (!plan[i].exercises.length) continue
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      gymSessions.push({ id: `gym-${w}-${i}`, date: iso(d), seconds: 3300 + i * 240, weekStart: iso(start) })
      for (const { exerciseId: id } of plan[i].exercises) {
        const weight = BASE_KG[id] + (6 - w) * 2.5
        // ids sort chronologically, like the app's time-based generateId()
        exerciseLogs.push({ id: `log-${String(1000 + exerciseLogs.length)}-${id}`, exerciseId: id, date: iso(d), weight, units: 'kg', sets: 3, reps: '10', blocks: [{ sets: 3, reps: 10, weight }] })
      }
    }
  }
  return { exerciseLogs, gymSessions }
}
export const logs = () => history().exerciseLogs
export const gymSessions = () => history().gymSessions

export const friends = [
  { username: 'Ana', streak: 12, exercisedToday: true, gymTime: 14400, lastUpdate: new Date().toISOString() },
  { username: 'Luis', streak: 9, exercisedToday: true, gymTime: 11700, lastUpdate: new Date().toISOString() },
  { username: 'Mariana', streak: 4, exercisedToday: false, gymTime: 7200, lastUpdate: new Date().toISOString() },
  { username: 'Diego', streak: 2, exercisedToday: false, gymTime: 3600, lastUpdate: new Date().toISOString() },
]

export async function seed(page, data) {
  await page.evaluate((d) => new Promise((resolve, reject) => {
    const stores = ['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions']
    const req = indexedDB.open('coach-pedro-ai', 2)
    req.onupgradeneeded = () => {
      for (const s of stores) {
        if (req.result.objectStoreNames.contains(s)) continue
        const store = req.result.createObjectStore(s, { keyPath: 'id' })
        if (s === 'exerciseLogs') {
          store.createIndex('exerciseId', 'exerciseId', { unique: false })
          store.createIndex('date', 'date', { unique: false })
        }
      }
    }
    req.onsuccess = () => {
      const db = req.result
      const tx = db.transaction(stores, 'readwrite')
      stores.forEach((s) => tx.objectStore(s).clear())
      ;(d.exercises ?? []).forEach((x) => tx.objectStore('exercises').put(x))
      ;(d.exerciseLogs ?? []).forEach((x) => tx.objectStore('exerciseLogs').put(x))
      ;(d.programs ?? []).forEach((x) => tx.objectStore('programs').put(x))
      ;(d.gymSessions ?? []).forEach((x) => tx.objectStore('gymSessions').put(x))
      if (d.settings) tx.objectStore('settings').put(d.settings)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    }
    req.onerror = () => reject(req.error)
  }), data)
  // The localStorage mirror would otherwise restore the previous world.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear() })
}
