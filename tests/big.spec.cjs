// GUARDRAIL: NEVER delete, rename or weaken an existing test() without asking
// Pedro first — including rewriting its assertions so they match new behavior.
// These tests are the record of what the app promised; rewriting one silently
// makes a regression look exactly like an intended change. If your change makes
// a test wrong, stop and say which promise is breaking, wait for a yes, and
// then keep the old intent in a comment next to the new assertion. Adding
// tests never needs permission.
//
// RESTRUCTURACIÓN EN CURSO: adaptando bigtest al nuevo flujo lineal.
//
// GUARDRAIL: If you're removing/modifying steps below, STOP.
// This is the single source of truth for behavioral/E2E coverage of the app —
// all behavior tests live here, against the real SvelteKit app. Don't add new
// top-level test files for app behavior.
//
// THE FULL USER FLOW is the test: one journey through the whole app that
// starts EMPTY and is its own seed — profile, exercises, programs, the past
// weeks (through Tú › Copia de seguridad › Restaurar), training, rest timer,
// Historial, Amigos, offline and the backup on a new phone, all through the
// real UI. A change that breaks anything breaks this one test. New behavior
// goes into it as a new step (step('Step N: …', …) + its name in
// EXPECTED_STEPS, in order). Never seedIndexedDB() inside it.
//
// Only what can't live in that journey gets its own `test.describe()` with
// exactly ONE `test()` below it (its own server, a history that contradicts
// the flow's, …), each saying why it's apart.
//
// The guardrail is two checks: at import, every name below must appear as a
// step('<name>' call (the array itself doesn't count); at the end of the flow,
// the steps that actually RAN must equal this list, in order.

const EXPECTED_STEPS = [
  'Step 0a: First Run',
  'Step 0b: Plan — Sin programa',
  'Step 0c: Historial — Sin programa',
  'Step 1a: Tú — Mis datos',
  'Step 1b: Tú — Ajustes',
  'Step 1c: Tú — Ejercicios',
  'Step 1d: Tú — Editor de ejercicio',
  'Step 1e: Tú — Programas',
  'Step 2a: Hoy — Before The First Workout',
  'Step 2b: Plan — Primera semana',
  'Step 2c: Historial — Primera vez',
  'Step 2d: Tú — Diccionario y semanas pasadas',
  'Step 2e: Historial — Antes de entrenar hoy',
  'Step 2f: Amigos — Primera vez y racha viva',
  'Step 3a: Plan — Weekdays And Weeks',
  'Step 3b: Plan — Exercise Detail',
  'Step 3c: Plan — Reprogramar',
  'Step 4: Hoy — Calentamiento',
  'Step 5a: Hoy — Registrar Press Banca',
  'Step 5b: Rest Timer — Iniciar y pantalla completa',
  'Step 5c: Rest Timer — Ciclo de series',
  'Step 5d: Rest Timer — Confirma tus series',
  'Step 5e: Hoy — Press Militar',
  'Step 5f: Hoy — Fondos por una alternativa',
  'Step 5g: Hoy — Otra alternativa queda hecha',
  'Step 5h: Hoy — Series por bloque',
  'Step 6a: Hoy — Terminar entrenamiento',
  'Step 6b: Hoy — Terminar desde el último ejercicio',
  'Step 6c: Hoy — Estiramiento',
  'Step 6d: Hoy — Racha, esfuerzo y resumen',
  'Step 6e: Plan — Hoy hecho',
  'Step 7a: Historial — Constancia',
  'Step 7b: Historial — Ejercicios',
  'Step 8a: Amigos — Liga después de entrenar',
  'Step 8b: Amigos — Liga chica y agregar',
  'Step 8c: Amigos — Podio, detalle y datos viejos',
  'Step 9a: Red — Sin conexión y ping',
  'Step 9b: Offline — Las vistas y lo que pide internet',
  'Step 10: Idioma, TabBar y nombres largos',
  'Step 11a: Copia — Copia de seguridad',
  'Step 11b: Copia — Teléfono nuevo',
  'Step 11c: Eliminar un ejercicio con registros',
  'Step 12: Hoy — Reiniciar día',
  'Step 13: No Uncaught JS Errors',
]

// Guardrail at import: the list above must not count as "present" — only real
// step('<name>' calls in the rest of the file do.
const _source = require('fs').readFileSync(__filename, 'utf8').replace(/const EXPECTED_STEPS = \[[\s\S]*?\n\]/, '')
for (const name of EXPECTED_STEPS) {
  if (!_source.includes(`step('${name}'`)) {
    throw new Error(`GUARDRAIL FAILED: no step('${name}', …) in ${__filename}. Restore it or update EXPECTED_STEPS.`)
  }
}
if (new Set(EXPECTED_STEPS).size !== EXPECTED_STEPS.length) {
  throw new Error('GUARDRAIL FAILED: EXPECTED_STEPS has a repeated name.')
}

const { test, expect } = require('@playwright/test')
const {
  SEL, todayDock, sheetHead, logDock, segTab, planDay, openFromPlan, lineCount,
  nav, blockExternalImages, unblockExternalImages,
} = require('./support/screens.cjs')
const {
  getDayIdx, localDate, buildDayArray,
  seedIndexedDB, storedSettings, storedProgram, readLogs, readExercises,
} = require('./support/db.cjs')
const { mockWorker, pushProbe, tapRestNotification, cached, waitRestCleared, goOffline } = require('./support/worker.cjs')
const { dragDay, dragDown, swipeDetail } = require('./support/gestures.cjs')

// The app has mounted once its tab bar is on screen: by then the page's
// onMount ran, so Hoy's focus/visibilitychange listeners are in place.
async function waitForApp(page) {
  await expect(page.locator('[data-component="TabBar"]')).toBeVisible()
}

// On its first load Amigos saves settings (userName → username); a seed that
// lands before that write gets overwritten. The week card or the username
// prompt only render once it's done.
async function gotoFriendsLoaded(page) {
  await nav(page, 'friends')
  await expect(page.locator('[data-component="WeekCard"], #username-prompt').first()).toBeVisible()
}

// Warmup/stretch sheet (Hoy v2): walks the → arrow until the last move, where
// it turns off. The arrow is the first «Siguiente» in the sheet (the dock's
// comes after it).
async function goToLastMove(page) {
  const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
  for (let i = 0; i < 20 && await next.isEnabled(); i++) await next.click()
  await expect(next).toBeDisabled()
}

// ═══════════════════════════ FULL USER FLOW ═══════════════════════════
// One journey through the whole app, starting EMPTY. Nothing is seeded: the
// test itself is the seed — profile, exercises, programs and the history all
// come in through the real UI (the past weeks through Tú › Copia de seguridad
// › Restaurar una copia). Days are placed relative to today, so it holds on
// whatever weekday it runs.

// Each phase runs through step(): `ran` proves at the end that every step in
// EXPECTED_STEPS actually executed, in order — not just that its name exists.
//
// To debug a late step faster, run the flow only up to it:
//   FLOW_UNTIL=8c npx playwright test -g "full user flow"
// The steps after it are skipped and the end checks only the ones that ran
// (and that no JS error was thrown on the way). Never set in the commit gate.
const FLOW_UNTIL = (process.env.FLOW_UNTIL || '').replace(/^Step\s*/i, '').trim()
if (FLOW_UNTIL && !EXPECTED_STEPS.some(n => n.startsWith(`Step ${FLOW_UNTIL}:`))) {
  throw new Error(`FLOW_UNTIL=${FLOW_UNTIL}: no step «Step ${FLOW_UNTIL}: …» in EXPECTED_STEPS.`)
}
const ran = []
let stopped = false
async function step(name, fn) {
  if (stopped) return
  ran.push(name)
  await test.step(name, fn)
  if (FLOW_UNTIL && name.startsWith(`Step ${FLOW_UNTIL}:`)) stopped = true
}

const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

async function backToYou(page) {
  await page.getByRole('button', { name: 'Tú', exact: true }).click()
  await expect(page.locator('#you-hub, #you-first-time')).toBeVisible()
}

async function createExercise(page, name, muscle) {
  // An empty list offers «Crear ejercicio»; after that it's the dock's +
  await page.getByRole('button', { name: /^(Crear ejercicio|Nuevo ejercicio)$/ }).click()
  // Same sheet as editing, in create mode; the muscle is searched and picked
  const sheet = page.locator('#edit-exercise-sheet')
  await expect(sheet.getByText('Nuevo ejercicio')).toBeVisible()
  await sheet.getByLabel('Nombre').fill(name)
  await sheet.locator('#muscle-search').fill(muscle)
  // Filtered (accents ignored): the match, or «Añadir «…»» when none
  await sheet.locator('[data-component="MusclePicker"] [data-component="FilterChip"]').first().click()
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.locator('[data-component="ExerciseListItem"]', { hasText: name }).first()).toBeVisible()
}

// Adds one exercise to a day of the program editor. `rest` is typed by hand.
async function addProgramExercise(page, day, { name, sets, reps, rest }) {
  await day.getByRole('button', { name: 'Añadir ejercicio' }).click()
  const sheet = page.locator('#program-exercise-sheet')
  await sheet.getByLabel('Nombre', { exact: true }).fill(name)
  for (let s = 3; s < sets; s++) await sheet.getByRole('button', { name: 'Más series' }).click()
  for (let s = 3; s > sets; s--) await sheet.getByRole('button', { name: 'Menos series' }).click()
  await sheet.getByLabel('Repeticiones').fill(reps)
  const restField = sheet.getByRole('textbox', { name: 'descanso', exact: true })
  await restField.fill(String(rest))
  await expect(restField).toHaveValue(String(rest))
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(sheet).toHaveCount(0)
}

async function addProgramDay(page, week, name, weekdayIdx) {
  await week.getByRole('button', { name: 'Añadir día' }).click()
  const sheet = page.locator('#program-day-sheet')
  await sheet.getByLabel('Nombre del día').fill(name)
  await sheet.getByRole('button', { name: WEEKDAY_LETTERS[weekdayIdx], exact: true }).click()
  await sheet.getByRole('button', { name: 'Guardar' }).click()
  await expect(sheet).toHaveCount(0)
}

const EX = {
  bench: { name: 'Press Banca', muscle: 'Chest' },
  military: { name: 'Press Militar', muscle: 'Shoulders' },
  dips: { name: 'Fondos', muscle: 'Triceps' },
  squat: { name: 'Sentadilla', muscle: 'Quadriceps' },
  deadlift: { name: 'Peso Muerto', muscle: 'Back' },
  long: { name: 'Flexiones dinámicas excéntricas contra pared con pausa isométrica', muscle: 'Chest' },
  madeup: { name: 'Ejercicio Inventado X7', muscle: '' },
}

test('full user flow: empty app → Tú → Plan → Hoy → rest timer → Historial → Amigos → offline → backup', async ({ page, context, browser }) => {
  test.setTimeout(600000)
  // A long journey: a stuck click should fail in seconds, not at the end of the budget
  page.setDefaultTimeout(5000)
  // The page's clock runs on its own, but rests, toasts and banners that wait
  // are jumped over with elapse() instead of waited out. The Service Worker
  // keeps the real clock: the page runs ahead of it by what was elapsed.
  await page.clock.install()
  const elapse = (ms) => page.clock.fastForward(ms)
  await blockExternalImages(context)
  const jsErrors = []
  page.on('pageerror', err => jsErrors.push(err.message))
  const api = { friends: [], users: [], exists: false, registerStatus: 500 }
  await mockWorker(page, api)
  // Desktop Chromium may or may not have navigator.share: take it away so
  // «Compartir mi usuario» takes the clipboard path, and record what's copied.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
    Object.defineProperty(Navigator.prototype, 'clipboard', { value: { writeText: async (t) => { window.__copied = t } }, configurable: true })
  })

  const t = getDayIdx()
  // Descansos de 5 s (escritos a mano en el editor) para que el test no tarde.
  const REST = 5

  // Historial v2: month header, calendar, the tapped day's panel and its dock
  const hHeader = page.locator('#history [data-component="PageHeader"]')
  const hCal = page.locator('[data-component="MonthCalendar"]')
  const hPanel = page.locator('[data-component="HistoryDayPanel"]')
  const hDock = page.locator('[data-component="ViewSwitchDock"]')
  const prevMonth = page.getByRole('button', { name: 'Mes anterior' })
  const nextMonth = page.getByRole('button', { name: 'Mes siguiente' })
  const dayCell = (iso) => hCal.getByRole('button', { name: String(Number(iso.slice(8))), exact: true })
  const sameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7)

  await step('Step 0a: First Run', async () => {
    await nav(page, 'today')
    await expect(page.getByText('Entrenemos.')).toBeVisible()
    for (const s of ['Arma tu rutina', 'Entrena desde Hoy', 'Suma con tus amigos']) {
      await expect(page.getByText(s, { exact: true })).toBeVisible()
    }
    await expect(page.locator('[data-component="FirstRunView"]')).toContainText('Tú → Copia de seguridad')
    // iOS Safari zooms into any focused field under 16px; maximum-scale=1 stops it
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /maximum-scale=1/)
    await page.getByRole('button', { name: /Armar mi rutina/ }).click()
    await expect(page).toHaveURL(/\/you\/?$/)
  })

  await step('Step 0b: Plan — Sin programa', async () => {
    await nav(page, 'plan')
    const empty = page.locator('[data-component="PlanEmpty"]')
    await expect(empty).toContainText('Aún no tienes un programa')
    await expect(empty).toContainText('aquí verás tu semana')
    await expect(page.locator('#plan-days-grid')).toHaveCount(0)
    await expect(todayDock(page)).toContainText('Pégala con IA o créala a mano en Tú')
    await todayDock(page).getByRole('button', { name: /Armar mi rutina/ }).click()
    await expect(page).toHaveURL(/\/you\/?$/)
  })

  await step('Step 0c: Historial — Sin programa', async () => {
    await nav(page, 'history')
    await expect(hHeader).toContainText('Sin programa activo')
    await expect(hPanel).toContainText('Elige un programa para empezar')
    // The month's shape, nothing to tap and no months to walk
    await expect(page.locator('[data-component="MonthCalendar"].ghost')).toBeVisible()
    await expect(hCal.locator('button:enabled')).toHaveCount(0)
    await expect(prevMonth).toHaveCount(0)
    await expect(nextMonth).toHaveCount(0)
    await expect(hDock).toContainText('Se elige en Tú → Programas')
    await hDock.getByRole('button', { name: /Elegir un programa/ }).click()
    await expect(page).toHaveURL(/\/you\/?$/)
  })

  await step('Step 1a: Tú — Mis datos', async () => {
    const first = page.locator('#you-first-time')
    await expect(first).toContainText('Hola.')
    await expect(page.locator('#you-step-datos')).toContainText('0 de 7')
    await expect(page.locator('#you-step-programa')).toContainText('Tu programa')
    await expect(page.locator('[data-component="OnboardingBanner"]')).toHaveCount(0)

    await page.getByRole('button', { name: 'Completar mis datos' }).click()
    const guide = page.locator('#profile-guide')
    await expect(guide).toContainText('Mis datos · 1 de 7')
    await expect(guide).toContainText('¿Cuánto mides?')
    for (let i = 0; i < 10; i++) await guide.getByRole('button', { name: 'Más estatura' }).click()
    await expect(guide.locator('[data-component="NumberStepper"]')).toContainText('180')
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await expect(guide).toContainText('¿Cuánto pesas?')
    for (let i = 0; i < 20; i++) await guide.getByRole('button', { name: 'Más peso' }).click()
    await expect(guide.locator('[data-component="NumberStepper"]')).toContainText('80')
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await expect(guide).toContainText('¿Cuántos años tienes?')
    for (let i = 0; i < 2; i++) await guide.getByRole('button', { name: 'Menos edad' }).click()
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await guide.getByRole('radio', { name: 'Masculino' }).click()
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await guide.getByRole('radio', { name: 'Hipertrofia' }).click()
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await guide.getByRole('radio', { name: 'Intermedio' }).click()
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await guide.getByPlaceholder('Profesión').fill('Ingeniero')
    await guide.getByRole('button', { name: 'Siguiente' }).click()
    await expect(guide).toHaveCount(0)
    await expect(page.locator('#you-step-datos')).toContainText('7 de 7')
  })

  await step('Step 1b: Tú — Ajustes', async () => {
    await page.locator('#you-row-ajustes').click()
    const fontBtn = page.locator('#font-size-toggle-btn')
    const fontSheet = page.locator('#font-size-sheet')
    await expect(fontBtn).toContainText('Normal')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1')
    await fontBtn.click()
    await fontSheet.getByRole('radio', { name: 'Grande', exact: true }).click()
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.15')
    await fontSheet.getByRole('radio', { name: 'Extra grande' }).click()
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.3')
    await fontSheet.getByRole('button', { name: 'Cerrar' }).click()
    await expect(fontBtn).toContainText('Extra grande')

    // Units in lb; the Watch on (for the moment after the warmup)
    await page.locator('#units-lb').click()
    await page.locator('#watch-switch').click()
    await expect.poll(async () => (await storedSettings(page))?.units).toBe('lb')
    await expect.poll(async () => (await storedSettings(page))?.hasWatch).toBe(true)

    // Persisted to Settings — survives a reload, not just component state
    await page.reload()
    await page.locator('#you-row-ajustes').click()
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Extra grande')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1.3')
    await expect(page.locator('#units-lb')).toHaveAttribute('aria-pressed', 'true')

    // Back to Normal and kg
    await page.locator('#font-size-toggle-btn').click()
    await fontSheet.getByRole('radio', { name: 'Normal' }).click()
    await fontSheet.getByRole('button', { name: 'Cerrar' }).click()

    // The sheet's grabber drags it down: it follows the finger, a short drag
    // springs back, past 100 px it closes
    await page.locator('#font-size-toggle-btn').click()
    const handle = fontSheet.locator('.sheet-handle')
    await dragDown(handle, 60, { lift: false })
    await expect(fontSheet.locator('.sheet-content')).toHaveAttribute('style', /translateY\(\d+(\.\d+)?px\)/)
    // The finger comes back up before lifting
    await handle.evaluate((el) => el.dispatchEvent(new TouchEvent('touchend', {
      changedTouches: [new Touch({ identifier: 1, target: el, clientX: 200, clientY: 110 })], bubbles: true,
    })))
    await expect(fontSheet).toBeVisible()
    await expect(fontSheet.locator('.sheet-content')).toHaveAttribute('style', /transform: none/)
    await dragDown(handle, 12)
    await expect(fontSheet).toBeVisible()
    await dragDown(handle, 150)
    await expect(fontSheet).toHaveCount(0)
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Normal')
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1')
    await page.locator('#units-kg').click()
    await expect.poll(async () => (await storedSettings(page))?.units).toBe('kg')

    // Color de la app: applies on tap, to the preview, the row's dot and the
    // TabBar's tab; it survives a reload. Then back to Lima, the flow's color.
    const LIMA = 'rgb(212, 255, 58)'
    const CIAN = 'rgb(73, 234, 242)'
    const accentSheet = page.locator('#accent-sheet')
    const dot = page.locator('#accent-row .swc')
    const activeTab = page.locator('[data-component="TabBar"] a.active')
    await expect(dot).toHaveCSS('background-color', LIMA)
    await expect(activeTab).toHaveCSS('color', LIMA)
    await page.locator('#accent-row').click()
    await expect(accentSheet.getByRole('radio', { name: 'Lima' })).toHaveAttribute('aria-checked', 'true')
    await accentSheet.getByRole('radio', { name: 'Cian' }).click()
    await expect(accentSheet.getByRole('radio', { name: 'Cian' })).toHaveAttribute('aria-checked', 'true')
    await expect(accentSheet.locator('.btn-prev')).toHaveCSS('background-color', CIAN)
    await accentSheet.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dot).toHaveCSS('background-color', CIAN)
    await expect(activeTab).toHaveCSS('color', CIAN)
    await expect.poll(async () => (await storedSettings(page))?.accentColor).toBe('#49eaf2')
    await page.reload()
    await page.locator('#you-row-ajustes').click()
    await expect(dot).toHaveCSS('background-color', CIAN)
    await expect(activeTab).toHaveCSS('color', CIAN)
    await page.locator('#accent-row').click()
    await accentSheet.getByRole('radio', { name: 'Lima' }).click()
    await accentSheet.getByRole('button', { name: 'Cerrar' }).click()
    await expect(dot).toHaveCSS('background-color', LIMA)
    await expect.poll(async () => (await storedSettings(page))?.accentColor).toBe('#d4ff3a')
    await backToYou(page)
  })

  await step('Step 1c: Tú — Ejercicios', async () => {
    await page.locator('#you-row-ejercicios').click()
    await expect(page.locator('#you-ejercicios')).toContainText('Aún no hay ejercicios')
    for (const ex of Object.values(EX)) await createExercise(page, ex.name, ex.muscle)
    await expect(page.locator('#ex-count')).toHaveText('7 ejercicios')

    // Search filters; no results offers to create what you searched
    await page.locator('#exercise-search').fill('sentad')
    await expect(page.locator('[data-component="ExerciseListItem"]')).toHaveCount(1)
    await expect(page.locator('[data-component="ExerciseListItem"]')).toContainText('Sentadilla')
    await page.locator('#exercise-search').fill('Remo Z')
    await expect(page.locator('#you-ejercicios')).toContainText('No tienes «Remo Z»')
    await page.getByRole('button', { name: 'Crear «Remo Z»' }).click()
    // Opens the create sheet with the searched name already filled
    const createSheet = page.locator('#edit-exercise-sheet')
    await expect(createSheet.getByLabel('Nombre')).toHaveValue('Remo Z')
    await createSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(createSheet).toHaveCount(0)
    await expect(page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo Z' })).toBeVisible()
    await page.locator('#exercise-search').fill('')
    await expect(page.locator('#ex-count')).toHaveText('8 ejercicios')
  })

  await step('Step 1d: Tú — Editor de ejercicio', async () => {
    // The open card only shows; the pencil opens the editor with every field
    const card = page.locator('[data-component="ExerciseCard"]')
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo Z' }).locator(SEL.exerciseToggle).click()
    await expect(card.locator('input')).toHaveCount(0)
    await card.getByRole('button', { name: 'Editar ejercicio' }).click()
    const editSheet = page.locator('#edit-exercise-sheet')
    await expect(editSheet.getByLabel('Nombre')).toHaveValue('Remo Z')
    await expect(editSheet.getByRole('button', { name: 'Eliminar ejercicio' })).toBeVisible()

    // Emptying the name: error and Guardar disabled (not before)
    await expect(editSheet).not.toContainText('Ponle un nombre.')
    await editSheet.getByLabel('Nombre').fill('')
    await expect(editSheet).toContainText('Ponle un nombre.')
    await expect(editSheet.getByRole('button', { name: 'Guardar' })).toBeDisabled()
    await editSheet.getByLabel('Nombre').fill('Remo con Barra Z')

    // Muscle by search (an unknown one offers «Añadir»)
    await page.locator('#muscle-search').fill('antebr')
    await expect(editSheet.getByRole('button', { name: 'Añadir «Antebr»' })).toBeVisible()
    await page.locator('#muscle-search').fill('trí')
    await expect(editSheet.locator('[data-component="MusclePicker"] [data-component="FilterChip"]')).toHaveText(['Tríceps'])
    await editSheet.getByRole('button', { name: 'Tríceps' }).click()
    await expect(page.locator('#muscle-search')).toHaveValue('')

    // Image: «Pegar URL» shows the field and the thumbnail follows it
    const imageField = editSheet.locator('[data-component="ImageField"]')
    await imageField.getByRole('button', { name: 'Pegar URL' }).click()
    await imageField.locator('input').fill('https://example.com/mi-remo.jpg')
    await expect(imageField.locator('img')).toHaveAttribute('src', 'https://example.com/mi-remo.jpg')

    // Tips: add two, remove one
    await editSheet.getByRole('button', { name: 'Añadir consejo' }).click()
    const tipInputs = editSheet.locator('[data-component="TipsEditor"] input')
    await expect(tipInputs.last()).toBeFocused()
    await tipInputs.last().fill('Espalda recta')
    await editSheet.getByRole('button', { name: 'Añadir consejo' }).click()
    await tipInputs.last().fill('Sin tirón')
    await editSheet.getByRole('button', { name: 'Quitar consejo' }).last().click()
    await expect(tipInputs).toHaveCount(1)

    // Alternatives: from the dictionary (an added one says «Ya está»), or by hand
    await editSheet.getByRole('button', { name: 'Añadir alternativa' }).click()
    const altSheet = page.locator('#alt-search-sheet')
    await page.locator('#alt-search').fill('martillo')
    await altSheet.getByRole('button', { name: /Curl Martillo con Mancuernas/ }).click()
    await expect(altSheet).toHaveCount(0)
    await editSheet.getByRole('button', { name: 'Añadir alternativa' }).click()
    await page.locator('#alt-search').fill('martillo')
    await expect(altSheet.getByRole('button', { name: /Curl Martillo con Mancuernas.*Ya está/ })).toBeDisabled()
    await page.locator('#alt-search').fill('remo casero')
    await altSheet.getByRole('button', { name: 'Escribir «remo casero» a mano' }).click()
    await expect(editSheet.locator('[data-component="ExerciseMiniCard"]')).toHaveCount(2)

    // Guardar: the card stays open with the new data, and it survives a reload
    await editSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(editSheet).toHaveCount(0)
    await expect(card).toContainText('Remo con Barra Z')
    await expect(card).toContainText('Tríceps')
    await expect(card.locator('.thumb')).toHaveAttribute('src', 'https://example.com/mi-remo.jpg')
    await page.reload()
    await page.locator('#you-row-ejercicios').click()
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra Z' }).locator(SEL.exerciseToggle).click()
    await expect(card).toContainText('Espalda recta')
    await expect(card).not.toContainText('Sin tirón')
    await expect(card.locator('[data-component="ExerciseMiniCard"]')).toHaveText(['Curl Martillo con Mancuernas', 'remo casero'])

    // Delete: the editor asks first; with no logs nothing else goes with it
    await card.getByRole('button', { name: 'Editar ejercicio' }).click()
    await editSheet.getByRole('button', { name: 'Eliminar ejercicio' }).click()
    const del = page.locator('#delete-exercise-sheet')
    await expect(del).toContainText('¿Eliminar «Remo con Barra Z»?')
    await del.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page.locator('[data-component="Toast"]')).toContainText('«Remo con Barra Z» eliminado')
    await expect(page.locator('#ex-count')).toHaveText('7 ejercicios')
  })

  await step('Step 1e: Tú — Programas', async () => {
    await nav(page, 'you')
    const editor = page.locator('#program-editor')
    const cards = page.locator('[data-component="ProgramCard"]')
    const activeCard = page.locator('[data-component="ProgramCard"].active')

    // The first program, from scratch: no name marks the error; saved, it's the active one
    await page.locator('#you-step-programa').click()
    const createSheet = page.locator('#create-program-sheet')
    await expect(createSheet).toContainText('Platícalo con el coach')
    await expect(createSheet).toContainText('Pega tu rutina')
    await createSheet.getByRole('button', { name: /Desde cero/ }).click()
    await editor.getByRole('button', { name: 'Guardar' }).click()
    await expect(editor).toContainText('Ponle un nombre para guardarlo.')
    await editor.getByLabel('Nombre del programa').fill('Programa Nuevo')
    await editor.getByRole('button', { name: 'Guardar' }).click()
    await expect(editor).toHaveCount(0)
    await expect(activeCard).toContainText('Programa activo')
    await expect(activeCard).toContainText('Programa Nuevo')

    // Every answer of the guide is in Mis datos (option values show their label)
    await expect(page.locator('#you-row-datos')).toContainText('7 de 7')
    await page.locator('#you-row-datos').click()
    await expect(page.locator('#profile-row-height')).toContainText('180 cm')
    await expect(page.locator('#profile-row-weight')).toContainText('80 kg')
    await expect(page.locator('#profile-row-sex')).toContainText('Masculino')
    await expect(page.locator('#profile-row-age')).toContainText('28')
    await expect(page.locator('#profile-row-goal')).toContainText('Hipertrofia')
    await expect(page.locator('#profile-row-experience')).toContainText('Intermedio')
    await expect(page.locator('#profile-row-occupation')).toContainText('Ingeniero')
    await backToYou(page)

    // ── Duplicar y Eliminar (with the confirmation in the sheet). The coach's
    // ways to create and improve a program live apart: «IA — programas con el coach» ──
    await page.locator('#you-row-programas').click()
    await activeCard.getByRole('button', { name: 'Más opciones' }).click()
    await page.locator('#program-options').getByRole('button', { name: 'Duplicar' }).click()
    const dupCard = cards.filter({ hasText: 'Programa Nuevo (copia)' })
    await expect(dupCard).toBeVisible()
    await dupCard.getByRole('button', { name: 'Más opciones' }).click()
    const options = page.locator('#program-options')
    await options.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(options).toContainText('¿Eliminar «Programa Nuevo (copia)»?')
    await options.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(dupCard).toHaveCount(0)

    // ── The program this journey trains: two weeks, from scratch. Today is
    // «Empuje» in week 1 and «Pierna» in week 2; «Tirón» sits two days later. ──
    await page.locator('#create-program-btn').click()
    await page.locator('#create-scratch').click()
    await editor.getByLabel('Nombre del programa').fill('Torso Pierna')
    const week1 = editor.locator('section[data-week="0"]')
    await addProgramDay(page, week1, 'Empuje', t)
    const empuje = week1.locator('[data-component="ProgramEditorDay"]').nth(0)
    await addProgramExercise(page, empuje, { name: EX.bench.name, sets: 4, reps: '8-10', rest: REST })
    await addProgramExercise(page, empuje, { name: EX.military.name, sets: 3, reps: '10-12', rest: REST })
    await addProgramExercise(page, empuje, { name: EX.dips.name, sets: 3, reps: '10', rest: REST })
    await addProgramExercise(page, empuje, { name: EX.long.name, sets: 3, reps: '10', rest: REST })
    await expect(empuje).toContainText(`${WEEKDAY_NAMES_ES[t]} · ≈`)
    await expect(empuje).toContainText('4 ejercicios')
    await expect(empuje).toContainText(`${EX.bench.name} 4 × 8-10 · ${REST} s`)
    await addProgramDay(page, week1, 'Tirón', (t + 2) % 7)
    await addProgramExercise(page, week1.locator('[data-component="ProgramEditorDay"]').nth(1), { name: EX.deadlift.name, sets: 3, reps: '5', rest: REST })
    await editor.getByRole('button', { name: 'Añadir semana' }).click()
    const week2 = editor.locator('section[data-week="1"]')
    await expect(week2).toContainText('Semana 2')
    await addProgramDay(page, week2, 'Pierna', t)
    const pierna = week2.locator('[data-component="ProgramEditorDay"]').nth(0)
    await addProgramExercise(page, pierna, { name: EX.squat.name, sets: 4, reps: '8-10', rest: REST })
    await addProgramExercise(page, pierna, { name: EX.deadlift.name, sets: 3, reps: '5', rest: REST })
    await editor.getByRole('button', { name: 'Guardar' }).click()
    await expect(editor).toHaveCount(0)
    const torso = cards.filter({ hasText: 'Torso Pierna' })
    await torso.getByRole('button', { name: 'Activar' }).click()
    await expect(activeCard).toContainText('Torso Pierna')
    await expect.poll(async () => (await storedSettings(page))?.activeProgramId).toBe(await activeCard.getAttribute('data-program-id'))

    // ── Editing it: the week's tag, an exercise picked «De tus ejercicios» and
    // then changed, a day renamed. Saved, then everything put back the way
    // the rest of the journey expects it ──
    const weekSheet = page.locator('#program-week-sheet')
    const daySheet = page.locator('#program-day-sheet')
    const exSheet = page.locator('#program-exercise-sheet')
    const dayOf = (name) => editor.locator('[data-component="ProgramEditorDay"]', { has: page.getByRole('button', { name: new RegExp(`^${name}`) }) })
    const openEdit = async () => {
      await activeCard.getByRole('button', { name: 'Editar días y ejercicios' }).click()
      await expect(editor).toContainText('Editar programa')
      await expect(editor.getByLabel('Nombre del programa')).toHaveValue('Torso Pierna')
    }
    const saveEdit = async () => {
      await editor.getByRole('button', { name: 'Guardar' }).click()
      await expect(editor).toHaveCount(0)
      await expect(page.locator('#backup-toast')).toContainText('Programa guardado')
    }
    await openEdit()
    await editor.locator('section[data-week="0"] .wkh').click()
    await expect(weekSheet.getByLabel('Nombre')).toHaveValue('Semana 1')
    await weekSheet.getByRole('button', { name: 'Carga', exact: true }).click()
    await expect(weekSheet.getByLabel('Etiqueta · opcional')).toHaveValue('Carga')
    await weekSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(editor.locator('section[data-week="0"] .wkh')).toContainText('Carga')

    await dayOf('Empuje').getByRole('button', { name: 'Añadir ejercicio' }).click()
    await exSheet.getByLabel('Nombre', { exact: true }).fill('Sentad')
    const suggestion = exSheet.locator('[data-component="OptionList"]').getByRole('button', { name: /Sentadilla/ })
    await expect(suggestion).toHaveCount(1)
    await suggestion.click()
    // The name as it is in Tú › Ejercicios
    const squatName = await exSheet.getByLabel('Nombre', { exact: true }).inputValue()
    expect(squatName).toMatch(/^Sentadilla/)
    await exSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(dayOf('Empuje')).toContainText(`${squatName} 3 × 10 · 60 s`)
    await expect(dayOf('Empuje')).toContainText('5 ejercicios')
    // Tapping it edits it in place
    await dayOf('Empuje').getByRole('button', { name: new RegExp(`^${squatName}`) }).click()
    await exSheet.getByRole('button', { name: 'Más series' }).click()
    await exSheet.getByRole('button', { name: 'Más series' }).click()
    await exSheet.getByLabel('Repeticiones').fill('6')
    await exSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(dayOf('Empuje')).toContainText(`${squatName} 5 × 6 · 60 s`)

    await dayOf('Tirón').getByRole('button', { name: /^Tirón/ }).click()
    await expect(daySheet.getByLabel('Nombre del día')).toHaveValue('Tirón')
    await expect(daySheet.getByRole('button', { name: WEEKDAY_LETTERS[(t + 2) % 7], exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(daySheet).toContainText(/Duración.*≈ \d+ min/)
    await daySheet.getByLabel('Nombre del día').fill('Espalda')
    await daySheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(editor).toContainText('Espalda')
    await saveEdit()

    // Saved as edited
    let saved = await storedProgram(page, 'Torso Pierna')
    expect(saved.weeks[0].tag).toBe('Carga')
    expect(saved.weeks[0].days.map(d => d.name)).toEqual(['Empuje', 'Espalda'])
    const squat = saved.weeks[0].days[0].exercises.at(-1)
    expect(squat).toMatchObject({ sets: 5, reps: '6', rest: 60 })
    // The one picked, not a new exercise made from the name
    expect(squat.exerciseId).toBe((await readExercises(page)).find(e => e.name === squatName).id)

    // Reopened it shows the edits; «Quitar» asks first, and it all goes back
    await openEdit()
    await expect(editor).toContainText('Espalda')
    await expect(dayOf('Empuje')).toContainText(`${squatName} 5 × 6 · 60 s`)
    await dayOf('Empuje').getByRole('button', { name: `Quitar ${squatName}` }).click()
    await expect(dayOf('Empuje')).toContainText(`¿Quitar ${squatName} de Empuje?`)
    await dayOf('Empuje').getByRole('button', { name: 'Quitar', exact: true }).click()
    await expect(dayOf('Empuje')).toContainText('4 ejercicios')
    await expect(dayOf('Empuje')).not.toContainText('Sentadilla')
    await dayOf('Espalda').getByRole('button', { name: /^Espalda/ }).click()
    await daySheet.getByLabel('Nombre del día').fill('Tirón')
    await daySheet.getByRole('button', { name: 'Guardar' }).click()
    await editor.locator('section[data-week="0"] .wkh').click()
    await weekSheet.getByRole('button', { name: 'Carga', exact: true }).click()
    await expect(weekSheet.getByLabel('Etiqueta · opcional')).toHaveValue('')
    await weekSheet.getByRole('button', { name: 'Guardar' }).click()
    await saveEdit()
    saved = await storedProgram(page, 'Torso Pierna')
    expect(saved.weeks[0].tag).toBe('')
    expect(saved.weeks[0].days.map(d => d.name)).toEqual(['Empuje', 'Tirón'])
    expect(saved.weeks[0].days[0].exercises).toHaveLength(4)
  })

  await step('Step 2a: Hoy — Before The First Workout', async () => {
    await nav(page, 'today')
    const header = page.locator('[data-component="PageHeader"]')
    await expect(header.locator(SEL.pageEyebrow)).toContainText('Semana 1')
    await expect(header.locator(SEL.pageTitle)).toHaveText('Empuje.')
    // The day title takes one line, ellipsized if long
    await expect(header.locator(SEL.pageTitle)).toHaveCSS('text-overflow', 'ellipsis')
    expect(await lineCount(header.locator(SEL.pageTitle))).toBeLessThanOrEqual(1.3)
    await expect(header.locator(SEL.pageSub)).toContainText('Pecho · Hombro')

    // Calentamiento open; Entrenamiento and Estiramiento wait as «Después»
    const warmup = page.locator('[data-phase="warmup"][data-state="open"]')
    await expect(warmup.locator(SEL.exerciseRow).first()).toBeVisible()
    await expect(page.locator('[data-phase="training"]')).toContainText('Después')
    await expect(page.locator('[data-phase="stretch"]')).toContainText('Después')
    await expect(page.locator('[data-component="PhaseCard"]')).toHaveCount(0)
    await expect(page.locator('#today')).not.toContainText(/v\d+\.\d+ ·/)
    await expect(page.getByRole('button', { name: 'Recargar' })).toBeVisible()

    // Without any log the dock greets the first workout
    await expect(todayDock(page).getByRole('button', { name: /Empezar calentamiento/ })).toBeVisible()
    await expect(todayDock(page).locator('.cap')).toHaveText(/^Tu primer entreno\. Empieza suave: \d+ movimientos\./)

    // The onboarding banner floats over the dock. ✕ hides it only until you
    // leave Hoy; its own buttons finish it for good.
    const banner = page.locator('[data-component="OnboardingBanner"]')
    await expect(banner).toContainText('Tu primer registro')
    await banner.getByRole('button', { name: 'Cerrar' }).click()
    await expect(banner).toHaveCount(0)
    await page.reload()
    await expect(banner).toContainText('Tu primer registro')
    await banner.getByRole('button', { name: 'Registrar peso' }).click()
    await expect(banner).toContainText('¡Todo listo!')
    await banner.getByRole('button', { name: 'Listo' }).click()
    await expect(banner).toHaveCount(0)
    await expect.poll(async () => (await storedSettings(page))?.onboarded).toBe(true)
    await page.reload()
    await expect(page.locator(SEL.pageTitle)).toHaveText('Empuje.')
    await expect(banner).toHaveCount(0)
  })

  await step('Step 2b: Plan — Primera semana', async () => {
    await nav(page, 'plan')
    // No workout yet: no count to fall behind on, and no friends to show
    const strip = page.locator('#plan-week-strip')
    await expect(strip).toContainText('Tu primera semana')
    await expect(strip.locator('[data-day="today"]')).toHaveCount(1)
    await expect(strip.locator('[data-day="done"]')).toHaveCount(0)
    await expect(strip).toContainText('Invita a un amigo y suman juntos cada semana')
    await expect(page.locator('#plan-days-grid')).not.toContainText('Hecho')
    // The dock greets the first workout and takes you to Hoy
    await expect(todayDock(page)).toContainText('Toca cualquier día para ver sus ejercicios')
    await todayDock(page).getByRole('button', { name: /Empezar mi primer entreno/ }).click()
    await expect(page).toHaveURL(/\/today\/?$/)
  })

  await step('Step 2c: Historial — Primera vez', async () => {
    await nav(page, 'history')
    // A clean month with today marked, and nowhere else to go
    await expect(hHeader).toContainText('Aún sin entrenos este mes')
    await expect(hCal.locator('[data-state="done"]')).toHaveCount(0)
    await expect(hCal.locator('.now')).toHaveText(String(new Date().getDate()))
    await expect(hPanel).toContainText('Tu primer entreno aparece aquí')
    await expect(nextMonth).toBeDisabled()
    await expect(prevMonth).toBeDisabled()
    await hDock.getByRole('button', { name: /Ir a entrenar/ }).click()
    await expect(page).toHaveURL(/\/today\/?$/)

    // Ejercicios before any weight: its own empty state and the same way out
    await nav(page, 'history')
    await hDock.getByRole('button', { name: 'Ejercicios', exact: true }).click()
    await expect(page.locator('#history')).toContainText('Todavía no hay pesos')
    await expect(page.locator('[data-component="ExerciseProgressRow"]')).toHaveCount(0)
    await expect(hDock.getByRole('button', { name: /Ir a entrenar/ })).toBeVisible()
  })

  // The exercises' ids, filled in by «Diccionario y semanas pasadas»
  const ids = {}

  // Only the seed the rest of the flow needs: canonical names and the past
  // weeks. The backup itself (exportar, importar, guardar, what the file holds
  // and a new phone) is checked at the end, once the flow has filled the app.
  await step('Step 2d: Tú — Diccionario y semanas pasadas', async () => {
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    await nav(page, 'you')
    const resultSheet = page.locator('[data-component="ResultSheet"]')

    // Ordenar con el diccionario: confirmation, then the result; the ones it
    // can't resolve are listed in «Sin coincidencia», each opening its editor
    await page.locator('#you-row-copia').click()
    await page.locator('#dictionary-row').click()
    await page.locator('#dictionary-sheet').getByRole('button', { name: /^Ordenar \d+ ejercicios?$/ }).click()
    await expect(resultSheet).toContainText(/\d+ de \d+ ordenados/, { timeout: 10000 })
    const unmatchedRow = page.locator('#unmatched-row')
    await expect(unmatchedRow).toBeVisible()
    await unmatchedRow.click()
    const unmatched = page.locator('#you-sin-coincidencia')
    await expect(unmatched).toContainText(EX.madeup.name)
    await unmatched.locator('[data-component="ExerciseListItem"]', { hasText: EX.madeup.name }).click()
    const editSheet = page.locator('#edit-exercise-sheet')
    await expect(editSheet).toBeVisible()
    await editSheet.getByRole('button', { name: 'Cerrar' }).click()
    await expect(editSheet).toHaveCount(0)
    await page.getByRole('button', { name: 'Copia de seguridad', exact: true }).click()
    await expect(page.locator('#you-copia')).toBeVisible()

    // The ids the past weeks are written against, as stored
    const stored = await readExercises(page)
    expect(stored).toHaveLength(7)
    const idOf = (re) => stored.find(e => re.test(e.name)).id
    Object.assign(ids, {
      bench: idOf(/Banca/), military: idOf(/Militar/), dips: idOf(/Fondos/),
      squat: idOf(/Sentadilla/), deadlift: idOf(/Muerto/), long: idOf(/Flexiones/),
    })

    // Restaurar una copia with the past weeks: Press Banca climbing 60 → 75 kg
    // over 4 weeks (7 sessions) and two Peso Muerto days. It merges.
    const benchPast = [[27, 60], [25, 62.5], [21, 65], [18, 67.5], [14, 70], [11, 72.5], [7, 75]]
    const history = [
      ...benchPast.map(([d, w]) => ({ id: `log-past-bench-${d}`, exerciseId: ids.bench, date: localDate(d), weight: w, units: 'kg' })),
      { id: 'log-past-dl-24', exerciseId: ids.deadlift, date: localDate(24), weight: 90, units: 'kg' },
      { id: 'log-past-dl-10', exerciseId: ids.deadlift, date: localDate(10), weight: 100, units: 'kg' },
    ]
    const logsFile = path.join(os.tmpdir(), `pw-logs-${Date.now()}.json`)
    fs.writeFileSync(logsFile, JSON.stringify({ exerciseLogs: history }))
    try {
      // «Guardar copia primero»: the sheet steps aside for a copy of what's
      // here now (the exercises, no workouts yet), then the restore goes on
      await page.locator('#restore-row').click()
      const [before] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#restore-sheet').getByRole('button', { name: 'Guardar copia primero' }).click(),
      ])
      await expect(page.locator('#restore-sheet')).toHaveCount(0)
      await expect(resultSheet).toContainText('Copia guardada')
      await page.getByRole('button', { name: 'Listo' }).click()
      const saved = JSON.parse(fs.readFileSync(await before.path(), 'utf8'))
      expect(saved.exercises.map(e => e.id).sort()).toEqual(stored.map(e => e.id).sort())
      expect(saved.exerciseLogs).toEqual([])
      expect(saved.programs.map(p => p.name).sort()).toEqual(['Programa Nuevo', 'Torso Pierna'])
      await page.locator('#restore-row').click()
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('#restore-sheet').getByRole('button', { name: 'Elegir archivo y restaurar' }).click(),
      ])
      await chooser.setFiles(logsFile)
      await expect(resultSheet).toContainText('Copia restaurada')
      await expect(resultSheet.locator('[data-component="StatBlock"]').nth(0)).toContainText(`${history.length} entrenos`)
      await page.locator('[data-component="Sheet"]', { hasText: 'Copia restaurada' }).getByRole('button', { name: 'Cerrar' }).click()
    } finally {
      fs.unlinkSync(logsFile)
    }
    expect((await readLogs(page)).length).toBe(history.length)

    await nav(page, 'you')
    await page.locator('#you-row-ejercicios').click()
    // A hand-written alternative for Press Militar (no dictionary entry, so
    // once swapped in it has no suggestions of its own)
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Militar' }).locator(SEL.exerciseToggle).click()
    const card = page.locator('[data-component="ExerciseCard"]')
    await card.getByRole('button', { name: 'Editar ejercicio' }).click()
    await editSheet.getByRole('button', { name: 'Añadir alternativa' }).click()
    await page.locator('#alt-search').fill('press casero de prueba')
    await page.locator('#alt-search-sheet').getByRole('button', { name: 'Escribir «press casero de prueba» a mano' }).click()
    await editSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(editSheet).toHaveCount(0)
    await expect(card).toContainText('press casero de prueba')
  })

  await step('Step 2e: Historial — Antes de entrenar hoy', async () => {
    await nav(page, 'history')
    // It opens on the last trained day (the restored copy's, a week ago), with its weights
    const lastTrained = localDate(7)
    await expect(dayCell(lastTrained)).toHaveClass(/sel/)
    await expect(dayCell(lastTrained)).toHaveAttribute('data-state', 'done')
    await expect(hPanel).toHaveAttribute('data-state', 'done')
    await expect(hPanel).toContainText('kg')
    await expect(hPanel).not.toContainText('Sin registrar')

    // Today, still unlogged: what it has and the way to Hoy
    if (!sameMonth(lastTrained, localDate(0))) await nextMonth.click()
    await hCal.locator('.now').click()
    await expect(hPanel).toHaveAttribute('data-state', 'today')
    await expect(hPanel).toContainText('Hoy toca Empuje')
    await hPanel.getByRole('button', { name: 'Ir a Hoy' }).click()
    await expect(page).toHaveURL(/\/today\/?$/)
  })

  const registers = () => api.calls.filter((c) => c.path.endsWith('/api/user/register'))
  const card = page.locator('[data-component="WeekCard"]')
  const list = page.locator('#friends-list')
  const addBtn = page.getByRole('button', { name: 'Agregar amigo' })
  const sheetClose = () => page.locator('[data-component="Sheet"]').getByRole('button', { name: 'Cerrar' }).click()
  let streakBefore = 0

  await step('Step 2f: Amigos — Primera vez y racha viva', async () => {
    await nav(page, 'friends')
    // No username yet: pick one (1–20 characters)
    const prompt = page.locator('#username-prompt')
    await expect(prompt).toContainText('Elige tu usuario')
    await page.locator('#username-input').fill('P')
    await expect(prompt).toContainText('1/20')
    await expect(page.locator('#username-btn')).toBeDisabled()
    await page.locator('#username-input').fill('Pedro')
    await expect(prompt).toContainText('5/20')
    await page.locator('#username-btn').click()

    // Registering failed (500) and the league opens anyway. The restored
    // weeks are a live streak, even with this week still untrained.
    await expect(card).toContainText('Tu racha')
    await expect(card.locator('.num')).toHaveText(/^[1-9]\d*$/)
    streakBefore = parseInt(await card.locator('.num').textContent(), 10)
    await expect(card).toContainText('semanas seguidas')
    await expect(card.locator('.line')).toHaveText(new RegExp(`^Tu racha de ${streakBefore} semanas? sigue viva\\.`))
    await expect(card.locator('.day').nth(t)).toHaveAttribute('data-day', 'today')
    await expect(page.locator('body')).not.toContainText('0 semanas')
    expect(registers().length).toBeGreaterThanOrEqual(1)
    expect(registers()[0].body).toEqual({ username: 'Pedro' })

    // Unregistered: Mi perfil says so; registering from there posts again
    const profile = page.locator('[data-component="ProfileSheet"]')
    await page.getByRole('button', { name: 'Mi perfil' }).click()
    await expect(profile).toContainText('Pedro')
    await expect(profile).toContainText('Aún no pueden encontrarte')
    await expect(page.getByRole('button', { name: 'Editar usuario' })).toHaveCount(0)
    api.registerStatus = 200
    api.exists = true
    const before = registers().length
    await page.getByRole('button', { name: 'Registrar mi usuario' }).click()
    await expect(profile).not.toContainText('Aún no pueden encontrarte')
    await expect(profile).toContainText('Así te encuentran tus amigos')
    expect(registers().length).toBe(before + 1)
    await sheetClose()
  })

  await step('Step 3a: Plan — Weekdays And Weeks', async () => {
    await nav(page, 'plan')
    const grid = page.locator('#plan-days-grid')
    const tiron = (t + 2) % 7
    // Each day sits on its own weekday; the rest are rest days, nothing moved
    for (let i = 0; i < 7; i++) {
      if (i === t) await expect(planDay(page, i).locator(SEL.dayTitle)).toHaveText('Empuje')
      else if (i === tiron) await expect(planDay(page, i).locator(SEL.dayTitle)).toHaveText('Tirón')
      else await expect(planDay(page, i)).toHaveAttribute('data-state', 'rest')
    }
    await expect(grid.locator('[data-state="moved"]')).toHaveCount(0)

    // Today opens by itself, marked «Hoy»; the other workout says its size
    await expect(planDay(page, t)).toHaveAttribute('data-component', 'DayPanel')
    await expect(planDay(page, t).locator('.now')).toHaveText('Hoy')
    await expect(planDay(page, tiron)).toContainText(/\d+ ej · \d+ min/)
    // Muscles in Spanish, weight on the same line, sets × reps at the right
    const bench = grid.locator(SEL.exerciseRow, { hasText: 'Banca' })
    await expect(bench).toContainText('Pecho')
    await expect(bench).toContainText('4 × 8–10')
    // Any other day opens on tap and closes from its head
    await planDay(page, tiron).click()
    await expect(planDay(page, tiron)).toHaveAttribute('data-component', 'DayPanel')
    await planDay(page, tiron).locator('.head').click()
    await expect(planDay(page, tiron)).toHaveAttribute('data-component', 'DayRow')

    // The week selector says which one is this week
    await expect(page.locator('[data-component="WeekSwitch"]').getByRole('tab', { selected: true })).toContainText('esta semana')
    const slotCard = (i) => planDay(page, i)

    // Switching weeks shows the new week's day, and the detail only walks that week
    await page.locator('button:has-text("Semana 2")').first().click()
    await expect(slotCard(t).locator(SEL.dayTitle)).toHaveText('Pierna')
    await expect(page.locator('#plan-days-grid')).toContainText('Sentadilla')
    await expect.poll(async () => (await storedSettings(page))?.currentWeekIdx).toBe(1)
    await openFromPlan(page, 'Sentadilla')
    await expect(sheetHead(page)).toContainText('1 de 2')
    await page.getByRole('button', { name: 'Siguiente' }).first().click()
    await expect(page.locator(SEL.detailName)).toContainText('Muerto')
    await expect(page.getByRole('button', { name: 'Siguiente' }).first()).toBeDisabled()
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await page.locator('button:has-text("Semana 1")').first().click()
    await expect(slotCard(t).locator(SEL.dayTitle)).toHaveText('Empuje')
    await expect.poll(async () => (await storedSettings(page))?.currentWeekIdx).toBe(0)
  })

  await step('Step 3b: Plan — Exercise Detail', async () => {
    await openFromPlan(page, 'Banca')
    // Position, media searches, name and arrows
    await expect(sheetHead(page)).toContainText('1 de 4')
    // Real links in a new tab: Google's Videos tab (udm=7; tbm=video gave «malformed request») and TikTok video search
    const google = page.getByRole('link', { name: 'Buscar en Google' })
    const tiktok = page.getByRole('link', { name: 'Buscar en TikTok' })
    await expect(google).toBeVisible()
    await expect(tiktok).toBeVisible()
    await expect(google).toHaveAttribute('href', /^https:\/\/www\.google\.com\/search\?udm=7&q=[^&]*Banca[^&]*t%C3%A9cnica$/)
    await expect(tiktok).toHaveAttribute('href', /^https:\/\/www\.tiktok\.com\/search\/video\?q=[^&]*Banca[^&]*t%C3%A9cnica$/)
    await expect(google).toHaveAttribute('target', '_blank')
    await expect(tiktok).toHaveAttribute('target', '_blank')
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    const prev = page.getByRole('button', { name: 'Anterior', exact: true }).first()
    const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
    await expect(prev).toBeDisabled()
    await expect(next).toBeEnabled()

    // Objective (the 5 s typed in the editor), coach, tabs, weight and dock
    const target = page.locator('[data-component="TargetPanel"]')
    await expect(target).toContainText('4×8-10')
    await expect(target).toContainText('0:05')
    await expect(page.getByRole('button', { name: /Pregúntale al coach/ })).toContainText('IA')
    for (const tab of ['Registrar', 'Historial']) await expect(segTab(page.locator('[data-component="ExerciseDetail"]'), tab)).toBeVisible()
    const weightPanel = page.locator('[data-component="WeightPanel"]')
    await expect(weightPanel).toContainText('Peso de hoy')
    await expect(weightPanel).toContainText('Última vez 75 kg')
    const weightInput = page.locator('input[inputmode="decimal"]').first()
    await expect(weightInput).toHaveValue('75')
    await expect(logDock(page).getByRole('button', { name: 'Iniciar descanso' })).toBeVisible()
    await expect(logDock(page).getByRole('button', { name: 'Registrar 75 kg' })).toBeVisible()
    await expect(logDock(page)).toContainText(/Después: Press Militar.* · 3 × 10-12/)

    // Its history came back with the restored copy
    const historialTab = segTab(page.locator('[data-component="ExerciseDetail"]'), 'Historial')
    const registrarTab = segTab(page.locator('[data-component="ExerciseDetail"]'), 'Registrar')
    const hero = page.locator('[data-component="ProgressHero"]')
    const emptyHistory = page.getByText('Aquí verás cómo subes')

    // Siguiente → Press Militar: never done, so a note, 0 kg and Registrar off
    await next.click()
    await expect(page.locator(SEL.detailName)).toContainText('Militar')
    await expect(prev).toBeEnabled()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toContainText(/Tu primera vez con Press Militar/)
    await expect(weightInput).toHaveValue('')
    const zero = logDock(page).getByRole('button', { name: 'Registrar 0 kg' })
    await expect(zero).toBeDisabled()
    await expect(logDock(page)).toContainText('Ajusta con − y +, luego registra')
    await historialTab.click()
    await expect(emptyHistory).toBeVisible()

    // Anterior → back on Press Banca, Historial re-derived for it
    await prev.click()
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    await expect(emptyHistory).not.toBeVisible()
    await expect(hero).toContainText('Tu récord')
    await expect(hero).toContainText('75')
    await registrarTab.click()
    await expect(weightInput).toHaveValue('75')

    // Swiping walks the same way
    await swipeDetail(page, -150)
    await expect(page.locator(SEL.detailName)).toContainText('Militar')
    await expect(weightInput).toHaveValue('')
    await page.getByRole('button', { name: 'Más peso' }).click()
    await expect(logDock(page).getByRole('button', { name: 'Registrar 5 kg' })).toBeEnabled()
    await swipeDetail(page, 150)
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    await expect(weightInput).toHaveValue('75')

    // (the coach's chat itself lives apart: «IA — coach del ejercicio y análisis»)
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toHaveCount(0)
    // Nothing was registered from Plan
    expect((await readLogs(page)).filter(l => l.date === localDate(0))).toHaveLength(0)
  })

  await step('Step 3c: Plan — Reprogramar', async () => {
    const slots = page.locator(SEL.dragSlot)
    const grid = page.locator('#plan-days-grid')
    const free = (t + 1) % 7
    const tiron = (t + 2) % 7
    const sheet = page.locator('#plan-reprogram-sheet')
    const movedFrom = (i) => `Se movió del ${WEEKDAY_NAMES_ES[i].toLowerCase()}`
    const listMoved = () => page.locator(`${SEL.dragSlot} [data-state="moved"]`)

    // Reprogramar asks first what happened, with today's real case; nothing to restore yet
    await page.locator('#plan-reprogram-btn').click()
    await expect(sheet).toContainText('¿Qué cambió esta semana?')
    if (t < 6) await expect(page.locator('#plan-shift-btn')).toContainText(`Hoy Empuje pasa al ${WEEKDAY_NAMES_ES[t + 1].toLowerCase()}`)
    await expect(page.locator('#plan-reset-btn')).toBeDisabled()

    // Mover: a grip on every day (nothing trained yet this week)
    await page.locator('#plan-move-btn').click()
    await expect(sheet).toHaveCount(0)
    await expect(page.locator(SEL.pageTitle)).toHaveText('Mover.')
    await expect(slots).toHaveCount(7)
    await expect(page.locator(SEL.dragHandle)).toHaveCount(7)

    // Dragging a day onto another one swaps them; each says where it came from
    await dragDay(page, t, tiron)
    await expect(slots.nth(tiron)).toContainText('Empuje')
    await expect(slots.nth(tiron)).toContainText(movedFrom(t))
    await expect(slots.nth(t)).toContainText('Tirón')
    await expect(slots.nth(t)).toContainText(movedFrom(tiron))

    // Releasing outside the list cancels
    await dragDay(page, tiron, free, { cancel: true })
    await expect(slots.nth(tiron)).toContainText('Empuje')
    await expect(listMoved()).toHaveCount(2)

    // Restablecer (in the dock) puts the week back; Listo with no edits must not
    // persist an identity override (it used to mask the weekdays forever)
    await page.locator('#plan-reset-btn').click()
    await expect(listMoved()).toHaveCount(0)
    await page.locator('#plan-done-btn').click()
    await expect(page.locator(SEL.pageTitle)).toHaveText('Plan.')
    // Deliberate: proves a write does NOT happen, so there is no event to wait on.
    await page.waitForTimeout(400)
    expect(Object.keys((await storedSettings(page))?.rescheduleWeekOrder || {})).toHaveLength(0)

    // «Me salté un día»: each pending workout from today on moves one day; the
    // notice offers Restablecer. On Sunday nothing is left to move. (Both
    // sides on every run, whatever today is: «Fechas fijas».)
    await page.locator('#plan-reprogram-btn').click()
    await page.locator('#plan-shift-btn').click()
    if (t < 6) {
      await expect(grid.locator('[data-state="moved"]', { hasText: 'Empuje' })).toContainText(movedFrom(t))
      if (t <= 3) await expect(grid.locator('[data-state="moved"]', { hasText: 'Tirón' })).toContainText(movedFrom(tiron))
      const shiftToast = page.locator('#plan-shift-toast')
      await expect(shiftToast).toContainText('Listo. Tu semana se corrió un día.')
      await shiftToast.getByRole('button', { name: 'Restablecer' }).click()
      await expect(grid.locator('[data-state="moved"]')).toHaveCount(0)
      await expect(shiftToast).toHaveCount(0)
    } else {
      await expect(page.locator('#backup-toast')).toContainText('No quedan días por correr esta semana')
    }
    await expect.poll(async () => Object.keys((await storedSettings(page))?.rescheduleWeekOrder || {}).length).toBe(0)

    // Today's workout dragged onto tomorrow's free slot
    await page.locator('#plan-reprogram-btn').click()
    await page.locator('#plan-move-btn').click()
    await dragDay(page, t, free)
    await expect(slots.nth(free)).toContainText('Empuje')
    await expect(slots.nth(free)).toContainText(movedFrom(t))
    await expect(slots.nth(t)).toContainText('Descanso')

    // Listo → the moved day keeps saying where it came from, also after a reload
    await page.locator('#plan-done-btn').click()
    // Mover closes only once the week is saved
    await expect(page.locator(SEL.pageTitle)).toHaveText('Plan.')
    await expect(planDay(page, free)).toContainText(movedFrom(t))
    await page.reload()
    await expect(planDay(page, free)).toContainText(movedFrom(t))
    await expect(planDay(page, t)).toContainText('Recuperar también cuenta')
    await page.locator('#plan-reprogram-btn').click()
    await expect(page.locator('#plan-reset-btn')).toBeEnabled()
    await sheet.getByRole('button', { name: 'Cerrar' }).click()

    // Hoy follows the plan: today is a rest day now, with the recovery list
    await nav(page, 'today')
    await expect(page.locator(SEL.pageTitle, { hasText: 'Descanso' })).toBeVisible()
    const restDay = page.locator('[data-component="RestDayView"]')
    await expect(restDay).toContainText('La recuperación es donde creces.')
    await expect(restDay).toContainText('Lista de recuperación')
    for (const tip of ['Hidrátate', 'Duerme 7-9 horas', 'Caminata suave', 'Movilidad', 'Come suficiente']) {
      await expect(restDay.locator('[data-component="InfoCard"]', { hasText: tip })).toBeVisible()
    }
    await expect(page.locator('[data-phase="training"]')).toHaveCount(0)

    // Back to the routine: Restablecer in the sheet leaves no override behind
    await nav(page, 'plan')
    await page.locator('#plan-reprogram-btn').click()
    await page.locator('#plan-reset-btn').click()
    await expect(page.locator('#backup-toast')).toContainText('Volviste a tu semana original')
    await expect(grid.locator('[data-state="moved"]')).toHaveCount(0)
    await expect.poll(async () => Object.keys((await storedSettings(page))?.rescheduleWeekOrder || {}).length).toBe(0)
    await page.reload()
    await expect(planDay(page, t).locator(SEL.dayTitle)).toHaveText('Empuje')

    await nav(page, 'today')
    await expect(page.locator(SEL.pageTitle)).toHaveText('Empuje.')
  })

  await step('Step 4: Hoy — Calentamiento', async () => {
    // With a history the dock no longer greets a first workout
    await expect(todayDock(page)).toContainText(/\d+ movimientos, uno a la vez/)
    const warmup = page.locator('[data-phase="warmup"]')
    const moves = (await warmup.locator(SEL.exerciseName).allTextContents()).map(s => s.trim())
    expect(moves.length).toBeGreaterThanOrEqual(3)
    const n = moves.length
    const arrowPrev = page.locator(SEL.detailNav).getByRole('button', { name: 'Anterior' })
    const arrowNext = page.locator(SEL.detailNav).getByRole('button', { name: 'Siguiente' })
    const dockNext = logDock(page).getByRole('button', { name: 'Siguiente' })

    await todayDock(page).getByRole('button', { name: /Empezar calentamiento/ }).click()
    await expect(sheetHead(page)).toContainText(`Calentamiento · 1 de ${n}`)
    await expect(page.locator(SEL.detailName)).toHaveText(moves[0])
    // «Cómo se hace» starts open, with the move's own sections
    const sheet = page.locator('[data-component="MovementSheet"]')
    await expect(sheet.getByText('Posición inicial', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Ejecución', { exact: true })).toBeVisible()
    await expect(sheet.getByText('Respiración', { exact: true })).toBeVisible()
    await expect(page.locator('[data-component="TargetPanel"]')).toContainText(/\d/)
    await expect(arrowPrev).toBeDisabled()
    await expect(logDock(page)).toContainText(`Después: ${moves[1]}`)

    // The dock's «Siguiente» marks and advances; the arrows only move
    await dockNext.click()
    await expect(sheetHead(page)).toContainText(`Calentamiento · 2 de ${n}`)
    await arrowNext.click()
    await expect(sheetHead(page)).toContainText(`Calentamiento · 3 de ${n}`)
    await arrowPrev.click()
    await expect(sheetHead(page)).toContainText(`Calentamiento · 2 de ${n}`)
    await page.getByRole('button', { name: 'Cerrar' }).first().click()

    // The mark lives in the session: the first move done, the second where to go on
    const check = async () => {
      await expect(warmup.locator(SEL.exerciseRow).nth(0)).toHaveAttribute('data-state', 'done')
      await expect(warmup.locator(SEL.exerciseRow).nth(1)).not.toHaveAttribute('data-state', 'done')
      await expect(todayDock(page).getByRole('button', { name: `Seguir con ${moves[1]}` })).toBeVisible()
      await expect(todayDock(page)).toContainText(`Movimiento 2 de ${n}`)
    }
    await check()
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.warmupMarks).toEqual([0])
    await page.reload()
    await check()

    // The last move: no «Siguiente», only «Terminar calentamiento»
    await todayDock(page).getByRole('button', { name: /Seguir con/ }).click()
    await goToLastMove(page)
    await expect(dockNext).toHaveCount(0)
    await expect(logDock(page)).toContainText('Último movimiento')
    await logDock(page).getByRole('button', { name: 'Terminar calentamiento' }).click()
    await expect(sheetHead(page)).toContainText('Calentamiento · listo')
    await expect(sheet).toContainText(`2 de ${n} hechos`)

    // The Watch is on: the moment to start it, then it goes away
    const watchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Inicia tu Smart Watch' })
    await expect(watchToast).toBeVisible()
    await elapse(2000)
    await expect(watchToast).not.toBeVisible()

    // «Empezar con …» hands over to the first exercise
    await logDock(page).getByRole('button', { name: /Empezar con Press de Banca/ }).click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toBeVisible()
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(page.locator('[data-phase="warmup"][data-state="done"]')).toBeVisible()
    await expect(page.locator('[data-phase="training"][data-state="open"]')).toBeVisible()
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.phase).toBeGreaterThanOrEqual(2)
    await expect(page.locator('[data-component="SessionClock"]')).toBeVisible()
  })

  const training = page.locator('[data-phase="training"]')
  const weightInput = page.locator('input[inputmode="decimal"]').first()
  const weightPanel = page.locator('[data-component="WeightPanel"]')
  const savedPanel = page.getByText('Registrado hoy')
  const todayLogOf = async (id) => (await readLogs(page)).filter(l => l.exerciseId === id && l.date === localDate(0))
  const openRow = async (name) => {
    if (await training.locator(SEL.phaseToggle).count()) await training.locator(SEL.phaseToggle).click()
    await training.locator(SEL.exerciseRow, { hasText: name }).first().click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toBeVisible()
  }

  await step('Step 5a: Hoy — Registrar Press Banca', async () => {
    await openRow('Banca')
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    await expect(weightInput).toHaveValue('75')

    // Above the best one: a new record, saved, with the toast up top
    await weightInput.fill('80')
    await logDock(page).getByRole('button', { name: 'Registrar 80 kg' }).click()
    await expect(weightPanel).toContainText('Registrado hoy')
    await expect(weightPanel).toContainText('tu nuevo récord')
    const toastEl = page.locator('#backup-toast')
    await expect(toastEl).toContainText('Guardado · 80 kg')
    expect((await toastEl.boundingBox()).y).toBeLessThan(200)
    await expect(logDock(page).getByRole('button', { name: 'Siguiente' })).toBeVisible()
    await expect(logDock(page).getByRole('button', { name: /Descansar 0:05/ })).toBeVisible()
    await expect(page.locator('[data-component="ExerciseDetail"]')).not.toContainText(/Borrar registro|Eliminar registro/)

    // Typing over it: no "8077", no snapping back; matching it again reads as saved
    await weightInput.click()
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('77.5')
    await expect(weightInput).toHaveValue('77.5')
    await expect(logDock(page).getByRole('button', { name: 'Registrar 77.5 kg' })).toBeVisible()
    await expect(savedPanel).toHaveCount(0)
    await page.keyboard.press('ControlOrMeta+a')
    await page.keyboard.type('80')
    await expect(savedPanel).toBeVisible()
    await expect(logDock(page).getByRole('button', { name: /^Registrar \d/ })).toHaveCount(0)

    // Saving another weight overwrites today's log: one log, survives a reload
    await weightInput.fill('77.5')
    await logDock(page).getByRole('button', { name: 'Registrar 77.5 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await page.reload()
    await openRow('Banca')
    await expect(weightInput).toHaveValue('77.5')
    let todays = await todayLogOf(ids.bench)
    expect(todays).toHaveLength(1)
    expect(todays[0].weight).toBe(77.5)
    await weightInput.fill('80')
    await logDock(page).getByRole('button', { name: 'Registrar 80 kg' }).click()
    await expect(savedPanel).toBeVisible()
    todays = await todayLogOf(ids.bench)
    expect(todays).toHaveLength(1)
    expect(todays[0].weight).toBe(80)

    // Alternativas: curated by the dictionary; picking one swaps the sheet
    // and jumps to Registrar; it survives a reload; «Volver a …» reverts it
    const altTab = segTab(page.locator('[data-component="ExerciseDetail"]'), 'Alternativas')
    const registrarTab = segTab(page.locator('[data-component="ExerciseDetail"]'), 'Registrar')
    const alts = page.locator('[data-component="AlternativesTab"]')
    await altTab.click()
    await expect(alts).toContainText(/Sugeridas para/)
    const dumbbell = alts.locator(SEL.exerciseRow, { hasText: 'Mancuernas' })
    await expect(dumbbell).toBeVisible()
    await expect(dumbbell.locator('img')).toHaveAttribute('src', /.+/)
    const search = logDock(page).locator('input')
    expect((await search.boundingBox()).y).toBeGreaterThan(page.viewportSize().height / 2)
    await dumbbell.click()
    await expect(registrarTab).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator(SEL.detailName)).toContainText('Mancuernas')
    await weightInput.fill('30')
    await logDock(page).getByRole('button', { name: 'Registrar 30 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await page.reload()
    await openRow('Mancuernas')
    await expect(page.locator(SEL.detailName)).toContainText('Mancuernas')
    await expect(weightInput).toHaveValue('30')
    await altTab.click()
    await alts.getByRole('button', { name: /Volver a Press de Banca/ }).click()
    await expect(page.locator(SEL.detailName)).toContainText('Banca')
    await expect(page.locator(SEL.detailName)).not.toContainText('Mancuernas')
    await registrarTab.click()
    await expect(weightInput).toHaveValue('80')
  })

  const timer = page.locator('[data-component="SeriesModeScreen"]')
  const timerTime = timer.locator(SEL.seriesTime)
  const serieLabel = timer.locator(SEL.seriesLabel)
  const wrsValue = (i) => timer.locator('[data-component="WeightRepsStepper"] [data-component="NumberStepper"]').nth(i).locator('b')
  const timerMain = timer.locator('.sms-dock [data-component="Button"]')
  // A 5 s rest running out: jumped over on the page clock. A set just
  // registered is written 450 ms later (debounced); in real time that lands
  // long before the rest ends, so it goes first here too.
  const waitPhase = async (phase) => {
    await elapse(500)
    await page.waitForTimeout(100)
    await elapse(REST * 1000)
    await expect(timer).toHaveAttribute('data-phase', phase)
  }

  await step('Step 5b: Rest Timer — Iniciar y pantalla completa', async () => {
    const probe = await pushProbe(page, context)
    const starts0 = api.restStarts.length
    const pushes0 = api.startPushes

    // A double tap, the way an impatient thumb does it: the rest starts on the
    // tap (full screen, delayed push queued), and it is ONE rest, ONE serie
    await logDock(page).getByRole('button', { name: /Descansar 0:05/ }).dblclick()
    await expect(timer).toBeVisible({ timeout: 1500 })
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    // +30 s right away: the 5 s rest would be over before the checks
    await timer.getByRole('button', { name: '+30 s' }).click()
    await expect(timer).toContainText('Press de Banca con Barra')
    await expect(serieLabel).toContainText('Serie 1 de 4')
    await expect(timer.locator(SEL.seriesDot('current'))).toHaveCount(1)
    await expect(timer.locator(SEL.seriesDot('done'))).toHaveCount(0)
    await expect(timer.locator('.sms-ex-sub [data-component="Tag"]')).toContainText('Pecho')
    expect(api.startPushes).toBe(pushes0)
    // The first rest queued once; +30 s re-queued it under a new tag, pushed back
    await expect.poll(() => api.restStarts.length).toBe(starts0 + 2)
    const [first, plus30] = api.restStarts.slice(starts0)
    expect(first.restSec).toBe(REST)
    expect(first.exerciseId).toBe(ids.bench)
    expect(first.sets).toBe(4)
    expect(first.reps).toBe('8-10')
    expect(first.deviceId).toBeTruthy()
    expect(plus30.restSec).toBe(REST + 30)
    expect(plus30.tag).not.toBe(first.tag)
    // (the delayed push is due 10 s before the end, but never sooner than 1 s
    // from now — which is what a 5 s rest gets)
    expect(plus30.endTime - first.endTime).toBeGreaterThan(20000)
    await expect(timerTime).toContainText(/0:3\d/)

    // What the Service Worker is told about this rest
    const spec = await cached(page, 'push-pending')
    expect(spec.exerciseData.exerciseId).toBe(ids.bench)
    expect(spec.exerciseData.restSec).toBe(REST + 30)
    expect(spec.doneAt).toBeGreaterThan(spec.startedAt)
    // A very late start push (past the middle of this 35 s rest, before the
    // done push is due) is still the start card, never «Descanso terminado».
    // 16 s on the Service Worker's clock: the real one (the page's runs ahead).
    await page.evaluate(async (realNow) => {
      const cache = await caches.open('push-pending')
      const s = await (await cache.match('/pending')).json()
      const shift = 16000 - (realNow - s.startedAt)
      s.startedAt -= shift
      s.doneAt -= shift
      await cache.put('/pending', new Response(JSON.stringify(s)))
    }, Date.now())
    await probe.deliver()
    await expect.poll(probe.cards, { timeout: 5000 }).toEqual(['rest-start: 4×8-10 · Descanso en curso · Tap para ver ▸'])
    await probe.clear()

    // The start notification leaves 3 s after the tap, on its own, once
    await elapse(3000)
    await expect.poll(() => api.startPushes).toBe(pushes0 + 1)

    // −15 s and «Reiniciar descanso» re-queue it too; restarting is not a new set
    await timer.getByRole('button', { name: '−15 s' }).click()
    await expect.poll(() => api.restStarts.length).toBe(starts0 + 3)
    expect(api.restStarts.at(-1).restSec).toBe(REST + 15)
    const before = api.restStarts.length
    await timer.getByRole('button', { name: 'Reiniciar descanso' }).click()
    await expect.poll(() => api.restStarts.length).toBe(before + 1)
    expect(api.restStarts.at(-1).restSec).toBe(REST + 15)
    await expect(timerTime).toContainText(/0:(19|20)/)
    await expect(serieLabel).toContainText('Serie 1 de 4')
    // Deliberate: proves no second start notification follows, so there is no
    // event to wait on. The second's on the page clock, then a beat for a request.
    await elapse(1000)
    await page.waitForTimeout(100)
    expect(api.startPushes).toBe(pushes0 + 1)

    // An empty push while the rest is young is the start card, never "terminado"…
    await probe.deliver()
    await expect.poll(probe.cards, { timeout: 5000 }).toEqual(['rest-start: 4×8-10 · Descanso en curso · Tap para ver ▸'])
    // …and once it is due, it is the done one (the spec shifted back in time)
    await page.evaluate(async () => {
      const cache = await caches.open('push-pending')
      const s = await (await cache.match('/pending')).json()
      s.startedAt -= 60000
      s.doneAt -= 60000
      await cache.put('/pending', new Response(JSON.stringify(s)))
    })
    await probe.clear()
    await probe.deliver()
    await expect.poll(probe.cards, { timeout: 5000 }).toEqual([
      'rest-done: Descanso terminado',
      'rest-start: 4×8-10 · Tap para iniciar descanso ▸',
    ])

    // Tapping the start notification while that rest runs only brings the app
    // to the front: no restart, no new set — even with iOS's burst of events
    const pending = await cached(page, 'rest-pending')
    const endBefore = (await cached(page, 'rest-timer')).endTime
    const startsBefore = api.restStarts.length
    await tapRestNotification(page, pending, { burst: true })
    // Deliberate: proves the clock is NOT restarted, so there is no event to wait on.
    await page.waitForTimeout(600)
    expect(api.restStarts.length).toBe(startsBefore)
    expect((await cached(page, 'rest-timer')).endTime).toBe(endBefore)
    await expect(serieLabel).toContainText('Serie 1 de 4')

    // Minimizar: the banner sits above the TabBar, in the sheet and in every view
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await expect(timer).toHaveCount(0)
    const banner = page.locator('[data-component="RestTimerBanner"]')
    await expect(banner).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    const checkBottom = async () => {
      await expect(banner).toBeVisible()
      const tab = await page.locator('[data-component="TabBar"]').boundingBox()
      const vh = page.viewportSize().height
      await expect.poll(async () => {
        const b = await banner.boundingBox()
        return b.y > vh / 2 && b.y + b.height <= tab.y + 1
      }).toBe(true)
    }
    await checkBottom()
    await expect(banner).toContainText('Sigue la serie')
    await expect(todayDock(page)).toHaveCount(0)
    await page.getByRole('link', { name: 'Plan' }).click()
    await expect(page).toHaveURL(/\/plan\/?$/)
    await checkBottom()
    await page.getByRole('link', { name: 'Hoy' }).click()
    await banner.getByRole('button', { name: 'Abrir descanso a pantalla completa' }).click()
    await expect(timer).toBeVisible()
    await expect(banner).toHaveCount(0)

    // Saltar sends the rest to zero: it cancels the queued push and the screen
    // stays, waiting for the next serie
    const cancels = api.restCancels.length
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    await expect(timerMain).toContainText('Empezar serie 2')
    await expect.poll(() => api.restCancels.length).toBe(cancels + 1)
    expect(api.restCancels.at(-1).tag).toBeTruthy()
    expect(api.restCancels.at(-1).deviceId).toBeTruthy()
    await expect.poll(async () => (await cached(page, 'rest-timer'))?.phase).toBe('done')

    // With no rest running, tapping that notification means "terminé la
    // siguiente serie": it counts serie 2 and arms its rest — once, even with
    // focus + visibilitychange + focus back-to-back
    await tapRestNotification(page, pending, { burst: true })
    await expect(timer).toBeVisible({ timeout: 3000 })
    await expect(serieLabel).toContainText('Serie 2 de 4')
    // Deliberate: proves no SECOND cycle is scheduled, so there is no event to wait on.
    await page.waitForTimeout(1000)
    expect(api.restStarts.length).toBe(startsBefore + 1)
    expect(api.restStarts.at(-1).restSec).toBe(REST)
  })

  await step('Step 5c: Rest Timer — Ciclo de series', async () => {
    const benchLog = async () => (await todayLogOf(ids.bench))[0]
    // Serie 2 is seeded from the previous set and the prescribed reps — nobody types
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(wrsValue(0)).toContainText('80')
    await expect(wrsValue(1)).toContainText('10')
    await expect(timerMain).toContainText('Registrar')

    // Untouched, the rest runs out: the screen stays, waiting for the next serie,
    // and the set is saved as shown. The old plain 80 kg inherits the reps, so
    // two identical sets stay ONE record — not blocks of "0 reps".
    await waitPhase('saved')
    await expect(timer).toContainText('Listo para la serie 3')
    await expect(timer).toContainText('Descanso terminado')
    await expect(timerMain).toContainText('Empezar serie 3')
    await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)
    // No in-app «Descanso terminado» toast: the screen says it, the push owns the notification
    expect(await page.evaluate(() => document.getElementById('backup-toast')?.textContent || '')).not.toContain('Descanso terminado')
    await expect.poll(async () => (await benchLog())?.sets).toBe(2)
    let log = await benchLog()
    expect(log.weight).toBe(80)
    expect(log.reps).toBe('10')
    expect(log.blocks).toBeUndefined()
    // The 'done' phase lives in the cache, not in memory: reopening finds it
    await expect.poll(async () => (await cached(page, 'rest-timer'))?.phase).toBe('done')

    // «Empezar serie 3»: the next rest starts on the tap, with its own start
    // notification 3 s later (the Watch gets a card per serie)
    const pushes = api.startPushes
    await timerMain.click()
    await expect(timer).toHaveAttribute('data-phase', 'registering', { timeout: 1500 })
    await expect(serieLabel).toContainText('Serie 3 de 4')
    await expect(timer.locator(SEL.seriesDot('done'))).toHaveCount(2)
    await expect(timerMain).toContainText('Registrar')
    await elapse(3000)
    await expect.poll(() => api.startPushes).toBe(pushes + 1)

    // Serie 3 heavier: «Registrar» folds the fields while the rest goes on
    await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await expect(wrsValue(0)).toContainText('85')
    await timerMain.click()
    await expect(timer).toContainText('Serie 3 registrada')
    await expect(timer).toContainText('85 kg × 10')
    // −15 s only shortens this rest: serie 4 below gets the full one again
    const startsNudge = api.restStarts.length
    await timer.getByRole('button', { name: '−15 s' }).click()
    await expect.poll(() => api.restStarts.length).toBe(startsNudge + 1)
    expect(api.restStarts.at(-1).restSec).toBe(1)
    await waitPhase('saved')
    await expect(timer).toContainText('Serie 3 guardada')
    // The first set that differs turns today's log into blocks
    await expect.poll(async () => (await benchLog())?.sets).toBe(3)
    log = await benchLog()
    expect(log.blocks).toEqual([{ sets: 2, reps: 10, weight: 80 }, { sets: 1, reps: 10, weight: 85 }])
    expect(log.weight).toBe(85)

    // Serie 4, the last, short of the 8-10 target: 85 × 7. Registering it folds
    // the fields like any serie; its rest reaching zero opens the summary.
    await expect(timerMain).toContainText('Empezar serie 4')
    await timerMain.click()
    await expect(serieLabel).toContainText('Serie 4 de 4')
    await expect.poll(() => api.restStarts.at(-1).restSec).toBe(REST)
    await expect(wrsValue(0)).toContainText('85')
    for (let i = 0; i < 3; i++) await timer.getByRole('button', { name: 'Menos reps' }).click()
    await expect(wrsValue(1)).toContainText('7')
    await timerMain.click()
    await expect(timer).toContainText('Serie 4 registrada')
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await waitPhase('confirm')
  })

  await step('Step 5d: Rest Timer — Confirma tus series', async () => {
    const benchLog = async () => (await todayLogOf(ids.bench))[0]
    await expect(timer).toContainText('Completado')
    await expect(timer).toContainText('Confirma tus series')
    await expect(timer.locator('.scs-eyebrow')).toContainText(/press/i)
    await expect(timerMain).toHaveCount(0)
    await expect(timer.locator('.scs-meta')).toContainText('objetivo 8–10 reps')
    const rows = timer.locator(SEL.confirmRow)
    await expect(rows).toHaveCount(4)
    await expect(rows.nth(0)).toContainText('80kg×10reps')
    await expect(rows.nth(0)).toContainText('en rango')
    await expect(rows.nth(2)).toContainText('85kg×10reps')
    await expect(rows.nth(3)).toContainText('85kg×7reps')
    await expect(rows.nth(3)).toContainText('-1 rep')
    // 80×10 + 80×10 + 85×10 + 85×7
    await expect(timer.locator('.scs-vol')).toHaveText(/3,?045 kg/)
    // Getting here already closed the last serie, exactly as registered
    expect((await benchLog()).blocks).toEqual([
      { sets: 2, reps: 10, weight: 80 },
      { sets: 1, reps: 10, weight: 85 },
      { sets: 1, reps: 7, weight: 85 },
    ])
    const save = timer.locator(SEL.confirmSave)
    await expect(save).toContainText('Guardar 4 series')
    await expect(save).not.toContainText('editada')

    // Edit serie 4 and take it back: «Restablecer» returns what was registered
    await timer.getByRole('button', { name: 'Serie 4', exact: true }).click()
    await expect(timer.locator('.scs-ed-title')).toContainText('Serie 4 de 4')
    await expect(timer.locator('.scs-ed-prev')).toContainText('Registrado: 85 kg × 7')
    await expect(timer.getByRole('button', { name: 'Copiar a las siguientes' })).toBeDisabled()
    await timer.getByRole('button', { name: 'Más reps' }).click()
    await expect(rows.nth(3)).toContainText('85kg×8reps')
    await expect(rows.nth(3)).toContainText('editada')
    await expect(save).toContainText('Guardar 4 series · 1 editada')
    await timer.getByRole('button', { name: 'Restablecer' }).click()
    await expect(rows.nth(3)).toContainText('85kg×7reps')
    await expect(save).not.toContainText('editada')

    // Serie 1 up two 2.5 kg steps, typed reps, then copied down
    await timer.getByRole('button', { name: 'Serie 1', exact: true }).click()
    await timer.getByRole('button', { name: 'Subir 2.5 kg' }).click()
    await timer.getByRole('button', { name: 'Subir 2.5 kg' }).click()
    await expect(wrsValue(0)).toContainText('85')
    // Tapping the figure turns it into a field to type in
    await wrsValue(1).click()
    await timer.getByLabel('Reps', { exact: true }).fill('9')
    await timer.getByLabel('Reps', { exact: true }).press('Enter')
    await expect(rows.nth(0)).toContainText('85kg×9reps')
    await timer.getByRole('button', { name: 'Siguiente serie' }).click()
    await expect(timer.locator('.scs-ed-title')).toContainText('Serie 2 de 4')
    await timer.getByRole('button', { name: 'Serie 1', exact: true }).click()
    await timer.getByRole('button', { name: 'Copiar a las siguientes' }).click()
    for (const i of [1, 2, 3]) await expect(rows.nth(i)).toContainText('85kg×9reps')
    await expect(save).toContainText('Guardar 4 series · 4 editadas')
    // Nothing is written until «Guardar»
    expect((await benchLog()).blocks).toHaveLength(3)

    // The whole view fits every phone: the save button on screen, nothing sideways
    for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      const box = await save.boundingBox()
      expect(box.y + box.height, `save off screen at ${size.width}`).toBeLessThanOrEqual(size.height)
      expect((await timer.locator('.scs-title').boundingBox()).y).toBeGreaterThanOrEqual(0)
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
      expect(overflow, `horizontal overflow at ${size.width}`).toBeLessThanOrEqual(0)
      const clipped = await timer.locator('.scs-pill').evaluateAll(els => els.filter(el => el.scrollWidth > el.clientWidth + 1).length)
      expect(clipped, `clipped pill at ${size.width}`).toBe(0)
    }

    // «Guardar» rewrites today's log from the confirmed rows and closes the timer
    await save.click()
    await expect(timer).toHaveCount(0)
    // The write lands right after the timer closes
    await expect.poll(async () => (await benchLog()).reps).toBe('9')
    const log = await benchLog()
    expect(log.weight).toBe(85)
    expect(log.sets).toBe(4)
    expect(log.reps).toBe('9')
    expect(log.blocks).toBeUndefined()
    await waitRestCleared(page)
  })

  const detail = page.locator('[data-component="ExerciseDetail"]')
  const tnName = page.locator(SEL.detailName)
  const altTab = segTab(detail, 'Alternativas')
  const registrarTab = segTab(detail, 'Registrar')
  const historialTab = segTab(detail, 'Historial')
  const alts = page.locator('[data-component="AlternativesTab"]')
  const navNext = page.locator(SEL.detailNav).getByRole('button', { name: 'Siguiente' })
  const navPrev = page.locator(SEL.detailNav).getByRole('button', { name: 'Anterior' })
  const closeDetail = async () => {
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(detail).toHaveCount(0)
  }

  await step('Step 5e: Hoy — Press Militar', async () => {
    await openRow('Militar')
    await expect(tnName).toContainText('Militar')

    // The hand-written alternative has no suggestions of its own
    await altTab.click()
    await alts.locator(SEL.exerciseRow, { hasText: 'press casero de prueba' }).click()
    await expect(tnName).toContainText(/press casero de prueba/i)
    await altTab.click()
    await expect(alts).toContainText('Sin sugerencias para este')
    await alts.getByRole('button', { name: /Volver a Press Militar/ }).click()
    await expect(tnName).toContainText('Militar')
    await registrarTab.click()

    // Serie 1 straight from the timer: never done, so it starts from nothing.
    // «Registrar» folds the fields; the rest keeps running
    await logDock(page).getByRole('button', { name: 'Iniciar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(serieLabel).toContainText('Serie 1 de 3')
    await expect(wrsValue(1)).toContainText('12')
    for (let i = 0; i < 8; i++) await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await expect(wrsValue(0)).toContainText('40')
    await timerMain.click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(timer).toContainText('Serie 1 registrada')
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.sets).toBe(1)
    // (+30 s keeps it running while minimized; at zero it would open full screen by itself)
    await timer.getByRole('button', { name: '+30 s' }).click()

    // Minimized inside the detail, the banner takes the dock's place and
    // reopens the same rest (no new set counted)
    const restBanner = page.locator('[data-component="RestTimerBanner"]')
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await expect(timer).toHaveCount(0)
    await expect(restBanner).toBeVisible()
    await expect(logDock(page)).toHaveCount(0)
    await restBanner.getByRole('button', { name: 'Abrir descanso a pantalla completa' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(serieLabel).toContainText('Serie 1 de 3')

    // Minimized again and out to Hoy: the banner there, Militar in progress with its marks
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await closeDetail()
    await expect(restBanner).toBeVisible()
    const bench = training.locator(SEL.exerciseRow).nth(0)
    const military = training.locator(SEL.exerciseRow).nth(1)
    await expect(bench).toHaveAttribute('data-state', 'done')
    await expect(bench).toContainText('Hoy 4 × 85 kg')
    await expect(military).toHaveAttribute('data-state', 'now')
    // («Última N kg» only once there's an earlier workout; this is its first)
    await expect(military).toContainText('Serie 2 de 3')
    await expect(military).not.toContainText('Última')
    await expect(military.locator('.pips i')).toHaveCount(3)
    await expect(military.locator('.pips i.on')).toHaveCount(1)
    await expect(page.locator('[data-component="SessionClock"]')).toBeVisible()
    await expect(page.locator('[data-phase="stretch"]')).toContainText('Después')
    expect((await storedSettings(page)).sessionState.endedAt ?? null).toBeNull()

    // Back in the detail, the banner reopens it; «Saltar» sends the rest to
    // zero and the screen stays, ready for the next serie
    await openRow('Militar')
    await restBanner.getByRole('button', { name: 'Abrir descanso a pantalla completa' }).click()
    await expect(serieLabel).toContainText('Serie 1 de 3')
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    await expect(timer).toContainText('Serie 1 guardada')
    // Minimized at zero there's no banner: the dock is back, and its rest
    // button reopens the timer where it was, without counting another serie
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await expect(restBanner).toHaveCount(0)
    await logDock(page).getByRole('button', { name: /Iniciar descanso|Descansar/ }).click()
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    await expect(serieLabel).toContainText('Serie 1 de 3')

    // Serie 2 through the timer, its rest skipped as well
    await timerMain.click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(serieLabel).toContainText('Serie 2 de 3')
    await expect(timer.locator(SEL.seriesDot('done'))).toHaveCount(1)
    await expect(wrsValue(0)).toContainText('40')
    await timerMain.click()
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.sets).toBe(2)

    // «Terminar» goes straight to «Confirma tus series» with every planned serie:
    // the registered ones as they were, the missing one filled in, all editable
    await timer.getByRole('button', { name: 'Terminar ejercicio' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'confirm')
    await expect(timer.locator(SEL.confirmRow)).toHaveCount(3)
    await expect(timer.locator(SEL.confirmRow).nth(1)).not.toContainText('auto')
    await expect(timer.locator(SEL.confirmRow).nth(2)).toContainText('auto')
    await expect(timer.locator(SEL.confirmSave)).toContainText('Guardar 3 series')
    await timer.locator(SEL.confirmSave).click()
    await expect(timer).toHaveCount(0)
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.sets).toBe(3)
    await waitRestCleared(page)
    // Saved, the detail moves on to the next exercise
    await expect(tnName).toContainText('Fondos')

    // Offline, Hoy's dock says everything is still saved on the phone
    await closeDetail()
    await goOffline(page, context)
    await expect(todayDock(page)).toContainText('Sin internet también se guarda todo en tu teléfono.')
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(todayDock(page)).not.toContainText('Sin internet')
  })

  await step('Step 5f: Hoy — Fondos por una alternativa', async () => {
    await openRow('Fondos')
    await expect(tnName).toContainText('Fondos')

    // The search in the dock covers the whole dictionary
    await altTab.click()
    await expect(alts.locator(SEL.exerciseRow).first()).toBeVisible()
    const curated = await alts.locator(SEL.exerciseRow).count()
    const search = logDock(page).locator('input')
    await search.fill('zzzxqy')
    await expect(alts).toContainText('No encontramos «zzzxqy»')
    await expect(alts.locator(SEL.exerciseRow)).toHaveCount(0)
    await alts.getByRole('button', { name: 'Borrar búsqueda' }).click()
    await expect(alts.locator(SEL.exerciseRow)).toHaveCount(curated)
    // Without accents it finds exercises that aren't curated alternatives
    await search.fill('sentadilla hack')
    await expect(alts.locator(SEL.exerciseRow).first()).toContainText('Sentadilla Hack')
    await expect(alts).toContainText(/resultado/)
    await alts.locator(SEL.exerciseRow).first().click()
    await expect(tnName).toContainText('Sentadilla Hack')
    await expect(registrarTab).toHaveAttribute('aria-pressed', 'true')

    // A set tapped right before Saltar lands on its own exercise (the write is debounced)
    const logsBefore = (await readLogs(page)).filter(l => l.date === localDate(0)).length
    await logDock(page).getByRole('button', { name: 'Iniciar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect.poll(async () => (await readLogs(page)).filter(l => l.date === localDate(0)).length).toBe(logsBefore + 1)
    const altLog = (await readLogs(page)).find(l => l.date === localDate(0) && ![ids.bench, ids.military, ids.dips, ids.long].includes(l.exerciseId) && l.weight === 5)
    expect(altLog, 'the skipped set is saved on the alternative').toBeTruthy()
    // The rest at zero stays up; minimized, the detail is back
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    await timer.getByRole('button', { name: 'Minimizar descanso' }).click()
    await expect(timer).toHaveCount(0)

    // Registered under the alternative, it still counts as today's Fondos.
    // With its rest still up (at zero, minimized), Registrar has the last word:
    // the rest ends, so coming back to the app it can't write its 1 serie over
    // the log and leave the exercise half done (bug seen 2026-11-03)
    await weightInput.fill('60')
    await logDock(page).getByRole('button', { name: 'Registrar 60 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await expect.poll(async () => await cached(page, 'rest-timer')).toBeNull()
    await page.reload()
    await waitForApp(page)
    const altRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Sentadilla Hack' })
    if (await altRow.count() === 0) await training.locator(SEL.phaseToggle).click()
    await expect(timer).toHaveCount(0)
    await expect(altRow).toHaveAttribute('data-done', 'true')
    expect((await readLogs(page)).find(l => l.id === altLog.id).sets).toBeUndefined()
    await expect(altRow.locator(SEL.exerciseDoneMark)).toBeVisible()
    const longRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Flexiones dinámicas' })
    await expect(longRow).toHaveAttribute('data-done', 'false')
    // A long exercise name takes at most two lines in its row
    expect(await lineCount(longRow.locator(SEL.exerciseName))).toBeLessThanOrEqual(2.05)
    // One exercise left: the session clock keeps running
    await expect(page.locator('[data-component="SessionClock"]')).toBeVisible()
    expect((await storedSettings(page)).sessionState.endedAt ?? null).toBeNull()
  })

  await step('Step 5g: Hoy — Otra alternativa queda hecha', async () => {
    // Back to Fondos, then a curated alternative with a plain weight log
    await openRow('Sentadilla Hack')
    await altTab.click()
    await alts.getByRole('button', { name: /Volver a Fondos/ }).click()
    await expect(tnName).toContainText('Fondos')
    await altTab.click()
    await alts.locator(SEL.exerciseRow).first().click()
    await expect(registrarTab).toHaveAttribute('aria-pressed', 'true')
    await expect(tnName).not.toContainText('Fondos')
    const altName = (await tnName.innerText()).trim()

    await weightInput.fill('20')
    await logDock(page).getByRole('button', { name: 'Registrar 20 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await expect.poll(async () => (await readLogs(page)).some(l => l.date === localDate(0) && l.weight === 20
      && ![ids.bench, ids.military, ids.dips, ids.long].includes(l.exerciseId))).toBe(true)

    // Back on Hoy, the slot shows the alternative, marked as done
    await closeDetail()
    const altRow = page.locator('[data-component="ExerciseRow"]', { hasText: altName })
    await expect(altRow).toHaveAttribute('data-done', 'true')
    await expect(altRow.locator(SEL.exerciseDoneMark)).toBeVisible()
    await expect(page.locator('[data-component="ExerciseRow"]', { hasText: 'Sentadilla Hack' })).toHaveCount(0)
  })

  await step('Step 5h: Hoy — Series por bloque', async () => {
    await openRow('Flexiones dinámicas')
    // The name takes at most two lines in the detail
    expect(await lineCount(tnName)).toBeLessThanOrEqual(2.05)

    // Three blocks, edited tile by tile, registered as ONE log with their real volume
    await page.getByRole('button', { name: /Series con pesos distintos/ }).click()
    const blockRows = page.locator('[data-component="BlockRow"]')
    await expect(blockRows).toHaveCount(1)
    const field = (b, i) => blockRows.nth(b).locator(SEL.blockField).nth(i)
    await field(0, 2).fill('10')
    await field(0, 2).click()
    const plus = blockRows.nth(0).getByRole('button', { name: 'Más', exact: true })
    await expect(blockRows.nth(0).getByRole('button', { name: 'Menos', exact: true })).toBeVisible()
    await plus.click()
    await expect(field(0, 2)).toHaveValue('12.5')
    await blockRows.nth(0).getByRole('button', { name: 'Menos', exact: true }).click()
    await expect(field(0, 2)).toHaveValue('10')
    // «Agregar bloque» copies the last one
    await page.getByRole('button', { name: 'Agregar bloque' }).click()
    await expect(blockRows).toHaveCount(2)
    await field(1, 1).fill('12')
    await field(1, 2).fill('8')
    await page.getByRole('button', { name: 'Agregar bloque' }).click()
    await expect(blockRows).toHaveCount(3)
    await field(2, 1).fill('8')
    await field(2, 2).fill('12')
    await expect(logDock(page)).toContainText('9 series · 10, 8 y 12 kg')
    await logDock(page).getByRole('button', { name: 'Registrar 9 series' }).click()
    const blocksPanel = page.locator('[data-component="BlocksPanel"]')
    await expect(blocksPanel).toContainText('Registrado hoy')
    await expect(blocksPanel).toContainText('9 series en 3 bloques')
    // Real volume: 3×10×10 + 3×12×8 + 3×8×12 = 876 kg
    const stored = await todayLogOf(ids.long)
    expect(stored).toHaveLength(1)
    expect(stored[0].blocks.reduce((v, b) => v + b.sets * b.reps * b.weight, 0)).toBe(876)
    expect(stored[0].weight).toBe(12)
    // Historial reads the same blocks back
    await historialTab.click()
    await expect(page.locator('[data-component="HistoryList"]')).toContainText('3 × 10 · 3 × 12 · 3 × 8')
    await expect(page.locator('[data-component="ProgressHero"]')).toContainText('12')
    await registrarTab.click()
    // «Editar bloques» › «Un solo peso» folds it back to one weight
    await blocksPanel.getByRole('button', { name: /Editar bloques/ }).click()
    await blocksPanel.getByRole('button', { name: 'Un solo peso' }).click()
    await expect(weightPanel).toBeVisible()

    // Nothing is written for a rest that just starts
    const longBefore = JSON.stringify(await todayLogOf(ids.long))
    await logDock(page).getByRole('button', { name: /Iniciar descanso|Descansar/ }).click()
    await expect(timer).toBeVisible()
    // Deliberate: proves nothing is written for this rest, so there is no event
    // to wait on. Past the 450 ms debounce on the page clock, then a beat for IndexedDB.
    await elapse(1200)
    await page.waitForTimeout(100)
    expect(JSON.stringify(await todayLogOf(ids.long))).toBe(longBefore)
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'saved')
    // Closing «Confirma tus series» without saving ends the rest for good
    await timer.getByRole('button', { name: 'Terminar ejercicio' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'confirm')
    await timer.getByRole('button', { name: 'Cerrar' }).click()
    await expect(timer).toHaveCount(0)
    await waitRestCleared(page)
    await closeDetail()
  })

  let endedAt = null
  await step('Step 6a: Hoy — Terminar entrenamiento', async () => {
    // Closing the last exercise ends the training: «Estira bb» with the time,
    // and the session clock stops there — stretching is not counted
    const stretchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })
    await expect(stretchToast).toBeVisible()
    await expect(stretchToast).toContainText(/seg|min/)
    await expect(page.locator('[data-component="SessionClock"]')).toHaveCount(0)
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.endedAt ?? null).not.toBeNull()
    endedAt = (await storedSettings(page)).sessionState.endedAt
    await elapse(3000)
    await expect(stretchToast).toHaveCount(0)

    // Training folds as «4 de 4 hechos»; unfolded, every row is done (Fondos
    // through its alternative), and the dock closes the phase
    await expect(training).toContainText('4 de 4 hechos')
    await training.locator(SEL.phaseToggle).click()
    const rows = page.locator('[data-phase="training"] [data-component="ExerciseRow"]')
    await expect(rows).toHaveCount(4)
    for (let i = 0; i < 4; i++) await expect(rows.nth(i)).toHaveAttribute('data-done', 'true')
    await expect(rows.nth(0).locator(SEL.exerciseDoneMark)).toBeVisible()
    await expect(rows.nth(0)).toHaveCSS('box-shadow', /rgb\(212, 255, 58\)/)
    await expect(todayDock(page)).toContainText('Entrenamiento completado · 4 ejercicios')
    await expect(page.locator('[data-component="MovementSheet"]')).toHaveCount(0)
    await todayDock(page).getByRole('button', { name: 'Terminar entrenamiento' }).click()

    // The stretch opens; the end time stays where the training ended
    await expect(page.locator('[data-phase="stretch"][data-state="open"]')).toBeVisible()
    await expect(page.locator('[data-phase="training"][data-state="done"]')).toBeVisible()
    await expect(todayDock(page).getByRole('button', { name: /Empezar estiramiento/ })).toBeVisible()
    await expect(todayDock(page)).toContainText(/Último paso · \d+ movimientos/)
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.phase).toBeGreaterThanOrEqual(3)
    expect((await storedSettings(page)).sessionState.endedAt).toBe(endedAt)

    // The marking is recomputed from IndexedDB on every load
    await page.reload()
    await expect(training).toContainText('4 de 4 hechos')
    await expect(page.locator('[data-phase="stretch"][data-state="open"]')).toBeVisible()
  })

  await step('Step 6b: Hoy — Terminar desde el último ejercicio', async () => {
    // Every exercise done: the one before the last still moves on with «Siguiente»
    if (await training.locator(SEL.phaseToggle).count()) await training.locator(SEL.phaseToggle).click()
    await training.locator('[data-component="ExerciseRow"]').nth(2).click()
    await expect(detail).toBeVisible()
    await expect(logDock(page).getByRole('button', { name: 'Siguiente' })).toBeEnabled()
    await expect(logDock(page).getByRole('button', { name: 'Terminar entrenamiento' })).toHaveCount(0)
    // On the last one «Siguiente» becomes «Terminar entrenamiento», next to «Descansar»
    await logDock(page).getByRole('button', { name: 'Siguiente' }).click()
    await expect(navNext).toBeDisabled()
    await expect(logDock(page).getByRole('button', { name: 'Siguiente' })).toHaveCount(0)
    await expect(logDock(page).getByRole('button', { name: /Descansar/ })).toBeVisible()
    await logDock(page).getByRole('button', { name: 'Terminar entrenamiento' }).click()

    // It goes straight to the first stretch move, no toast, end time untouched
    await expect(detail).toHaveCount(0)
    await expect(page.locator('[data-component="MovementSheet"]')).toBeVisible()
    await expect(sheetHead(page)).toContainText(/Estiramiento · 1 de \d+/)
    await expect(page.locator('[data-component="CenterToast"]')).toHaveCount(0)
    expect((await storedSettings(page)).sessionState.endedAt).toBe(endedAt)
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(page.locator('[data-component="MovementSheet"]')).toHaveCount(0)
  })

  await step('Step 6c: Hoy — Estiramiento', async () => {
    await todayDock(page).getByRole('button', { name: /Empezar estiramiento/ }).click()
    await expect(sheetHead(page)).toContainText(/Estiramiento · 1 de \d+/)
    const sheet = page.locator('[data-component="MovementSheet"]')
    // Walk every move with the arrow: a chest one needs the stall bar, a
    // triceps one has no image but keeps its searches
    let stallbar = false
    let noMedia = false
    for (let i = 0; i < 20; i++) {
      if (await sheet.getByText('STALLBAR').count()) stallbar = true
      if (await sheet.getByText('Sin imagen para este movimiento').count()) {
        noMedia = true
        await expect(sheet.getByRole('link', { name: 'Buscar en Google' })).toBeVisible()
        await expect(sheet.getByRole('link', { name: 'Buscar en TikTok' })).toBeVisible()
      }
      if (!(await navNext.isEnabled())) break
      await navNext.click()
    }
    expect(stallbar, 'a move with the STALLBAR badge').toBe(true)
    expect(noMedia, 'a move without media').toBe(true)

    // Offline the sheet says so and still marks
    await goOffline(page, context)
    await expect(sheetHead(page)).toContainText('Sin conexión')
    while (await navPrev.isEnabled()) await navPrev.click()
    await expect(logDock(page)).toContainText('Sin internet también puedes seguir')
    await logDock(page).getByRole('button', { name: 'Siguiente' }).click()
    await expect(sheetHead(page)).toContainText('Sin conexión')
    await expect(navPrev).toBeEnabled()
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.stretchMarks).toEqual([0])
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(sheetHead(page)).toContainText(/Estiramiento · 2 de \d+/)

    // The last move ends it; the training's end time doesn't move
    await goToLastMove(page)
    await logDock(page).getByRole('button', { name: 'Terminar estiramiento' }).click()
    await expect(sheetHead(page)).toContainText('Estiramiento · listo')
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.phase).toBeGreaterThanOrEqual(4)
    expect((await storedSettings(page)).sessionState.endedAt).toBe(endedAt)
    await logDock(page).getByRole('button', { name: 'Terminar sesión' }).click()
  })

  await step('Step 6d: Hoy — Racha, esfuerzo y resumen', async () => {
    // The streak (the restored weeks + this one) waits for «Seguir»
    const streak = page.locator('#streak-overlay')
    await expect(streak).toBeVisible()
    await expect(streak).toContainText(/semanas? seguidas?/)
    // Deliberate: proves it doesn't close by itself, so there is no event to wait on.
    await elapse(3000)
    await expect(streak).toBeVisible()
    await streak.getByRole('button', { name: 'Seguir' }).click()
    await expect(streak).toHaveCount(0)

    // Effort: four options, no emojis. «Ahora no» leaves the duration and a way back
    const effort = page.locator('#effort-overlay')
    await expect(effort.locator('[data-effort]')).toHaveCount(4)
    expect(/\p{Extended_Pictographic}/u.test(await effort.innerText())).toBe(false)
    await effort.getByRole('button', { name: 'Ahora no' }).click()
    await expect(page.locator(SEL.pageEyebrow)).toContainText('Hoy · terminado en')

    // The summary without the coach: the duration (volume and records come with
    // the coach's answer, which lives apart: «IA — coach del ejercicio y análisis»)
    // and the way to ask for it
    const summary = page.locator('[data-component="SessionSummary"]')
    const checkSummary = async () => {
      await expect(summary.locator('[data-component="StatBlock"]', { hasText: 'duración' })).toContainText(/\d+\s*min/)
      await expect(summary.getByRole('button', { name: 'Pedir análisis al coach' })).toBeVisible()
      await expect(summary.getByRole('button', { name: /Reiniciar día/ })).toBeVisible()
    }
    await checkSummary()
    // It survives closing and reopening the app
    await page.reload()
    await checkSummary()
  })

  await step('Step 6e: Plan — Hoy hecho', async () => {
    await nav(page, 'plan')
    // Today is done: accent ring, its time, and the week counts it
    const today = planDay(page, t)
    await expect(today).toHaveAttribute('data-state', 'done')
    await expect(today).toContainText(/Hecho( en \d+ min)?/)
    const strip = page.locator('#plan-week-strip')
    await expect(strip.locator('.n')).toHaveText('1')
    await expect(strip.locator('.u')).toHaveText('de 2 entrenos')
    await expect(strip.locator('[data-day="done"]')).toHaveCount(1)
    // Nothing left to push today: no Entrenar, only Reprogramar and what comes next
    await expect(todayDock(page).getByRole('button', { name: /^Entrenar/ })).toHaveCount(0)
    await expect(todayDock(page).getByRole('button', { name: /Reprogramar semana/ })).toBeVisible()
    await expect(todayDock(page)).toContainText(t <= 4 ? /: Tirón · \d+ min/ : /No quedan entrenos esta semana/)
    // Today's alternative was for today only: the program still has Fondos.
    // That it's gone the next time the day comes: «Alternativa solo por hoy»
    const empuje = (await storedProgram(page, 'Torso Pierna')).weeks[0].days.find(d => d.name === 'Empuje')
    expect(empuje.exercises.map(e => e.exerciseId)).toContain(ids.dips)
    expect((await storedSettings(page)).todaySwaps.date).toBe(localDate(0))
  })

  await step('Step 7a: Historial — Constancia', async () => {
    // Rewritten for Historial v2 with Pedro's yes (2026-10-22). It keeps the
    // promise of the old one: today's session (was the «Completado» pill in
    // .cal-detail), names resolved and never a raw exercise id, and a row
    // opening the detail with its alternatives and its history.
    await nav(page, 'history')
    await expect(hHeader.locator(SEL.pageTitle)).toHaveText(`${MONTHS_ES[new Date().getMonth()]}.`)
    await expect(hHeader).toContainText(/\d+ entrenos? este mes/)
    await expect(hCal.locator('.now')).toHaveClass(/sel/)
    await expect(hCal.locator('.now')).toHaveAttribute('data-state', 'done')
    await expect(hPanel).toHaveAttribute('data-state', 'done')

    // Exactly what was logged today: the alternative instead of Fondos, which has no log
    const todayLogs = (await readLogs(page)).filter(l => l.date === localDate(0) && l.weight > 0 && l.exerciseId !== '__day__')
    expect(todayLogs.some(l => l.exerciseId === ids.dips)).toBe(false)
    await expect(hPanel.locator(SEL.exerciseRow)).toHaveCount(todayLogs.length)
    const benchRow = hPanel.locator(SEL.exerciseRow, { hasText: 'Press de Banca con Barra' })
    await expect(benchRow).toContainText('85 kg')
    await expect(hPanel.locator(SEL.exerciseRow, { hasText: 'Press Militar' })).toContainText(/\d+ kg/)
    await expect(hPanel.locator(SEL.exerciseRow, { hasText: 'Sentadilla Hack' })).toContainText('60 kg')
    const bodyText = await page.locator('body').textContent()
    for (const id of Object.values(ids)) expect(bodyText).not.toContain(id)
    // No streak card and no red words for a missed day
    for (const word of ['Racha actual', 'Faltaste', 'No fuiste']) await expect(page.locator('body')).not.toContainText(word)

    // A row of the day opens the same detail, with its alternatives too
    await benchRow.click()
    await expect(sheetHead(page)).toContainText(/Empuje · 1 de \d+/)
    await expect(page.getByRole('link', { name: 'Buscar en Google' })).toBeVisible()
    await expect(altTab).toHaveCount(1)

    // Its history: the record, how much it went up, sessions by week
    await historialTab.click()
    const hero = page.locator('[data-component="ProgressHero"]')
    await expect(hero).toContainText('Tu récord')
    await expect(hero).toContainText('85')
    await expect(hero).toContainText(/Subiste 25 kg desde el \d+ de \w+\./)
    const list = page.locator('[data-component="HistoryList"]')
    await expect(list).toContainText('Esta semana')
    await expect(list).toContainText('Semana pasada')
    await expect(list.locator('.hr-d').first()).toHaveText(/^(Lun|Mar|Mié|Jue|Vie|Sáb|Dom) \d+ (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)$/)
    await expect(list.locator('.hr', { hasText: '85' }).first().locator('.hr-s')).toHaveText('Récord')
    await list.getByRole('button', { name: 'Ver las 8 sesiones' }).click()
    await expect(list.locator('.hr')).toHaveCount(8)
    await closeDetail()

    // A rest day: recovery, nothing to mark (this month, or the one before)
    const restCell = hCal.locator('[data-state="rest"]').first()
    const wentBack = !(await restCell.count())
    if (wentBack) await prevMonth.click()
    await restCell.click()
    await expect(hPanel).toContainText('Día de recuperación')
    await expect(page.getByRole('button', { name: /Marcar como hecho/ })).toHaveCount(0)
    if (wentBack) await nextMonth.click()

    // The next workout ahead (Tirón in two days, or next week's Pierna): what
    // it has, dimmed, nothing to mark. It used to walk the future cells and
    // pass without checking anything when none was a workout; now it's that
    // date. Past the month's end it can't be reached here (no months ahead):
    // «Fechas fijas» checks it on a fixed date.
    const [aheadIn, aheadName] = t <= 4 ? [2, 'Tirón'] : [7, 'Pierna']
    const aheadDate = localDate(-aheadIn)
    if (sameMonth(aheadDate, localDate(0))) {
      await dayCell(aheadDate).click()
      await expect(dayCell(aheadDate)).toHaveAttribute('data-state', 'future')
      await expect(hPanel).toContainText(aheadName)
      await expect(hPanel.getByText('Lo que toca', { exact: true })).toBeVisible()
      await expect(hPanel.locator(SEL.exerciseRow).first()).toBeVisible()
      await expect(page.getByRole('button', { name: /Marcar como hecho/ })).toHaveCount(0)
    }

    // Months: nothing after this one; back to the oldest log's, where ‹ turns off
    await expect(nextMonth).toBeDisabled()
    for (let i = 0; i < 3 && await prevMonth.isEnabled(); i++) await prevMonth.click()
    await expect(prevMonth).toBeDisabled()
    const oldest = localDate(27)
    await expect(hHeader.locator(SEL.pageTitle)).toHaveText(`${MONTHS_ES[Number(oldest.slice(5, 7)) - 1]}.`)
  })

  await step('Step 7b: Historial — Ejercicios', async () => {
    // Rewritten for Historial v2 with Pedro's yes (2026-10-22). Same promise
    // as the .ex-card version: last weight, how much it went up («+25.0» is
    // now «+25 kg»), its trend line, no empty chip, filter by muscle and back.
    await hDock.getByRole('button', { name: 'Ejercicios', exact: true }).click()
    const rows = page.locator('[data-component="ExerciseProgressRow"]')
    await expect(rows.first()).toBeVisible()
    const all = await rows.count()
    expect(all).toBeGreaterThanOrEqual(5)
    // Only what has logs, the latest first; exercises never logged don't show
    await expect(rows.first()).toContainText('· hoy')
    await expect(rows.filter({ hasText: 'Ejercicio Inventado X7' })).toHaveCount(0)
    // (the imported «Curl de Bíceps» is checked the same way in «Copia de seguridad», where it's imported now)
    // Press Banca: last 85 kg, +25 since the first restored 60, with its trend line
    const benchRow = rows.filter({ hasText: 'Press de Banca con Barra' })
    await expect(benchRow).toContainText('85 kg')
    await expect(benchRow).toContainText('+25 kg')
    await expect(benchRow).toContainText('Pecho · hoy')
    await expect(benchRow.locator('svg')).toHaveCount(1)
    // Peso Muerto came only from the copy: 90 → 100
    await expect(rows.filter({ hasText: 'Peso Muerto' })).toContainText('+10 kg')

    // No empty chip for the exercise without a muscle
    const chips = page.locator('#history [data-component="ChipRow"] [data-component="FilterChip"]')
    await expect(chips.filter({ hasText: /^\s*$/ })).toHaveCount(0)
    // Filter by one muscle (Peso Muerto's, from the dictionary), then back to all
    await chips.filter({ hasText: /^Isquiotibiales$/ }).click()
    await expect(rows).toHaveCount(1)
    await expect(rows).toContainText('Peso Muerto')
    await expect(page.locator('#history')).toContainText('1 de Isquiotibiales')
    await chips.filter({ hasText: /^Todos$/ }).click()
    await expect(rows).toHaveCount(all)

    // The whole row opens the detail
    await benchRow.click()
    await expect(detail).toBeVisible()
    await closeDetail()

    // Editar: a pencil per row, and the row no longer opens the detail. The
    // editor behind the pencil is the one in Tú; renaming through it here was
    // dropped (Pedro, 2026-11-03): «Tú — Editor de ejercicio» already proves it.
    await page.getByRole('button', { name: 'Editar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Listo', exact: true })).toBeVisible()
    await expect(rows.getByRole('button', { name: /^Editar / })).toHaveCount(all)
    await rows.first().locator('.n').click()
    await expect(detail).toHaveCount(0)
    await page.getByRole('button', { name: 'Listo', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
    await expect(rows.getByRole('button', { name: /^Editar / })).toHaveCount(0)
  })

  await step('Step 8a: Amigos — Liga después de entrenar', async () => {
    await nav(page, 'friends')
    // Today counts now: the week is done and the streak grew by one
    await expect(card.locator('.day').nth(t)).toHaveAttribute('data-day', 'done')
    await expect(card.locator('.num')).toHaveText(String(streakBefore + 1))
    await expect(card).toContainText('semanas seguidas')
    await expect(page.locator('body')).not.toContainText('0 semanas')
  })

  await step('Step 8b: Amigos — Liga chica y agregar', async () => {
    // Alone: the invitation, adding is the primary action, and sharing
    await expect(list).toContainText('Entrena con tu gente')
    await expect(addBtn).toHaveClass(/btn-primary/)
    await expect(list.getByRole('button', { name: 'Compartir mi usuario' })).toBeVisible()

    // Search from the sheet; adding doesn't close it
    const ana = LEAGUE.friend('Ana', 60, { streak: 12, exercisedToday: true })
    const anabel = LEAGUE.friend('Anabel', 30)
    api.users = [ana, anabel]
    const sheet = page.locator('[data-component="AddFriend"]')
    const input = page.locator('#friend-search-input')
    const items = page.locator(SEL.searchResult)
    await addBtn.click()
    await expect(input).toBeFocused()
    await expect(sheet).toContainText('¿Tu amigo aún no tiene la app?')
    await input.fill('Ana')
    await expect(items).toHaveCount(2)
    const anaItem = items.filter({ has: page.locator(SEL.searchResultName, { hasText: /^Ana$/ }) })
    const anabelItem = items.filter({ has: page.locator(SEL.searchResultName, { hasText: 'Anabel' }) })
    await anaItem.getByRole('button', { name: 'Agregar' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Ana está en tu liga')
    expect(api.calls.find((c) => c.path.endsWith('/api/friends/add')).body).toEqual({ username: 'Pedro', friendUsername: 'Ana' })
    await expect(sheet).toBeVisible()
    await sheetClose()

    // One friend: a plain list, no podium, and the nudge to add more
    await expect(page.locator('[data-component="LeagueRow"]')).toHaveCount(2)
    await expect(page.locator('.podium')).toHaveCount(0)
    await expect(card.locator('.line')).toHaveText(/^Ana va adelante por \d+ min\. Te (queda 1 día|quedan \d+ días) para alcanzarlo\.$/)
    await expect(list).toContainText('Con más amigos, la semana se pone más reñida.')

    // The one already in the league says so; the other one can be added
    await addBtn.click()
    await input.fill('An')
    await expect(anaItem).toContainText('En tu liga')
    await expect(anaItem.getByRole('button')).toHaveCount(0)
    await anabelItem.getByRole('button', { name: 'Agregar' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Anabel está en tu liga')
    await expect(anabelItem).toContainText('En tu liga')
    // No one by that name
    await input.fill('zzq')
    await expect(sheet).toContainText('No encontramos a «zzq»')
    // No native share → clipboard + «Copiado»
    await sheet.getByRole('button', { name: 'Compartir mi usuario' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Copiado')
    const copied = await page.evaluate(() => window.__copied)
    expect(copied).toContain('Agrégame en Coach Pedro AI: mi usuario es Pedro')
    expect(copied).toContain('/Pedro-IA-Coach/')
    await sheetClose()

    // Two friends: the podium appears and adding becomes secondary
    await expect(page.locator('.podium .col')).toHaveCount(3)
    await expect(list).not.toContainText('Con más amigos')
    await expect(addBtn).toHaveClass(/btn-secondary/)
  })

  await step('Step 8c: Amigos — Podio, detalle y datos viejos', async () => {
    const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString()
    api.friends = [
      ...api.friends,
      LEAGUE.friend('Luis', 195, { streak: 9 }),
      LEAGUE.friend('Viejo', 150, { exercisedToday: true, lastUpdate: hoursAgo(8 * 24) }),
      LEAGUE.friend('Ayer', 45, { exercisedToday: true, lastUpdate: hoursAgo(24) }),
    ]
    await page.reload()
    // Podium by minutes, shown 2-1-3, no medals anywhere
    const cols = page.locator('.podium .col')
    await expect(cols).toHaveCount(3)
    await expect(cols.nth(1)).toHaveAttribute('data-pos', '1')
    await expect(cols.nth(1)).toContainText('Luis')
    await expect(cols.nth(1)).toContainText('195 min')
    await expect(cols.nth(0)).toContainText('Ana')
    for (const medal of ['🏆', '🥈', '🥉']) await expect(page.locator('body')).not.toContainText(medal)
    // Behind: where I am and how much is missing to pass the next one
    await expect(card.locator('.line')).toHaveText(/^Vas #\d+ de 6\. Con \d+ min más pasas a \S+\.$/)

    // Old data: last week's minutes count 0 and the stale «trained today» goes;
    // yesterday's sync keeps its minutes (unless yesterday was last week) but not the dot
    const entry = (name) => page.locator(`#friends-list [data-user="${name}"]`)
    await expect(entry('Viejo')).toContainText('0 min')
    await expect(entry('Viejo')).toHaveAttribute('data-component', 'LeagueRow')
    await expect(entry('Viejo').locator('[data-today]')).toHaveCount(0)
    await expect(entry('Ayer')).toContainText(`${t === 0 ? 0 : 45} min`)
    await expect(entry('Ayer').locator('[data-today]')).toHaveCount(0)
    // Synced today and trained: the dot, and the legend that explains it
    await expect(entry('Ana').locator('[data-today]')).toHaveCount(1)
    await expect(page.locator('[data-component="Leaderboard"] .legend')).toHaveText('Entrenó hoy')

    // A friend's detail: two figures and bars relative to whoever has more
    await entry('Anabel').click()
    const fd = page.locator('[data-component="FriendDetail"]')
    await expect(fd).toContainText(/#\d esta semana/)
    await expect(fd.locator('.duo > div').nth(0)).toContainText('semanas seguidas')
    await expect(fd.locator('.duo > div').nth(1)).toContainText('30')
    await expect(fd.locator('.duo > div').nth(1)).toContainText('min esta semana')
    await expect(fd.locator('.bar-row')).toHaveCount(2)
    await expect(fd.locator('.bar-row.me')).toContainText('Tú')
    // Cancelar keeps her; Quitar removes her on the Worker and from the league
    await fd.getByRole('button', { name: 'Quitar de mi liga' }).click()
    await expect(fd).toContainText('¿Quitar a Anabel de tu liga?')
    await fd.getByRole('button', { name: 'Cancelar' }).click()
    await expect(fd.getByRole('button', { name: 'Quitar de mi liga' })).toBeVisible()
    expect(api.calls.filter((c) => c.path.endsWith('/api/friends/remove'))).toHaveLength(0)
    await fd.getByRole('button', { name: 'Quitar de mi liga' }).click()
    await fd.getByRole('button', { name: 'Quitar', exact: true }).click()
    await expect(fd).toHaveCount(0)
    await expect(page.locator('#backup-toast')).toContainText('Anabel ya no está en tu liga')
    expect(api.calls.find((c) => c.path.endsWith('/api/friends/remove')).body).toEqual({ username: 'Pedro', friendUsername: 'Anabel' })
    await expect(entry('Anabel')).toHaveCount(0)

    // With everyone behind me this week: «Vas primero», and I stand in the middle
    api.friends = [LEAGUE.friend('Mariana', 0, { streak: 4 }), LEAGUE.friend('Diego', 0, { streak: 1 })]
    await page.reload()
    await expect(card.locator('.line')).toHaveText('Vas primero esta semana. Bien hecho.')
    await expect(cols.nth(1)).toHaveAttribute('data-pos', '1')
    await expect(cols.nth(1)).toContainText('Tú')
  })

  const banner = page.locator('#offline-banner')

  await step('Step 9a: Red — Sin conexión y ping', async () => {
    // With the network there from the start, nothing shows
    await nav(page, 'today')
    await waitForApp(page)
    await expect(banner).toHaveCount(0)
    await context.setOffline(true)
    await expect(banner).toContainText('Sin conexión')
    await context.setOffline(false)
    await expect(banner).toContainText('Conectado de nuevo')
    await elapse(2500)
    await expect(banner).toHaveCount(0)

    // Mobile data on but no internet: navigator.onLine says true, the cheap
    // HEAD ping to the Worker fails on open → «Sin conexión»
    let reachable = false
    const pings = []
    await page.route(/\/api\/ping/, (route) => {
      pings.push(route.request().method())
      return reachable
        ? route.fulfill({ status: 405, headers: { 'Access-Control-Allow-Origin': '*' } })
        : route.abort('internetdisconnected')
    })
    await page.reload()
    await expect(banner).toContainText('Sin conexión', { timeout: 8000 })
    expect(await page.evaluate(() => navigator.onLine)).toBe(true)
    expect(pings[0]).toBe('HEAD')
    // Coming back to the foreground re-checks: now the server answers
    reachable = true
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(banner).toContainText('Conectado de nuevo')
    await elapse(2500)
    await expect(banner).toHaveCount(0)
    // Online: no periodic polling
    const count = pings.length
    // Deliberate: proves there is no polling, so there is no event to wait on.
    // Three seconds on the page clock, then a beat for a request to land.
    await elapse(3000)
    await page.waitForTimeout(100)
    expect(pings.length).toBe(count)
  })

  await step('Step 9b: Offline — Las vistas y lo que pide internet', async () => {
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
    // The Worker unreachable for real: drop the simulated one (and the stand-in
    // images: the placeholder below must come from the Service Worker)
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await unblockExternalImages(context)
    await page.route(/\/api\/ping/, (route) => route.fulfill({ status: 405, headers: { 'Access-Control-Allow-Origin': '*' } }))
    await context.setOffline(true)

    // Every view opens from the cache, and a reload too (real page loads: page.goto)
    await page.goto('plan')
    await expect(page.locator(`#plan-days-grid ${SEL.exerciseRow}`, { hasText: 'Banca' })).toBeVisible({ timeout: 5000 })
    await expect(banner).toContainText('Sin conexión')
    // The league line says how old it is
    await expect(page.locator('#plan-week-strip')).toContainText(/Liga actualizada a las \d{2}:\d{2}\. Se refresca al volver la señal/)
    // Historial opens (was: its «Constancia» tab visible — now «Días», with Pedro's yes 2026-10-22)
    await page.goto('history')
    await expect(hDock.getByRole('button', { name: 'Días', exact: true })).toBeVisible({ timeout: 5000 })
    await expect(hDock).toContainText('Tu historial está guardado en tu teléfono')

    // Marking a past workout as done works without internet
    if (await prevMonth.isEnabled()) await prevMonth.click()
    const missed = hCal.locator('[data-state="missed"]').first()
    const marked = Number(await missed.textContent())
    const doneBefore = await hCal.locator('[data-state="done"]').count()
    await missed.click()
    await expect(hPanel).toHaveAttribute('data-state', 'missed')
    await expect(hPanel).toContainText('Sin registrar')
    await expect(hPanel).toContainText('¿Lo hiciste y no lo anotaste?')
    await expect(hDock).toContainText('Marcar funciona sin internet')
    await hPanel.getByRole('button', { name: /Marcar como hecho/ }).click()
    const markedCell = hCal.getByRole('button', { name: String(marked), exact: true })
    await expect(markedCell).toHaveAttribute('data-state', 'done')
    await expect(hPanel).toContainText('Marcado a mano · sin pesos')
    await expect(hDock).toContainText('Listo. Ya cuenta en tu semana.')
    await expect(hCal.locator('[data-state="done"]')).toHaveCount(doneBefore + 1)
    await expect(hHeader).toContainText(`● ${doneBefore + 1} entreno`)
    let dayMark = null
    await expect.poll(async () => {
      dayMark = (await readLogs(page)).find(l => l.exerciseId === '__day__' && Number(l.date.slice(8)) === marked)
      return !!dayMark
    }).toBe(true)
    await page.reload()
    if (!sameMonth(dayMark.date, localDate(0))) await prevMonth.click()
    await expect(dayCell(dayMark.date)).toHaveAttribute('data-state', 'done')

    await page.goto('today')
    await page.reload()
    await expect(banner).toBeVisible()
    // An image never seen before can't come from the network → the placeholder
    const width = await page.evaluate(() => new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img.naturalWidth)
      img.onerror = () => resolve(0)
      img.src = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/offline-test/0.jpg'
    }))
    expect(width).toBe(1200)

    // Amigos: the saved league, and each Worker action off with its reason
    await page.goto('friends')
    await expect(list).toContainText('Mariana', { timeout: 5000 })
    await expect(page.locator('#friends-cached')).toHaveText(/^Datos del \d{1,2} [a-z]{3}, \d{2}:\d{2}\. Se actualizan al volver la conexión\.$/)
    await expect(addBtn).toBeDisabled()
    await expect(list).toContainText('Necesitas internet para agregar amigos.')
    await expect(page.locator('#friend-search-input')).toHaveCount(0)
    await list.locator('[data-user="Mariana"]').click()
    const fd = page.locator('[data-component="FriendDetail"]')
    await expect(fd.getByRole('button', { name: 'Quitar de mi liga' })).toBeDisabled()
    await expect(fd).toContainText('Necesitas internet para quitar amigos.')
    await sheetClose()

    // The detail: the position says it, the coach is off, registering saves on the phone
    await page.goto('plan')
    await openFromPlan(page, 'Militar')
    await expect(sheetHead(page)).toContainText('Sin conexión')
    const coachRow = detail.locator('button', { hasText: /coach/ })
    await expect(coachRow).toBeDisabled()
    await expect(coachRow).toContainText('El coach necesita internet')
    await expect(logDock(page)).toContainText('Sin internet también se guarda en tu teléfono')
    await expect(weightInput).toHaveValue('40')
    await page.getByRole('button', { name: 'Más peso' }).click()
    await logDock(page).getByRole('button', { name: 'Registrar 45 kg' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Guardado en tu teléfono · 45 kg')
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.weight).toBe(45)

    // Back online: the coach comes back
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(coachRow).toBeEnabled()
    await expect(coachRow).toContainText('Pregúntale al coach')
    await closeDetail()
    await mockWorker(page, api)
    await blockExternalImages(context)
  })

  await step('Step 10: Idioma, TabBar y nombres largos', async () => {
    // English names everywhere, then back to Spanish
    await nav(page, 'you')
    await page.locator('#you-row-ajustes').click()
    const langBtn = page.locator('#lang-toggle-btn')
    await expect(langBtn).toContainText('Español')
    await langBtn.click()
    await page.locator('#language-sheet').getByRole('radio', { name: 'English' }).click()
    await expect.poll(async () => (await storedSettings(page))?.language).toBe('en')
    await nav(page, 'history')
    await expect(page.locator('body')).toContainText('Barbell Bench Press')
    await nav(page, 'you')
    await page.locator('#you-row-ajustes').click()
    await expect(langBtn).toContainText('English')
    await langBtn.click()
    await page.locator('#language-sheet').getByRole('radio', { name: 'Español' }).click()
    await expect.poll(async () => (await storedSettings(page))?.language).toBe('es')
    await nav(page, 'history')
    await expect(page.locator('body')).toContainText('Press de Banca')

    // The TabBar is on screen on every page, also after scrolling
    for (const route of ['today', 'plan', 'history', 'friends', 'you']) {
      await page.goto(route)
      const hoy = page.getByRole('link', { name: 'Hoy' })
      await expect(hoy).toBeInViewport()
      await page.evaluate(() => window.scrollTo(0, 9999))
      await expect(hoy).toBeInViewport()
    }
  })

  // The backup saved in «Copia de seguridad», restored on the new phone
  let backup = null

  // At the end on purpose (Pedro, 2026-10-30): the flow has filled the app, so
  // the copy is checked against everything it holds by now
  await step('Step 11a: Copia — Copia de seguridad', async () => {
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const resultSheet = page.locator('[data-component="ResultSheet"]')
    await nav(page, 'you')
    await page.locator('#you-row-copia').click()

    // Exportar ejercicios: the file has every exercise, with its id
    const exercisesNow = await readExercises(page)
    const [exDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-exercises-row').click(),
    ])
    expect(exDownload.suggestedFilename()).toMatch(/^ejercicios-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(resultSheet).toContainText(`${exercisesNow.length} ejercicios exportados`)
    await page.getByRole('button', { name: 'Listo' }).click()
    const exported = JSON.parse(fs.readFileSync(await exDownload.path(), 'utf8'))
    expect(exported.map(e => e.id).sort()).toEqual(exercisesNow.map(e => e.id).sort())

    // Importar ejercicios: one new, one you already have (left as it was)
    const exFile = path.join(os.tmpdir(), `pw-exercises-${Date.now()}.json`)
    fs.writeFileSync(exFile, JSON.stringify([
      { id: 'ex-imported', name: 'Curl de Bíceps', muscle: 'Biceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      { ...exported.find(e => e.id === ids.bench), muscle: 'Músculo Pisado' },
    ]))
    try {
      const [chooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('#import-exercises-row').click(),
      ])
      await chooser.setFiles(exFile)
      await expect(resultSheet).toContainText('2 ejercicios en el archivo')
      await expect(resultSheet).toContainText('Nuevos1')
      await expect(resultSheet).toContainText('Ya los tenías')
      await page.getByRole('button', { name: 'Listo' }).click()
    } finally {
      fs.unlinkSync(exFile)
    }
    await nav(page, 'you')
    await page.locator('#you-row-ejercicios').click()
    await expect(page.locator('#you-ejercicios')).toContainText('Curl de Bíceps')
    await expect(page.locator('#you-ejercicios')).not.toContainText('Músculo Pisado')
    await expect(page.locator('#ex-count')).toHaveText(`${exercisesNow.length + 1} ejercicios`)
    // Never logged, so Historial › Ejercicios doesn't list it
    await nav(page, 'history')
    await hDock.getByRole('button', { name: 'Ejercicios', exact: true }).click()
    await expect(page.locator('[data-component="ExerciseProgressRow"]').first()).toBeVisible()
    await expect(page.locator('[data-component="ExerciseProgressRow"]', { hasText: 'Curl de Bíceps' })).toHaveCount(0)

    // Guardar copia: one file with everything the app holds
    await nav(page, 'you')
    await page.locator('#you-row-copia').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#save-backup-btn').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^training-backup-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(resultSheet).toContainText('Copia guardada')
    await page.getByRole('button', { name: 'Listo' }).click()
    const filePath = await download.path()
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    expect(data.exportedAt).toBeDefined()

    // Its exercises: all of them, the canonical names and the imported one
    const exercises = await readExercises(page)
    expect(data.exercises.map(e => e.id).sort()).toEqual(exercises.map(e => e.id).sort())
    expect(data.exercises.find(e => e.id === ids.bench).name).toBe('Press de Banca con Barra')
    expect(data.exercises.some(e => e.name === 'Curl de Bíceps')).toBe(true)

    // Its workouts: every log, the restored weeks and today's as confirmed
    const logs = await readLogs(page)
    expect(data.exerciseLogs).toHaveLength(logs.length)
    expect(data.exerciseLogs.find(l => l.id === 'log-past-bench-27').weight).toBe(60)
    const benchToday = data.exerciseLogs.find(l => l.exerciseId === ids.bench && l.date === localDate(0))
    expect(benchToday).toMatchObject({ weight: 85, sets: 4, reps: '9' })
    expect(data.exerciseLogs.find(l => l.exerciseId === ids.long && l.date === localDate(0)).blocks).toHaveLength(3)
    expect(data.exerciseLogs.some(l => l.exerciseId === '__day__')).toBe(true)
    expect(data.gymSessions.find(g => g.date === localDate(0))?.seconds).toBeGreaterThan(0)

    // Its programs: Programa Nuevo and Torso Pierna, the active one marked
    // (was 5 while the coach's three lived in the flow)
    expect(data.programs.map(p => p.name).sort()).toEqual(['Programa Nuevo', 'Torso Pierna'])
    expect(data.settings.activeProgramId).toBe((await storedSettings(page)).activeProgramId)

    // The user's data: Mis datos, the username and the settings
    expect(data.settings).toMatchObject({ height: '180', weight: '80', age: '28', occupation: 'Ingeniero', username: 'Pedro', language: 'es', units: 'kg' })
    backup = { filePath, data, trainedDays: new Set(logs.map(l => l.date)).size }
  })

  await step('Step 11b: Copia — Teléfono nuevo', async () => {
    const { filePath, data, trainedDays } = backup

    // A new phone: empty, until the copy comes back
    // Same conditions as the flow's phone: no motion, stand-in images, and its
    // JS errors count in «No Uncaught JS Errors» too
    const { baseURL, viewport, reducedMotion } = test.info().project.use
    const phone = await browser.newContext({ baseURL, viewport, reducedMotion })
    await blockExternalImages(phone)
    const p2 = await phone.newPage()
    p2.on('pageerror', err => jsErrors.push(`[teléfono nuevo] ${err.message}`))
    await mockWorker(p2, { friends: [], users: [] })
    try {
      await p2.goto('you')
      await expect(p2.locator('#you-first-time')).toContainText('Hola.')
      await p2.locator('#you-row-copia').click()
      await p2.locator('#restore-row').click()
      const [chooser] = await Promise.all([
        p2.waitForEvent('filechooser'),
        p2.locator('#restore-sheet').getByRole('button', { name: 'Elegir archivo y restaurar' }).click(),
      ])
      await chooser.setFiles(filePath)
      const restored = p2.locator('[data-component="ResultSheet"]')
      await expect(restored).toContainText('Copia restaurada')
      await expect(restored.locator('[data-component="StatBlock"]').nth(0)).toContainText(`${trainedDays}`)
      await expect(restored.locator('[data-component="StatBlock"]').nth(1)).toContainText(`${data.programs.length}`)
      await expect(restored.locator('[data-component="StatBlock"]').nth(2)).toContainText(`${data.exercises.length}`)
      await p2.reload()
      // Everything is back: exercises, profile, the active program, the workouts and the username
      await p2.locator('#you-row-ejercicios').click()
      await expect(p2.locator('#ex-count')).toHaveText(`${data.exercises.length} ejercicios`)
      await p2.goto('you')
      await expect(p2.locator('[data-component="ProgramCard"].active')).toContainText('Torso Pierna')
      await expect(p2.locator('#you-row-datos')).toContainText('7 de 7')
      await p2.locator('#you-row-datos').click()
      await expect(p2.locator('#profile-row-height')).toContainText('180 cm')
      await expect(p2.locator('#profile-row-weight')).toContainText('80 kg')
      await expect(p2.locator('#profile-row-occupation')).toContainText('Ingeniero')
      // Today's workout in Historial, with its weights, and the bench's whole climb
      await p2.goto('history')
      const p2Panel = p2.locator('[data-component="HistoryDayPanel"]')
      await expect(p2.locator('[data-component="MonthCalendar"] .now')).toHaveAttribute('data-state', 'done')
      await expect(p2Panel.locator(SEL.exerciseRow, { hasText: 'Press de Banca con Barra' })).toContainText('85 kg')
      await p2.locator('[data-component="ViewSwitchDock"]').getByRole('button', { name: 'Ejercicios', exact: true }).click()
      await expect(p2.locator('[data-component="ExerciseProgressRow"]', { hasText: 'Press de Banca con Barra' })).toContainText('+25 kg')
      await p2.goto('friends')
      await p2.getByRole('button', { name: 'Mi perfil' }).click()
      await expect(p2.locator('[data-component="ProfileSheet"]')).toContainText('Pedro')
    } finally {
      await phone.close()
    }
  })

  await step('Step 11c: Eliminar un ejercicio con registros', async () => {
    // Deleting says how many logs go with it
    await nav(page, 'you')
    await page.locator('#you-row-ejercicios').click()
    const countBefore = parseInt(await page.locator('#ex-count').textContent(), 10)
    const dlLogs = (await readLogs(page)).filter(l => l.exerciseId === ids.deadlift).length
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Peso Muerto' }).locator(SEL.exerciseToggle).click()
    await page.locator('[data-component="ExerciseCard"]').getByRole('button', { name: 'Editar ejercicio' }).click()
    await page.locator('#edit-exercise-sheet').getByRole('button', { name: 'Eliminar ejercicio' }).click()
    const del = page.locator('#delete-exercise-sheet')
    await expect(del).toContainText(`Se borran también sus ${dlLogs} registros del historial. No se puede deshacer.`)
    await del.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page.locator('[data-component="Toast"]')).toContainText('eliminado')
    await expect(page.locator('#ex-count')).toHaveText(`${countBefore - 1} ejercicios`)
    expect((await readLogs(page)).filter(l => l.exerciseId === ids.deadlift)).toHaveLength(0)
  })

  // At the end on purpose (Pedro, 2026-11-02): it wipes today's session
  await step('Step 12: Hoy — Reiniciar día', async () => {
    await nav(page, 'today')
    const summary = page.locator('[data-component="SessionSummary"]')
    await expect(summary).toBeVisible()
    const logsBefore = (await readLogs(page)).filter(l => l.date === localDate(0)).length
    await summary.getByRole('button', { name: /Reiniciar día/ }).click()

    // The session starts over: no summary, warmup and stretch back to «Después».
    // Today's weights stay, so training reads done and the dock offers to end it again
    const check = async () => {
      await expect(summary).toHaveCount(0)
      await expect(page.locator(SEL.pageEyebrow)).not.toContainText('terminado')
      await expect(page.locator('[data-phase="warmup"]')).toContainText('Después')
      await expect(page.locator('[data-phase="stretch"]')).toContainText('Después')
      await expect(training).toContainText('4 de 4 hechos')
      await expect(todayDock(page).getByRole('button', { name: 'Terminar entrenamiento' })).toBeVisible()
    }
    await check()
    await expect.poll(async () => (await storedSettings(page))?.sessionState ?? null).toBeNull()
    expect((await storedSettings(page)).lastCoachAnalysis ?? null).toBeNull()
    // The weights stay: only the session goes
    expect((await readLogs(page)).filter(l => l.date === localDate(0))).toHaveLength(logsBefore)
    await page.reload()
    await check()
  })

  await step('Step 13: No Uncaught JS Errors', async () => {
    expect(jsErrors).toEqual([])
  })

  // Every step ran, in order — not just "its name is somewhere in the file".
  // With FLOW_UNTIL, the ones up to it, and no JS error on the way.
  if (stopped) {
    expect(ran).toEqual(EXPECTED_STEPS.slice(0, ran.length))
    expect(jsErrors).toEqual([])
  } else {
    expect(ran).toEqual(EXPECTED_STEPS)
  }
})

// Apart from the flow: the flow's day trains muscles that all have their own
// warmups (with sections). A day whose muscle has none falls back to the
// generic warmup, whose moves carry a plain description instead.
test.describe('Calentamiento genérico — sin secciones', () => {
  test('a muscle without its own warmup falls back to the generic moves and their description', async ({ page }) => {
    const program = {
      id: 'prog-test', name: 'Test Program',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Piernas', subtitle: 'Sentadilla', duration: 60,
          exercises: [{ exerciseId: 'ex-squat', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }
    await nav(page, 'today')
    await seedIndexedDB(page, {
      // Quadriceps does not resolve to any WARMUP_DATA key → GENERIC_WARMUP_ONLY
      exercises: [{ id: 'ex-squat', name: 'Sentadilla', muscle: 'Quadriceps', imgUrl: '', tips: [], alternatives: [] }],
      program,
      settings: {
        id: 'settings', activeProgramId: 'prog-test', currentWeekIdx: 0, units: 'kg', accentColor: '#d4ff3a',
        hasWatch: false, sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, onboarded: true,
      },
    })
    await page.reload()

    await page.getByRole('button', { name: /Empezar calentamiento/ }).click()
    // «Cómo se hace» starts open, with the one step holding the desc
    const sheet = page.locator('[data-component="MovementSheet"]')
    await expect(sheet).toContainText('De pie con brazos extendidos', { timeout: 3000 })
    // Section labels should NOT appear
    await expect(sheet.getByText('Posición inicial', { exact: true })).toHaveCount(0)
  })
})

// ── Offline — red que conecta pero no contesta ──
// Apart from the flow: it serves the build from its own server (another URL)
// to make the network hang.
// Los datos móviles a menudo aceptan la conexión y se quedan colgados sin
// entregar nada. Un fetch sin plazo muerto nunca resuelve, así que la
// navegación se quedaba esperando en vez de arrancar desde la caché: la app
// no abría hasta apagar los datos. Este test reproduce ese servidor mudo
// (acepta y nunca responde) y exige que la app arranque igual.
test.describe('Offline — la red que se cuelga sin responder', () => {
  test('la app arranca desde caché cuando la red conecta pero no contesta', async ({ page }) => {
    test.setTimeout(60000)
    const http = require('http')
    const fs = require('fs')
    const path = require('path')

    // Sirve el mismo build que el preview, pero con un interruptor: colgado
    // las peticiones se quedan abiertas sin responder nunca.
    const ROOT = path.join(__dirname, '..', 'build')
    const MIME = {
      '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain',
    }
    let stuck = false
    let stuckBuildHits = 0
    const server = http.createServer((req, res) => {
      if (req.method === 'POST' && req.url.startsWith('/__stuck')) {
        stuck = req.url.includes('on')
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.end(stuck ? 'on' : 'off')
        return
      }
      let url = req.url.split('?')[0]
      if (url.startsWith('/Pedro-IA-Coach')) url = url.slice('/Pedro-IA-Coach'.length) || '/'
      if (url === '/') url = '/index.html'
      if (stuck) {
        // Red muda: ni responde ni falla. Se cuenta lo que le piden para
        // comprobar que el código de la app ni siquiera se pide.
        if (url.includes('/_app/immutable/')) stuckBuildHits++
        return
      }
      let file = path.join(ROOT, url)
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        const asHtml = `${file}.html`
        file = fs.existsSync(asHtml) ? asHtml : path.join(ROOT, 'index.html')
      }
      if (!fs.existsSync(file)) {
        res.writeHead(404)
        res.end('not found')
        return
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      fs.createReadStream(file).pipe(res)
    })
    await new Promise((r) => server.listen(0, r))
    const base = `http://localhost:${server.address().port}/Pedro-IA-Coach/`

    const setStuck = (on) => new Promise((resolve, reject) => {
      const req = http.request({ host: 'localhost', port: server.address().port, path: `/__stuck?${on ? 'on' : 'off'}`, method: 'POST' }, (res) => {
        res.resume()
        res.on('end', resolve)
      })
      req.on('error', reject)
      req.end()
    })

    try {
      // Visita con red para que el SW precachee, y otra recarga para que
      // controlara la página.
      await page.goto(base)
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 })
      await page.reload()
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20000 })
      await expect(page.locator('[data-component="TabBar"]')).toBeVisible()

      // Ahora la red se cuelga: la navegación debe arrancar igual desde caché.
      await setStuck(true)
      stuckBuildHits = 0
      await page.goto(base, { timeout: 15000 })
      await expect(page.locator('[data-component="TabBar"]')).toBeVisible({ timeout: 15000 })

      // Y ni siquiera le pide su código a la red: los assets con hash se
      // sirven directo de la caché.
      expect(stuckBuildHits).toBe(0)

      await setStuck(false)
    } finally {
      await new Promise((r) => server.close(r))
    }
  })
})

// ── Cloudflare: la segunda casa (spec 2026-10-14, Fase B) ──
// The suite tests the GitHub Pages build; this one builds the Cloudflare
// version (`npm run build:cf`, only if stale) and serves build-cf/ at the root
// with the SPA fallback Cloudflare uses.
test.describe('Cloudflare: la app vive en la raíz y no lleva al repo', () => {
  const http = require('http')
  const fs = require('fs')
  const path = require('path')
  const ROOT = path.join(__dirname, '..', 'build-cf')
  const MIME = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain',
  }
  let server = null
  const requested = []

  // Like Cloudflare's assets: the file, else `<path>.html`, else index.html.
  function resolveFile(url) {
    const file = path.join(ROOT, url === '/' ? '/index.html' : url)
    if (fs.existsSync(file) && !fs.statSync(file).isDirectory()) return file
    if (fs.existsSync(`${file}.html`)) return `${file}.html`
    return path.join(ROOT, 'index.html')
  }

  test.beforeAll(async () => {
    test.setTimeout(240000)
    require('child_process').execSync('node scripts/build-if-stale.mjs cf', { cwd: path.join(__dirname, '..'), stdio: 'inherit' })
    server = http.createServer((req, res) => {
      const url = req.url.split('?')[0]
      requested.push(url)
      const file = resolveFile(url)
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' })
      fs.createReadStream(file).pipe(res)
    })
    await new Promise((r) => server.listen(0, r))
  })

  test.afterAll(async () => {
    if (server) await new Promise((r) => server.close(r))
  })

  test('las pestañas, recargar, el manifest, el service worker y el enlace compartido van a la raíz', async ({ page }) => {
    const origin = `http://localhost:${server.address().port}`
    await mockWorker(page, { friends: [] })
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { value: undefined, configurable: true })
      Object.defineProperty(Navigator.prototype, 'clipboard', { value: { writeText: async (t) => { window.__copied = t } }, configurable: true })
    })
    await page.goto(`${origin}/today`)
    await seedIndexedDB(page, {
      exercises: [V2.bench, V2.military], program: V2.program(),
      // Name and age: «/» sends someone new to Tú, a known user to Hoy
      settings: V2.settings({ onboarded: true, username: 'TestUser', userName: 'Ana', age: '30' }),
    })

    await page.goto(`${origin}/`)
    await expect(page).toHaveURL(`${origin}/today`)
    await waitForApp(page)

    const hrefs = await page.locator('[data-component="TabBar"] a').evaluateAll((as) => as.map((a) => a.getAttribute('href')))
    expect(hrefs.length).toBeGreaterThan(0)
    for (const h of hrefs) expect(h).not.toContain('/Pedro-IA-Coach')
    // Tapped by their root href (nav() would fall back to the GitHub base URL)
    const tapTab = async (tab) => {
      await page.locator(`[data-component="TabBar"] a[href="/${tab}"]`).click()
      await expect(page).toHaveURL(`${origin}/${tab}`)
    }
    for (const tab of ['plan', 'history', 'friends', 'you']) await tapTab(tab)

    for (const route of ['history', 'friends']) {
      await page.goto(`${origin}/${route}`)
      await page.reload()
      await waitForApp(page)
      await expect(page).toHaveURL(`${origin}/${route}`)
    }

    const manifest = await page.request.get(`${origin}/manifest.json`)
    expect(manifest.status()).toBe(200)
    const m = await manifest.json()
    expect(m.start_url).toBe('.')
    expect(m.name).toBe('FitFriends')

    await page.waitForFunction(() => navigator.serviceWorker.ready.then(() => true), null, { timeout: 20000 })
    expect(await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toBe(`${origin}/`)

    // The shared link is this home's, never GitHub's
    await tapTab('friends')
    await page.getByRole('button', { name: 'Compartir mi usuario' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Copiado')
    const copied = await page.evaluate(() => window.__copied)
    expect(copied).toContain(`${origin}/`)
    expect(copied).not.toContain('/Pedro-IA-Coach')

    expect(requested.filter((u) => u.endsWith('.map'))).toEqual([])
  })
})

// ── Amigos v2 — liga semanal ──
// Spec: docs/superpowers/specs/2026-10-07-amigos-v2-liga-semanal-design.md.
// Friends built around today's date (the league week is always Monday →
// Sunday, so they hold whatever day the suite runs) — used by the full flow's
// Amigos steps and by «racha nueva» below, which seeds a broken streak.
const LEAGUE = {
  // Local date `days` after this week's Monday (negative = earlier weeks).
  fromMonday(days) {
    return localDate(getDayIdx() - days)
  },
  // Monday–Wednesday of the week `weeksAgo` weeks back: a completed week for a 4-day program.
  fullWeek(weeksAgo) {
    return [0, 1, 2].map((i) => ({ id: `log-w${weeksAgo}-${i}`, exerciseId: 'ex-bench', date: LEAGUE.fromMonday(-7 * weeksAgo + i), weight: 50, units: 'kg' }))
  },
  exercises: [
    { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
    { id: 'ex-military', name: 'Press Militar', muscle: 'Shoulders', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
  ],
  // Four training days a week (streak threshold 3), today among them.
  program() {
    const t = getDayIdx()
    const training = new Set([t, (t + 1) % 7, (t + 2) % 7, (t + 4) % 7])
    const workout = { name: 'Empuje', subtitle: 'Press Banca', duration: 60, exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }, { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 }] }
    const rest = { name: 'Descanso', subtitle: '', duration: 0, exercises: [] }
    return { id: 'prog-liga', name: 'Programa Liga', weeks: [{ name: 'Semana 1', subtitle: '', tag: 'BUILD', days: Array.from({ length: 7 }, (_, i) => (training.has(i) ? workout : rest)) }] }
  },
  settings(over = {}) {
    return {
      id: 'settings', activeProgramId: 'prog-liga', currentWeekIdx: 0, units: 'kg',
      accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
      sessionState: { date: localDate(0), phase: 2, todayExDone: 0 }, lastCoachAnalysis: null,
      rescheduleWeekOrder: {}, language: 'es', onboarded: true, username: 'TestUser',
      ...over,
    }
  },
  friend(username, minutes, over = {}) {
    return { username, streak: 3, exercisedToday: false, gymTime: minutes * 60, lastUpdate: new Date().toISOString(), ...over }
  },
}

async function openFriends(page, data) {
  await gotoFriendsLoaded(page)
  await seedIndexedDB(page, { exercises: LEAGUE.exercises, ...data })
  await page.reload()
}

// Logs one weight on today's first exercise through Hoy, like a user would.
// Changed 2026-10-15 with Hoy/Detalle v2 (approved by Pedro): the training rows
// were always on screen and the button said «Registrar ·» → «Guardado ·». In
// Hoy v2 training waits folded until the warmup is done, so it is opened first;
// the button says «Registrar N kg» and the panel «Registrado hoy».
async function logWeightToday(page) {
  await nav(page, 'today')
  const training = page.locator('[data-phase="training"]')
  if (await training.locator(SEL.phaseToggle).count()) await training.locator(SEL.phaseToggle).click()
  await training.locator(SEL.exerciseRow).first().click()
  await page.getByRole('button', { name: 'Más peso' }).first().click()
  await page.getByRole('button', { name: /^Registrar \d/ }).click()
  await expect(page.getByText('Registrado hoy')).toBeVisible()
}

// Apart from the flow: it needs a streak that broke weeks ago, while the
// flow's restored history is a streak that is alive.
test.describe('Amigos v2 — racha nueva', () => {
  test('never shows a 0 streak: progress of the week instead, and it moves after training', async ({ page }) => {
    const api = { friends: [] }
    await mockWorker(page, api)
    await openFriends(page, {
      exerciseLogs: [...LEAGUE.fullWeek(6), ...LEAGUE.fullWeek(7), ...LEAGUE.fullWeek(8)],
      program: LEAGUE.program(),
      settings: LEAGUE.settings(),
    })
    const card = page.locator('[data-component="WeekCard"]')

    await expect(card).toContainText('Racha nueva')
    await expect(card.locator('.num')).toHaveText('0 de 3')
    await expect(card).toContainText('entrenos esta semana')
    await expect(card.locator('.line')).toHaveText('Volviste. Tu mejor racha es de 3 semanas; te faltan 3 entrenos para empezar otra.')
    await expect(card.locator('.day').nth(getDayIdx())).toHaveAttribute('data-day', 'today')
    await expect(page.locator('body')).not.toContainText('0 semanas')

    await logWeightToday(page)
    await nav(page, 'friends')
    await expect(card.locator('.num')).toHaveText('1 de 3')
    await expect(card.locator('.day').nth(getDayIdx())).toHaveAttribute('data-day', 'done')
    await expect(page.locator('body')).not.toContainText('0 semanas')
  })
})


// Apart from the flow: it needs a registered user with friends from the start.
// Changed 2026-10-14 (approved by Pedro): the «Editar usuario» pencil in Mi perfil is
// hidden for now. It was commented out until then; back 2026-11-02 (Pedro): the
// pencil is still in the page, only hidden, so the test checks it stays hidden,
// shows it, and the whole rename (on the Worker, taken name, survives reload)
// keeps being tested. When the pencil returns, drop the unhide.
test.describe('Amigos v2 — mi perfil y renombrar', () => {
  test('renames on the Worker, rejects a taken name, and keeps the new name after reload', async ({ page }) => {
    const api = { friends: [LEAGUE.friend('Ana', 60), LEAGUE.friend('Luis', 30)], renameStatus: 409 }
    await mockWorker(page, api)
    await openFriends(page, {
      exerciseLogs: [...LEAGUE.fullWeek(1), ...LEAGUE.fullWeek(2), ...LEAGUE.fullWeek(3)],
      program: LEAGUE.program(),
      settings: LEAGUE.settings(),
    })
    const profile = page.locator('[data-component="ProfileSheet"]')
    const header = page.locator('[data-component="Sheet"] .sheet-header')
    const save = page.getByRole('button', { name: 'Guardar' })
    const renames = () => api.calls.filter((c) => c.path.endsWith('/api/user/rename'))

    await page.getByRole('button', { name: 'Mi perfil' }).click()
    await expect(profile.locator('.who-name')).toHaveText('TestUser')
    await expect(profile.locator('.duo > div').nth(0)).toContainText('3')
    await expect(profile.locator('.duo > div').nth(0)).toContainText('semanas seguidas')
    await expect(profile.locator('.duo > div').nth(1)).toContainText('2')
    await expect(profile.locator('.duo > div').nth(1)).toContainText('amigos en tu liga')

    // Hidden for now (Pedro): not on screen, but still in the page
    const pencil = profile.locator('button.edit')
    await expect(pencil).toHaveAttribute('aria-label', 'Editar usuario')
    await expect(pencil).toBeHidden()
    await pencil.evaluate((el) => { el.hidden = false })

    // Nothing to save until the name changes.
    await page.getByRole('button', { name: 'Editar usuario' }).click()
    await expect(header).toHaveText('Cambiar usuario')
    await expect(save).toBeDisabled()
    await page.locator('#rename-input').fill('Pedro')
    await expect(profile).toContainText('5/20')

    // Taken: the error shows, the sheet stays, the name does not change.
    await save.click()
    await expect(profile).toContainText('Ese usuario ya está tomado')
    await expect(header).toHaveText('Cambiar usuario')
    await expect(page.locator('#backup-toast')).toHaveCount(0)
    expect(api.listUsers.at(-1)).toBe('TestUser')

    // Free: renamed on the Worker and shown right away.
    api.renameStatus = 200
    await save.click()
    await expect(page.locator('#backup-toast')).toContainText('Usuario actualizado')
    expect(renames().at(-1).body).toEqual({ username: 'TestUser', newUsername: 'Pedro' })
    await expect(header).toHaveText('Mi perfil')
    await expect(profile.locator('.who-name')).toHaveText('Pedro')

    // It survives a reload, and the league is asked for under the new name.
    await page.reload()
    await page.getByRole('button', { name: 'Mi perfil' }).click()
    await expect(profile.locator('.who-name')).toHaveText('Pedro')
    expect(api.listUsers.at(-1)).toBe('Pedro')
  })
})

// ═══════════════════ Nube — cuenta y copia (spec 2026-10-14, Fase A) ═══════════════════
// The Worker is simulated (mockWorker → cloudRoute); each test seeds once and
// drives the real UI. A seeded account lives in localStorage like the app's.

const CLOUD = {
  account: { username: 'TestUser', email: 'test@mail.com', token: 'tok-test' },
  logs: [
    { id: 'log-c1', exerciseId: 'ex-bench', date: localDate(3), weight: 50, units: 'kg' },
    { id: 'log-c2', exerciseId: 'ex-military', date: localDate(3), weight: 30, units: 'kg' },
  ],
  gymSession: { id: localDate(3), date: localDate(3), seconds: 1800, weekStart: localDate(3) },
  uploadKeys(api) {
    return api.uploads.flatMap((u) => (u.body.upserts || []).map((r) => `${r.store}:${r.id}`))
  },
}

async function seedCloud(page, route, data, account = null) {
  await page.goto(route)
  await seedIndexedDB(page, data)
  await page.evaluate((a) => {
    localStorage.removeItem('cloud-hashes')
    localStorage.removeItem('cloud-upload')
    if (a) localStorage.setItem('cloud-account', JSON.stringify(a))
    else localStorage.removeItem('cloud-account')
  }, account)
  await page.reload()
  await waitForApp(page)
}

// Today's two exercises (V2 program: Press Banca, Press Militar), one weight
// each through the detail, closing it like a user. Two minutes pass between
// them so today's gym time is not 0.
async function registerBothExercises(page) {
  const training = page.locator('[data-phase="training"]')
  const rows = training.locator(SEL.exerciseRow)
  for (let i = 0; i < 2; i++) {
    if (await rows.count() === 0) await training.locator(SEL.phaseToggle).click()
    await rows.nth(i).click()
    await page.getByRole('button', { name: 'Más peso' }).first().click()
    await page.getByRole('button', { name: /^Registrar \d/ }).click()
    await expect(page.getByText('Registrado hoy')).toBeVisible()
    if (i === 0) await page.clock.fastForward('02:00')
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toHaveCount(0)
  }
}

function syncsWithGymTime(api) {
  return api.calls.filter((c) => c.path.endsWith('/api/user/sync') && c.body.gymTime > 0)
}

test.describe('Nube — proteger mi usuario', () => {
  test('crea la cuenta con correo y contraseña, sube todo y Tú muestra «Guardado hoy»', async ({ page }) => {
    const api = { createStatus: 409 }
    await mockWorker(page, api)
    await seedCloud(page, 'you', {
      exercises: LEAGUE.exercises, program: LEAGUE.program(), exerciseLogs: CLOUD.logs,
      gymSessions: [CLOUD.gymSession], settings: LEAGUE.settings(),
    })
    const creates = () => api.calls.filter((c) => c.path.endsWith('/api/account/create'))

    // Registered in the league, no password yet (Cuenta v2)
    await expect(page.locator('#cloud-card')).toContainText('Tu usuario no tiene contraseña')
    await expect(page.locator('#cloud-card')).toContainText('TestUser')
    await page.locator('#cloud-card-create').click()
    // The user already has a name: only email and password
    await expect(page.locator('#account-email')).toBeVisible()
    await expect(page.locator('#account-username')).toHaveCount(0)

    await page.locator('#account-email').fill('ana@')
    await page.locator('#account-password').fill('1234')
    await page.locator('#account-submit').click()
    await expect(page.getByText('Correo no válido')).toBeVisible()
    await expect(page.getByText('Mínimo 8 caracteres')).toBeVisible()
    expect(creates()).toHaveLength(0)

    // Someone protected it first (once): the sheet offers signing in
    await page.locator('#account-email').fill('test@mail.com')
    await page.locator('#account-password').fill('secreta123')
    await page.locator('#account-submit').click()
    await expect(page.getByText('Ese usuario ya está protegido')).toBeVisible()
    await expect(page.locator('#account-go-login')).toBeVisible()

    // Free now: created, and everything goes up
    await page.locator('#account-submit').click()
    await expect(page.locator('#cloud-verified')).toContainText('Tu cuenta está lista')
    await expect(page.locator('#cloud-verified')).toContainText('Guardado hoy')
    await expect(page.locator('#you-row-cuenta')).toContainText('Verificado')
    await page.locator('#cloud-verified-done').click()
    await expect(page.locator('#cloud-verified')).toHaveCount(0)
    expect(creates().at(-1).body).toEqual({ username: 'TestUser', email: 'test@mail.com', password: 'secreta123' })
    const keys = CLOUD.uploadKeys(api)
    for (const k of ['exerciseLogs:log-c1', 'exerciseLogs:log-c2', 'programs:prog-liga', 'exercises:ex-bench', 'exercises:ex-military', `gymSessions:${localDate(3)}`, 'settings:settings']) {
      expect(keys).toContain(k)
    }
    expect(api.uploads[0].auth).toBe('Bearer tok-test')
    // The phone's own fields never go up
    const settingsUp = api.uploads[0].body.upserts.find((r) => r.store === 'settings').data
    expect(settingsUp).not.toHaveProperty('sessionState')
    expect(settingsUp).not.toHaveProperty('pushSubscribed')

    await page.reload()
    await waitForApp(page)
    await expect(page.locator('#cloud-card')).toHaveCount(0)
    await expect(page.locator('#you-row-cuenta')).toContainText('Guardado hoy')
    await expect(page.locator('#you-row-cuenta')).toContainText('test@mail.com')
    await expect(page.locator('#you-row-copia')).not.toContainText('solo en este teléfono')
  })
})

test.describe('Nube — sin usuario todavía', () => {
  test('la hoja pide el usuario, y Amigos ya no lo pide después', async ({ page }) => {
    const api = {}
    await mockWorker(page, api)
    await seedCloud(page, 'you', { exercises: LEAGUE.exercises, program: LEAGUE.program(), settings: LEAGUE.settings({ username: '' }) })

    await expect(page.locator('#cloud-card')).toContainText('Crea tu usuario y contraseña')
    await page.locator('#cloud-card-create').click()
    await expect(page.locator('#account-username')).toBeVisible()
    await page.locator('#account-username').fill('Nuevo')
    await page.locator('#account-email').fill('nuevo@mail.com')
    await page.locator('#account-password').fill('secreta123')
    await page.locator('#account-submit').click()
    await expect(page.locator('#cloud-verified')).toContainText('Tu cuenta está lista')
    expect(api.calls.find((c) => c.path.endsWith('/api/account/create')).body.username).toBe('Nuevo')

    await page.reload()
    await gotoFriendsLoaded(page)
    await expect(page.locator('#username-prompt')).toHaveCount(0)
    await expect(page.locator('[data-component="WeekCard"]')).toBeVisible()
    expect(api.listUsers.at(-1)).toBe('Nuevo')
  })
})

test.describe('Nube — mi usuario ya tiene contraseña', () => {
  test('la tarjeta dice «Ya tienes cuenta», inicia sesión con mi usuario y la fila queda verificada', async ({ page }) => {
    const api = { protectedUsers: ['TestUser'] }
    await mockWorker(page, api)
    await seedCloud(page, 'you', { exercises: LEAGUE.exercises, program: LEAGUE.program(), settings: LEAGUE.settings() })

    await expect(page.locator('#cloud-card')).toContainText('Ya tienes cuenta')
    await expect(page.locator('#cloud-card-create')).toHaveCount(0)
    await page.locator('#cloud-card-login').click()
    await expect(page.locator('#account-sheet')).toBeVisible()
    await expect(page.locator('#account-username')).toHaveValue('TestUser')
    await page.locator('#account-password').fill('secreta123')
    await page.locator('#account-submit').click()
    await expect(page).toHaveURL(/\/today$/)

    await nav(page, 'you')
    await expect(page.locator('#cloud-card')).toHaveCount(0)
    await expect(page.locator('#you-row-cuenta')).toContainText('Verificado')
  })
})

test.describe('Nube — sube al terminar los ejercicios, sin estirar', () => {
  test('los minutos, la liga y la copia van al terminar los ejercicios; estirar sube otra vez', async ({ page }) => {
    await page.clock.install()
    const api = {}
    await mockWorker(page, api)
    await seedCloud(page, 'today', {
      exercises: [V2.bench, V2.military], program: V2.program(),
      settings: V2.settings({ onboarded: true, username: 'TestUser', sessionState: V2.session({ phase: 2 }) }),
    }, CLOUD.account)
    const training = page.locator('[data-phase="training"]')
    const rows = training.locator(SEL.exerciseRow)

    // One exercise is not the end: nothing goes up
    await rows.first().click()
    await page.getByRole('button', { name: 'Más peso' }).first().click()
    await page.getByRole('button', { name: /^Registrar \d/ }).click()
    await expect(page.getByText('Registrado hoy')).toBeVisible()
    await page.clock.fastForward('02:00')
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    expect(api.uploads).toHaveLength(0)

    if (await rows.count() === 0) await training.locator(SEL.phaseToggle).click()
    await rows.nth(1).click()
    await page.getByRole('button', { name: 'Más peso' }).first().click()
    await page.getByRole('button', { name: /^Registrar \d/ }).click()
    await expect(page.getByText('Registrado hoy')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })).toBeVisible()

    // Before stretching: league synced with today's minutes, copy uploaded
    await expect.poll(() => api.uploads.length).toBe(1)
    await expect.poll(() => syncsWithGymTime(api).length).toBeGreaterThan(0)
    const todayLogs = (await readLogs(page)).filter((l) => l.date === localDate(0))
    expect(todayLogs).toHaveLength(2)
    const keys = CLOUD.uploadKeys(api)
    for (const l of todayLogs) expect(keys).toContain(`exerciseLogs:${l.id}`)
    const gym = api.uploads[0].body.upserts.find((r) => r.store === 'gymSessions' && r.id === localDate(0))
    expect(gym.data.seconds).toBeGreaterThan(0)

    await nav(page, 'you')
    await expect(page.locator('#you-row-cuenta')).toContainText('Guardado hoy')

    // Back to Hoy: the toast may show again, but nothing goes up again
    await nav(page, 'today')
    await todayDock(page).getByRole('button', { name: 'Terminar entrenamiento' }).click()
    await todayDock(page).getByRole('button', { name: /Empezar estiramiento/ }).click()
    expect(api.uploads).toHaveLength(1)
    await goToLastMove(page)
    await logDock(page).getByRole('button', { name: 'Terminar estiramiento' }).click()
    await expect.poll(() => api.uploads.length).toBe(2)
  })
})

test.describe('Nube — sin cuenta, los minutos se guardan igual sin estirar', () => {
  test('la liga recibe los minutos al terminar los ejercicios, sin tocar la nube', async ({ page }) => {
    await page.clock.install()
    const api = {}
    await mockWorker(page, api)
    await seedCloud(page, 'today', {
      exercises: [V2.bench, V2.military], program: V2.program(),
      settings: V2.settings({ onboarded: true, username: 'TestUser', sessionState: V2.session({ phase: 2 }) }),
    })

    await registerBothExercises(page)
    await expect(page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })).toBeVisible()
    await expect.poll(() => syncsWithGymTime(api).length).toBeGreaterThan(0)
    expect(api.calls.filter((c) => c.path.includes('/api/cloud/') || c.path.includes('/api/account/'))).toHaveLength(0)
    expect(api.downloads).toHaveLength(0)

    await gotoFriendsLoaded(page)
    await expect(page.locator('[data-component="WeekCard"] .minutes b')).not.toHaveText('0')
  })
})

test.describe('Nube — iniciar sesión en un teléfono nuevo', () => {
  test('«Ya tengo cuenta» baja la copia, conserva lo del teléfono y abre Hoy', async ({ page }) => {
    const program = V2.program()
    const logs = [V2.log('ex-bench', 3, 50), V2.log('ex-military', 3, 30), V2.log('ex-bench', 10, 47.5)]
    const cloudSettings = V2.settings({
      activeProgramId: 'prog-v2', username: 'TestUser', onboarded: true, onboardingStep: -1, pushSubscribed: true,
      sessionState: V2.session({ date: localDate(5), phase: 3 }),
    })
    const rec = (store, data) => ({ store, id: String(data.id), data })
    const api = {
      cloudPages: [
        [rec('exerciseLogs', logs[0]), rec('exerciseLogs', logs[1]), rec('exerciseLogs', logs[2]), rec('exercises', V2.bench), rec('exercises', V2.military)],
        [rec('gymSessions', CLOUD.gymSession), rec('programs', program), rec('settings', cloudSettings)],
      ],
    }
    await mockWorker(page, api)
    // A fresh context is a phone with nothing: no IndexedDB, no account
    await page.goto('you')
    await expect(page.locator('#you-first-time')).toBeVisible()
    await expect(page.locator('#you-first-time')).toContainText('Hola.')

    await page.locator('#you-row-login').click()
    await expect(page.locator('#account-username')).toBeVisible()
    await page.locator('#account-forgot').click()
    await expect(page.getByText('Escríbele a Pedro para restablecerla.')).toBeVisible()

    await page.locator('#account-username').fill('TestUser')
    await page.locator('#account-password').fill('secreta000')
    await page.locator('#account-submit').click()
    await expect(page.getByText('Usuario o contraseña incorrectos')).toBeVisible()

    await page.locator('#account-password').fill('secreta123')
    await page.locator('#account-submit').click()
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.locator(SEL.pageTitle)).toHaveText('Empuje.')
    expect(api.downloads).toEqual([0, 1])

    expect(await readLogs(page)).toHaveLength(3)
    const s = await storedSettings(page)
    expect(s.username).toBe('TestUser')
    expect(s.activeProgramId).toBe('prog-v2')
    expect(s.pushSubscribed).toBe(false)
    // The cloud's old session (5 days ago) never lands; Hoy may start today's own
    expect(s.sessionState?.date ?? null).not.toBe(localDate(5))

    await nav(page, 'history')
    await expect(page.locator('body')).toContainText('Press de Banca')
    await nav(page, 'you')
    await expect(page.locator('#you-row-cuenta')).toBeVisible()
    await expect(page.locator('#cloud-card')).toHaveCount(0)
  })
})

test.describe('Nube — usuario protegido en Amigos', () => {
  test('escribir un usuario protegido pide iniciar sesión, y renombrarlo manda el token', async ({ page }) => {
    const api = { protectedUsers: ['Ana'], friends: [] }
    await mockWorker(page, api)
    await gotoFriendsLoaded(page)
    await seedIndexedDB(page, { exercises: LEAGUE.exercises, program: LEAGUE.program(), settings: LEAGUE.settings({ username: '' }) })
    await page.reload()
    await expect(page.locator('#username-prompt')).toBeVisible()

    await page.locator('#username-input').fill('Ana')
    await page.locator('#username-btn').click()
    await expect(page.getByText('Ese usuario está protegido')).toBeVisible()
    await expect(page.locator('#account-sheet')).toBeVisible()
    await expect(page.locator('#account-username')).toHaveValue('Ana')
    expect(api.calls.filter((c) => c.path.endsWith('/api/user/register'))).toHaveLength(0)
    expect((await storedSettings(page)).username || '').toBe('')

    // Signing in as Ana gives the name back
    await page.locator('#account-password').fill('secreta123')
    await page.locator('#account-submit').click()
    await expect(page).toHaveURL(/\/today$/)
    await gotoFriendsLoaded(page)
    await page.getByRole('button', { name: 'Mi perfil' }).click()
    const profile = page.locator('[data-component="ProfileSheet"]')
    await expect(profile.locator('.who-name')).toHaveText('Ana')

    // The rename pencil is hidden for now (see «mi perfil y renombrar»)
    await profile.locator('button.edit').evaluate((el) => { el.hidden = false })
    await page.getByRole('button', { name: 'Editar usuario' }).click()
    await page.locator('#rename-input').fill('Anita')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.locator('#backup-toast')).toContainText('Usuario actualizado')
    const rename = api.calls.filter((c) => c.path.endsWith('/api/user/rename')).at(-1)
    expect(rename.body).toEqual({ username: 'Ana', newUsername: 'Anita' })
    expect(rename.auth).toBe('Bearer tok-test')
  })
})

test.describe('Nube — sin conexión al terminar', () => {
  test('queda «Pendiente de subir» y sube al volver a abrir la app', async ({ page }) => {
    await page.clock.install()
    const api = { uploadAbort: true }
    await mockWorker(page, api)
    await seedCloud(page, 'today', {
      exercises: [V2.bench, V2.military], program: V2.program(),
      settings: V2.settings({ onboarded: true, username: 'TestUser', sessionState: V2.session({ phase: 2 }) }),
    }, CLOUD.account)

    await registerBothExercises(page)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('cloud-upload') || '{}').pending)).toBe(true)
    await nav(page, 'you')
    await expect(page.locator('#you-row-cuenta')).toContainText('Pendiente de subir')
    expect(api.uploads).toHaveLength(0)

    api.uploadAbort = false
    await page.reload()
    await waitForApp(page)
    await expect.poll(() => api.uploads.length).toBeGreaterThan(0)
    const todayLogs = (await readLogs(page)).filter((l) => l.date === localDate(0))
    const keys = CLOUD.uploadKeys(api)
    for (const l of todayLogs) expect(keys).toContain(`exerciseLogs:${l.id}`)
    await expect(page.locator('#you-row-cuenta')).toContainText('Guardado hoy')
  })
})

test.describe('Nube — cuenta borrada por Pedro', () => {
  test('la subida da 401: la app olvida la cuenta y vuelve la tarjeta', async ({ page }) => {
    await page.clock.install()
    const api = { uploadStatus: 401 }
    await mockWorker(page, api)
    await seedCloud(page, 'today', {
      exercises: [V2.bench, V2.military], program: V2.program(),
      settings: V2.settings({ onboarded: true, username: 'TestUser', sessionState: V2.session({ phase: 2 }) }),
    }, CLOUD.account)

    await registerBothExercises(page)
    await expect.poll(() => api.uploads.length).toBe(1)
    await nav(page, 'you')
    await expect(page.locator('#cloud-card')).toBeVisible()
    await expect(page.locator('#you-row-cuenta')).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('cloud-account'))).toBeNull()
  })
})

// ═══════════════════ Hoy v2 / Detalle v2 (spec 2026-10-15) ═══════════════════
// Base data of the spec: day «Empuje» (Press Banca Chest 4 × 8-10 / 120 s,
// Press Militar Shoulders 3 × 10-12 / 90 s), week «Semana 1» · «Volumen» ·
// BUILD, no Watch. Each scenario seeds once and then drives the real UI.

const V2 = {
  bench: { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
  military: { id: 'ex-military', name: 'Press Militar', muscle: 'Shoulders', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
  program(day = {}) {
    return {
      id: 'prog-v2', name: 'Programa v2',
      weeks: [{
        name: 'Semana 1', subtitle: 'Volumen', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: '', duration: 60,
          exercises: [
            { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
            { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
          ],
          ...day,
        }),
      }],
    }
  },
  settings(over = {}) {
    return {
      id: 'settings', activeProgramId: 'prog-v2', currentWeekIdx: 0, units: 'kg',
      accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
      sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
      ...over,
    }
  },
  log(exerciseId, daysAgo, weight, extra = {}) {
    return { id: `log-${exerciseId}-${daysAgo}`, exerciseId, date: localDate(daysAgo), weight, units: 'kg', ...extra }
  },
  session(over = {}) {
    return { date: localDate(0), phase: 1, todayExDone: 0, ...over }
  },
}

async function seedV2(page, data = {}, route = 'today') {
  await page.goto(route)
  await seedIndexedDB(page, {
    exercises: [V2.bench, V2.military],
    program: V2.program(),
    settings: V2.settings(),
    ...data,
  })
  await page.reload()
  await waitForApp(page)
}

// Apart from the flow: comparing the two sheets needs one-line names on both
// (a short exercise, the generic «Oruga» warmup); the flow's names are long.
test.describe('Hoy v2 — comparativa Detalle / Calentamiento', () => {
  test('position, media, arrows, name and main button line up in both sheets', async ({ page }) => {
    // Short names on both sides so each title takes one line.
    const short = { id: 'ex-short', name: 'Mi ejercicio', muscle: 'Quadriceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }
    await seedV2(page, {
      exercises: [short],
      program: V2.program({ exercises: [{ exerciseId: 'ex-short', sets: 3, reps: '10', rest: 60 }] }),
      settings: V2.settings({ sessionState: V2.session({ phase: 2 }) }),
    })

    const measure = async () => {
      const y = async (sel) => (await page.locator(sel).first().boundingBox()).y
      return {
        position: await y('[data-component="DetailSheetHead"] .dsh-pos'),
        media: await y('[data-component="ExerciseMedia"]'),
        arrows: await y(SEL.detailNav),
        name: await y(SEL.detailName),
        main: await y('[data-component="LogDock"] [data-component="Button"] >> nth=-1'),
      }
    }

    await page.locator(`[data-phase="training"] ${SEL.exerciseRow}`).first().click()
    await expect(page.locator(SEL.detailName)).toHaveText('Mi ejercicio')
    const detail = await measure()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    // «Oruga» (generic warmup) is the short one.
    await page.locator(`[data-phase="warmup"] ${SEL.phaseToggle}`).click()
    await page.locator(`[data-phase="warmup"] ${SEL.exerciseRow}`, { hasText: 'Oruga' }).click()
    await expect(page.locator(SEL.detailName)).toHaveText('Oruga')
    const warmup = await measure()

    for (const key of Object.keys(detail)) {
      expect(Math.abs(detail[key] - warmup[key]), key).toBeLessThanOrEqual(2)
    }
    // Added 2026-10-15 (Pedro, «v2 · 12 Comparativa»): muscle + arrows on top,
    // the name below at full width — in both sheets.
    for (const m of [detail, warmup]) expect(m.arrows).toBeLessThan(m.name)
  })
})

// Apart from the flow: part of what Plan and Historial show depends on the
// weekday, and the flow runs on whatever day it's run (on a Sunday it never
// saw «Me salté un día» move anything). Here the page clock is fixed on a
// Wednesday and on a Sunday, so both sides are checked on every run.
test.describe('Fechas fijas — Plan e Historial según el día', () => {
  test('miércoles: la semana se corre y queda el viernes; domingo: nada que correr ni entrenos por delante', async ({ browser }) => {
    const { baseURL, viewport, reducedMotion } = test.info().project.use
    const workout = (name) => ({
      name, subtitle: '', duration: 60,
      exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }, { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 }],
    })
    const week = (days) => Array.from({ length: 7 }, (_, i) => days[i] || { name: 'Descanso', subtitle: '', duration: 0, exercises: [] })
    const CASES = [
      // Empuje today, Tirón on Friday; the next workout after Friday is next Wednesday
      { label: 'miércoles', date: '2026-11-11', t: 2, days: { 2: workout('Empuje'), 4: workout('Tirón') }, ahead: ['2026-11-13', 'Tirón'] },
      // Tirón on Wednesday (missed), Empuje today: nothing left after today, and
      // the week isn't complete; the next one is next Wednesday
      { label: 'domingo', date: '2026-11-15', t: 6, days: { 2: workout('Tirón'), 6: workout('Empuje') }, ahead: ['2026-11-18', 'Tirón'] },
    ]
    for (const c of CASES) {
      await test.step(c.label, async () => {
        const context = await browser.newContext({ baseURL, viewport, reducedMotion })
        await blockExternalImages(context)
        const page = await context.newPage()
        try {
          const [y, m, d] = c.date.split('-').map(Number)
          await page.clock.install({ time: new Date(y, m - 1, d, 12) })
          await mockWorker(page, {})
          const program = { id: 'prog-fijo', name: 'Programa fijo', weeks: [{ name: 'Semana 1', subtitle: '', tag: '', days: week(c.days) }] }
          const seed = (logs) => seedIndexedDB(page, {
            exercises: [V2.bench, V2.military], program, exerciseLogs: logs,
            settings: V2.settings({ activeProgramId: 'prog-fijo', onboarded: true }),
          })
          await page.goto('plan')
          await seed([])
          await page.reload()
          await expect(planDay(page, c.t).locator(SEL.dayTitle)).toHaveText('Empuje')

          // «Me salté un día»
          const grid = page.locator('#plan-days-grid')
          await page.locator('#plan-reprogram-btn').click()
          if (c.t === 2) {
            await expect(page.locator('#plan-shift-btn')).toContainText('Hoy Empuje pasa al jueves')
            await page.locator('#plan-shift-btn').click()
            await expect(grid.locator('[data-state="moved"]', { hasText: 'Empuje' })).toContainText('Se movió del miércoles')
            await expect(grid.locator('[data-state="moved"]', { hasText: 'Tirón' })).toContainText('Se movió del viernes')
            const shiftToast = page.locator('#plan-shift-toast')
            await expect(shiftToast).toContainText('Listo. Tu semana se corrió un día.')
            await shiftToast.getByRole('button', { name: 'Restablecer' }).click()
            await expect(grid.locator('[data-state="moved"]')).toHaveCount(0)
          } else {
            await expect(page.locator('#plan-shift-btn')).not.toContainText('pasa al')
            await page.locator('#plan-shift-btn').click()
            await expect(page.locator('#backup-toast')).toContainText('No quedan días por correr esta semana')
            await expect(grid.locator('[data-state="moved"]')).toHaveCount(0)
          }

          // Today trained: the dock says what comes next this week, or that nothing does
          await seed([{ id: 'log-hoy', exerciseId: 'ex-bench', date: c.date, weight: 80, units: 'kg' }])
          await page.reload()
          await expect(planDay(page, c.t)).toHaveAttribute('data-state', 'done')
          await expect(todayDock(page)).toContainText(c.t === 2 ? /Viernes: Tirón · \d+ min/ : 'No quedan entrenos esta semana')

          // Historial: the next workout ahead, dimmed, with what it has
          await nav(page, 'history')
          const cal = page.locator('[data-component="MonthCalendar"]')
          const panel = page.locator('[data-component="HistoryDayPanel"]')
          const [aheadDate, aheadName] = c.ahead
          const cell = cal.getByRole('button', { name: String(Number(aheadDate.slice(8))), exact: true })
          await expect(cell).toHaveAttribute('data-state', 'future')
          await cell.click()
          await expect(panel).toContainText(aheadName)
          await expect(panel.getByText('Lo que toca', { exact: true })).toBeVisible()
          await expect(panel.locator(SEL.exerciseRow)).toHaveCount(2)
          await expect(page.getByRole('button', { name: /Marcar como hecho/ })).toHaveCount(0)
        } finally {
          await context.close()
        }
      })
    }
  })
})

// Apart from the flow: the flow trains Fondos through an alternative and sees
// the day done, but it can't reach the next time that day comes. Here the
// page clock is fixed on a Wednesday, then moved to the next one.
test.describe('Alternativa solo por hoy', () => {
  test('la alternativa cuenta el día como hecho, y la semana siguiente vuelve el ejercicio del programa', async ({ page }) => {
    await page.clock.install({ time: new Date(2026, 10, 11, 12) })
    await mockWorker(page, {})
    const empuje = { name: 'Empuje', subtitle: '', duration: 60, exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }] }
    const days = Array.from({ length: 7 }, (_, i) => i === 2 ? empuje : { name: 'Descanso', subtitle: '', duration: 0, exercises: [] })
    await page.goto('today')
    await seedIndexedDB(page, {
      // An alternative of its own, or the detail has no Alternativas tab
      exercises: [{ ...V2.bench, alternatives: [{ name: 'Press Inclinado' }] }],
      program: { ...V2.program(), weeks: [{ name: 'Semana 1', subtitle: '', tag: '', days }] },
      settings: V2.settings({ onboarded: true, sessionState: { date: '2026-11-11', phase: 2, todayExDone: 0 } }),
    })
    await page.reload()
    await waitForApp(page)
    const training = page.locator('[data-phase="training"]')
    const rows = training.locator(SEL.exerciseRow)
    const detail = page.locator('[data-component="ExerciseDetail"]')

    // Press Banca swapped for one found in the dictionary, and registered
    await rows.first().click()
    await segTab(detail, 'Alternativas').click()
    await logDock(page).locator('input').fill('sentadilla hack')
    await page.locator('[data-component="AlternativesTab"]').locator(SEL.exerciseRow).first().click()
    await expect(page.locator(SEL.detailName)).toContainText('Sentadilla Hack')
    await page.locator('input[inputmode="decimal"]').first().fill('60')
    await logDock(page).getByRole('button', { name: 'Registrar 60 kg' }).click()
    await expect(page.getByText('Registrado hoy')).toBeVisible()
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(detail).toHaveCount(0)

    // Today the slot is the alternative, done, and so is the whole training
    await expect(training).toContainText('1 de 1 hechos')
    if (await rows.count() === 0) await training.locator(SEL.phaseToggle).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Sentadilla Hack')
    await expect(rows.first()).toHaveAttribute('data-done', 'true')

    // Next Wednesday: Press Banca again, nothing done
    await page.clock.setSystemTime(new Date(2026, 10, 18, 12))
    await page.reload()
    await waitForApp(page)
    await expect(page.locator(SEL.pageTitle)).toHaveText('Empuje.')
    if (await rows.count() === 0) await training.locator(SEL.phaseToggle).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Press de Banca con Barra')
    await expect(rows.first()).not.toContainText('Sentadilla Hack')
    await expect(rows.first()).toHaveAttribute('data-done', 'false')
  })
})

// ═══════════════════════════════ IA ═══════════════════════════════
// Apart from the flow (Pedro, 2026-10-30): the flow builds its program by hand
// with its own exercises; everything that talks to the AI lives here, each
// test with its answers mocked and the bodies it sends checked.

const AI_PROFILE = { userName: 'Pedro', height: '180', weight: '80', sex: 'male', age: '28', goal: 'hypertrophy', experience: 'intermediate', occupation: 'Ingeniero', onboarded: true }

// Moved from the flow's «Tú — Programas»: the three ways the coach
// makes a program, with the same promises.
test.describe('IA — programas con el coach', () => {
  test('platicarlo, pegar la rutina y mejorarla: cada uno manda la conversación completa y deja su programa activo', async ({ page }) => {
    await mockWorker(page, {})
    await seedV2(page, { settings: V2.settings(AI_PROFILE) }, 'you')
    const activeCard = page.locator('[data-component="ProgramCard"].active')

    // ── Platícalo con el coach: the coach proposes first (kickoff hidden), it's
    // discussed, and «Crear este programa» sends the whole conversation ──
    // One matcher per endpoint: each part below unroutes the one before it
    // first, so only its own answers are in place (they used to pile up)
    const isChat = (url) => url.href.includes('/api/ai/program-chat')
    const isGenerate = (url) => url.href.includes('/api/ai/generate-program')
    const chatBodies = []
    let createBody = null
    await page.route(isChat, async (route) => {
      chatBodies.push(route.request().postDataJSON())
      const reply = chatBodies.length === 1
        ? 'Propuesta: por tu trabajo de oficina deberíamos priorizar espalda alta.'
        : 'Va, bajamos piernas a 1 día.'
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply, _provider: 'test' }) })
    })
    // Two passes: the coach writes a draft, then reviews it (redundant same-muscle work) and that one is saved
    let reviewBody = null
    await page.route(isGenerate, async (route) => {
      const body = route.request().postDataJSON()
      if (createBody) reviewBody = body
      else createBody = body
      const days = reviewBody
        ? [{ name: 'Espalda', weekday: 1, subtitle: '', exercises: [{ exercise_name: 'Peso Muerto', muscle: 'Back', sets: 4, reps: '8-12', rest_sec: 90 }] }]
        : [{ name: 'Espalda', weekday: 1, subtitle: '', exercises: [{ exercise_name: 'Peso Muerto', muscle: 'Back', sets: 4, reps: '8-12', rest_sec: 90 }, { exercise_name: 'Rack Pull', muscle: 'Back', sets: 4, reps: '8', rest_sec: 90 }] }]
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ program_name: reviewBody ? 'Upper/Lower Acordado' : 'Borrador', weeks: [{ name: 'Semana 1', tag: '', days }], _provider: 'test' }),
      })
    })
    await page.locator('#you-row-programas').click()
    await page.locator('#create-program-btn').click()
    const createSheet = page.locator('#create-program-sheet')
    await expect(createSheet).toContainText('Platícalo con el coach')
    await expect(createSheet).toContainText('Pega tu rutina')
    await page.locator('#create-coach').click()
    const setup = page.locator('#coach-setup-sheet')
    await setup.getByRole('button', { name: '4', exact: true }).click()
    await setup.getByRole('button', { name: 'Rodilla' }).click()
    await setup.getByRole('button', { name: 'Platicar con el coach' }).click()
    const chat = page.locator('[data-component="CoachChat"]')
    await expect(chat).toContainText('Con el coach')
    await expect(chat).toContainText('4 días')
    await expect(chat).toContainText('Cuidar rodilla')
    await expect(chat).toContainText('Propuesta: por tu trabajo de oficina')
    await expect(chat).not.toContainText('dame tu propuesta inicial')
    expect(chatBodies[0].messages).toHaveLength(1)
    expect(chatBodies[0].systemPrompt).toContain('PERFIL DEL USUARIO')
    expect(chatBodies[0].systemPrompt).toContain('Ingeniero')
    expect(chatBodies[0].systemPrompt).toContain('"daysPerWeek":4')
    expect(chatBodies[0].systemPrompt).toContain('Rodilla')
    await chat.locator('textarea').fill('Prefiero menos pierna')
    await chat.locator('textarea').press('Enter')
    await expect(chat).toContainText('Va, bajamos piernas a 1 día.')
    await chat.getByRole('button', { name: 'Crear este programa' }).click()
    await expect(chat).not.toBeVisible({ timeout: 10000 })
    expect(createBody.messages.map(m => m.content)).toEqual([
      chatBodies[0].messages[0].content,
      'Propuesta: por tu trabajo de oficina deberíamos priorizar espalda alta.',
      'Prefiero menos pierna',
      'Va, bajamos piernas a 1 día.',
      'Crea el programa completo con el enfoque que acordamos en esta conversación.',
    ])
    expect(createBody.systemPrompt).toContain('"daysPerWeek":4')
    // The review keeps the same coach persona and conversation, and gets the draft
    expect(reviewBody.systemPrompt).toContain('Act as an Elite Personal Trainer')
    expect(reviewBody.systemPrompt).toContain('REVISOR')
    expect(reviewBody.systemPrompt).toContain('"daysPerWeek":4')
    expect(reviewBody.messages.slice(0, 4).map(m => m.content)).toEqual(createBody.messages.slice(0, 4).map(m => m.content))
    expect(reviewBody.messages[4].content).toContain('BORRADOR:')
    expect(reviewBody.messages[4].content).toContain('Rack Pull')
    const ready = page.locator('[data-component="ProgramReady"]')
    await expect(ready).toContainText('Listo, Pedro.')
    await expect(ready).toContainText('«Upper/Lower Acordado» ya es tu programa activo.')
    await ready.getByRole('button', { name: 'Ver programa' }).click()
    await expect(activeCard).toContainText('Upper/Lower Acordado')
    const saved = await storedProgram(page, 'Upper/Lower Acordado')
    expect(saved.weeks[0].days[0].exercises).toHaveLength(1)
    expect(saved.weeks[0].days[0].weekday).toBe(1)

    // ── Pega tu rutina: a chat reads it back, «Crear este programa» creates it ──
    const pasteBodies = []
    await page.unroute(isChat)
    await page.unroute(isGenerate)
    await page.route(isChat, async (route) => {
      pasteBodies.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Entendí 1 día: Lunes · Press Banca 4 × 8.', _provider: 'test' }) })
    })
    await page.route(isGenerate, (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        program_name: 'Programa IA',
        weeks: [{ name: 'Semana 1', subtitle: '', tag: 'VOLUMEN', days: [{ name: 'Pecho', subtitle: '', weekday: 1, exercises: [{ exercise_name: 'Press Banca', muscle: 'Chest', sets: 4, reps: '8', rest_sec: 120 }] }] }],
      }),
    }))
    await page.locator('#create-program-btn').click()
    await page.locator('#create-paste').click()
    const paste = page.locator('#paste-routine-sheet')
    await paste.getByRole('button', { name: 'Escribirla aquí' }).click()
    await paste.getByRole('textbox', { name: 'Tu rutina' }).fill('Lunes: Press banca 4x8')
    await paste.getByRole('button', { name: 'Ver cómo queda' }).click()
    await expect(chat).toContainText('Tu rutina · 1 línea')
    await expect(chat).toContainText('Entendí 1 día')
    expect(pasteBodies[0].messages[0].content).toBe('Lunes: Press banca 4x8')
    await chat.getByRole('button', { name: 'Crear este programa' }).click()
    await expect(ready).toContainText('«Programa IA» ya es tu programa activo.', { timeout: 5000 })
    await ready.getByRole('button', { name: 'Ver programa' }).click()
    await expect(activeCard).toContainText('Programa IA')
    const iaId = await activeCard.getAttribute('data-program-id')

    // ── Mejorar con el coach: two turns carry the whole thread and the
    // program; «Crear versión nueva» makes «Programa IA · v2» the active one ──
    const improveBodies = []
    let applyBody = null
    await page.unroute(isChat)
    await page.unroute(isGenerate)
    await page.route(isChat, async (route) => {
      improveBodies.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: `Respuesta del coach ${improveBodies.length}`, _provider: 'test' }) })
    })
    await page.route((url) => url.href.includes('/api/ai/program-coach'), async (route) => {
      applyBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          program: { program_name: 'Programa Acordado', weeks: [{ name: 'Semana 1', tag: '', days: [{ name: 'Pecho', subtitle: '', duration_min: 60, exercises: [{ exercise_name: 'Press Banca', muscle: 'Chest', sets: 4, reps: '8', rest_sec: 120 }] }] }] },
          _provider: 'test',
        }),
      })
    })
    // The review pass fails here: the version is still created from the draft
    let improveReviews = 0
    await page.route(isGenerate, (route) => {
      improveReviews++
      return route.fulfill({ status: 502, contentType: 'application/json', body: JSON.stringify({ error: 'La IA no generó JSON válido.' }) })
    })
    await page.locator('#improve-program-row').click()
    await expect(chat).toContainText('Mejorar con el coach')
    await expect(chat).toContainText('Qué onda, Pedro.')
    await expect(chat).toContainText('«Programa IA»')
    await expect(chat.getByRole('button', { name: 'Tengo menos tiempo' })).toBeVisible()
    const applyBtn = chat.getByRole('button', { name: 'Crear versión nueva' })
    await expect(applyBtn).toBeDisabled()
    await chat.locator('textarea').fill('¿Está balanceada mi rutina?')
    await chat.locator('textarea').press('Enter')
    await expect(chat).toContainText('Respuesta del coach 1')
    await chat.locator('textarea').fill('Agrega más pecho')
    await chat.locator('textarea').press('Enter')
    await expect(chat).toContainText('Respuesta del coach 2')
    expect(improveBodies[1].messages.map(m => m.content)).toEqual(['¿Está balanceada mi rutina?', 'Respuesta del coach 1', 'Agrega más pecho'])
    expect(improveBodies[1].systemPrompt).toContain('PROGRAMA ACTUAL:')
    expect(improveBodies[1].systemPrompt).toContain('Programa IA')
    await expect(applyBtn).toBeEnabled()
    await applyBtn.click()
    const versionSheet = page.locator('#new-version-sheet')
    await expect(versionSheet.getByLabel('Nombre')).toHaveValue('Programa IA · v2')
    await expect(versionSheet.getByRole('switch', { name: 'Usarla desde hoy' })).toHaveAttribute('aria-checked', 'true')
    await versionSheet.getByRole('button', { name: 'Crear versión' }).click()
    await expect(chat).not.toBeVisible({ timeout: 10000 })
    expect(applyBody.messages).toHaveLength(5)
    expect(applyBody.messages[4].content).toContain('Aplica los cambios que acordamos')
    expect(improveReviews).toBe(1)
    await expect(page.locator('body')).toContainText('Versión nueva activa. La anterior sigue abajo.')
    await expect(activeCard).toContainText('Programa IA · v2')
    // The original stays untouched, in «Otros programas»
    await expect(page.locator(`[data-component="ProgramCard"][data-program-id="${iaId}"]:not(.active)`)).toBeVisible()
    // Reopening starts from scratch
    await page.locator('#improve-program-row').click()
    await expect(chat).toBeVisible()
    await expect(chat).not.toContainText('Respuesta del coach')
    await chat.getByRole('button', { name: 'Volver' }).click()
    await expect(chat).not.toBeVisible()
  })
})

// Moved from the flow's «Plan — Exercise Detail» (the coach in the detail) and
// «Hoy — Racha, esfuerzo y resumen» (the coach's analysis of the session).
test.describe('IA — coach del ejercicio y análisis', () => {
  test('preguntas rápidas en el detalle, y el resumen muestra la respuesta real del coach', async ({ page }) => {
    const api = {
      analysis: {
        analysis: 'Sesión sólida, buen control.', verdict: 'positive',
        proximo_objetivo: 'Press Banca → 87.5 kg', recommendations: ['Baja más lento en el Militar'],
        total_volume: 4200, pr_count: 1, _provider: 'test',
      },
    }
    await mockWorker(page, api)
    // Today trained and finished (phase 5): the summary is up, without the coach yet
    const now = Date.now()
    await seedV2(page, {
      exerciseLogs: [V2.log('ex-bench', 0, 80), V2.log('ex-military', 0, 40)],
      settings: V2.settings({ ...AI_PROFILE, sessionState: V2.session({ phase: 5, startedAt: now - 40 * 60000, endedAt: now }) }),
    }, 'plan')

    // The coach in the detail: quick questions on screen, body parts for pain
    await openFromPlan(page, 'Banca')
    await page.getByRole('button', { name: /Pregúntale al coach/ }).click()
    const chat = page.locator('[data-component="CoachChat"]')
    await expect(chat).toContainText('Hola. Soy tu coach')
    await expect(chat).toContainText('Preguntas rápidas')
    for (const q of ['Mejorar técnica', 'Me duele algo', '¿Voy muy pesado?', 'Dame una variante']) {
      await expect(chat.getByRole('button', { name: q })).toBeInViewport({ ratio: 1 })
    }
    await chat.getByRole('button', { name: 'Me duele algo' }).click()
    await expect(chat).toContainText('¿Dónde lo sientes?')
    await expect(chat.getByRole('button', { name: 'Codo' })).toBeVisible()
    await expect(chat.getByRole('button', { name: 'Cancelar' })).toBeVisible()
    await chat.getByRole('button', { name: 'Volver' }).click()
    await expect(chat).toHaveCount(0)
    await page.getByRole('button', { name: 'Cerrar' }).first().click()

    // «Pedir análisis al coach» asks the effort first, then calls /api/ai/coach
    await nav(page, 'today')
    const effort = page.locator('#effort-overlay')
    const coachCalls = api.calls.length
    await page.getByRole('button', { name: 'Pedir análisis al coach' }).click()
    await expect(effort).toBeVisible()
    await effort.locator('[data-effort="Justo"]').click()

    // The summary shows the REAL /api/ai/coach answer (mocked here), not a canned line
    const summary = page.locator('[data-component="SessionSummary"]')
    const checkSummary = async () => {
      await expect(summary).toContainText('Tu coach', { timeout: 10000 })
      await expect(summary).toContainText(api.analysis.analysis)
      await expect(summary).toContainText('Para la próxima')
      await expect(summary).toContainText(api.analysis.proximo_objetivo)
      await expect(summary).toContainText(api.analysis.recommendations[0])
      await expect(summary.locator('[data-component="StatBlock"]')).toHaveCount(3)
      await expect(summary.locator('[data-component="StatBlock"]', { hasText: 'duración' })).toContainText(/\d+\s*min/)
      await expect(summary.getByRole('button', { name: /Reiniciar día/ })).toBeVisible()
      await expect(page.locator('body')).not.toContainText('WORKOUT_ANALYSIS')
    }
    await checkSummary()
    expect(api.calls.slice(coachCalls).some(c => c.path.includes('/api/ai/coach'))).toBe(true)
    // It survives closing and reopening the app
    await page.reload()
    await checkSummary()
  })
})

