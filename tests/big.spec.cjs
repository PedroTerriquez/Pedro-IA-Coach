// GUARDRAIL: If you're removing/modifying steps below, STOP.
// This is the single source of truth for behavioral/E2E coverage of the app —
// all behavior tests live here, against the real SvelteKit app (real routes,
// real components, no hash-routing or window-exposed test hooks left over
// from the pre-migration vanilla-JS app). Don't add new top-level test files
// for app behavior; add a step to the main flow below, or a new `test()`
// inside a `test.describe()` block in this same file.
// Removing any step WILL break the guardrail assertion below.
// Add new steps after step 15, or add your scenario as a SEPARATE test.
// If you truly must remove a step, update the EXPECTED_STEPS array.

const EXPECTED_STEPS = [
  'Step 1: Verify Profile',
  'Step 2: Ejercicios Tab Hydration',
  'Step 3: Visit Today — Phase Cards',
  'Step 4: Warmup — Navigate Prev/Next, Mark Done',
  'Step 5: Plan — Switch Week',
  'Step 6: Back to Today — Training Card',
  'Step 7: Coach IA FAB',
  'Step 8: Log Weights for Both Exercises',
  'Step 9: Streak Celebration',
  'Step 10: Effort Modal + Coach Card',
  'Step 11: History Verification',
  'Step 12: Friends',
  'Step 13: Language Toggle',
  'Step 14: Tab Bar Always Visible',
  'Step 15: No Uncaught JS Errors',
]

// Guardrail runs at import time — if any step is missing, the test file is corrupt.
const _source = require('fs').readFileSync(__filename, 'utf8')
for (const step of EXPECTED_STEPS) {
  if (!_source.includes(step)) {
    throw new Error(`GUARDRAIL FAILED: Missing "${step}" in ${__filename}. Restore it or update EXPECTED_STEPS.`)
  }
}

const { test, expect } = require('@playwright/test')

function getDayIdx() {
  return (new Date().getDay() + 6) % 7
}

function buildDayArray(workoutDay) {
  const idx = getDayIdx()
  const days = []
  for (let i = 0; i < idx; i++) {
    days.push({ name: 'Rest', subtitle: '', duration: 0, exercises: [] })
  }
  days.push(workoutDay)
  return days
}

const SEED = {
  exercises: [
    {
      id: 'ex-bench',
      name: 'Press Banca',
      dictId: 'dict_press-banca-barra',
      muscle: 'Chest',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén los hombros hacia atrás y abajo', 'No rebotes el pecho', 'Respira profundo en cada repetición'],
      alternatives: [
        { name: 'Press Banca con Mancuernas', reason: 'Más rango de movimiento, activa estabilizadores' },
        { name: 'Press Inclinado con Barra', reason: 'Mayor énfasis en la parte superior del pecho' },
      ],
    },
    {
      id: 'ex-military',
      name: 'Press Militar',
      dictId: 'dict_press-militar-barra',
      muscle: 'Shoulders',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén el core apretado', 'No arquees la espalda', 'La barra baja hasta la clavícula'],
      alternatives: [
        { name: 'Press Militar con Mancuernas', reason: 'Permite mayor rotación y menos tensión en hombros' },
      ],
    },
    {
      id: 'ex-squat',
      name: 'Sentadilla',
      dictId: 'dict_sentadilla-barra-back-squat',
      muscle: 'Quadriceps',
      imgUrl: '',
      gifUrl: '',
      tips: ['Mantén el pecho arriba', 'Rodillas hacia afuera', 'Baja hasta paralela'],
      alternatives: [
        { name: 'Sentadilla Búlgara', reason: 'Más trabajo unilateral, menos carga lumbar' },
      ],
    },
    {
      id: 'ex-deadlift',
      name: 'Peso Muerto',
      dictId: 'dict_peso-muerto-convencional',
      muscle: 'Back',
      imgUrl: '',
      gifUrl: '',
      tips: ['Espalda recta', 'Empuja con las piernas', 'Activa el core'],
      alternatives: [
        { name: 'Peso Muerto Rumano', reason: 'Menos rango, más isquiotibiales' },
      ],
    },
  ],
  getSettings() {
    return {
      id: 'settings',
      activeProgramId: 'prog-sample',
      currentWeekIdx: 0,
      units: 'kg',
      accentColor: '#d4ff3a',
      hasWatch: false,
      userName: 'TestUser',
      height: '180',
      weight: '80',
      sex: 'Masculino',
      age: '28',
      goal: 'hipertrofia',
      experience: 'intermedio',
      occupation: 'Ingeniero',
      pushSubscribed: false,
      pushServerUrl: '',
      sessionState: null,
      lastCoachAnalysis: null,
      rescheduleWeekOrder: {},
      language: 'es',
    }
  },
  getProgram() {
    const bench = { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }
    const military = { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 }
    const benchHeavy = { exerciseId: 'ex-bench', sets: 5, reps: '5', rest: 180 }
    const squat = { exerciseId: 'ex-squat', sets: 4, reps: '8-10', rest: 120 }

    return {
      id: 'prog-sample',
      name: 'Programa de Prueba',
      weeks: [
        {
          name: 'Semana 1 · Volumen',
          subtitle: '',
          tag: 'BUILD',
          days: buildDayArray({
            name: 'Empuje',
            subtitle: 'Press Banca · Press Militar',
            duration: 60,
            exercises: [bench, military],
          }),
        },
        {
          name: 'Semana 2 · Fuerza',
          subtitle: '',
          tag: 'STRENGTH',
          days: buildDayArray({
            name: 'Pierna y Espalda',
            subtitle: 'Press Banca 5×5 · Sentadilla',
            duration: 60,
            exercises: [benchHeavy, squat],
          }),
        },
      ],
    }
  },
}

async function seedIndexedDB(page, data, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.evaluate((d) => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('coach-pedro-ai', 1)
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction(['exercises', 'exerciseLogs', 'programs', 'settings'], 'readwrite')
            tx.objectStore('exercises').clear()
            tx.objectStore('exerciseLogs').clear()
            tx.objectStore('programs').clear()
            tx.objectStore('settings').clear()
            d.exercises.forEach(ex => tx.objectStore('exercises').put(ex))
            ;(d.exerciseLogs || []).forEach(log => tx.objectStore('exerciseLogs').put(log))
            if (d.program) tx.objectStore('programs').put(d.program)
            tx.objectStore('settings').put(d.settings)
            tx.oncomplete = () => { db.close(); resolve() }
            tx.onerror = () => reject(tx.error)
          }
          req.onerror = () => reject(req.error)
        })
      }, data)
      return // success
    } catch (e) {
      if (attempt === retries) throw e
      await page.waitForTimeout(1000)
    }
  }
}

// Generic /api/ interceptor shared by the sub-tab suites below — mirrors the
// default branch of the main flow's route handler (coach-style JSON), since
// most of these tests don't care about AI response shape, only that the UI
// reacts to *a* response. Tests that DO care (e.g. AI import needs `weeks`)
// register a more specific page.route override before triggering the action;
// Playwright matches the most-recently-registered handler first.
async function mockApiRoutes(page) {
  await page.route(/\/api\//, async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: 'Buen trabajo.',
        verdict: 'positive',
        rotation_topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })
}

test('full user flow: profile → warmup → week switch (A→B) → training → stretch → coach → history → friends', async ({ page }) => {
  test.setTimeout(90000)

  // ── Fail on ANY uncaught JS error (hydration / runtime) ──
  const jsErrors = []
  page.on('pageerror', err => jsErrors.push(err.message))

  // ── Seed IndexedDB ──
  const program = SEED.getProgram()
  const settings = SEED.getSettings()
  await page.goto('today')
  await page.waitForTimeout(600)
  await seedIndexedDB(page, { exercises: SEED.exercises, program, settings })

  await page.waitForTimeout(200)
  await page.reload()
  await page.waitForTimeout(1000)
  // No appRefresh hook needed — SvelteKit re-reads IndexedDB on every route's
  // onMount, so a plain reload (or goto) is enough to pick up seeded data.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 5000 }).catch(() => {})

  // Intercept Worker API calls
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url()
    if (url.includes('/api/user/register')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/user/sync')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/friends/search')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ results: [{ username: 'Ana', streak: 12, exercisedToday: true }] }) })
    }
    if (url.includes('/api/friends/add')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
    }
    if (url.includes('/api/friends/list')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ friends: [{ username: 'Ana', streak: 12, exercisedToday: true, lastUpdate: new Date().toISOString() }] }) })
    }
    // Default: coach AI response (used by You → Programas → Coach IA, not by
    // the local post-workout coach card, which is client-side only)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        analysis: 'Buen trabajo hoy, TestUser.',
        verdict: 'positive',
        proximo_objetivo: 'Press Banca → 55kg @ RIR 1-2',
        recommendations: ['Sube Press Banca 2.5kg la próxima sesión'],
        rotation_topic: 'comparativa',
        _provider: 'test',
      }),
    })
  })

  // ── Step 1: Verify Profile ──
  await page.goto('you')
  await page.waitForSelector('#user-name')

  await expect(page.locator('#user-name')).toHaveText('TestUser')
  await expect(page.locator('#height-input')).toHaveValue('180')
  await expect(page.locator('#weight-input')).toHaveValue('80')
  await expect(page.locator('#sex-input')).toHaveValue('Masculino')
  await expect(page.locator('#age-input')).toHaveValue('28')
  await expect(page.locator('#goal-input')).toHaveValue('hipertrofia')
  await expect(page.locator('#exp-input')).toHaveValue('intermedio')
  await expect(page.locator('#occ-input')).toHaveValue('Ingeniero')

  // ── Step 2: Ejercicios Tab Hydration ──
  // Proves the SegmentedControl is actually interactive post-hydration by
  // checking the real effect of clicking it (content swap), not a CSS color.
  await page.click('#you-tab-ejercicios')
  await page.waitForTimeout(300)
  await expect(page.locator('#you-tab-ejercicios')).toHaveClass(/seg-active/)
  await expect(page.locator('.ex-count')).toBeVisible()

  // ── Step 3: Visit Today — Phase Cards ──
  await page.goto('today')
  await page.waitForTimeout(500)

  // Warmup + training are PhaseCards; stretch is a LockedCard (locked by warmup)
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="training"]')).toBeVisible()
  await expect(page.locator('#today-locked-warmup-stretch')).toBeVisible()

  // ── Step 4: Warmup — Navigate Prev/Next, Mark Done ──
  await page.locator('[data-phase="warmup"]').click()
  await page.waitForTimeout(400)

  const hechoBtn = page.getByRole('button', { name: 'Hecho' })
  await expect(hechoBtn).toBeVisible({ timeout: 3000 })

  const getCounter = () => page.getByText(/\d+ \/ \d+/).first()
  const counter1 = await getCounter().textContent()
  expect(counter1).toMatch(/^1 \/ \d+$/)

  // Click Siguiente → counter changes
  // (Warmup's swipe transition holds a `swiping` lock for ~550ms; clicking
  // again before it clears is a silent no-op, so these waits must clear it.)
  await page.getByRole('button', { name: 'Siguiente' }).first().click()
  await page.waitForTimeout(700)
  const counter2 = await getCounter().textContent()
  expect(counter2).not.toBe(counter1)

  // Click Anterior → counter reverts
  await page.getByRole('button', { name: 'Anterior' }).first().click()
  await page.waitForTimeout(700)
  const counter3 = await getCounter().textContent()
  expect(counter3).toBe(counter1)

  // Mark warmup done — the Hoy tab must still show the Calentamiento card
  // (now completed) alongside the training card, not swap it away.
  await hechoBtn.click()
  await expect(hechoBtn).not.toBeVisible({ timeout: 2000 })
  await page.waitForTimeout(400)

  const warmupCard = page.locator('[data-phase="warmup"]')
  await expect(warmupCard).toBeVisible()
  await expect(warmupCard).toHaveClass(/completed/)
  await expect(page.locator('[data-phase="training"]')).toBeVisible()

  // ── Step 5: Plan — Switch Week ──
  // Wait for persistPhase() from warmup completion to settle in IndexedDB
  await page.waitForTimeout(800)
  await page.goto('plan')
  await page.waitForTimeout(500)

  const week2Tab = page.locator('button:has-text("Semana 2")').first()
  await expect(week2Tab).toBeVisible()
  await week2Tab.click()
  await page.waitForTimeout(500)

  // After switching weeks, the current day must auto-expand showing exercises
  // from the NEW week (not the previous one).
  const planDaysGrid = page.locator('#plan-days-grid')
  await expect(planDaysGrid).toContainText('Press de Banca')
  await expect(planDaysGrid).toContainText('Sentadilla')

  // ── Step 6: Back to Today — Training Card ──
  await page.goto('today')
  await page.waitForTimeout(800)

  const trainingCard = page.locator('[data-phase="training"]').first()
  await expect(trainingCard).toBeVisible()
  await expect(trainingCard).toContainText('Entrenamiento')

  // The completed Calentamiento card stays on the Hoy tab alongside the
  // training card — it must not disappear once warmup is done.
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="warmup"]')).toHaveClass(/completed/)

  // Estiramiento is locked until the (new week's) exercises are finished.
  await expect(page.getByText('Termina el entrenamiento primero')).toBeVisible()

  // Exercise previews must render INSIDE the training card (not a separate
  // list elsewhere on the page).
  await expect(trainingCard.locator('.exercise-row')).toHaveCount(2)
  await expect(page.locator('#today-exercise-list')).toHaveCount(0)

  // Click training card → open detail sheet
  await trainingCard.click()
  await page.waitForTimeout(500)

  // Verify Google + TikTok exercise-search links (video search is intentional —
  // exercise demo videos, not a plain web search)
  const googleBtn = page.locator('.hero-google-btn').first()
  const tiktokBtn = page.locator('.hero-tiktok-btn').first()
  await expect(googleBtn).toBeVisible()
  await expect(tiktokBtn).toBeVisible()
  const googleHref = await googleBtn.getAttribute('href')
  expect(googleHref).toContain('google.com/search')
  expect(googleHref).toContain('tbm=video')

  // ── Step 7: Coach IA FAB ──
  const coachFab = page.locator('#coach-fab')
  await expect(coachFab).toBeVisible({ timeout: 3000 })
  await expect(coachFab).toContainText('Coach IA')

  // Click to open Coach IA overlay
  await coachFab.click()
  await page.waitForTimeout(400)

  // Verify overlay shows close button + exercise-specific greeting
  await expect(page.locator('.coach-close-btn')).toBeVisible()
  await expect(page.locator('text=¡Qué onda!')).toBeVisible()
  await expect(page.locator('text=Mejorar técnica')).toBeVisible()
  await expect(page.locator('text=¿Voy muy pesado?')).toBeVisible()

  // Close overlay via close button
  await page.locator('.coach-close-btn').click()
  await page.waitForTimeout(200)

  // Verify overlay is gone
  await expect(page.locator('.coach-close-btn')).not.toBeVisible()

  // ── Step 8: Log Weights for Both Exercises ──
  // Exercise 1: Press Banca 5×5
  const stepperInc = page.locator('.stepper-inc').first()
  await expect(stepperInc).toBeVisible()
  await stepperInc.click()
  await page.waitForTimeout(100)

  const weightInput = page.locator('input[inputmode="decimal"]').first()
  const weightVal = await weightInput.inputValue()
  expect(parseFloat(weightVal)).toBe(5)

  // Register weight — match "Registrar · 5kg"
  const registerBtn = page.getByRole('button', { name: /Registrar ·/ })
  await expect(registerBtn).toBeVisible()
  await registerBtn.click()
  await page.waitForTimeout(600)

  // Merged from the former tests/notifications.spec.cjs — a real user taps
  // "Iniciar" right after logging a set, to start resting before the next one.
  // This only stages the rest-timer push for the service worker; it must NOT
  // arm the in-app timer/banner itself — those only start once the OS
  // notification is tapped (covered in the "Rest timer notification flow"
  // suite below, which picks up from exactly this staged state).
  const iniciarBtn = page.getByRole('button', { name: 'Iniciar' })
  await expect(iniciarBtn).toBeVisible()
  await iniciarBtn.click()
  await page.waitForTimeout(600)

  const stagedPush = await page.evaluate(async () => {
    const cache = await caches.open('push-pending')
    const res = await cache.match('/pending')
    return res ? await res.json() : null
  })
  expect(stagedPush).not.toBeNull()
  expect(stagedPush.kind).toBe('start')
  expect(stagedPush.exerciseData.name).toBe('Press Banca')
  expect(stagedPush.exerciseData.restSec).toBe(180)
  expect(stagedPush.exerciseData.sets).toBe(5)
  expect(stagedPush.exerciseData.exerciseId).toBe('ex-bench')
  await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)

  // Navigate to exercise 2 via Siguiente nav pill
  await page.getByRole('button', { name: 'Siguiente' }).first().click()
  await page.waitForTimeout(400)

  // Exercise 2: Should show Sentadilla (from Week B), NOT Press Militar (from Week A)
  // This verifies the week-switch navigation bug: the detail sheet must search
  // only the current week, not all weeks, for prev/next context.
  await expect(page.locator('text=Sentadilla').first()).toBeVisible({ timeout: 2000 })

  // Increment stepper + register
  const stepperInc2 = page.locator('.stepper-inc').first()
  await stepperInc2.click()
  await page.waitForTimeout(100)
  const registerBtn2 = page.getByRole('button', { name: /Registrar ·/ })
  await expect(registerBtn2).toBeVisible()
  await registerBtn2.click()
  await page.waitForTimeout(600)

  // Close detail sheet → triggers refresh() which recalculates today's done count
  const sheetCloseBtn = page.getByRole('button', { name: 'Cerrar' }).first()
  await expect(sheetCloseBtn).toBeVisible()
  await sheetCloseBtn.click()
  await page.waitForTimeout(500)

  // Finishing all exercises must NOT force-launch the stretch overlay — the
  // Hoy tab keeps showing the completed Calentamiento + Entrenamiento cards
  // plus a tappable Estiramiento card, same as the warmup → training handoff.
  await expect(page.locator('[data-phase="warmup"]')).toBeVisible()
  await expect(page.locator('[data-phase="training"]')).toBeVisible()
  const stretchCard = page.locator('[data-phase="stretch"]')
  await expect(stretchCard).toBeVisible({ timeout: 5000 })
  await stretchCard.click()
  await page.waitForTimeout(400)

  const stretchHecho = page.getByRole('button', { name: 'Hecho' })
  await expect(stretchHecho).toBeVisible({ timeout: 5000 })

  // Navigate stretch if controls visible
  const stretchNext = page.getByRole('button', { name: 'Siguiente' })
  if (await stretchNext.isVisible()) {
    await stretchNext.click()
    await page.waitForTimeout(500)
  }
  const stretchPrev = page.getByRole('button', { name: 'Anterior' })
  if (await stretchPrev.isVisible()) {
    await stretchPrev.click()
    await page.waitForTimeout(500)
  }

  await stretchHecho.click()
  await page.waitForTimeout(500)

  // ── Step 9: Streak Celebration ──
  const streakOverlay = page.locator('#streak-overlay')
  await expect(streakOverlay).toBeVisible({ timeout: 5000 })
  await expect(streakOverlay.locator('text=Días consecutivos')).toBeVisible()
  // Wait for auto-dismiss
  await expect(streakOverlay).not.toBeVisible({ timeout: 5000 })

  // ── Step 10: Effort Modal + Coach Card ──
  const effortOverlay = page.locator('#effort-overlay')
  await expect(effortOverlay).toBeVisible({ timeout: 5000 })
  await effortOverlay.locator('[data-effort="good"]').click()

  const coachCard = page.locator('#coach-card-regen')
  await expect(coachCard).toBeVisible({ timeout: 10000 })
  await expect(coachCard).toContainText('Resumen del coach')

  // Regression guard: the post-workout coach card must show the *real*
  // /api/ai/coach response, not a static canned string keyed only by effort
  // level (the old client-side-only stub). Asserting this test's mocked
  // payload verbatim proves the network call is actually wired up.
  await expect(coachCard).toContainText('Buen trabajo hoy, TestUser.')
  await expect(coachCard).toContainText('Press Banca → 55kg @ RIR 1-2')
  await expect(coachCard).toContainText('Sube Press Banca 2.5kg la próxima sesión')

  // ── Step 10b: Coach result survives closing and reopening the app ──
  // Regression guard: reloading must keep showing the coach's analysis for
  // today, not fall back to just the bare "Ejercicios/Volumen/PRs" stat grid.
  await page.reload()
  await page.waitForTimeout(1000)
  const coachCardAfterReload = page.locator('#coach-card-regen')
  await expect(coachCardAfterReload).toBeVisible({ timeout: 10000 })
  await expect(coachCardAfterReload).toContainText('Buen trabajo hoy, TestUser.')

  // ── Step 11: History Verification ──
  await page.goto('history')
  await page.waitForTimeout(500)

  // History shows the completed session with exercise names (from Week B)
  await expect(page.locator('body')).toContainText('Press de Banca')
  await expect(page.locator('body')).toContainText('Sentadilla')
  await expect(page.locator('body')).toContainText('Completado')

  // History shows logged weights from Step 8
  await expect(page.locator('body')).toContainText('5')

  // History/Calendar must show resolved exercise names, never raw ids like "ex-bench"
  const bodyText = await page.locator('body').textContent()
  expect(bodyText).not.toContain('ex-bench')
  expect(bodyText).not.toContain('ex-squat')

  // ── Step 12: Friends ──
  // No window overrides — the real Friends page calls the API directly;
  // routes are intercepted above.
  await page.goto('friends')
  await page.waitForTimeout(500)

  // First visit shows username prompt
  await expect(page.locator('#username-prompt')).toBeVisible()
  await expect(page.locator('#username-prompt')).toContainText('Bienvenido')

  // Set username
  const usernameInput = page.locator('#username-input')
  await expect(usernameInput).toBeVisible()
  await usernameInput.fill('TestUser')

  const listoBtn = page.locator('#username-btn')
  await expect(listoBtn).toBeEnabled()
  await listoBtn.click()
  await page.waitForTimeout(2000)

  // Prompt disappears, main view shows
  await expect(page.locator('#username-prompt')).not.toBeVisible()
  await expect(page.locator('.friends-my-streak')).toContainText('racha')

  // Search for friend
  const searchInput = page.locator('#friend-search-input')
  await expect(searchInput).toBeVisible()
  await searchInput.fill('Ana')
  await page.waitForTimeout(500)

  // Search result shows mock friend
  const searchResult = page.locator('.sr-item')
  await expect(searchResult).toBeVisible()
  await expect(searchResult).toContainText('Ana')

  // Add friend
  const addBtn = page.getByRole('button', { name: 'Agregar' })
  await expect(addBtn).toBeVisible()
  await addBtn.click()
  await page.waitForTimeout(500)

  // Verify friend appears in list with streak
  const friendCard = page.locator('.friend-card')
  await expect(friendCard).toBeVisible()
  await expect(friendCard).toContainText('Ana')
  await expect(friendCard).toContainText('12')
  await expect(friendCard).toContainText('Hoy')

  // ── Step 13: Language Toggle — Exercise Names ──
  await page.goto('you')
  await page.waitForTimeout(500)

  const langBtn = page.locator('#lang-toggle-btn')
  await expect(langBtn).toBeVisible()
  await expect(langBtn).toContainText('Español')

  // Click to switch to English
  await langBtn.click()
  await page.waitForTimeout(500)

  // Navigate to History — exercise names should be in English
  await page.goto('history')
  await page.waitForTimeout(500)
  await expect(page.locator('body')).toContainText('Barbell Bench Press')
  await expect(page.locator('body')).toContainText('Barbell Full Squat')

  // Toggle back to Spanish
  await page.goto('you')
  await page.waitForTimeout(500)
  const langBtn2 = page.locator('#lang-toggle-btn')
  await expect(langBtn2).toContainText('English')
  await langBtn2.click()
  await page.waitForTimeout(500)

  // Verify Spanish names restored
  await page.goto('history')
  await page.waitForTimeout(500)
  await expect(page.locator('body')).toContainText('Press de Banca')

  // ── Step 14: Tab Bar Always Visible — on every page, without scrolling ──
  const tabBarPages = ['today', 'plan', 'history', 'you']
  for (const tabPage of tabBarPages) {
    await page.goto(tabPage)
    await page.waitForTimeout(400)

    const hoyBtn = page.getByRole('link', { name: 'Hoy' })
    await expect(hoyBtn).toBeVisible()
    await expect(hoyBtn).toBeInViewport()

    // After scrolling content, tab bar must stay fixed at the bottom
    await page.evaluate(() => window.scrollTo(0, 9999))
    await page.waitForTimeout(200)
    await expect(hoyBtn).toBeInViewport()
  }

  // ── Step 15: No Uncaught JS Errors ──
  expect(jsErrors).toEqual([])
})

// Merged from the former tests/warmup-detail.spec.cjs — same rule: all app
// behavior lives in this one file. These are independent, narrowly-seeded
// scenarios (not steps in the main flow above), so they're separate test()
// calls sharing the seedIndexedDB/buildDayArray helpers already defined above.
test.describe('You — Tamaño de texto (accessibility)', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('cycles Normal → Grande → Extra grande, scales the whole app, and persists', async ({ page }) => {
    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const fontBtn = page.locator('#font-size-toggle-btn')
    await expect(fontBtn).toBeVisible()
    await expect(fontBtn).toContainText('Normal')
    await expect(page.locator('html')).toHaveCSS('zoom', '1')

    await fontBtn.click()
    await page.waitForTimeout(300)
    await expect(fontBtn).toContainText('Grande')
    await expect(page.locator('html')).toHaveCSS('zoom', '1.15')

    await fontBtn.click()
    await page.waitForTimeout(300)
    await expect(fontBtn).toContainText('Extra grande')
    await expect(page.locator('html')).toHaveCSS('zoom', '1.3')

    // Persisted to Settings — survives a reload, not just local component state
    await page.reload()
    await page.waitForTimeout(600)
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Extra grande')
    await expect(page.locator('html')).toHaveCSS('zoom', '1.3')

    // Cycles back to Normal
    await page.locator('#font-size-toggle-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('#font-size-toggle-btn')).toContainText('Normal')
    await expect(page.locator('html')).toHaveCSS('zoom', '1')
  })
})

test.describe('Warmup detail sheet rendering', () => {
  const BASE_SETTINGS = {
    id: 'settings',
    activeProgramId: 'prog-test',
    currentWeekIdx: 0,
    units: 'kg',
    accentColor: '#d4ff3a',
    hasWatch: false,
    pushSubscribed: false,
    pushServerUrl: '',
    sessionState: null,
    lastCoachAnalysis: null,
    rescheduleWeekOrder: {},
  }

  function getTodayStr() {
    return new Date().toISOString().slice(0, 10)
  }

  test('renders sectioned cards when item has posInicial/ejecucion/respiracion/duracion', async ({ page }) => {
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje',
          subtitle: 'Press Banca',
          duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', tips: [], alternatives: [] }],
      program,
      settings: { ...BASE_SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // The warmup sheet doesn't auto-open — the user opens it via the phase card.
    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)

    // Chest warmup items from WARMUP_DATA have all 4 sections
    await expect(page.getByText('Posición Inicial').first()).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Ejecución').first()).toBeVisible()
    await expect(page.getByText('Respiración').first()).toBeVisible()
    await expect(page.getByText('Duración').first()).toBeVisible()
  })

  test('falls back to desc for GENERIC_WARMUP items without section fields', async ({ page }) => {
    // Quadriceps does not resolve to any WARMUP_DATA key -> GENERIC_WARMUP_ONLY fallback
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Piernas',
          subtitle: 'Sentadilla',
          duration: 60,
          exercises: [{ exerciseId: 'ex-squat', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-squat', name: 'Sentadilla', muscle: 'Quadriceps', imgUrl: '', tips: [], alternatives: [] }],
      program,
      settings: { ...BASE_SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)

    // GENERIC_WARMUP items have a desc field, not sections
    // "Cómo hacerlo" label shows in the fallback path
    await expect(page.getByText('Cómo hacerlo').first()).toBeVisible({ timeout: 3000 })

    // Section labels should NOT appear
    await expect(page.getByText('Posición Inicial')).toHaveCount(0)
  })

  test('shows STALLBAR badge when item has stallbar: true', async ({ page }) => {
    // Chest exercise; seed sessionState at phase 3 with todayExDone matching
    // the day's exercise count so the app lands on the Hoy tab with the
    // Estiramiento card tappable (it doesn't auto-open on mount).
    const program = {
      id: 'prog-test',
      name: 'Test Program',
      weeks: [{
        name: 'Semana 1',
        subtitle: '',
        tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje',
          subtitle: 'Press Banca',
          duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }
    const today = getTodayStr()

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', tips: [], alternatives: [] }],
      program,
      // A real logged weight is required — the app reconciles todayExDone
      // against actual exerciseLogs on mount and would otherwise zero it out.
      exerciseLogs: [{ id: 'log-bench-today', exerciseId: 'ex-bench', date: today, weight: 60, units: 'kg' }],
      settings: { ...BASE_SETTINGS, sessionState: { date: today, phase: 3, todayExDone: 1 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // The Estiramiento card is now visible and active on the Hoy tab — tap it to open.
    await page.locator('[data-phase="stretch"]').click()
    await page.waitForTimeout(500)

    // Chest stretch: 3rd item "Apertura de Pecho Pasiva en Espaldera" has stallbar: true
    // Navigate Siguiente twice (same ~550ms swipe-lock as the main flow's warmup step)
    const nextBtn = page.getByRole('button', { name: 'Siguiente' }).first()
    await expect(nextBtn).toBeVisible({ timeout: 3000 })
    await nextBtn.click()
    await page.waitForTimeout(700)
    await nextBtn.click()
    await page.waitForTimeout(700)

    // STALLBAR badge should now be visible
    await expect(page.getByText('STALLBAR').first()).toBeVisible({ timeout: 2000 })
  })
})

// The suites below close the sub-tab gaps the main flow above never reaches:
// Tú → Programas, Tú → Datos, Tú → Ejercicios CRUD (main flow only proves the
// tab hydrates), Plan → Reprogramar mode, Plan's own ExerciseDetail wiring,
// and Historial → Ejercicios. Same rule as the warmup suite above: independent
// scenarios live here as their own test()/describe(), not steps in the main flow.

test.describe('You — Programas tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-a', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  const PROGRAM_A = {
    id: 'prog-a', name: 'Programa Activo',
    weeks: [{ name: 'Semana 1', subtitle: '', tag: 'BUILD', days: [{ name: 'Día 1', subtitle: '', duration: 60, exercises: [] }] }],
  }

  test('create, activate, duplicate, delete a program + Coach IA response', async ({ page }) => {
    test.setTimeout(60000)
    await mockApiRoutes(page)

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM_A, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Programas' }).click()
    await page.waitForTimeout(300)

    // Create a new program
    await page.getByPlaceholder('Nombre del nuevo programa').fill('Programa Nuevo')
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.waitForTimeout(500)

    const newCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo' }).first()
    await expect(newCard).toBeVisible()

    // Activate it — the ACTIVO pill should move off "Programa Activo"
    await newCard.getByRole('button', { name: 'Activar' }).click()
    await page.waitForTimeout(400)
    await expect(newCard.locator('.pill')).toHaveText('ACTIVO')
    const oldCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Activo' })
    await expect(oldCard.locator('.pill')).toHaveCount(0)

    // Duplicate
    await newCard.getByRole('button', { name: 'Duplicar' }).click()
    await page.waitForTimeout(400)
    const dupCard = page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo (copia)' })
    await expect(dupCard).toBeVisible()

    // Delete the duplicate
    page.once('dialog', d => d.accept())
    await dupCard.getByRole('button', { name: 'Eliminar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('[data-component="ProgramCard"]', { hasText: 'Programa Nuevo (copia)' })).toHaveCount(0)

    // Coach IA — ask a question, verify a response renders
    await page.locator('[data-component="CoachIACard"] textarea').fill('¿Está balanceada mi rutina?')
    await page.getByRole('button', { name: 'Enviar al coach' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('[data-component="CoachResponseCard"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-component="CoachResponseCard"]')).toContainText('Listo.')
  })
})

test.describe('You — Datos tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('AI import, dictionary migration, and JSON export/import', async ({ page }) => {
    test.setTimeout(60000)

    // Only the AI-import endpoint needs a real payload (it requires `weeks`);
    // registered as its own route so it's matched ahead of nothing else here.
    await page.route((url) => url.href.includes('/api/ai/import'), (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        program_name: 'Programa IA',
        weeks: [{
          name: 'Semana 1', subtitle: '', tag: 'BUILD',
          days: [{ name: 'Día 1', subtitle: '', duration: 60, exercises: [{ name: 'Press Banca', muscle: 'Chest' }] }],
        }],
      }),
    }))

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Datos' }).click()
    await page.waitForTimeout(300)

    // AI import
    await page.locator('.ai-textarea-wrap textarea').fill('Lunes: Press banca 4x8')
    await page.getByRole('button', { name: 'Importar con IA' }).click()
    await page.waitForTimeout(600)
    await expect(page.locator('#ai-status')).toContainText('Importado "Programa IA"')

    // Dictionary migration
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('#dict-migrate-status')).toContainText('Actualizados')

    // Export exercises JSON
    const [download1] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-component="DataExportSection"]').getByRole('button', { name: 'Exportar JSON' }).first().click(),
    ])
    expect(download1.suggestedFilename()).toMatch(/^ejercicios-\d{4}-\d{2}-\d{2}\.json$/)

    // Import exercises JSON
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    const exFile = path.join(os.tmpdir(), `pw-exercises-${Date.now()}.json`)
    fs.writeFileSync(exFile, JSON.stringify([
      { id: 'ex-imported', name: 'Curl de Bíceps', muscle: 'Biceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
    ]))
    try {
      await page.locator('[data-component="DataImportSection"] input[type="file"]').first().setInputFiles(exFile)
      await page.waitForTimeout(500)
      await expect(page.locator('[data-component="DataImportSection"]')).toContainText('1 ejercicios importados')
    } finally {
      fs.unlinkSync(exFile)
    }

    // Import logs+settings JSON
    const logsFile = path.join(os.tmpdir(), `pw-logs-${Date.now()}.json`)
    fs.writeFileSync(logsFile, JSON.stringify({
      exerciseLogs: [{ id: 'log-imported', exerciseId: 'ex-imported', date: '2026-07-01', weight: 40, units: 'kg' }],
    }))
    try {
      await page.locator('[data-component="DataImportSection"] input[type="file"]').nth(1).setInputFiles(logsFile)
      await page.waitForTimeout(500)
      await expect(page.locator('[data-component="DataImportSection"]')).toContainText('Importados 1 logs')
    } finally {
      fs.unlinkSync(logsFile)
    }
  })

  // Merged from the former tests/dict-normalize.spec.cjs — same Datos tab,
  // continuing the route with an exercise the dictionary can't resolve.
  test('shows ver más link + overlay for exercises with no dictionary match', async ({ page }) => {
    const exercises = [
      { id: 'ex-bench', name: 'Press Banca', dictId: '', muscle: '', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      { id: 'ex-madeup', name: 'Ejercicio Inventado X7', dictId: '', muscle: '', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
    ]

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Datos' }).click()
    await page.waitForTimeout(300)

    // "Forzar" re-runs the migration even if already applied this session
    const forceBtn = page.getByRole('button', { name: 'Forzar' })
    await expect(forceBtn).toBeVisible()
    await forceBtn.click()

    const statusEl = page.locator('#dict-migrate-status')
    await expect(statusEl).toContainText('sin match 1', { timeout: 10000 })

    const verMas = page.locator('#ver-mas-link')
    await expect(verMas).toBeVisible()
    await expect(verMas).toContainText('ver más')
    await verMas.click()
    await page.waitForTimeout(300)

    const overlay = page.locator('#skipped-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('Ejercicio Inventado X7')

    const closeBtn = page.locator('#skipped-close-btn')
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await page.waitForTimeout(200)
    await expect(overlay).not.toBeVisible()
  })
})

test.describe('You — Ejercicios tab CRUD', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('search, add, edit, delete an exercise', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto('you')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-a', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-b', name: 'Sentadilla', muscle: 'Quadriceps', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.click('#you-tab-ejercicios')
    await page.waitForTimeout(300)
    await expect(page.locator('#ex-count')).toHaveText('2 ejercicios')

    // Search filters the list down to one match
    await page.getByPlaceholder('Buscar ejercicio…').fill('sentad')
    await page.waitForTimeout(300)
    await expect(page.locator('[data-component="ExerciseListItem"]')).toHaveCount(1)
    await expect(page.locator('[data-component="ExerciseListItem"]')).toContainText('Sentadilla')
    await page.getByPlaceholder('Buscar ejercicio…').fill('')
    await page.waitForTimeout(300)

    // Add a new exercise
    await page.getByRole('button', { name: '+ Nuevo' }).click()
    await page.getByPlaceholder('Nombre del ejercicio').fill('Remo con Barra')
    await page.getByPlaceholder('Músculo (ej: Pecho, Espalda)').fill('Espalda')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('#ex-count')).toHaveText('3 ejercicios')
    const newItem = page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra' })
    await expect(newItem).toBeVisible()

    // Edit it
    await newItem.locator('.exercise-toggle').click()
    await page.waitForTimeout(300)
    await newItem.getByRole('button', { name: 'Editar' }).click()
    await newItem.getByPlaceholder('Nombre').fill('Remo con Barra (editado)')
    await newItem.getByRole('button', { name: 'Guardar' }).click()
    await page.waitForTimeout(400)
    const editedItem = page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra (editado)' })
    await expect(editedItem).toBeVisible()

    // Delete it — still expanded from the edit step above (a second toggle
    // click here would collapse it again and hide the Eliminar button)
    page.once('dialog', d => d.accept())
    await editedItem.getByRole('button', { name: 'Eliminar' }).click()
    await page.waitForTimeout(400)
    await expect(page.locator('#ex-count')).toHaveText('2 ejercicios')
  })
})

test.describe('Plan — Reprogramar mode', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-plan', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }
  // Fixed 7-day week (not built from buildDayArray, which pads only up to
  // "today") so day names/positions are deterministic regardless of run date.
  const PROGRAM_PLAN = {
    id: 'prog-plan', name: 'Programa Plan',
    weeks: [{
      name: 'Semana 1', subtitle: '', tag: 'BUILD',
      days: [
        { name: 'Empuje', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Tirón', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Pierna', subtitle: '', duration: 60, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
        { name: 'Rest', subtitle: '', duration: 0, exercises: [] },
      ],
    }],
  }

  test('swap days, reset, shift, and persist a reschedule', async ({ page }) => {
    test.setTimeout(60000)

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, { exercises: [], program: PROGRAM_PLAN, settings: SETTINGS })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Reprogramando esta semana')).toBeVisible()

    // Swap Empuje (Mon) and Tirón (Wed)
    await page.locator('.day-card', { hasText: 'Empuje' }).locator('.day-header').click()
    await page.waitForTimeout(200)
    await page.locator('.day-card', { hasText: 'Tirón' }).locator('.day-header').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.day-card', { hasText: 'Tirón' }).locator('.moved-chip')).toContainText('desde Mié')
    await expect(page.locator('.day-card', { hasText: 'Empuje' }).locator('.moved-chip')).toContainText('desde Lun')

    // Reset clears the swap
    await page.locator('#plan-reset-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.moved-chip')).toHaveCount(0)

    // "Me salté un día" rotates every workout forward by one day
    await page.locator('#plan-shift-btn').click()
    await page.waitForTimeout(300)
    await expect(page.locator('.day-card', { hasText: 'Empuje' }).locator('.moved-chip')).toContainText('desde Lun')
    await expect(page.locator('.day-card', { hasText: 'Tirón' }).locator('.moved-chip')).toContainText('desde Mié')

    // Save — a persistent "changes" banner should appear outside edit mode
    await page.locator('#plan-reprogram-btn').click()
    await page.waitForTimeout(400)
    await expect(page.locator('#plan-changes-banner')).toBeVisible()
    await expect(page.locator('#plan-changes-banner')).toContainText('cambios')

    // Reload — the reschedule must have actually persisted to settings, not
    // just local component state
    await page.reload()
    await page.waitForTimeout(800)
    await expect(page.locator('#plan-changes-banner')).toBeVisible()
  })
})

test.describe('Plan — exercise detail sheet', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-detail', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('opens and closes ExerciseDetail from the Plan day grid', async ({ page }) => {
    const program = {
      id: 'prog-detail', name: 'Programa Detalle',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('plan')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    // "Banca" (not the full seeded name) — the dictionary auto-normalizes
    // display names by name-match even without an explicit dictId, e.g.
    // "Press Banca" renders as "Press de Banca con Barra".
    const exerciseRow = page.locator('#plan-days-grid .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // Same shared ExerciseDetail/ExerciseHero used on Today — proves Plan's
    // wiring (openExerciseDetailAt) actually opens the real sheet, not a stub
    await expect(page.locator('.hero-google-btn')).toBeVisible()
    const closeBtn = page.getByRole('button', { name: 'Cerrar' }).first()
    await expect(closeBtn).toBeVisible()
    await closeBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero-google-btn')).not.toBeVisible()
  })
})

test.describe('Historial — Constancia day detail', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-cal-detail', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('clicking an exercise row in the day detail opens ExerciseDetail', async ({ page }) => {
    const program = {
      id: 'prog-cal-detail', name: 'Programa Detalle Calendario',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca', duration: 60,
          exercises: [{ exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 }],
        }),
      }],
    }

    await page.goto('history')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [{ id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] }],
      program,
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const exerciseRow = page.locator('.cal-detail .exercise-row', { hasText: 'Banca' })
    await expect(exerciseRow).toBeVisible({ timeout: 3000 })
    await exerciseRow.click()
    await page.waitForTimeout(400)

    // Same shared ExerciseDetail used on Plan/Today — proves Calendar's
    // day-detail wiring opens the real sheet, not just a static row.
    await expect(page.locator('.hero-google-btn')).toBeVisible()
    const closeBtn = page.getByRole('button', { name: 'Cerrar' }).first()
    await closeBtn.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.hero-google-btn')).not.toBeVisible()
  })
})

test.describe('Exercise detail navigation', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-nav', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  function getTodayStr() {
    return new Date().toISOString().slice(0, 10)
  }

  // Fires synthetic touch events directly at the element (bypassing the need
  // for a real touch-capable browser context) to exercise ExerciseDetail's
  // swipe-to-navigate handlers the same way a finger drag would.
  async function swipe(page, dx) {
    await page.evaluate((dx) => {
      const el = document.querySelector('.detail-scroll')
      const startX = 200
      const startY = 400
      const start = new TouchEvent('touchstart', {
        touches: [new Touch({ identifier: 1, target: el, clientX: startX, clientY: startY })],
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(start)
      const end = new TouchEvent('touchend', {
        changedTouches: [new Touch({ identifier: 1, target: el, clientX: startX + dx, clientY: startY })],
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(end)
    }, dx)
  }

  test('Anterior/Siguiente buttons and swipe both navigate exercises, keeping Registrar + Historial subtabs in sync', async ({ page }) => {
    const program = {
      id: 'prog-nav', name: 'Programa Nav',
      weeks: [{
        name: 'Semana 1', subtitle: '', tag: 'BUILD',
        days: buildDayArray({
          name: 'Empuje', subtitle: 'Press Banca · Press Militar', duration: 60,
          exercises: [
            { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
            { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
          ],
        }),
      }],
    }
    const today = getTodayStr()

    await page.goto('today')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-military', name: 'Press Militar', muscle: 'Shoulders', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      // Only Press Banca has a past log — Press Militar's Historial should
      // start empty, proving the subtab re-derives data per exercise instead
      // of holding onto whatever was shown for the previous one.
      exerciseLogs: [{ id: 'log-bench', exerciseId: 'ex-bench', date: '2026-07-01', weight: 50, units: 'kg' }],
      program,
      // phase 2 = warmup already done, so the training card is tappable immediately.
      settings: { ...SETTINGS, sessionState: { date: today, phase: 2, todayExDone: 0 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    const trainingCard = page.locator('[data-phase="training"]').first()
    await expect(trainingCard).toBeVisible()
    await trainingCard.click()
    await page.waitForTimeout(400)

    const heroName = page.locator('.hero-name')
    const anteriorBtn = page.getByRole('button', { name: 'Anterior' }).first()
    const siguienteBtn = page.getByRole('button', { name: 'Siguiente' }).first()
    const historialTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Historial' })
    const actualStat = page.locator('.stat-block', { hasText: 'Actual' })
    const weightInput = page.locator('input[inputmode="decimal"]').first()
    const logBtn = page.locator('.log-btn').first()

    await expect(heroName).toContainText('Banca')
    await expect(anteriorBtn).toBeDisabled()
    await expect(siguienteBtn).toBeEnabled()
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')

    await siguienteBtn.click()
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Militar')
    await expect(anteriorBtn).toBeEnabled()
    await expect(siguienteBtn).toBeDisabled()
    await expect(weightInput).toHaveValue('')
    await expect(logBtn).toContainText('Registrar · 0kg')

    await historialTab.click()
    await page.waitForTimeout(300)
    await expect(page.locator('.empty-history')).toBeVisible()

    await anteriorBtn.click()
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Banca')
    await expect(page.locator('.empty-history')).not.toBeVisible()
    await expect(actualStat).toContainText('50')

    await page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Registrar' }).click()
    await page.waitForTimeout(300)
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')

    await swipe(page, -150)
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Militar')
    await expect(weightInput).toHaveValue('')
    await expect(logBtn).toContainText('Registrar · 0kg')

    await swipe(page, 150)
    await page.waitForTimeout(300)
    await expect(heroName).toContainText('Banca')
    await expect(weightInput).toHaveValue('50')
    await expect(logBtn).toContainText('Registrar · 50kg')
  })
})

test.describe('Historial — Ejercicios sub-tab', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('filters by muscle and shows sparkline + delta stats', async ({ page }) => {
    await page.goto('history')
    await page.waitForTimeout(400)
    await seedIndexedDB(page, {
      exercises: [
        { id: 'ex-bench', name: 'Press Banca', muscle: 'Chest', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
        { id: 'ex-deadlift', name: 'Peso Muerto', muscle: 'Back', imgUrl: '', gifUrl: '', tips: [], alternatives: [] },
      ],
      exerciseLogs: [
        { id: 'log-1', exerciseId: 'ex-bench', date: '2026-07-01', weight: 50, units: 'kg' },
        { id: 'log-2', exerciseId: 'ex-bench', date: '2026-07-15', weight: 60, units: 'kg' },
        { id: 'log-3', exerciseId: 'ex-deadlift', date: '2026-07-01', weight: 80, units: 'kg' },
      ],
      settings: SETTINGS,
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(800)

    await page.getByRole('button', { name: 'Ejercicios' }).click()
    await page.waitForTimeout(400)

    await expect(page.locator('.ex-card')).toHaveCount(2)
    // "Banca" (not the full seeded name) — display names are dictionary-
    // normalized by name-match, e.g. "Press Banca" → "Press de Banca con Barra".
    const benchCard = page.locator('.ex-card', { hasText: 'Banca' })
    await expect(benchCard.locator('.ex-last')).toContainText('60')
    await expect(benchCard.locator('.ex-delta')).toContainText('+10.0')
    await expect(benchCard.locator('.ex-sparkline-placeholder')).toHaveCount(0)

    // Filter to Chest only
    await page.locator('.chips-row').getByText('Chest', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ex-card')).toHaveCount(1)
    await expect(page.locator('.ex-card')).toContainText('Banca')

    // Back to all
    await page.locator('.chips-row').getByText('Todos', { exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.locator('.ex-card')).toHaveCount(2)
  })
})

// Merged from the former tests/notifications.spec.cjs — picks up where the
// main flow's Step 8 "Iniciar" tap left off (a push staged, nothing armed
// yet) and walks the rest of that same journey: the OS notification gets
// tapped, the app comes back to the foreground, and the in-app rest timer
// takes over from there. All three tests re-stage the SW caches by hand
// (standing in for "user tapped the OS push"), since Playwright can't
// dispatch a real system notification tap.
test.describe('Rest timer notification flow', () => {
  test('tapping the start notification schedules the delayed push and shows the rest banner', async ({ page }) => {
    let startTimerPayload = null
    await page.route(/rest-timer\/start/, async (route) => {
      startTimerPayload = route.request().postData()
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })
    let cancelPayload = null
    await page.route(/rest-timer\/cancel/, async (route) => {
      cancelPayload = route.request().postData()
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'ok' })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    // The SW writes the exercise payload + flag when a start notification is tapped.
    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
      await cache.put('/from-notification', new Response('1'))
    })

    // Returning to the foreground (from tapping the OS notification) fires focus.
    await page.evaluate(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 300))
    })
    await page.waitForTimeout(1000)

    const banner = page.locator('[data-component="RestTimerBanner"]')
    await expect(banner).toBeVisible({ timeout: 3000 })
    await expect(banner).toContainText('Press de Banca con Barra')

    expect(startTimerPayload).not.toBeNull()
    const payload = JSON.parse(startTimerPayload)
    // endTime targets ~10s before the real rest end (latency compensation).
    expect(typeof payload.endTime).toBe('number')
    expect(payload.endTime).toBeGreaterThan(Date.now() + 100 * 1000)
    expect(payload.endTime).toBeLessThan(Date.now() + 120 * 1000)
    expect(payload.deviceId).toBeTruthy()
    expect(payload.exerciseId).toBe('ex-bench')
    expect(payload.restSec).toBe(120)
    expect(payload.sets).toBe(4)
    expect(payload.reps).toBe('8-10')
    expect(payload.title).toBe('Press Banca')
    expect(payload.tag).toBeTruthy()

    // The "Saltar" button cancels the queued delayed push (tapping the card
    // itself no longer cancels — avoids accidental cancels).
    await banner.locator('.rtb-skip').click()
    await page.waitForTimeout(500)
    expect(cancelPayload).not.toBeNull()
    const cancelData = JSON.parse(cancelPayload)
    expect(cancelData.tag).toBeTruthy()
    expect(cancelData.deviceId).toBeTruthy()
  })

  test('banner completion disappears silently and does not reschedule', async ({ page }) => {
    let restTimerCalled = false
    await page.route(/rest-timer\/start/, async (route) => {
      restTimerCalled = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    await page.evaluate(async () => {
      const cache = await caches.open('rest-timer')
      await cache.put('/pending', new Response(JSON.stringify({
        endTime: Date.now() - 1000,
        name: 'Press Banca', tag: 'test-tag', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
    })

    await page.evaluate(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
      await new Promise(r => setTimeout(r, 100))
    })
    await page.waitForTimeout(1500)

    // Banner is decorative: it just disappears. No "Descanso terminado" toast —
    // that message belongs to the delayed push (avoids a double notification).
    await expect(page.locator('[data-component="RestTimerBanner"]')).toHaveCount(0)
    const toastText = await page.evaluate(() => {
      const t = document.getElementById('backup-toast')
      return t ? t.textContent : ''
    })
    expect(toastText).not.toContain('Descanso terminado')
    // Completion must not schedule a new delayed push (the push drives the cycle).
    expect(restTimerCalled).toBe(false)
  })

  // Regression: returning to the foreground fires focus + visibilitychange
  // near-simultaneously. A single tap must schedule exactly ONE delayed push,
  // not one per event (the "3 notifications" bug).
  test('concurrent foreground events schedule only one rest cycle', async ({ page }) => {
    let startCalls = 0
    await page.route(/rest-timer\/start/, async (route) => {
      startCalls++
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'scheduled' }) })
    })
    await page.route(/rest-timer\/cancel/, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: 'ok' })
    })

    await page.goto('today')
    await page.waitForTimeout(600)

    await page.evaluate(async () => {
      const cache = await caches.open('rest-pending')
      await cache.put('/pending', new Response(JSON.stringify({
        name: 'Press Banca', restSec: 120, sets: 4, reps: '8-10', exerciseId: 'ex-bench',
      })))
      await cache.put('/from-notification', new Response('1'))
      // Fire the foreground events back-to-back, like iOS does on notification tap.
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
      await new Promise(r => setTimeout(r, 500))
    })
    await page.waitForTimeout(1000)

    await expect(page.locator('[data-component="RestTimerBanner"]')).toBeVisible({ timeout: 3000 })
    expect(startCalls).toBe(1)
  })
})
