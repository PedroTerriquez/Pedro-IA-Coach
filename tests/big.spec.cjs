// GUARDRAIL: NEVER delete, rename or weaken an existing test() without asking
// Pedro first — including rewriting its assertions so they match new behavior.
// These tests are the record of what the app promised; rewriting one silently
// makes a regression look exactly like an intended change. If your change makes
// a test wrong, stop and say which promise is breaking, wait for a yes, and
// then keep the old intent in a comment next to the new assertion. Adding
// tests never needs permission.
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
  'Step 0: First Run',
  'Step 1: Tú — Mis datos',
  'Step 1b: Tú — Ajustes',
  'Step 2: Tú — Ejercicios',
  'Step 2b: Tú — Editor de ejercicio',
  'Step 3: Tú — Programas',
  'Step 4: Hoy — Before The First Workout',
  'Step 5: Tú — Copia de seguridad',
  'Step 5b: Amigos — Primera vez y racha viva',
  'Step 6: Plan — Weekdays And Weeks',
  'Step 6b: Plan — Exercise Detail',
  'Step 6c: Plan — Reprogramar',
  'Step 7: Hoy — Calentamiento',
  'Step 8: Hoy — Registrar Press Banca',
  'Step 8b: Rest Timer — Iniciar y pantalla completa',
  'Step 8c: Rest Timer — Ciclo de series',
  'Step 8d: Rest Timer — Confirma tus series',
  'Step 8e: Hoy — Press Militar',
  'Step 8f: Hoy — Fondos por una alternativa',
  'Step 8g: Hoy — Series por bloque',
  'Step 9: Hoy — Terminar entrenamiento',
  'Step 9b: Hoy — Estiramiento',
  'Step 9c: Hoy — Racha, esfuerzo y resumen',
  'Step 10: Historial — Constancia',
  'Step 10b: Historial — Ejercicios',
  'Step 11: Amigos — Liga después de entrenar',
  'Step 11b: Amigos — Liga chica y agregar',
  'Step 11c: Amigos — Podio, detalle y datos viejos',
  'Step 12: Red — Sin conexión y ping',
  'Step 12b: Offline — Las vistas y lo que pide internet',
  'Step 13: Idioma, TabBar y nombres largos',
  'Step 14: Copia — Teléfono nuevo',
  'Step 14b: Eliminar un ejercicio con registros',
  'Step 15: No Uncaught JS Errors',
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

async function seedIndexedDB(page, data, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await page.evaluate((d) => {
        return new Promise((resolve, reject) => {
          const req = indexedDB.open('coach-pedro-ai', 2)
          req.onupgradeneeded = () => {
            const db = req.result
            const stores = ['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions']
            stores.forEach((s) => {
              if (db.objectStoreNames.contains(s)) return
              const store = db.createObjectStore(s, { keyPath: 'id' })
              if (s === 'exerciseLogs') {
                store.createIndex('exerciseId', 'exerciseId', { unique: false })
                store.createIndex('date', 'date', { unique: false })
              }
            })
          }
          req.onsuccess = () => {
            try {
              const db = req.result
              const tx = db.transaction(['exercises', 'exerciseLogs', 'programs', 'settings', 'gymSessions'], 'readwrite')
              tx.objectStore('exercises').clear()
              tx.objectStore('exerciseLogs').clear()
              tx.objectStore('programs').clear()
              tx.objectStore('settings').clear()
              tx.objectStore('gymSessions').clear()
              d.exercises.forEach(ex => tx.objectStore('exercises').put(ex))
              ;(d.exerciseLogs || []).forEach(log => tx.objectStore('exerciseLogs').put(log))
              if (d.program) tx.objectStore('programs').put(d.program)
              ;(d.gymSessions || []).forEach(g => tx.objectStore('gymSessions').put(g))
              tx.objectStore('settings').put(d.settings)
              tx.oncomplete = () => { db.close(); resolve() }
              tx.onerror = () => reject(tx.error)
            } catch (e) {
              reject(e)
            }
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

// The app has mounted once its tab bar is on screen: by then the page's
// onMount ran, so Hoy's focus/visibilitychange listeners are in place.
async function waitForApp(page) {
  await expect(page.locator('[data-component="TabBar"]')).toBeVisible()
}

// On its first load Amigos saves settings (userName → username); a seed that
// lands before that write gets overwritten. The week card or the username
// prompt only render once it's done.
async function gotoFriendsLoaded(page) {
  await page.goto('friends')
  await expect(page.locator('[data-component="WeekCard"], #username-prompt').first()).toBeVisible()
}

// Settings as persisted in IndexedDB. A goto/reload right after a tap can beat
// settings.update()'s write; polling this is the real "it's saved" signal.
function storedSettings(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('coach-pedro-ai', 2)
    req.onsuccess = () => {
      const db = req.result
      const get = db.transaction('settings', 'readonly').objectStore('settings').get('settings')
      get.onsuccess = () => { db.close(); resolve(get.result || null) }
      get.onerror = () => reject(get.error)
    }
    req.onerror = () => reject(req.error)
  }))
}

// Warmup/stretch sheet (Hoy v2): walks the → arrow until the last move, where
// it turns off. The arrow is the first «Siguiente» in the sheet (the dock's
// comes after it).
async function goToLastMove(page) {
  const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
  for (let i = 0; i < 20 && await next.isEnabled(); i++) await next.click()
  await expect(next).toBeDisabled()
}

// Saltar hides the timer first and clears its caches after. A rest staged
// before that finishes would be wiped, or ignored as "already running".
async function waitRestCleared(page) {
  await expect.poll(() => page.evaluate(async () => {
    const timer = await (await caches.open('rest-timer')).match('/pending')
    const pending = await (await caches.open('rest-pending')).match('/pending')
    return !timer && !pending
  })).toBe(true)
}

// ═══════════════════════════ FULL USER FLOW ═══════════════════════════
// One journey through the whole app, starting EMPTY. Nothing is seeded: the
// test itself is the seed — profile, exercises, programs and the history all
// come in through the real UI (the past weeks through Tú › Copia de seguridad
// › Restaurar una copia). Days are placed relative to today, so it holds on
// whatever weekday it runs.

// Each phase runs through step(): `ran` proves at the end that every step in
// EXPECTED_STEPS actually executed, in order — not just that its name exists.
const ran = []
async function step(name, fn) {
  ran.push(name)
  await test.step(name, fn)
}

const WEEKDAY_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const WEEKDAY_NAMES_ES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function localDate(daysAgo = 0) {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000 - daysAgo * 86400000).toISOString().slice(0, 10)
}

// The simulated Worker for the whole flow. `api` is mutated by the test to
// steer it: friends (the league on the server), users (what search finds),
// exists, registerStatus. Every POST lands in `api.calls`. AI chat routes are
// registered on top where a step cares about their bodies.
async function mockWorker(page, api) {
  api.calls = []
  api.listUsers = []
  api.restStarts = []
  api.restCancels = []
  api.startPushes = 0
  await page.route(/\/api\/|rest-timer\/|push\/start/, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) })
    let body = null
    try { body = req.method() === 'POST' ? req.postDataJSON() : null } catch { body = req.postData() }
    if (body) api.calls.push({ path: url.pathname, body })
    const p = url.pathname
    if (p.endsWith('/api/ping')) return route.fulfill({ status: 405, headers: { 'Access-Control-Allow-Origin': '*' } })
    if (p.includes('rest-timer/start')) { api.restStarts.push(body); return json({ status: 'scheduled' }) }
    if (p.includes('rest-timer/cancel')) { api.restCancels.push(body); return json({ status: 'ok' }) }
    if (p.includes('push/start')) { api.startPushes++; return json({ status: 'sent' }) }
    if (p.endsWith('/api/friends/list')) {
      api.listUsers.push(url.searchParams.get('username'))
      return json({ friends: api.friends || [] })
    }
    if (p.endsWith('/api/friends/search')) {
      const q = (url.searchParams.get('q') || '').toLowerCase()
      return json({ results: (api.users || []).filter((u) => u.username.toLowerCase().includes(q)) })
    }
    if (p.endsWith('/api/friends/add')) {
      api.friends = [...(api.friends || []), (api.users || []).find((u) => u.username === body.friendUsername)]
      return json({ status: 'ok' })
    }
    if (p.endsWith('/api/friends/remove')) {
      api.friends = (api.friends || []).filter((f) => f.username !== body.friendUsername)
      return json({ status: 'ok' })
    }
    if (p.endsWith('/api/user/check')) return json({ exists: api.exists !== false })
    if (p.endsWith('/api/user/register')) return api.registerStatus === 500 ? json({ error: 'boom' }, 500) : json({ status: 'ok' })
    if (p.endsWith('/api/user/sync')) return json({ status: 'ok' })
    // Default: the post-workout coach analysis
    return json(api.analysis || { analysis: 'Buen trabajo.', verdict: 'positive', _provider: 'test' })
  })
}

async function backToYou(page) {
  await page.getByRole('button', { name: 'Tú', exact: true }).click()
  await expect(page.locator('#you-hub, #you-first-time')).toBeVisible()
}

async function createExercise(page, name, muscle) {
  // An empty list offers «Crear ejercicio»; after that it's the dock's +
  await page.getByRole('button', { name: /^(Crear ejercicio|Nuevo ejercicio)$/ }).click()
  const sheet = page.locator('#new-exercise-sheet')
  await sheet.getByLabel('Nombre').fill(name)
  await sheet.getByLabel('Músculo').fill(muscle)
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

// Delivers payload-less pushes (like the Worker's) to the real Service Worker.
// Headless Chromium refuses notification permission, so the last step —
// handing the card to the OS — is recorded instead; everything before it (the
// push event, reading the staged spec, choosing the card) is the real SW.
async function pushProbe(page, context) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  const cdp = await context.newCDPSession(page)
  let registrationId = null
  cdp.on('ServiceWorker.workerRegistrationUpdated', ({ registrations }) => {
    const mine = registrations.find(r => r.scopeURL === scope)
    if (mine) registrationId = mine.registrationId
  })
  await cdp.send('ServiceWorker.enable')
  await expect.poll(() => registrationId, { timeout: 5000 }).not.toBeNull()
  const sw = context.serviceWorkers()[0]
  const record = () => sw.evaluate(() => {
    self.__cards = []
    self.registration.showNotification = async (_title, opts) => { self.__cards.push(`${opts.tag}: ${opts.body}`) }
    self.registration.getNotifications = async () => []
  })
  await record()
  return {
    deliver: () => cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(scope).origin, registrationId, data: '' }),
    cards: () => sw.evaluate(() => self.__cards),
    clear: () => sw.evaluate(() => { self.__cards = [] }),
  }
}

// What the Service Worker caches when the OS start notification is tapped —
// Playwright can't tap a system notification, so the test stands in for it:
// the exercise payload + the flag, then the app comes back to the foreground.
async function tapRestNotification(page, payload, { burst = false } = {}) {
  await page.evaluate(async ([p, burst]) => {
    const cache = await caches.open('rest-pending')
    if (p) await cache.put('/pending', new Response(JSON.stringify(p)))
    await cache.put('/from-notification', new Response('1'))
    // iOS fires the foreground events back-to-back on a notification tap
    window.dispatchEvent(new Event('focus'))
    if (burst) {
      document.dispatchEvent(new Event('visibilitychange'))
      window.dispatchEvent(new Event('focus'))
    }
    await new Promise(r => setTimeout(r, 400))
  }, [payload, burst])
}

function cached(page, cacheName) {
  return page.evaluate(async (name) => {
    const res = await (await caches.open(name)).match('/pending')
    return res ? res.json() : null
  }, cacheName)
}

// Plan › Reprogramar › Mover: drags the handle of slot `from` onto slot `to`.
// With `cancel`, it lets go outside the list instead (which must undo it).
async function dragDay(page, from, to, { cancel = false } = {}) {
  const slots = page.locator('.drag-slot')
  // Later slots sit partly under the fixed tab bar — bring the lower one into
  // the clear, or elementFromPoint hits the tab bar and the drag never starts.
  await page.evaluate(([a, b]) => {
    const els = document.querySelectorAll('.drag-slot')
    const low = els[Math.max(a, b)].getBoundingClientRect()
    const safe = window.innerHeight - 110
    if (low.bottom > safe) window.scrollBy(0, low.bottom - safe)
  }, [from, to])
  const box0 = await slots.nth(0).boundingBox()
  const box1 = await slots.nth(1).boundingBox()
  const stepY = box1.y - box0.y
  const fromBox = await slots.nth(from).boundingBox()
  const hb = await slots.nth(from).locator('.drag-handle').boundingBox()
  const cx = hb.x + hb.width / 2
  const cy = hb.y + hb.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  if (cancel) {
    await page.mouse.move(cx, cy + stepY, { steps: 5 })
    await page.mouse.move(5, 5)
  } else {
    await page.mouse.move(cx, box0.y + to * stepY + (hb.y - fromBox.y) + hb.height / 2, { steps: 12 })
  }
  await page.mouse.up()
}

// Fires synthetic touch events at the detail's scroller, the way a finger
// swipe would, to exercise ExerciseDetail's swipe-to-navigate.
async function swipeDetail(page, dx) {
  await page.evaluate((dx) => {
    const el = document.querySelector('.detail-scroll')
    const touch = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 400 })
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(200)], bubbles: true, cancelable: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(200 + dx)], bubbles: true, cancelable: true }))
  }, dx)
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
  page.setDefaultTimeout(15000)
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

  await step('Step 0: First Run', async () => {
    await page.goto('today')
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

  await step('Step 1: Tú — Mis datos', async () => {
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
    await expect(page.locator('.app-shell')).toHaveCSS('zoom', '1')
    await page.locator('#units-kg').click()
    await expect.poll(async () => (await storedSettings(page))?.units).toBe('kg')
    await backToYou(page)
  })

  await step('Step 2: Tú — Ejercicios', async () => {
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
    await expect(page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo Z' })).toBeVisible()
    await page.locator('#exercise-search').fill('')
    await expect(page.locator('#ex-count')).toHaveText('8 ejercicios')
  })

  await step('Step 2b: Tú — Editor de ejercicio', async () => {
    // The open card only shows; the pencil opens the editor with every field
    const card = page.locator('[data-component="ExerciseCard"]')
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo Z' }).locator('.exercise-toggle').click()
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
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Remo con Barra Z' }).locator('.exercise-toggle').click()
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

  await step('Step 3: Tú — Programas', async () => {
    await page.goto('you')
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

    // ── Platícalo con el coach: the coach proposes first (kickoff hidden), it's
    // discussed, and «Crear este programa» sends the whole conversation ──
    const chatBodies = []
    let createBody = null
    await page.route((url) => url.href.includes('/api/ai/program-chat'), async (route) => {
      chatBodies.push(route.request().postDataJSON())
      const reply = chatBodies.length === 1
        ? 'Propuesta: por tu trabajo de oficina deberíamos priorizar espalda alta.'
        : 'Va, bajamos piernas a 1 día.'
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply, _provider: 'test' }) })
    })
    await page.route((url) => url.href.includes('/api/ai/generate-program'), async (route) => {
      createBody = route.request().postDataJSON()
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          program_name: 'Upper/Lower Acordado',
          weeks: [{ name: 'Semana 1', tag: '', days: [{ name: 'Espalda', weekday: 1, subtitle: '', duration_min: 60, exercises: [{ exercise_name: 'Peso Muerto', muscle: 'Back', sets: 4, reps: '8-12', rest_sec: 90 }] }] }],
          _provider: 'test',
        }),
      })
    })
    await page.locator('#you-row-programas').click()
    await page.locator('#create-program-btn').click()
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
    const ready = page.locator('[data-component="ProgramReady"]')
    await expect(ready).toContainText('Listo, Pedro.')
    await expect(ready).toContainText('«Upper/Lower Acordado» ya es tu programa activo.')
    await ready.getByRole('button', { name: 'Ver programa' }).click()
    await expect(activeCard).toContainText('Upper/Lower Acordado')

    // ── Pega tu rutina: a chat reads it back, «Crear este programa» creates it ──
    const pasteBodies = []
    await page.route((url) => url.href.includes('/api/ai/program-chat'), async (route) => {
      pasteBodies.push(route.request().postDataJSON())
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ reply: 'Entendí 1 día: Lunes · Press Banca 4 × 8.', _provider: 'test' }) })
    })
    await page.route((url) => url.href.includes('/api/ai/generate-program'), (route) => route.fulfill({
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
    await page.route((url) => url.href.includes('/api/ai/program-chat'), async (route) => {
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

    // ── Activar, Duplicar, Eliminar (with the confirmation in the sheet) ──
    const nuevo = cards.filter({ hasText: 'Programa Nuevo' }).first()
    await nuevo.getByRole('button', { name: 'Activar' }).click()
    await expect(activeCard).toContainText('Programa Nuevo')
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
  })

  await step('Step 4: Hoy — Before The First Workout', async () => {
    await page.goto('today')
    const header = page.locator('[data-component="PageHeader"]')
    await expect(header.locator('.page-header-eyebrow')).toContainText('Semana 1')
    await expect(header.locator('.page-header-title')).toHaveText('Empuje.')
    // The day title takes one line, ellipsized if long
    await expect(header.locator('.page-header-title')).toHaveCSS('text-overflow', 'ellipsis')
    expect(await lineCount(header.locator('.page-header-title'))).toBeLessThanOrEqual(1.3)
    await expect(header.locator('.page-header-sub')).toContainText('Pecho · Hombro')

    // Calentamiento open; Entrenamiento and Estiramiento wait as «Después»
    const warmup = page.locator('[data-phase="warmup"][data-state="open"]')
    await expect(warmup.locator('.exercise-row').first()).toBeVisible()
    await expect(page.locator('[data-phase="training"]')).toContainText('Después')
    await expect(page.locator('[data-phase="stretch"]')).toContainText('Después')
    await expect(page.locator('[data-component="PhaseCard"]')).toHaveCount(0)
    await expect(page.locator('#today')).not.toContainText(/v\d+\.\d+ ·/)
    await expect(page.getByRole('button', { name: '↻' })).toBeVisible()

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
    await expect(page.locator('.page-header-title')).toHaveText('Empuje.')
    await expect(banner).toHaveCount(0)
  })

  // Filled in by Step 5 from the exported exercises file
  const ids = {}

  await step('Step 5: Tú — Copia de seguridad', async () => {
    const fs = require('fs')
    const os = require('os')
    const path = require('path')
    await page.goto('you')
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

    // Exportar ejercicios: the file has every exercise, with its id
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#export-exercises-row').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^ejercicios-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(resultSheet).toContainText('7 ejercicios exportados')
    await page.getByRole('button', { name: 'Listo' }).click()
    const exported = JSON.parse(fs.readFileSync(await download.path(), 'utf8'))
    expect(exported).toHaveLength(7)
    const idOf = (re) => exported.find(e => re.test(e.name)).id
    Object.assign(ids, {
      bench: idOf(/Banca/), military: idOf(/Militar/), dips: idOf(/Fondos/),
      squat: idOf(/Sentadilla/), deadlift: idOf(/Muerto/), long: idOf(/Flexiones/),
    })

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

    // The exercise you already had kept its own muscle; the new one is there
    await page.goto('you')
    await page.locator('#you-row-ejercicios').click()
    await expect(page.locator('#you-ejercicios')).toContainText('Curl de Bíceps')
    await expect(page.locator('#you-ejercicios')).not.toContainText('Músculo Pisado')
    await expect(page.locator('#ex-count')).toHaveText('8 ejercicios')

    // A hand-written alternative for Press Militar (no dictionary entry, so
    // once swapped in it has no suggestions of its own)
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Militar' }).locator('.exercise-toggle').click()
    const card = page.locator('[data-component="ExerciseCard"]')
    await card.getByRole('button', { name: 'Editar ejercicio' }).click()
    await editSheet.getByRole('button', { name: 'Añadir alternativa' }).click()
    await page.locator('#alt-search').fill('press casero de prueba')
    await page.locator('#alt-search-sheet').getByRole('button', { name: 'Escribir «press casero de prueba» a mano' }).click()
    await editSheet.getByRole('button', { name: 'Guardar' }).click()
    await expect(editSheet).toHaveCount(0)
    await expect(card).toContainText('press casero de prueba')
  })

  const registers = () => api.calls.filter((c) => c.path.endsWith('/api/user/register'))
  const card = page.locator('[data-component="WeekCard"]')
  const list = page.locator('#friends-list')
  const addBtn = page.getByRole('button', { name: 'Agregar amigo' })
  const sheetClose = () => page.locator('[data-component="Sheet"]').getByRole('button', { name: 'Cerrar' }).click()
  let streakBefore = 0

  await step('Step 5b: Amigos — Primera vez y racha viva', async () => {
    await page.goto('friends')
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

  await step('Step 6: Plan — Weekdays And Weeks', async () => {
    await page.goto('plan')
    const slotCard = (i) => page.locator('#plan-days-grid .day-card')
      .filter({ has: page.locator('.badge-day', { hasText: WEEKDAY_SHORT[i] }) })
    // Each day sits on its own weekday; the rest stay free, with no "moved" chips
    for (let i = 0; i < 7; i++) {
      if (i === t) await expect(slotCard(i).locator('.day-title')).toHaveText('Empuje')
      else if (i === (t + 2) % 7) await expect(slotCard(i).locator('.day-title')).toHaveText('Tirón')
      else await expect(slotCard(i).locator('.day-empty')).toContainText('Sin entrenamiento')
    }
    await expect(page.locator('#plan-days-grid .moved-chip')).toHaveCount(0)
    await expect(page.locator('.meta-label', { hasText: /^\d+m$/ }).first()).toBeVisible()

    // Switching weeks shows the new week's day, and the detail only walks that week
    await page.locator('button:has-text("Semana 2")').first().click()
    await expect(slotCard(t).locator('.day-title')).toHaveText('Pierna')
    await expect(page.locator('#plan-days-grid')).toContainText('Sentadilla')
    await expect.poll(async () => (await storedSettings(page))?.currentWeekIdx).toBe(1)
    await openFromPlan(page, 'Sentadilla')
    await expect(sheetHead(page)).toContainText('1 de 2')
    await page.getByRole('button', { name: 'Siguiente' }).first().click()
    await expect(page.locator('.tn-name')).toContainText('Muerto')
    await expect(page.getByRole('button', { name: 'Siguiente' }).first()).toBeDisabled()
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await page.locator('button:has-text("Semana 1")').first().click()
    await expect(slotCard(t).locator('.day-title')).toHaveText('Empuje')
    await expect.poll(async () => (await storedSettings(page))?.currentWeekIdx).toBe(0)
  })

  await step('Step 6b: Plan — Exercise Detail', async () => {
    await openFromPlan(page, 'Banca')
    // Position, media searches, name and arrows
    await expect(sheetHead(page)).toContainText('1 de 4')
    await expect(page.getByRole('button', { name: 'Buscar en Google' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Buscar en TikTok' })).toBeVisible()
    await expect(page.locator('.tn-name')).toContainText('Banca')
    const prev = page.getByRole('button', { name: 'Anterior', exact: true }).first()
    const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
    await expect(prev).toBeDisabled()
    await expect(next).toBeEnabled()

    // Objective (the 5 s typed in the editor), coach, tabs, weight and dock
    const target = page.locator('[data-component="TargetPanel"]')
    await expect(target).toContainText('4×8-10')
    await expect(target).toContainText('0:05')
    await expect(page.getByRole('button', { name: /Pregúntale al coach/ })).toContainText('IA')
    for (const tab of ['Registrar', 'Historial']) await expect(page.locator('.seg-btn', { hasText: tab })).toBeVisible()
    const weightPanel = page.locator('[data-component="WeightPanel"]')
    await expect(weightPanel).toContainText('Peso de hoy')
    await expect(weightPanel).toContainText('Última vez 75 kg')
    const weightInput = page.locator('input[inputmode="decimal"]').first()
    await expect(weightInput).toHaveValue('75')
    await expect(logDock(page).getByRole('button', { name: 'Iniciar descanso' })).toBeVisible()
    await expect(logDock(page).getByRole('button', { name: 'Registrar 75 kg' })).toBeVisible()
    await expect(logDock(page)).toContainText(/Después: Press Militar.* · 3 × 10-12/)

    // Its history came back with the restored copy
    const historialTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Historial' })
    const registrarTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Registrar' })
    const hero = page.locator('[data-component="ProgressHero"]')
    const emptyHistory = page.getByText('Aquí verás cómo subes')

    // Siguiente → Press Militar: never done, so a note, 0 kg and Registrar off
    await next.click()
    await expect(page.locator('.tn-name')).toContainText('Militar')
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
    await expect(page.locator('.tn-name')).toContainText('Banca')
    await expect(emptyHistory).not.toBeVisible()
    await expect(hero).toContainText('Tu récord')
    await expect(hero).toContainText('75')
    await registrarTab.click()
    await expect(weightInput).toHaveValue('75')

    // Swiping walks the same way
    await swipeDetail(page, -150)
    await expect(page.locator('.tn-name')).toContainText('Militar')
    await expect(weightInput).toHaveValue('')
    await page.getByRole('button', { name: 'Más peso' }).click()
    await expect(logDock(page).getByRole('button', { name: 'Registrar 5 kg' })).toBeEnabled()
    await swipeDetail(page, 150)
    await expect(page.locator('.tn-name')).toContainText('Banca')
    await expect(weightInput).toHaveValue('75')

    // The coach: quick questions on screen, body parts for pain
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
    await expect(page.locator('[data-component="ExerciseDetail"]')).toHaveCount(0)
    // Nothing was registered from Plan
    expect((await readLogs(page)).filter(l => l.date === localDate(0))).toHaveLength(0)
  })

  await step('Step 6c: Plan — Reprogramar', async () => {
    const slots = page.locator('.drag-slot')
    const free = (t + 1) % 7
    const tiron = (t + 2) % 7
    await page.locator('#plan-reprogram-btn').click()
    await expect(page.getByText('Reprogramando esta semana')).toBeVisible()
    await page.locator('#plan-move-btn').click()
    await expect(slots).toHaveCount(7)
    await expect(page.locator('.drag-handle')).toHaveCount(2)

    // Dragging a day onto another one swaps them
    await dragDay(page, t, tiron)
    await expect(slots.nth(tiron).getByText('Empuje')).toBeVisible()
    await expect(slots.nth(tiron).locator('.moved-chip')).toContainText(`desde ${WEEKDAY_SHORT[t]}`)
    await expect(slots.nth(t).getByText('Tirón')).toBeVisible()
    await expect(slots.nth(t).locator('.moved-chip')).toContainText(`desde ${WEEKDAY_SHORT[tiron]}`)

    // Releasing outside the list cancels
    await dragDay(page, tiron, free, { cancel: true })
    await expect(slots.nth(tiron).getByText('Empuje')).toBeVisible()
    await expect(page.locator('.moved-chip')).toHaveCount(2)

    // Reset clears it; «Me salté un día» moves every workout one day forward
    await page.locator('#plan-reset-btn').click()
    await expect(page.locator('.moved-chip')).toHaveCount(0)
    await page.locator('#plan-shift-btn').click()
    await expect(page.locator('.drag-slot', { hasText: 'Empuje' }).locator('.moved-chip')).toContainText(`desde ${WEEKDAY_SHORT[t]}`)
    await expect(page.locator('.drag-slot', { hasText: 'Tirón' }).locator('.moved-chip')).toContainText(`desde ${WEEKDAY_SHORT[tiron]}`)
    await page.locator('#plan-reset-btn').click()
    await expect(page.locator('.moved-chip')).toHaveCount(0)

    // Today's workout dragged onto tomorrow's free slot
    await dragDay(page, t, free)
    await expect(slots.nth(free).getByText('Empuje')).toBeVisible()
    await expect(slots.nth(free).locator('.moved-chip')).toContainText(`desde ${WEEKDAY_SHORT[t]}`)
    await expect(slots.nth(t).getByText('Sin entrenamiento')).toBeVisible()

    // Listo → a persistent banner, and it survives a reload
    await page.locator('#plan-reprogram-btn').click()
    await expect(page.locator('#plan-changes-banner')).toContainText('2 cambios')
    await page.reload()
    await expect(page.locator('#plan-changes-banner')).toBeVisible()

    // Hoy follows the plan: today is a rest day now
    await page.goto('today')
    await expect(page.locator('.hero-title', { hasText: 'Descanso' })).toBeVisible()

    // Back to the routine: reset and Listo leave no override behind
    await page.goto('plan')
    await page.locator('#plan-reprogram-btn').click()
    await page.locator('#plan-reset-btn').click()
    await page.locator('#plan-reprogram-btn').click()
    await expect(page.locator('#plan-changes-banner')).toHaveCount(0)
    await expect.poll(async () => Object.keys((await storedSettings(page))?.rescheduleWeekOrder || {}).length).toBe(0)

    // Reprogramar + Listo with no edits must not persist an identity override
    // either (it used to mask the weekdays forever)
    await page.locator('#plan-reprogram-btn').click()
    await page.locator('#plan-reprogram-btn').click()
    // Deliberate: proves a write does NOT happen, so there is no event to wait on.
    await page.waitForTimeout(400)
    expect(Object.keys((await storedSettings(page))?.rescheduleWeekOrder || {})).toHaveLength(0)
    await page.reload()
    await expect(page.locator('#plan-days-grid .day-card').filter({ has: page.locator('.badge-day', { hasText: WEEKDAY_SHORT[t] }) }).locator('.day-title')).toHaveText('Empuje')

    await page.goto('today')
    await expect(page.locator('.page-header-title')).toHaveText('Empuje.')
  })

  await step('Step 7: Hoy — Calentamiento', async () => {
    // With a history the dock no longer greets a first workout
    await expect(todayDock(page)).toContainText(/\d+ movimientos, uno a la vez/)
    const warmup = page.locator('[data-phase="warmup"]')
    const moves = (await warmup.locator('.xc-n').allTextContents()).map(s => s.trim())
    expect(moves.length).toBeGreaterThanOrEqual(3)
    const n = moves.length
    const arrowPrev = page.locator('.tn-nav').getByRole('button', { name: 'Anterior' })
    const arrowNext = page.locator('.tn-nav').getByRole('button', { name: 'Siguiente' })
    const dockNext = logDock(page).getByRole('button', { name: 'Siguiente' })

    await todayDock(page).getByRole('button', { name: /Empezar calentamiento/ }).click()
    await expect(sheetHead(page)).toContainText(`Calentamiento · 1 de ${n}`)
    await expect(page.locator('.tn-name')).toHaveText(moves[0])
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
      await expect(warmup.locator('.exercise-row').nth(0)).toHaveAttribute('data-state', 'done')
      await expect(warmup.locator('.exercise-row').nth(1)).not.toHaveAttribute('data-state', 'done')
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
    await expect(watchToast).not.toBeVisible({ timeout: 5000 })

    // «Empezar con …» hands over to the first exercise
    await logDock(page).getByRole('button', { name: /Empezar con Press de Banca/ }).click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toBeVisible()
    await expect(page.locator('.tn-name')).toContainText('Banca')
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
    if (await training.locator('.ph-row').count()) await training.locator('.ph-row').click()
    await training.locator('.exercise-row', { hasText: name }).first().click()
    await expect(page.locator('[data-component="ExerciseDetail"]')).toBeVisible()
  }

  await step('Step 8: Hoy — Registrar Press Banca', async () => {
    await openRow('Banca')
    await expect(page.locator('.tn-name')).toContainText('Banca')
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
    const altTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Alternativas' })
    const registrarTab = page.locator('[data-component="ExerciseDetail"] .seg-btn', { hasText: 'Registrar' })
    const alts = page.locator('[data-component="AlternativesTab"]')
    await altTab.click()
    await expect(alts).toContainText(/Sugeridas para/)
    const dumbbell = alts.locator('.exercise-row', { hasText: 'Mancuernas' })
    await expect(dumbbell).toBeVisible()
    await expect(dumbbell.locator('img')).toHaveAttribute('src', /.+/)
    const search = logDock(page).locator('input')
    expect((await search.boundingBox()).y).toBeGreaterThan(page.viewportSize().height / 2)
    await dumbbell.click()
    await expect(registrarTab).toHaveClass(/seg-active/)
    await expect(page.locator('.tn-name')).toContainText('Mancuernas')
    await weightInput.fill('30')
    await logDock(page).getByRole('button', { name: 'Registrar 30 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await page.reload()
    await openRow('Mancuernas')
    await expect(page.locator('.tn-name')).toContainText('Mancuernas')
    await expect(weightInput).toHaveValue('30')
    await altTab.click()
    await alts.getByRole('button', { name: /Volver a Press de Banca/ }).click()
    await expect(page.locator('.tn-name')).toContainText('Banca')
    await expect(page.locator('.tn-name')).not.toContainText('Mancuernas')
    await registrarTab.click()
    await expect(weightInput).toHaveValue('80')
  })

  const timer = page.locator('[data-component="SeriesModeScreen"]')
  const timerTime = timer.locator('.sms-time')
  const serieLabel = timer.locator('.sms-serie-label')
  const wrsValue = (i) => timer.locator('.wrs-row').nth(i).locator('.wrs-value')
  const timerMain = timer.locator('.sms-dock .btn-pri')
  // A 5 s rest running out (with room for a loaded machine)
  const waitPhase = (phase) => expect(timer).toHaveAttribute('data-phase', phase, { timeout: 10000 })

  await step('Step 8b: Rest Timer — Iniciar y pantalla completa', async () => {
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
    await expect(timer.locator('.ms-dot.current')).toHaveCount(1)
    await expect(timer.locator('.ms-dot.done')).toHaveCount(0)
    await expect(timer.locator('.sms-chip')).toContainText('Pecho')
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
    // done push is due) is still the start card, never «Descanso terminado»
    await page.evaluate(async () => {
      const cache = await caches.open('push-pending')
      const s = await (await cache.match('/pending')).json()
      const shift = 16000 - (Date.now() - s.startedAt)
      s.startedAt -= shift
      s.doneAt -= shift
      await cache.put('/pending', new Response(JSON.stringify(s)))
    })
    await probe.deliver()
    await expect.poll(probe.cards, { timeout: 5000 }).toEqual(['rest-start: 4×8-10 · Descanso en curso · Tap para ver ▸'])
    await probe.clear()

    // The start notification leaves 3 s after the tap, on its own, once
    await expect.poll(() => api.startPushes, { timeout: 6000 }).toBe(pushes0 + 1)

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
    // Deliberate: proves no second start notification follows, so there is no event to wait on.
    await page.waitForTimeout(1000)
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
    await banner.locator('.rtb-open').click()
    await expect(timer).toBeVisible()
    await expect(banner).toHaveCount(0)

    // Saltar cancels the queued push and clears the timer
    const cancels = api.restCancels.length
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveCount(0)
    await expect.poll(() => api.restCancels.length).toBe(cancels + 1)
    expect(api.restCancels.at(-1).tag).toBeTruthy()
    expect(api.restCancels.at(-1).deviceId).toBeTruthy()
    await waitRestCleared(page)

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

  await step('Step 8c: Rest Timer — Ciclo de series', async () => {
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
    await expect(timer.locator('.ms-dot.done')).toHaveCount(2)
    await expect(timerMain).toContainText('Registrar')
    await expect.poll(() => api.startPushes, { timeout: 6000 }).toBe(pushes + 1)

    // Serie 3 heavier: «Registrar» folds the fields while the rest goes on
    await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await expect(wrsValue(0)).toContainText('85')
    await timerMain.click()
    await expect(timer).toContainText('Serie 3 registrada')
    await expect(timer).toContainText('85 kg × 10')
    await waitPhase('saved')
    await expect(timer).toContainText('Serie 3 guardada')
    // The first set that differs turns today's log into blocks
    await expect.poll(async () => (await benchLog())?.sets).toBe(3)
    log = await benchLog()
    expect(log.blocks).toEqual([{ sets: 2, reps: 10, weight: 80 }, { sets: 1, reps: 10, weight: 85 }])
    expect(log.weight).toBe(85)

    // Serie 4, the last, short of the 8-10 target: 85 × 7. Registering it
    // ends on the summary instead of a next serie.
    await expect(timerMain).toContainText('Empezar serie 4')
    await timerMain.click()
    await expect(serieLabel).toContainText('Serie 4 de 4')
    await expect(wrsValue(0)).toContainText('85')
    for (let i = 0; i < 3; i++) await timer.getByRole('button', { name: 'Menos reps' }).click()
    await expect(wrsValue(1)).toContainText('7')
    await timerMain.click()
    await expect(timer).toHaveAttribute('data-phase', 'confirm', { timeout: 10000 })
  })

  await step('Step 8d: Rest Timer — Confirma tus series', async () => {
    const benchLog = async () => (await todayLogOf(ids.bench))[0]
    await expect(timer).toContainText('Completado')
    await expect(timer).toContainText('Confirma tus series')
    await expect(timer.locator('.scs-eyebrow')).toContainText(/press/i)
    await expect(timerMain).toHaveCount(0)
    await expect(timer.locator('.scs-meta')).toContainText('objetivo 8–10 reps')
    const rows = timer.locator('.scs-row')
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
    const save = timer.locator('.scs-save')
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
    await timer.locator('.wrs-row').nth(1).locator('.wrs-center').click()
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
  const tnName = page.locator('.tn-name')
  const altTab = detail.locator('.seg-btn', { hasText: 'Alternativas' })
  const registrarTab = detail.locator('.seg-btn', { hasText: 'Registrar' })
  const historialTab = detail.locator('.seg-btn', { hasText: 'Historial' })
  const alts = page.locator('[data-component="AlternativesTab"]')
  const navNext = page.locator('.tn-nav').getByRole('button', { name: 'Siguiente' })
  const navPrev = page.locator('.tn-nav').getByRole('button', { name: 'Anterior' })
  const closeDetail = async () => {
    await page.getByRole('button', { name: 'Cerrar' }).first().click()
    await expect(detail).toHaveCount(0)
  }

  await step('Step 8e: Hoy — Press Militar', async () => {
    await openRow('Militar')
    await expect(tnName).toContainText('Militar')

    // The hand-written alternative has no suggestions of its own
    await altTab.click()
    await alts.locator('.exercise-row', { hasText: 'press casero de prueba' }).click()
    await expect(tnName).toContainText(/press casero de prueba/i)
    await altTab.click()
    await expect(alts).toContainText('Sin sugerencias para este')
    await alts.getByRole('button', { name: /Volver a Press Militar/ }).click()
    await expect(tnName).toContainText('Militar')
    await registrarTab.click()

    // Serie 1 straight from the timer: never done, so it starts from nothing
    await logDock(page).getByRole('button', { name: 'Iniciar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await expect(serieLabel).toContainText('Serie 1 de 3')
    await expect(wrsValue(1)).toContainText('12')
    for (let i = 0; i < 8; i++) await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await expect(wrsValue(0)).toContainText('40')
    await timerMain.click()
    await waitPhase('saved')
    // «Terminar» closes the cycle for this exercise, keeping what was registered
    await timer.getByRole('button', { name: 'Terminar ejercicio' }).click()
    await expect(timer).toHaveCount(0)
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.sets).toBe(1)
    await closeDetail()

    // Hoy: Banca done, Militar in progress with its marks, the dock on the next set
    const bench = training.locator('.exercise-row').nth(0)
    const military = training.locator('.exercise-row').nth(1)
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
    // Offline, the dock says everything is still saved on the phone
    await goOffline(page, context)
    await expect(todayDock(page)).toContainText('Sin internet también se guarda todo en tu teléfono.')
    await context.setOffline(false)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await expect(todayDock(page)).not.toContainText('Sin internet')
    await todayDock(page).getByRole('button', { name: /Registrar serie 2 de Press Militar/ }).click()
    await expect(tnName).toContainText('Militar')
    expect((await storedSettings(page)).sessionState.endedAt ?? null).toBeNull()

    // Series 2 and 3 through the timer, then «Guardar 3 series»
    await logDock(page).getByRole('button', { name: /Iniciar descanso|Descansar/ }).click()
    await expect(serieLabel).toContainText('Serie 2 de 3')
    await expect(wrsValue(0)).toContainText('40')
    await timerMain.click()
    await waitPhase('saved')
    await timerMain.click()
    await expect(serieLabel).toContainText('Serie 3 de 3')
    await timerMain.click()
    await expect(timer).toHaveAttribute('data-phase', 'confirm', { timeout: 10000 })
    await expect(timer.locator('.scs-row')).toHaveCount(3)
    await timer.locator('.scs-save').click()
    await expect(timer).toHaveCount(0)
    await expect.poll(async () => (await todayLogOf(ids.military))[0]?.sets).toBe(3)
    await waitRestCleared(page)
  })

  await step('Step 8f: Hoy — Fondos por una alternativa', async () => {
    await navNext.click()
    await expect(tnName).toContainText('Fondos')

    // The search in the dock covers the whole dictionary
    await altTab.click()
    await expect(alts.locator('.exercise-row').first()).toBeVisible()
    const curated = await alts.locator('.exercise-row').count()
    const search = logDock(page).locator('input')
    await search.fill('zzzxqy')
    await expect(alts).toContainText('No encontramos «zzzxqy»')
    await expect(alts.locator('.exercise-row')).toHaveCount(0)
    await alts.getByRole('button', { name: 'Borrar búsqueda' }).click()
    await expect(alts.locator('.exercise-row')).toHaveCount(curated)
    // Without accents it finds exercises that aren't curated alternatives
    await search.fill('sentadilla hack')
    await expect(alts.locator('.exercise-row').first()).toContainText('Sentadilla Hack')
    await expect(alts).toContainText(/resultado/)
    await alts.locator('.exercise-row').first().click()
    await expect(tnName).toContainText('Sentadilla Hack')
    await expect(registrarTab).toHaveClass(/seg-active/)

    // A set tapped right before Saltar lands on its own exercise (the write is debounced)
    const logsBefore = (await readLogs(page)).filter(l => l.date === localDate(0)).length
    await logDock(page).getByRole('button', { name: 'Iniciar descanso' }).click()
    await expect(timer).toHaveAttribute('data-phase', 'registering')
    await timer.getByRole('button', { name: 'Subir 5 kg' }).click()
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect.poll(async () => (await readLogs(page)).filter(l => l.date === localDate(0)).length).toBe(logsBefore + 1)
    const altLog = (await readLogs(page)).find(l => l.date === localDate(0) && ![ids.bench, ids.military, ids.dips, ids.long].includes(l.exerciseId) && l.weight === 5)
    expect(altLog, 'the skipped set is saved on the alternative').toBeTruthy()
    await waitRestCleared(page)

    // Registered under the alternative, it still counts as today's Fondos
    await weightInput.fill('60')
    await logDock(page).getByRole('button', { name: 'Registrar 60 kg' }).click()
    await expect(savedPanel).toBeVisible()
    await closeDetail()
    const altRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Sentadilla Hack' })
    await expect(altRow).toHaveAttribute('data-done', 'true')
    await expect(altRow.locator('.xc-ok')).toBeVisible()
    const longRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Flexiones dinámicas' })
    await expect(longRow).toHaveAttribute('data-done', 'false')
    // A long exercise name takes at most two lines in its row
    expect(await lineCount(longRow.locator('.xc-n'))).toBeLessThanOrEqual(2.05)
    // One exercise left: the session clock keeps running
    await expect(page.locator('[data-component="SessionClock"]')).toBeVisible()
    expect((await storedSettings(page)).sessionState.endedAt ?? null).toBeNull()
  })

  await step('Step 8g: Hoy — Series por bloque', async () => {
    await openRow('Flexiones dinámicas')
    // The name takes at most two lines in the detail
    expect(await lineCount(tnName)).toBeLessThanOrEqual(2.05)

    // Three blocks, edited tile by tile, registered as ONE log with their real volume
    await page.getByRole('button', { name: /Series con pesos distintos/ }).click()
    const blockRows = page.locator('[data-component="BlockRow"]')
    await expect(blockRows).toHaveCount(1)
    const field = (b, i) => blockRows.nth(b).locator('.block-field-input').nth(i)
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
    // Deliberate: proves nothing is written for this rest, so there is no event to wait on.
    await page.waitForTimeout(1200)
    expect(JSON.stringify(await todayLogOf(ids.long))).toBe(longBefore)
    await timer.getByRole('button', { name: 'Saltar descanso' }).click()
    await expect(timer).toHaveCount(0)
    await waitRestCleared(page)
    await closeDetail()
  })

  let endedAt = null
  await step('Step 9: Hoy — Terminar entrenamiento', async () => {
    // Closing the last exercise ends the training: «Estira bb» with the time,
    // and the session clock stops there — stretching is not counted
    const stretchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })
    await expect(stretchToast).toBeVisible()
    await expect(stretchToast).toContainText(/seg|min/)
    await expect(page.locator('[data-component="SessionClock"]')).toHaveCount(0)
    await expect.poll(async () => (await storedSettings(page))?.sessionState?.endedAt ?? null).not.toBeNull()
    endedAt = (await storedSettings(page)).sessionState.endedAt
    await expect(stretchToast).toHaveCount(0, { timeout: 6000 })

    // Training folds as «4 de 4 hechos»; unfolded, every row is done (Fondos
    // through its alternative), and the dock closes the phase
    await expect(training).toContainText('4 de 4 hechos')
    await training.locator('.ph-row').click()
    const rows = page.locator('[data-phase="training"] [data-component="ExerciseRow"]')
    await expect(rows).toHaveCount(4)
    for (let i = 0; i < 4; i++) await expect(rows.nth(i)).toHaveAttribute('data-done', 'true')
    await expect(rows.nth(0).locator('.xc-ok')).toBeVisible()
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

  await step('Step 9b: Hoy — Estiramiento', async () => {
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
        await expect(sheet.getByRole('button', { name: 'Buscar en Google' })).toBeVisible()
        await expect(sheet.getByRole('button', { name: 'Buscar en TikTok' })).toBeVisible()
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

  await step('Step 9c: Hoy — Racha, esfuerzo y resumen', async () => {
    // The streak (the restored weeks + this one) waits for «Seguir»
    const streak = page.locator('#streak-overlay')
    await expect(streak).toBeVisible()
    await expect(streak).toContainText(/semanas? seguidas?/)
    // Deliberate: proves it doesn't close by itself, so there is no event to wait on.
    await page.waitForTimeout(3000)
    await expect(streak).toBeVisible()
    await streak.getByRole('button', { name: 'Seguir' }).click()
    await expect(streak).toHaveCount(0)

    // Effort: four options, no emojis. «Ahora no» leaves the duration and a way back
    const effort = page.locator('#effort-overlay')
    await expect(effort.locator('[data-effort]')).toHaveCount(4)
    expect(/\p{Extended_Pictographic}/u.test(await effort.innerText())).toBe(false)
    await effort.getByRole('button', { name: 'Ahora no' }).click()
    await expect(page.locator('.page-header-eyebrow')).toContainText('Hoy · terminado en')
    api.analysis = {
      analysis: 'Sesión sólida, buen control.', verdict: 'positive',
      proximo_objetivo: 'Press Banca → 87.5 kg', recommendations: ['Baja más lento en el Militar'],
      total_volume: 4200, pr_count: 1, _provider: 'test',
    }
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

  await step('Step 10: Historial — Constancia', async () => {
    await page.goto('history')
    // Today's session, with resolved names — never a raw exercise id
    await expect(page.locator('body')).toContainText('Completado')
    const dayDetail = page.locator('.cal-detail')
    await expect(dayDetail).toContainText('Press de Banca')
    await expect(dayDetail).toContainText('Press Militar')
    const bodyText = await page.locator('body').textContent()
    for (const id of Object.values(ids)) expect(bodyText).not.toContain(id)

    // A row of the day opens the same detail, with its alternatives too
    await dayDetail.locator('.exercise-row', { hasText: 'Banca' }).first().click()
    await expect(page.getByRole('button', { name: 'Buscar en Google' })).toBeVisible()
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
  })

  await step('Step 10b: Historial — Ejercicios', async () => {
    await page.getByRole('button', { name: 'Ejercicios' }).click()
    const cards = page.locator('.ex-card')
    await expect(cards.first()).toBeVisible()
    const all = await cards.count()
    expect(all).toBeGreaterThanOrEqual(5)
    // Press Banca: last 85 kg, +25 since the first restored 60, with its sparkline
    const benchCard = cards.filter({ hasText: 'Press de Banca con Barra' })
    await expect(benchCard.locator('.ex-last')).toContainText('85')
    await expect(benchCard.locator('.ex-delta')).toContainText('+25.0')
    await expect(benchCard.locator('.ex-sparkline-placeholder')).toHaveCount(0)
    // Peso Muerto came only from the copy: 90 → 100
    await expect(cards.filter({ hasText: 'Peso Muerto' }).locator('.ex-delta')).toContainText('+10.0')

    // No empty chip for the exercise without a muscle
    await expect(page.locator('.chips-row button').filter({ hasText: /^\s*$/ })).toHaveCount(0)
    // Filter by one muscle (Peso Muerto's, from the dictionary), then back to all
    const chip = page.locator('.chips-row').getByText('Isquiotibiales', { exact: true })
    await chip.click()
    await expect(cards.filter({ hasText: 'Peso Muerto' })).toHaveCount(1)
    await expect(cards.filter({ hasText: 'Banca' })).toHaveCount(0)
    await page.locator('.chips-row').getByText('Todos', { exact: true }).click()
    await expect(cards).toHaveCount(all)
  })

  await step('Step 11: Amigos — Liga después de entrenar', async () => {
    await page.goto('friends')
    // Today counts now: the week is done and the streak grew by one
    await expect(card.locator('.day').nth(t)).toHaveAttribute('data-day', 'done')
    await expect(card.locator('.num')).toHaveText(String(streakBefore + 1))
    await expect(card).toContainText('semanas seguidas')
    await expect(page.locator('body')).not.toContainText('0 semanas')
  })

  await step('Step 11b: Amigos — Liga chica y agregar', async () => {
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
    const items = page.locator('.sr-item')
    await addBtn.click()
    await expect(input).toBeFocused()
    await expect(sheet).toContainText('¿Tu amigo aún no tiene la app?')
    await input.fill('Ana')
    await expect(items).toHaveCount(2)
    const anaItem = items.filter({ has: page.locator('.sr-name', { hasText: /^Ana$/ }) })
    const anabelItem = items.filter({ has: page.locator('.sr-name', { hasText: 'Anabel' }) })
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

  await step('Step 11c: Amigos — Podio, detalle y datos viejos', async () => {
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

  await step('Step 12: Red — Sin conexión y ping', async () => {
    // With the network there from the start, nothing shows
    await page.goto('today')
    await waitForApp(page)
    await expect(banner).toHaveCount(0)
    await context.setOffline(true)
    await expect(banner).toContainText('Sin conexión')
    await context.setOffline(false)
    await expect(banner).toContainText('Conectado de nuevo')
    await expect(banner).toHaveCount(0, { timeout: 5000 })

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
    await expect(banner).toHaveCount(0, { timeout: 5000 })
    // Online: no periodic polling
    const count = pings.length
    // Deliberate: proves there is no polling, so there is no event to wait on.
    await page.waitForTimeout(3000)
    expect(pings.length).toBe(count)
  })

  await step('Step 12b: Offline — Las vistas y lo que pide internet', async () => {
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 })
    // The Worker unreachable for real: drop the simulated one
    await page.unrouteAll({ behavior: 'ignoreErrors' })
    await page.route(/\/api\/ping/, (route) => route.fulfill({ status: 405, headers: { 'Access-Control-Allow-Origin': '*' } }))
    await context.setOffline(true)

    // Every view opens from the cache, and a reload too
    await page.goto('plan')
    await expect(page.locator('#plan-days-grid .exercise-row', { hasText: 'Banca' })).toBeVisible({ timeout: 5000 })
    await expect(banner).toContainText('Sin conexión')
    await page.goto('history')
    await expect(page.getByRole('button', { name: 'Constancia' })).toBeVisible({ timeout: 5000 })
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
  })

  await step('Step 13: Idioma, TabBar y nombres largos', async () => {
    // English names everywhere, then back to Spanish
    await page.goto('you')
    await page.locator('#you-row-ajustes').click()
    const langBtn = page.locator('#lang-toggle-btn')
    await expect(langBtn).toContainText('Español')
    await langBtn.click()
    await page.locator('#language-sheet').getByRole('radio', { name: 'English' }).click()
    await expect.poll(async () => (await storedSettings(page))?.language).toBe('en')
    await page.goto('history')
    await expect(page.locator('body')).toContainText('Barbell Bench Press')
    await page.goto('you')
    await page.locator('#you-row-ajustes').click()
    await expect(langBtn).toContainText('English')
    await langBtn.click()
    await page.locator('#language-sheet').getByRole('radio', { name: 'Español' }).click()
    await expect.poll(async () => (await storedSettings(page))?.language).toBe('es')
    await page.goto('history')
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

  await step('Step 14: Copia — Teléfono nuevo', async () => {
    const fs = require('fs')
    await page.goto('you')
    await page.locator('#you-row-copia').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#save-backup-btn').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^training-backup-\d{4}-\d{2}-\d{2}\.json$/)
    await expect(page.locator('[data-component="ResultSheet"]')).toContainText('Copia guardada')
    await page.getByRole('button', { name: 'Listo' }).click()
    const filePath = await download.path()
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    const logs = await readLogs(page)
    expect(data.exerciseLogs).toHaveLength(logs.length)
    expect(data.exercises.length).toBeGreaterThanOrEqual(8)
    expect(data.programs.length).toBe(5)
    expect(data.settings.activeProgramId).toBe((await storedSettings(page)).activeProgramId)
    expect(data.settings.language).toBe('es')
    expect(data.exportedAt).toBeDefined()
    const trainedDays = new Set(logs.map(l => l.date)).size

    // A new phone: empty, until the copy comes back
    const phone = await browser.newContext({ baseURL: test.info().project.use.baseURL, viewport: { width: 390, height: 844 } })
    const p2 = await phone.newPage()
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
      await expect(restored.locator('[data-component="StatBlock"]').nth(1)).toContainText('5')
      await expect(restored.locator('[data-component="StatBlock"]').nth(2)).toContainText(`${data.exercises.length}`)
      await p2.reload()
      // Everything is back: exercises, profile, the active program and the username
      await p2.locator('#you-row-ejercicios').click()
      await expect(p2.locator('#ex-count')).toHaveText(`${data.exercises.length} ejercicios`)
      await p2.goto('you')
      await expect(p2.locator('[data-component="ProgramCard"].active')).toContainText('Torso Pierna')
      await p2.locator('#you-row-datos').click()
      await expect(p2.locator('#profile-row-height')).toContainText('180 cm')
      await expect(p2.locator('#profile-row-weight')).toContainText('80 kg')
      await p2.goto('friends')
      await p2.getByRole('button', { name: 'Mi perfil' }).click()
      await expect(p2.locator('[data-component="ProfileSheet"]')).toContainText('Pedro')
    } finally {
      await phone.close()
    }
  })

  await step('Step 14b: Eliminar un ejercicio con registros', async () => {
    // Deleting says how many logs go with it
    await page.goto('you')
    await page.locator('#you-row-ejercicios').click()
    const countBefore = parseInt(await page.locator('#ex-count').textContent(), 10)
    const dlLogs = (await readLogs(page)).filter(l => l.exerciseId === ids.deadlift).length
    await page.locator('[data-component="ExerciseListItem"]', { hasText: 'Peso Muerto' }).locator('.exercise-toggle').click()
    await page.locator('[data-component="ExerciseCard"]').getByRole('button', { name: 'Editar ejercicio' }).click()
    await page.locator('#edit-exercise-sheet').getByRole('button', { name: 'Eliminar ejercicio' }).click()
    const del = page.locator('#delete-exercise-sheet')
    await expect(del).toContainText(`Se borran también sus ${dlLogs} registros del historial. No se puede deshacer.`)
    await del.getByRole('button', { name: 'Eliminar', exact: true }).click()
    await expect(page.locator('[data-component="Toast"]')).toContainText('eliminado')
    await expect(page.locator('#ex-count')).toHaveText(`${countBefore - 1} ejercicios`)
    expect((await readLogs(page)).filter(l => l.exerciseId === ids.deadlift)).toHaveLength(0)
  })

  await step('Step 15: No Uncaught JS Errors', async () => {
    expect(jsErrors).toEqual([])
  })

  // Every step ran, in order — not just "its name is somewhere in the file"
  expect(ran).toEqual(EXPECTED_STEPS)
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
    await page.goto('today')
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

// ── Amigos v2 — liga semanal ──
// Spec: docs/superpowers/specs/2026-10-07-amigos-v2-liga-semanal-design.md.
// Friends built around today's date (the league week is always Monday →
// Sunday, so they hold whatever day the suite runs) — used by the full flow's
// Amigos steps and by «racha nueva» below, which seeds a broken streak.
const LEAGUE = {
  dateStr(d) {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  },
  today() {
    return LEAGUE.dateStr(new Date())
  },
  // Local date `days` after this week's Monday (negative = earlier weeks).
  fromMonday(days) {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - getDayIdx() + days)
    return LEAGUE.dateStr(d)
  },
  // Monday–Wednesday of the week `weeksAgo` weeks back: a completed week for a 4-day program.
  fullWeek(weeksAgo) {
    return [0, 1, 2].map((i) => ({ id: `log-w${weeksAgo}-${i}`, exerciseId: 'ex-bench', date: LEAGUE.fromMonday(-7 * weeksAgo + i), weight: 50, units: 'kg' }))
  },
  todayLog() {
    return { id: 'log-liga-today', exerciseId: 'ex-bench', date: LEAGUE.today(), weight: 50, units: 'kg' }
  },
  gymToday(seconds) {
    const date = LEAGUE.today()
    return { id: date, date, seconds, weekStart: LEAGUE.fromMonday(0) }
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
      sessionState: { date: LEAGUE.today(), phase: 2, todayExDone: 0 }, lastCoachAnalysis: null,
      rescheduleWeekOrder: {}, language: 'es', onboarded: true, username: 'TestUser',
      ...over,
    }
  },
  friend(username, minutes, over = {}) {
    return { username, streak: 3, exercisedToday: false, gymTime: minutes * 60, lastUpdate: new Date().toISOString(), ...over }
  },
}

// `api` fields: friends (the league on the server), users (what search can
// find), exists, registerStatus, renameStatus. Every POST body lands in
// `api.calls` and every list request's username in `api.listUsers`.
async function mockFriendsWorker(page, api) {
  api.calls = []
  api.listUsers = []
  await page.route(/\/api\//, async (route) => {
    const req = route.request()
    const url = new URL(req.url())
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    const body = req.method() === 'POST' ? req.postDataJSON() : null
    if (body) api.calls.push({ path: url.pathname, body })
    if (url.pathname.endsWith('/api/friends/list')) {
      api.listUsers.push(url.searchParams.get('username'))
      return json({ friends: api.friends || [] })
    }
    if (url.pathname.endsWith('/api/friends/search')) {
      const q = (url.searchParams.get('q') || '').toLowerCase()
      return json({ results: (api.users || []).filter((u) => u.username.toLowerCase().includes(q)) })
    }
    if (url.pathname.endsWith('/api/friends/add')) {
      api.friends = [...(api.friends || []), (api.users || []).find((u) => u.username === body.friendUsername)]
      return json({ status: 'ok' })
    }
    if (url.pathname.endsWith('/api/friends/remove')) {
      api.friends = (api.friends || []).filter((f) => f.username !== body.friendUsername)
      return json({ status: 'ok' })
    }
    if (url.pathname.endsWith('/api/user/check')) return json({ exists: api.exists !== false })
    if (url.pathname.endsWith('/api/user/register')) return api.registerStatus === 500 ? json({ error: 'boom' }, 500) : json({ status: 'ok' })
    if (url.pathname.endsWith('/api/user/rename')) return api.renameStatus === 409 ? json({ error: 'Ese usuario ya está tomado' }, 409) : json({ status: 'ok' })
    return json({ status: 'ok' })
  })
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
  await page.goto('today')
  const training = page.locator('[data-phase="training"]')
  if (await training.locator('.ph-row').count()) await training.locator('.ph-row').click()
  await training.locator('.exercise-row').first().click()
  await page.getByRole('button', { name: 'Más peso' }).first().click()
  await page.getByRole('button', { name: /^Registrar \d/ }).click()
  await expect(page.getByText('Registrado hoy')).toBeVisible()
}

// Apart from the flow: it needs a streak that broke weeks ago, while the
// flow's restored history is a streak that is alive.
test.describe('Amigos v2 — racha nueva', () => {
  test('never shows a 0 streak: progress of the week instead, and it moves after training', async ({ page }) => {
    const api = { friends: [] }
    await mockFriendsWorker(page, api)
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
    await page.goto('friends')
    await expect(card.locator('.num')).toHaveText('1 de 3')
    await expect(card.locator('.day').nth(getDayIdx())).toHaveAttribute('data-day', 'done')
    await expect(page.locator('body')).not.toContainText('0 semanas')
  })
})


// Changed 2026-10-14 (approved by Pedro): the «Editar usuario» pencil in Mi perfil is
// hidden for now, so «Cambiar usuario» can't be opened from the UI. This whole journey
// (rename on the Worker, taken name, survives reload) is commented until the pencil returns.
/*
test.describe('Amigos v2 — mi perfil y renombrar', () => {
  test('renames on the Worker, rejects a taken name, and keeps the new name after reload', async ({ page }) => {
    const api = { friends: [LEAGUE.friend('Ana', 60), LEAGUE.friend('Luis', 30)], renameStatus: 409 }
    await mockFriendsWorker(page, api)
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
*/

// ═══════════════════ Hoy v2 / Detalle v2 (spec 2026-10-15) ═══════════════════
// Base data of the spec: day «Empuje» (Press Banca Chest 4 × 8-10 / 120 s,
// Press Militar Shoulders 3 × 10-12 / 90 s), week «Semana 1» · «Volumen» ·
// BUILD, no Watch. Each scenario seeds once and then drives the real UI.

const V2 = {
  date(daysAgo = 0) {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000 - daysAgo * 86400000).toISOString().slice(0, 10)
  },
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
    return { id: `log-${exerciseId}-${daysAgo}`, exerciseId, date: V2.date(daysAgo), weight, units: 'kg', ...extra }
  },
  session(over = {}) {
    return { date: V2.date(0), phase: 1, todayExDone: 0, ...over }
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

function readLogs(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const req = indexedDB.open('coach-pedro-ai', 2)
    req.onsuccess = () => {
      const get = req.result.transaction('exerciseLogs', 'readonly').objectStore('exerciseLogs').getAll()
      get.onsuccess = () => { req.result.close(); resolve(get.result) }
    }
  }))
}

async function goOffline(page, context) {
  await context.setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
}

async function openFromPlan(page, name = 'Banca') {
  const row = page.locator('#plan-days-grid .exercise-row', { hasText: name })
  await expect(row).toBeVisible({ timeout: 5000 })
  await row.click()
  await expect(page.locator('[data-component="ExerciseDetail"]')).toBeVisible()
}

/** Number of text lines an element takes */
function lineCount(locator) {
  return locator.evaluate((el) => {
    const cs = getComputedStyle(el)
    const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2
    return el.getBoundingClientRect().height / lh
  })
}

const todayDock = (page) => page.locator('[data-component="NextStepDock"]')
const sheetHead = (page) => page.locator('[data-component="DetailSheetHead"]')
const logDock = (page) => page.locator('[data-component="LogDock"]')

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
        arrows: await y('.tn-nav'),
        name: await y('.tn-name'),
        main: await y('[data-component="LogDock"] [data-component="Button"] >> nth=-1'),
      }
    }

    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await expect(page.locator('.tn-name')).toHaveText('Mi ejercicio')
    const detail = await measure()
    await page.getByRole('button', { name: 'Cerrar' }).click()

    // «Oruga» (generic warmup) is the short one.
    await page.locator('[data-phase="warmup"] .ph-row').click()
    await page.locator('[data-phase="warmup"] .exercise-row', { hasText: 'Oruga' }).click()
    await expect(page.locator('.tn-name')).toHaveText('Oruga')
    const warmup = await measure()

    for (const key of Object.keys(detail)) {
      expect(Math.abs(detail[key] - warmup[key]), key).toBeLessThanOrEqual(2)
    }
    // Added 2026-10-15 (Pedro, «v2 · 12 Comparativa»): muscle + arrows on top,
    // the name below at full width — in both sheets.
    for (const m of [detail, warmup]) expect(m.arrows).toBeLessThan(m.name)
  })
})

