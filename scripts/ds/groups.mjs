// One function per design-system group. Each seeds once and then walks the
// real UI, capturing a card at every state worth designing against.
import { grab } from './capture.mjs'

const C = 'src/lib/components/'
const world = (S, over = {}) => ({
  exercises: S.exercises,
  exerciseLogs: S.logs(),
  gymSessions: S.gymSessions(),
  programs: [S.program(), S.secondProgram()],
  settings: S.settings(),
  ...over,
})
const comp = (name) => `[data-component="${name}"]`
const btn = (page, name) => page.getByRole('button', { name }).first()
/** Wait until no transient toast covers the screen. */
async function clearToasts(page) {
  await page.waitForTimeout(600)
  await page.locator(`${comp('CenterToast')}, ${comp('Toast')}`).first().waitFor({ state: 'detached', timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(300)
}

export const groups = {
  // ───────────────────────── Hoy + Detalle de ejercicio ─────────────────────────
  // Hoy v2 + Detalle v2 (2026-10-15). Writes «Hoy · Actual» (vistas/hoy2/) and
  // «Detalle de ejercicio · Actual» (vistas/detalle-ejercicio2/); the old
  // vistas/hoy and vistas/detalle-ejercicio stay as «· v1».
  async hoy({ open, S }) {
    await hoyScreens({ open, S })
    await moveSheets({ open, S })
    await detailScreens({ open, S })
  },

  // ───────────────────────────────── Plan ─────────────────────────────────
  // Plan v2 (2026-10-21). Writes «Plan · Actual» (vistas/plan2/); the old
  // vistas/plan cards stay as «Plan · v1».
  async plan({ open, S }) {
    await planScreens({ open, S })
  },

  // ─────────────────────────────── Historial ───────────────────────────────
  // Historial v2 (2026-10-22). Writes «Historial · Actual» (vistas/historial2/);
  // the old vistas/historial cards stay as «Historial · v1».
  async historial({ open, S }) {
    await historialScreens({ open, S })
  },

  // ──────────────────────────────── Amigos ────────────────────────────────
  async amigos({ open, S }) {
    const G = 'Amigos'
    const at = (p) => `vistas/amigos/${p}`
    const src = 'src/routes/friends/+page.svelte'
    // A sheet over the league: captured at the fold, like the phone shows it.
    const sheet = (p, path, name, subtitle, file) => p.card({ path: at(path), group: G, name, subtitle, source: C + file, screen: true, fold: true })
    const closeSheet = (p) => p.locator(`${comp('Sheet')} [aria-label="Cerrar"]`).click()

    const page = await open(world(S))
    await page.go('friends')
    await page.card({ path: at('pantalla'), group: G, name: 'Amigos · Liga', subtitle: 'tarjeta Tu racha, podio (top 3), lista y Agregar amigo', source: src, screen: true })
    await page.card({ path: at('leaderboard'), group: G, name: 'Leaderboard', subtitle: 'leyenda Entrenó hoy, podio 2-1-3 y filas', source: C + 'Leaderboard.svelte', specimens: [{ label: 'Leaderboard · 5 participantes', selector: comp('Leaderboard') }], viewport: '420x620' })
    await page.card({ path: at('league-row'), group: G, name: 'LeagueRow', subtitle: 'posición, avatar, racha y minutos; la mía con superficie y Tú', source: C + 'LeagueRow.svelte', specimens: [{ label: 'LeagueRow', selector: comp('LeagueRow'), distinct: true }], viewport: '420x260' })
    await page.card({ path: at('avatar'), group: G, name: 'Avatar', subtitle: 'inicial sobre tono derivado del usuario; punto si entrenó hoy', source: C + 'Avatar.svelte', specimens: [{ label: 'Avatar', selector: comp('Avatar'), distinct: 'html', row: true }], viewport: '420x200' })
    const weekAlive = await grab(page, [{ label: 'WeekCard · Tu racha', selector: comp('WeekCard') }])

    await page.locator('#friends-list [data-user="Ana"]').click()
    await sheet(page, 'pantalla-detalle', 'Amigos · Detalle de amigo', 'racha, minutos, comparación contra mí y Quitar de mi liga', 'FriendDetail.svelte')
    await btn(page, 'Quitar de mi liga').click()
    await sheet(page, 'pantalla-confirmar-quitar', 'Amigos · Confirmar quitar', 'Cancelar / Quitar, sin temporizador', 'FriendDetail.svelte')
    await closeSheet(page)

    await btn(page, 'Agregar amigo').click()
    await sheet(page, 'pantalla-agregar', 'Amigos · Agregar amigo', 'sin escribir: invita a compartir mi usuario', 'AddFriend.svelte')
    await page.locator('#friend-search-input').fill('a')
    await page.locator('.sr-item').first().waitFor({ timeout: 5000 })
    await sheet(page, 'pantalla-busqueda', 'Amigos · Agregar con resultados', 'En tu liga o botón Agregar', 'AddFriend.svelte')
    await page.card({ path: at('search-results'), group: G, name: 'SearchResults', subtitle: 'resultados: En tu liga / Agregar', source: C + 'SearchResults.svelte', specimens: [{ label: 'SearchResults', selector: comp('SearchResults') }], viewport: '420x320' })
    await page.locator('#friend-search-input').fill('rodrigx')
    await page.getByText('No encontramos').waitFor({ timeout: 5000 })
    await sheet(page, 'pantalla-sin-resultados', 'Amigos · Sin resultados', 'nadie con ese usuario: compartir el mío', 'AddFriend.svelte')
    await closeSheet(page)

    await btn(page, 'Mi perfil').click()
    await sheet(page, 'pantalla-mi-perfil', 'Amigos · Mi perfil', 'usuario, racha, amigos y Compartir mi usuario', 'ProfileSheet.svelte')
    // "Editar usuario" (pencil) is hidden (2026-10-14) — the rename flow is no longer
    // reachable from the UI, so its card is skipped. Kept for when it returns.
    // await btn(page, 'Editar usuario').click()
    // await sheet(page, 'pantalla-cambiar-usuario', 'Amigos · Cambiar usuario', 'campo arriba con contador y Guardar', 'ProfileSheet.svelte')
    await closeSheet(page)

    // The list fails first so the league comes from the cache, with its date.
    await page.route(/\/api\/friends\/list/, (route) => route.abort())
    await page.go('friends')
    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.waitForTimeout(800)
    await page.card({ path: at('pantalla-sin-conexion'), group: G, name: 'Amigos · Sin conexión', subtitle: 'liga guardada con su fecha; Agregar amigo desactivado', source: src, screen: true })
    await page.context().close()

    const one = await open(world(S), { friends: S.friends.slice(1, 2) })
    await one.go('friends')
    await one.card({ path: at('pantalla-un-amigo'), group: G, name: 'Amigos · Con 1 amigo', subtitle: 'sin podio; Agregar amigo primario', source: src, screen: true })
    await one.context().close()

    const alone = await open(world(S), { friends: [] })
    await alone.go('friends')
    await alone.card({ path: at('pantalla-sin-amigos'), group: G, name: 'Amigos · Sin amigos', subtitle: 'Entrena con tu gente: agregar o compartir', source: src, screen: true })
    await alone.context().close()

    const fresh = await open(world(S, { exerciseLogs: [], gymSessions: [] }), { registered: false })
    await fresh.go('friends')
    const weekNew = await grab(fresh, [{ label: 'WeekCard · Racha nueva', selector: comp('WeekCard') }])
    await fresh.card({ path: at('week-card'), group: G, name: 'WeekCard', subtitle: 'racha o progreso de la semana, minutos, siete días y frase', source: C + 'WeekCard.svelte', snaps: [weekAlive, weekNew], viewport: '800x420' })
    await btn(fresh, 'Mi perfil').click()
    await sheet(fresh, 'pantalla-sin-registrar', 'Amigos · Sin registrar', 'aún no pueden encontrarte: Registrar mi usuario', 'ProfileSheet.svelte')
    await fresh.context().close()

    const anon = await open(world(S, { settings: S.settings({ username: '', userName: '' }) }))
    await anon.go('friends')
    await anon.card({ path: at('pantalla-elegir-nombre'), group: G, name: 'Amigos · Elegir usuario', subtitle: 'primera vez: avatar, campo con contador y Listo', source: src, screen: true })
    await anon.context().close()
  },

  // ────────────────────────────────── Tú ──────────────────────────────────
  // Tú v2 (2026-10-13) removed the 4 tabs this walk went through and the
  // components it captured (ProfileCard, QuickSettingsCard, AccentToggle,
  // CardRow, ProgramCreateForm, ProgramEditorIACard, NormalizeCard,
  // NewExerciseForm, ActionRow…). The old cards stay in Claude Design as
  // «Tú · v1» (vistas/tu/) and the new design lives in «Tú · Nuevo». Pedro
  // skipped regenerating the Tú cards this round. The walk for the new view
  // (vistas/tu2/) only covers Ejercicios (Tú · Nuevo 03, 2026-10-14) so far;
  // the hub, Programas, Ajustes and Copia are still to be written.
  async tu({ open, S }) {
    // «Actual» = what the app looks like today, next to «Tú · Nuevo» (proposals) and «Tú · v1» (archive)
    const G = 'Tú · Actual'
    const at = (p) => `vistas/tu2/${p}`
    const src = C + 'ExercisesScreen.svelte'
    const shot = (p, path, name, subtitle, file = 'ExercisesScreen.svelte') => p.card({ path: at(path), group: G, name, subtitle, source: C + file, screen: true, fold: true })
    const page = await open(world(S))
    await page.go('you')
    await page.locator('#you-row-ejercicios').click()
    await page.waitForTimeout(500)
    await page.card({ path: at('ejercicios'), group: G, name: 'Tú · Ejercicios', subtitle: 'miniatura, nombre y músculo; buscador y + abajo', source: src, screen: true })

    const card = page.locator(comp('ExerciseCard'))
    await page.locator(comp('ExerciseListItem'), { hasText: 'Curl con Barra EZ' }).locator('.exercise-toggle').click()
    await page.waitForTimeout(400)
    await page.card({ path: at('ejercicios-abierto'), group: G, name: 'Tú · Ejercicio abierto', subtitle: 'solo muestra: consejos y alternativas con foto; el lápiz edita', source: C + 'ExerciseCard.svelte', screen: true })
    await page.card({ path: at('exercise-card'), group: G, name: 'ExerciseCard', subtitle: 'tarjeta abierta de solo lectura', source: C + 'ExerciseCard.svelte', specimens: [{ label: 'ExerciseCard', selector: comp('ExerciseCard'), width: 366 }], viewport: '440x620' })
    await page.card({ path: at('exercise-mini-card'), group: G, name: 'ExerciseMiniCard', subtitle: 'un ejercicio en foto y nombre (foto por defecto si no tiene)', source: C + 'ExerciseMiniCard.svelte', specimens: [{ label: 'ExerciseMiniCard', selector: comp('ExerciseMiniCard'), max: 2, width: 342 }], viewport: '420x260' })
    await page.card({ path: at('exercise-list-item'), group: G, name: 'ExerciseListItem', subtitle: 'fila cerrada: miniatura, nombre y músculo', source: C + 'ExerciseListItem.svelte', specimens: [{ label: 'ExerciseListItem', selector: comp('ExerciseListItem'), max: 2, width: 366 }], viewport: '440x260' })

    const editor = page.locator('#edit-exercise-sheet')
    await card.getByRole('button', { name: 'Editar ejercicio' }).click()
    await shot(page, 'editar-ejercicio', 'Tú · Editar ejercicio', 'nombre, músculo en chips e imagen; consejos y alternativas debajo', 'EditExerciseSheet.svelte')
    // The capture ignores scroll: the end of the editor goes as specimens
    await page.card({ path: at('editar-ejercicio-listas'), group: G, name: 'Editar ejercicio · consejos, alternativas y eliminar', subtitle: 'TipsEditor, AlternativesEditor y Eliminar ejercicio en rojo al final', source: C + 'EditExerciseSheet.svelte', specimens: [
      { label: 'TipsEditor', selector: comp('TipsEditor'), width: 350 },
      { label: 'AlternativesEditor', selector: comp('AlternativesEditor'), width: 350 },
      { label: 'Eliminar ejercicio', selector: '#edit-exercise-sheet .far', width: 350 },
    ], viewport: '420x900' })
    await editor.getByLabel('Nombre').fill('')
    await shot(page, 'editar-ejercicio-error', 'Tú · Editar ejercicio sin nombre', '«Ponle un nombre.» y Guardar desactivado', 'EditExerciseSheet.svelte')
    await editor.getByLabel('Nombre').fill('Curl con Barra EZ')

    await editor.getByRole('button', { name: 'Añadir alternativa' }).click()
    await page.locator('#alt-search').fill('curl')
    await shot(page, 'ejercicios-alternativa', 'Tú · Añadir alternativa', 'diccionario y tus ejercicios en mini cards; las que ya están, atenuadas', 'AltSearchSheet.svelte')
    await page.locator('#alt-search-sheet [aria-label="Cerrar"]').click()

    await editor.getByRole('button', { name: 'Eliminar ejercicio' }).click()
    await shot(page, 'eliminar-ejercicio', 'Tú · Eliminar ejercicio', 'dice cuántos registros se borran con él', 'ConfirmSheet.svelte')
    await page.context().close()
  },

  // ───────────────────────────────── Shell ─────────────────────────────────
  async shell({ open, S }) {
    const G = 'Shell'
    const at = (p) => `shell/${p}`
    const page = await open(world(S))
    await page.go('today')
    await page.card({ path: at('tab-bar'), group: G, name: 'TabBar', subtitle: 'barra flotante con blur, tab activo en acento', source: C + 'TabBar.svelte', specimens: [{ label: 'TabBar · Hoy activo', selector: comp('TabBar'), width: 390, unfix: true }], viewport: '460x200' })

    // Hoy v2: training waits folded under the warmup; open it and register.
    await page.locator('[data-phase="training"] .ph-row').click()
    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await btn(page, 'Más peso').click()
    await btn(page, /^Registrar \d/).click()
    await page.locator(comp('Toast')).waitFor({ timeout: 3000 })
    await page.card({ path: at('toast'), group: G, name: 'Toast', subtitle: 'confirmación breve arriba, bajo la barra de estado', source: C + 'Toast.svelte', specimens: [{ label: 'Toast', selector: comp('Toast'), unfix: true }], viewport: '420x160' })
    await clearToasts(page)
    await btn(page, /Descansar/).click()
    await page.locator(comp('SeriesModeScreen')).waitFor({ timeout: 3000 })
    await page.getByRole('button', { name: 'Minimizar' }).click()
    await page.locator(comp('RestTimerBanner')).waitFor({ timeout: 3000 })
    await btn(page, 'Cerrar').click().catch(() => {})
    await page.waitForTimeout(500)
    await page.card({ path: at('rest-timer-banner-pantalla'), group: G, name: 'RestTimerBanner · en contexto', subtitle: 'descanso minimizado abajo, sobre la TabBar, en lugar del dock', source: C + 'RestTimerBanner.svelte', screen: true, fold: true })
    await page.card({ path: at('rest-timer-banner'), group: G, name: 'RestTimerBanner', subtitle: 'anillo blanco + tiempo + ejercicio + «Sigue la serie» + saltar', source: C + 'RestTimerBanner.svelte', specimens: [{ label: 'RestTimerBanner', selector: comp('RestTimerBanner'), width: 366, unfix: true }], viewport: '440x240' })

    await page.context().setOffline(true)
    await page.evaluate(() => window.dispatchEvent(new Event('offline')))
    await page.locator(comp('OfflineBanner')).waitFor({ timeout: 4000 })
    await page.card({ path: at('offline-banner'), group: G, name: 'OfflineBanner', subtitle: 'aviso de sin conexión', source: C + 'OfflineBanner.svelte', specimens: [{ label: 'OfflineBanner', selector: comp('OfflineBanner'), width: 366, unfix: true }], viewport: '440x180' })
    await page.context().close()

    // Steps 1–2 no longer show on Tú (its first-time screen covers them since Tú v2)
    const snaps = []
    for (const [step, route] of [[2, 'today'], [3, 'today']]) {
      const ob = await open(world(S, { settings: S.settings({ onboarded: false, onboardingStep: step }) }))
      await ob.go(route)
      snaps.push(await grab(ob, [{ label: `OnboardingBanner · paso ${step + 1} de 4`, selector: comp('OnboardingBanner'), width: 366, unfix: true }]))
      if (step === 2) await ob.card({ path: at('onboarding-banner-pantalla'), group: G, name: 'OnboardingBanner · en contexto', subtitle: 'tras crear el primer programa, sobre Hoy', source: C + 'OnboardingBanner.svelte', screen: true, fold: true })
      await ob.context().close()
    }
    await card0(snaps, at('onboarding-banner'), G)
  },

  // ────────────────────────────── Compartidos ──────────────────────────────
  // Atoms are collected wherever they naturally appear, then merged per card.
  async compartidos({ open, S }) {
    const G = 'Compartidos'
    const page = await open(world(S))
    const bag = {}
    const collect = async (key, specimens) => (bag[key] ??= []).push(await grab(page, specimens.map((s) => ({ optional: true, ...s })), 250))
    const tab = async (label) => {
      await page.locator('.seg-btn', { hasText: label }).first().click()
      await page.waitForTimeout(500)
    }
    // The Tú tabs this walk used to visit (Perfil / Programas / IA Powered /
    // Ejercicios / Datos) are gone since Tú v2, together with TextArea and
    // DeleteButton. Only what still exists on Tú's summary is collected here;
    // the new shared pieces and variants get their cards when the Tú v2 walk
    // is written (skipped this round by Pedro).
    await page.go('you')
    await collect('page-header', [{ label: 'PageHeader · Tú', selector: comp('PageHeader'), width: 390 }])
    await collect('stats', [{ label: 'StatsGrid tiles · 3 columnas · StatBlock tile', selector: comp('StatsGrid'), width: 366 }])

    await page.go('history')
    await tab('Ejercicios')
    await collect('chips', [{ label: 'ChipRow con scroll + FilterChip sm', selector: comp('ChipRow'), width: 366 }])

    // Hoy v2 (2026-10-15): PhaseCard, StatusBadge and ProgressBar are gone;
    // the detail's segmented control is the 44 `tabs` variant.
    await page.go('today')
    await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    await page.locator('[data-phase="training"] .ph-row').click()
    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await page.waitForTimeout(600)
    await collect('segmented', [{ label: 'SegmentedControl · tabs (Detalle v2)', selector: `${comp('ExerciseDetail')} ${comp('SegmentedControl')}`, width: 366 }])
    await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    await btn(page, 'Cerrar').click()
    for (const r of ['plan', 'friends', 'you']) {
      await page.go(r)
      await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    }
    await page.context().close()

    // Card and InfoCard: the rest day uses both
    const rest = await open(world(S, { programs: [S.restDayProgram()] }))
    await rest.go('today')
    bag.card = [await grab(rest, [
      { label: 'Card', selector: comp('Card'), width: 350, optional: true },
      { label: 'InfoCard', selector: comp('InfoCard'), width: 350, optional: true }
    ])]
    await rest.context().close()

    const cards = [
      ['button', 'Button', 'primary, secondary, danger, ghost, text, dashed · md y sm', 'Button.svelte', '820x900'],
      ['chips', 'ChipRow y FilterChip', 'chips de filtro (mono y sans, sm y lg)', 'FilterChip.svelte', '820x560'],
      ['segmented', 'SegmentedControl', '2, 3 y 4 opciones', 'SegmentedControl.svelte', '820x360'],
      ['inputs', 'TextInput y SearchInput', 'campos de texto', 'TextInput.svelte', '820x640'],
      ['stats', 'StatsGrid + StatBlock', 'cuadrícula de cifras', 'StatBlock.svelte', '820x280'],
      ['page-header', 'PageHeader', 'eyebrow + título de vista', 'PageHeader.svelte', '460x220'],
      ['section-label', 'SectionLabel', 'rótulo de sección con barra de acento', 'SectionLabel.svelte', '420x220'],
      ['empty', 'EmptyState', 'mensaje centrado para listas vacías o carga', 'EmptyState.svelte', '420x220'],
      ['card', 'Card e InfoCard', 'tarjeta de superficie (antes GlowCard) y aviso de lectura', 'Card.svelte', '440x560'],
      ['debug', 'DebugAIToggle', 'interruptor de depuración de IA', 'DebugAIToggle.svelte', '420x200'],
    ]
    for (const [key, name, subtitle, file, viewport] of cards) {
      const snaps = (bag[key] ?? []).filter((s) => s.html.trim())
      if (!snaps.length) { console.log('· sin muestras:', key); continue }
      await card(null, { path: `compartidos/${key}`, group: G, name, subtitle, source: C + file, snaps: key === 'icons' ? [dedupeIcons(snaps)] : snaps, viewport })
    }
  },
}

/** Icons were collected on several screens; keep each distinct <svg> once, in one box. */
function dedupeIcons(snaps) {
  const svgs = [...new Set(snaps.flatMap((s) => s.html.match(/<svg[\s\S]*?<\/svg>/g) ?? []))]
  const html = `<figure class="ds-spec"><figcaption>Icon · ${svgs.length} íconos</figcaption><div class="ds-box ds-row" style="width:720px;gap:18px">${svgs.join('')}</div></figure>`
  return { ...snaps[0], html, rules: [...new Set(snaps.flatMap((s) => s.rules))] }
}

// Standalone because the pages that produced the snaps are already closed.
import { card } from './capture.mjs'
const card0 = (snaps, path, group) =>
  card(null, { path, group, name: 'OnboardingBanner', subtitle: 'los 4 pasos del primer arranque', source: C + 'OnboardingBanner.svelte', snaps, viewport: '860x640' })

// ───────────────────────── Hoy v2 / Detalle v2 ─────────────────────────
const HOY = 'Hoy · Actual'
const DET = 'Detalle de ejercicio · Actual'
const HOY_SRC = 'src/routes/today/+page.svelte'
const hoyAt = (p) => `vistas/hoy2/${p}`
const detAt = (p) => `vistas/detalle-ejercicio2/${p}`
const isoToday = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
const todayLog = (id, weight, extra = {}) => ({ id: `log-9999-${id}`, exerciseId: id, date: isoToday(), weight, units: 'kg', ...extra })
const session = (S, over = {}) => S.settings({ hasWatch: false, sessionState: { date: isoToday(), phase: 1, todayExDone: 0, ...over } })
const dock = (page) => page.locator(comp('NextStepDock'))
const logDock = (page) => page.locator(comp('LogDock'))
const hoyScreen = (page, path, name, subtitle, source = HOY_SRC) =>
  page.card({ path: hoyAt(path), group: HOY, name, subtitle, source, screen: true, fold: true })
const detScreen = (page, path, name, subtitle, source = C + 'ExerciseDetail.svelte') =>
  page.card({ path: detAt(path), group: DET, name, subtitle, source, screen: true, fold: true })

// ───────────────────────────── Plan v2 ─────────────────────────────
const PLAN = 'Plan · Actual'
const PLAN_SRC = 'src/routes/plan/+page.svelte'
const planAt = (p) => `vistas/plan2/${p}`
const planScreen = (page, path, name, subtitle, source = PLAN_SRC) =>
  page.card({ path: planAt(path), group: PLAN, name, subtitle, source, screen: true, fold: true })
const planPart = (page, path, name, subtitle, source, specimens, viewport) =>
  page.card({ path: planAt(path), group: PLAN, name, subtitle, source, specimens, viewport })

/** Opens Plan on a seeded world, with the friends list Amigos would have cached */
async function openPlan(open, S, over = {}, friends = S.friends) {
  const page = await open(world(S, over))
  await page.evaluate((list) => localStorage.setItem('friends-cache', JSON.stringify({ friends: list, savedAt: Date.now() - 95 * 60000 })), friends)
  await page.go('plan')
  return page
}

async function planScreens({ open, S }) {
  const trainedToday = [todayLog('ex-bench', 80), todayLog('ex-military', 45), todayLog('ex-lateral', 12)]
  const todaySession = { id: 'gym-today', date: isoToday(), seconds: 52 * 60, weekStart: '' }

  // Esta semana: hoy abierto, la franja y el dock
  let page = await openPlan(open, S)
  await planScreen(page, 'pantalla', 'Plan · Esta semana', 'hoy abierto con sus ejercicios, la semana en una franja, entrenar abajo')
  await planPart(page, 'week-strip', 'PlanWeekStrip', 'avance de la semana + quién entrenó hoy (lleva a Amigos)', C + 'PlanWeekStrip.svelte', [{ label: 'PlanWeekStrip', selector: comp('PlanWeekStrip'), width: 350 }], '420x320')
  await planPart(page, 'week-switch', 'WeekSwitch', 'selector de semanas del programa; la actual dice «esta semana»', C + 'WeekSwitch.svelte', [{ label: 'WeekSwitch', selector: comp('WeekSwitch'), width: 350 }], '420x160')
  await planPart(page, 'day-panel', 'DayPanel', 'un día abierto con sus ejercicios; hoy con «Hoy» y aro blanco', C + 'DayPanel.svelte', [{ label: 'DayPanel · hoy', selector: comp('DayPanel'), width: 350 }], '420x420')
  await planPart(page, 'exercise-row', 'ExerciseRow · plan', 'nombre, músculo y peso en una línea; series × reps a la derecha', C + 'ExerciseRow.svelte', [{ label: 'ExerciseRow variant="plan"', selector: `${comp('DayPanel')} .exercise-row`, max: 3, width: 334 }], '420x320')
  await planPart(page, 'day-row', 'DayRow', 'hecho / pendiente / descanso', C + 'DayRow.svelte', [{ label: 'DayRow · variantes', selector: comp('DayRow'), distinct: true, max: 4, width: 350 }], '420x420')
  const dockTrain = await grab(page, [{ label: 'NextStepDock · Reprogramar + Entrenar', selector: comp('NextStepDock'), width: 390, unfix: true }])

  // ¿Qué cambió? → Mover
  await page.locator('#plan-reprogram-btn').click()
  await page.waitForTimeout(500)
  await planScreen(page, 'pantalla-que-cambio', 'Plan · ¿Qué cambió?', 'Reprogramar pregunta primero qué pasó, con el caso real de hoy', C + 'ReprogramSheet.svelte')
  await planPart(page, 'choice-card', 'ChoiceCard', 'opción de una hoja: ícono, qué es, qué hace', C + 'ChoiceCard.svelte', [{ label: 'ChoiceCard', selector: comp('ChoiceCard'), max: 2, width: 350 }], '420x260')
  await page.locator('#plan-move-btn').click()
  await page.waitForTimeout(500)
  await planScreen(page, 'pantalla-mover', 'Plan · Mover', 'asa de 44 px a la derecha; lo hecho no se mueve; Restablecer y Listo abajo', C + 'PlanReorder.svelte')
  await planPart(page, 'plan-reorder', 'PlanReorder', 'días arrastrables con DayRow; los hechos llevan check', C + 'PlanReorder.svelte', [{ label: 'PlanReorder', selector: comp('PlanReorder'), width: 350 }], '420x700')
  await page.locator('#plan-done-btn').click()
  await page.waitForTimeout(400)

  // Me salté un día → días movidos + aviso con Restablecer
  await page.locator('#plan-reprogram-btn').click()
  await page.waitForTimeout(400)
  await page.locator('#plan-shift-btn').click()
  await page.waitForTimeout(600)
  await planScreen(page, 'pantalla-movido', 'Plan · Después de «Me salté un día»', 'cada día movido dice de dónde vino; el aviso ofrece Restablecer', C + 'ActionToast.svelte')
  await planPart(page, 'action-toast', 'ActionToast', 'aviso en la zona del pulgar con una salida', C + 'ActionToast.svelte', [{ label: 'ActionToast', selector: comp('ActionToast'), width: 366, unfix: true }], '420x140')
  await page.context().close()

  // Hoy ya entrenaste
  page = await openPlan(open, S, { exerciseLogs: [...S.logs(), ...trainedToday], gymSessions: [...S.gymSessions(), todaySession] })
  await planScreen(page, 'pantalla-hecho', 'Plan · Hoy ya entrenaste', 'hoy hecho con acento; sin botón principal, dice qué sigue')
  const dockDone = await grab(page, [{ label: 'NextStepDock · Reprogramar semana + qué sigue', selector: comp('NextStepDock'), width: 390, unfix: true }])
  await page.card({ path: planAt('next-step-dock'), group: PLAN, name: 'NextStepDock · Plan', subtitle: 'entrenar hoy / hoy hecho', source: C + 'NextStepDock.svelte', snaps: [dockTrain, dockDone], viewport: '460x380' })
  await page.context().close()

  // Hoy toca descanso
  page = await openPlan(open, S, { programs: [S.restDayProgram(), S.secondProgram()] })
  await planScreen(page, 'pantalla-descanso', 'Plan · Hoy toca descanso', 'el descanso como parte del plan')
  await page.context().close()

  // Primera semana: sin registros ni amigos
  page = await openPlan(open, S, { exerciseLogs: [], gymSessions: [] }, [])
  await planScreen(page, 'pantalla-primera-semana', 'Plan · Primera semana', 'sin cuenta de entrenos; invita a un amigo; empezar el primer entreno')
  await page.context().close()

  // Sin conexión
  page = await openPlan(open, S)
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(500)
  await planScreen(page, 'pantalla-sin-conexion', 'Plan · Sin conexión', 'el plan funciona igual; la liga dice a qué hora se actualizó')
  await page.context().close()

  // Sin programa
  const empty = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
  await empty.go('plan')
  await planScreen(empty, 'pantalla-sin-programa', 'Plan · Sin programa', 'qué aparecerá aquí, filas fantasma y «Armar mi rutina»', C + 'PlanEmpty.svelte')
  await empty.context().close()
}

// ─────────────────────────── Historial v2 ───────────────────────────
const HIST = 'Historial · Actual'
const HIST_SRC = 'src/routes/history/+page.svelte'
const histAt = (p) => `vistas/historial2/${p}`
const histScreen = (page, path, name, subtitle, source = HIST_SRC) =>
  page.card({ path: histAt(path), group: HIST, name, subtitle, source, screen: true, fold: true })
const histPart = (page, path, name, subtitle, source, specimens, viewport) =>
  page.card({ path: histAt(path), group: HIST, name, subtitle, source, specimens, viewport })
const isoDaysAgo = (n) => new Date(Date.now() - new Date().getTimezoneOffset() * 60000 - n * 86400000).toISOString().slice(0, 10)
const cal = (page, state) => page.locator(`${comp('MonthCalendar')} ${state}`)
const panelSnap = (page, label) => grab(page, [{ label: `HistoryDayPanel · ${label}`, selector: comp('HistoryDayPanel'), width: 350 }])
const histDockSnap = (page, label) => grab(page, [{ label: `ViewSwitchDock · ${label}`, selector: comp('ViewSwitchDock'), width: 390, unfix: true }])

async function tapDay(page, state) {
  if (!(await cal(page, state).count())) await btn(page, 'Mes anterior').click()
  await cal(page, state).first().click()
  await page.waitForTimeout(300)
}

async function historialScreens({ open, S }) {
  // Last week left unlogged, so past workouts show as «Sin registrar»
  const withGap = S.logs().filter((l) => l.date < isoDaysAgo(13) || l.date > isoDaysAgo(7))
  let page = await open(world(S, { exerciseLogs: withGap }))
  await page.go('history')
  await histScreen(page, 'pantalla', 'Historial · Días', 'el mes con lo entrenado en acento; abre el último día entrenado con sus pesos')
  await histPart(page, 'month-calendar', 'MonthCalendar', 'celdas de 44: entrenado en acento, el resto gris, futuro tenue, tocado en blanco, hoy con anillo', C + 'MonthCalendar.svelte', [{ label: 'MonthCalendar', selector: comp('MonthCalendar'), width: 350 }], '420x420')
  const panels = [await panelSnap(page, 'hecho')]
  const docks = [await histDockSnap(page, 'Días')]

  if (!(await cal(page, '.now').count())) await btn(page, 'Mes siguiente').click()
  await cal(page, '.now').click()
  await page.waitForTimeout(300)
  await histScreen(page, 'pantalla-hoy', 'Historial · Hoy sin registrar', '«Hoy toca …» y el enlace a Hoy', C + 'HistoryDayPanel.svelte')
  panels.push(await panelSnap(page, 'hoy'))

  const future = cal(page, '[data-state="future"]')
  if (await future.count()) {
    await future.first().click()
    await page.waitForTimeout(300)
    panels.push(await panelSnap(page, 'futuro'))
  }

  await tapDay(page, '[data-state="rest"]')
  panels.push(await panelSnap(page, 'descanso'))

  await tapDay(page, '[data-state="missed"]')
  await histScreen(page, 'pantalla-sin-registrar', 'Historial · Sin registrar', '¿Lo hiciste y no lo anotaste? «Marcar como hecho» y lo que tocaba, atenuado', C + 'HistoryDayPanel.svelte')
  panels.push(await panelSnap(page, 'sin registrar'))
  await btn(page, /Marcar como hecho/).click()
  await page.waitForTimeout(500)
  await histScreen(page, 'pantalla-marcado', 'Historial · Marcado a mano', 'el día pasa a acento, «Marcado a mano · sin pesos» y el dock lo confirma', C + 'HistoryDayPanel.svelte')
  panels.push(await panelSnap(page, 'marcado a mano'))
  await page.card({ path: histAt('history-day-panel'), group: HIST, name: 'HistoryDayPanel', subtitle: 'hecho, hoy, futuro, descanso, sin registrar y marcado a mano', source: C + 'HistoryDayPanel.svelte', snaps: panels, viewport: '460x1800' })

  await page.locator(comp('ViewSwitchDock')).getByRole('button', { name: 'Ejercicios', exact: true }).click()
  await page.waitForTimeout(500)
  await histScreen(page, 'pantalla-ejercicios', 'Historial · Ejercicios', 'filtros por músculo y lo último arriba: gráfica gris, último peso y cuánto subiste')
  const rows = [await grab(page, [{ label: 'ExerciseProgressRow', selector: comp('ExerciseProgressRow'), max: 3, width: 350 }])]
  docks.push(await histDockSnap(page, 'Ejercicios'))
  await page.locator(`#history ${comp('FilterChip')}`).nth(1).click()
  await page.waitForTimeout(300)
  await histScreen(page, 'pantalla-filtro', 'Historial · Ejercicios con filtro', '«N de {músculo}»')
  await page.locator(`#history ${comp('FilterChip')}`).first().click()
  await page.getByRole('button', { name: 'Editar', exact: true }).click()
  await page.waitForTimeout(300)
  await histScreen(page, 'pantalla-editar', 'Historial · Modo editar', 'un lápiz de 44 por fila; la fila ya no abre el Detalle')
  rows.push(await grab(page, [{ label: 'ExerciseProgressRow · editing', selector: comp('ExerciseProgressRow'), max: 2, width: 350 }]))
  await page.card({ path: histAt('exercise-progress-row'), group: HIST, name: 'ExerciseProgressRow', subtitle: 'nombre, músculo · cuándo, gráfica, último peso y subida; en modo editar, el lápiz', source: C + 'ExerciseProgressRow.svelte', snaps: rows, viewport: '420x620' })
  await page.locator(`${comp('ExerciseProgressRow')} ${comp('IconButton')}`).first().click()
  await page.waitForTimeout(600)
  await histScreen(page, 'pantalla-hoja-editar', 'Historial · Editar ejercicio', 'la hoja de Tú, con «Eliminar ejercicio» y el conteo de registros', C + 'EditExerciseSheet.svelte')
  await page.context().close()

  // Primera vez: programa activo, cero registros
  page = await open(world(S, { exerciseLogs: [], gymSessions: [] }))
  await page.go('history')
  await histScreen(page, 'pantalla-primera-vez', 'Historial · Primera vez', 'calendario limpio con hoy marcado; «Ir a entrenar»')
  docks.push(await histDockSnap(page, 'primera vez'))
  await page.locator(comp('ViewSwitchDock')).getByRole('button', { name: 'Ejercicios', exact: true }).click()
  await page.waitForTimeout(400)
  await histScreen(page, 'pantalla-primera-vez-ejercicios', 'Historial · Ejercicios sin pesos', '«Todavía no hay pesos» y filas fantasma')
  await page.context().close()
  await card(null, { path: histAt('view-switch-dock'), group: HIST, name: 'ViewSwitchDock', subtitle: 'Días / Ejercicios sobre la TabBar, con caption y botón opcionales', source: C + 'ViewSwitchDock.svelte', snaps: docks, viewport: '460x560' })

  // Sin conexión
  page = await open(world(S))
  await page.go('history')
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(500)
  await histScreen(page, 'pantalla-sin-conexion', 'Historial · Sin conexión', 'todo igual; el dock dice que el historial está en el teléfono')
  await page.context().close()

  // Sin programa
  page = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
  await page.go('history')
  await histScreen(page, 'pantalla-sin-programa', 'Historial · Sin programa', 'calendario fantasma y «Elegir un programa»')
  await page.context().close()
}

/** Opens Hoy on a seeded world; `logs` are today's extra logs */
async function openHoy(open, S, settings, logs = [], over = {}) {
  const page = await open(world(S, { settings, exerciseLogs: [...S.logs(), ...logs], ...over }))
  await page.go('today')
  return page
}

async function hoyScreens({ open, S }) {
  const bench = todayLog('ex-bench', 80)
  const militaryOne = todayLog('ex-military', 40, { sets: 1, reps: '10' })
  const started = Date.now() - 11 * 60000

  // Antes de empezar + calentamiento a mitad
  let page = await openHoy(open, S, session(S))
  await hoyScreen(page, 'pantalla-inicio', 'Hoy · Antes de empezar', 'calentamiento abierto; entrenamiento y estiramiento en «Después»')
  const stepsOpen = await grab(page, [{ label: 'SessionSteps · antes de empezar', selector: comp('SessionSteps'), width: 390 }])
  const dockStart = await grab(page, [{ label: 'NextStepDock · empezar calentamiento', selector: comp('NextStepDock'), width: 390, unfix: true }])
  await btn(page, /Empezar calentamiento/).click()
  await logDock(page).getByRole('button', { name: 'Siguiente' }).click()
  await btn(page, 'Cerrar').click()
  await hoyScreen(page, 'pantalla-calentamiento-a-mitad', 'Hoy · Calentamiento a mitad', 'un movimiento hecho, el dock sigue con el siguiente')
  await page.context().close()

  // Entrenando (calentamiento hecho, nada registrado)
  page = await openHoy(open, S, session(S, { phase: 2, startedAt: started }))
  await hoyScreen(page, 'pantalla-entrenando', 'Hoy · Entrenando', 'entrenamiento abierto, el dock empieza con el primer ejercicio')
  await page.context().close()

  // En curso: un ejercicio hecho, otro con una serie
  page = await openHoy(open, S, session(S, { phase: 2, startedAt: started }), [bench, militaryOne])
  await hoyScreen(page, 'pantalla-en-curso', 'Hoy · Ejercicio en curso', 'hecho con acento, en curso con sus marcas, dock «Registrar serie»')
  const rows = await grab(page, [{ label: 'ExerciseRow session · hecho / en curso / siguiente', selector: '[data-phase="training"] .exercise-row', max: 3, width: 366 }])
  const stepsTraining = await grab(page, [{ label: 'SessionSteps · entrenando', selector: comp('SessionSteps'), width: 390 }])
  const clock = await grab(page, [{ label: 'PageHeader · con reloj de sesión', selector: comp('PageHeader'), width: 390 }])

  // Descansando: el banner minimizado toma el lugar del dock
  await page.locator('[data-phase="training"] .exercise-row').nth(1).click()
  await btn(page, /Descansar|Iniciar descanso/).click()
  await btn(page, 'Minimizar descanso').click()
  await btn(page, 'Cerrar').click()
  await page.locator(comp('RestTimerBanner')).waitFor({ timeout: 3000 })
  await page.waitForTimeout(600)
  await hoyScreen(page, 'pantalla-descansando', 'Hoy · Descansando', 'banner del descanso abajo, sobre la TabBar, en lugar del dock', C + 'RestTimerBanner.svelte')
  await page.context().close()

  // Sin conexión
  page = await openHoy(open, S, session(S, { phase: 2, startedAt: started }), [bench, militaryOne])
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.waitForTimeout(500)
  await hoyScreen(page, 'pantalla-sin-conexion', 'Hoy · Sin conexión', 'el dock avisa que todo se guarda en el teléfono')
  await page.context().close()

  // Falta estirar → estiramiento → racha → esfuerzo → resumen
  const allDone = [bench, todayLog('ex-military', 40), todayLog('ex-lateral', 10)]
  page = await openHoy(open, S, session(S, { phase: 2, startedAt: started }), allDone)
  await clearToasts(page)
  await hoyScreen(page, 'pantalla-entrenamiento-completado', 'Hoy · Entrenamiento completado', 'todo registrado; el dock pide «Terminar entrenamiento» antes de estirar')
  await btn(page, 'Terminar entrenamiento').click()
  await page.waitForTimeout(400)
  await hoyScreen(page, 'pantalla-falta-estirar', 'Hoy · Falta estirar', 'calentamiento y entrenamiento hechos, estiramiento abierto')
  const stepsStretch = await grab(page, [{ label: 'SessionSteps · falta estirar', selector: comp('SessionSteps'), width: 390 }])
  await btn(page, /Empezar estiramiento/).click()
  const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
  while (await next.isEnabled()) await next.click()
  await btn(page, 'Terminar estiramiento').click()
  await page.locator(comp('LogDock')).getByRole('button', { name: 'Terminar sesión' }).click()
  await page.locator('#streak-overlay').waitFor({ timeout: 6000 })
  await hoyScreen(page, 'racha', 'StreakScreen', 'racha a pantalla completa; espera a «Seguir»', C + 'StreakScreen.svelte')
  await btn(page, 'Seguir').click()
  await page.locator('#effort-overlay').waitFor({ timeout: 6000 })
  await hoyScreen(page, 'esfuerzo', 'EffortSheet', '¿Cómo sentiste la sesión? con barras de intensidad', C + 'EffortSheet.svelte')
  await page.locator('#effort-overlay [data-effort="Justo"]').click()
  await page.locator(comp('SessionSummary')).getByText('Para la próxima').waitFor({ timeout: 10000 })
  await page.card({ path: hoyAt('pantalla-resumen'), group: HOY, name: 'Hoy · Resumen', subtitle: 'Tu coach, para la próxima y tres cifras', source: C + 'SessionSummary.svelte', screen: true })
  await page.context().close()

  // Ahora no: resumen sin análisis
  page = await openHoy(open, S, S.settings({ hasWatch: false, streakShownDate: isoToday(), sessionState: { date: isoToday(), phase: 5, todayExDone: 3, startedAt: started, endedAt: Date.now() } }), allDone)
  await hoyScreen(page, 'pantalla-resumen-sin-analisis', 'Hoy · Resumen sin análisis', 'tras «Ahora no»: duración y «Pedir análisis al coach»', C + 'SessionSummary.svelte')
  await page.context().close()

  // Primer entreno y sin programa
  page = await openHoy(open, S, session(S), [], { exerciseLogs: [] })
  await hoyScreen(page, 'pantalla-primer-entreno', 'Hoy · Primer entreno', 'sin ningún registro: el dock da la bienvenida')
  await page.context().close()
  page = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
  await page.go('today')
  await hoyScreen(page, 'pantalla-sin-programa', 'Hoy · Sin programa', 'tres pasos, privacidad y «Armar mi rutina»', C + 'FirstRunView.svelte')
  await page.context().close()

  await card(null, { path: hoyAt('session-steps'), group: HOY, name: 'SessionSteps', subtitle: 'fase abierta, hecha (68, acento) y después', source: C + 'SessionSteps.svelte', snaps: [stepsOpen, stepsTraining, stepsStretch], viewport: '820x1400' })
  await card(null, { path: hoyAt('exercise-row'), group: HOY, name: 'ExerciseRow · session', subtitle: '76: hecho, en curso con marcas, siguiente', source: C + 'ExerciseRow.svelte', snaps: [rows], viewport: '460x420' })
  await card(null, { path: hoyAt('page-header-reloj'), group: HOY, name: 'PageHeader · reloj de sesión', subtitle: 'día en un renglón, músculos y reloj en texto', source: HOY_SRC, snaps: [clock], viewport: '460x220' })
  await card(null, { path: hoyAt('next-step-dock'), group: HOY, name: 'NextStepDock', subtitle: 'un botón principal con caption', source: C + 'NextStepDock.svelte', snaps: [dockStart], viewport: '460x220' })
}

async function moveSheets({ open, S }) {
  const pieces = []
  // Calentamiento: movimiento, cómo se hace, último, completado
  let page = await openHoy(open, S, session(S))
  await btn(page, /Empezar calentamiento/).click()
  await page.waitForTimeout(600)
  await hoyScreen(page, 'calentamiento', 'Calentamiento', 'un movimiento en la hoja de Detalle: objetivo en frase, «Siguiente» lo marca y avanza', C + 'MovementSheet.svelte')
  pieces.push(await grab(page, [
    { label: 'DetailSheetHead · posición', selector: comp('DetailSheetHead'), width: 390 },
    { label: 'ExerciseMedia · GIF de movimiento', selector: comp('ExerciseMedia'), width: 350 },
    { label: 'TitleNav', selector: comp('TitleNav'), width: 350 },
    { label: 'TargetPanel · one', selector: comp('TargetPanel'), width: 350 },
    { label: 'DetailRow · Cómo se hace (cerrada)', selector: `${comp('MovementSheet')} button[aria-expanded]`, width: 350 },
    { label: 'LogDock · Siguiente + Hecho', selector: comp('LogDock'), width: 390, unfix: true },
  ]))
  await btn(page, /Cómo se hace/).click()
  await hoyScreen(page, 'calentamiento-como-se-hace', 'Calentamiento · Cómo se hace', 'posición inicial, ejecución y respiración', C + 'MovementSheet.svelte')
  const next = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
  while (await next.isEnabled()) await next.click()
  await hoyScreen(page, 'calentamiento-ultimo', 'Calentamiento · Último', 'Siguiente apagado y «Terminar calentamiento»', C + 'MovementSheet.svelte')
  await btn(page, 'Terminar calentamiento').click()
  await hoyScreen(page, 'calentamiento-completado', 'Calentamiento · Listo', 'los marcados y «Empezar con …»', C + 'MovementSheet.svelte')
  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await btn(page, 'Cerrar').click()
  await page.locator('[data-phase="warmup"] .ph-row').click()
  await page.locator('[data-phase="warmup"] .exercise-row').first().click()
  await page.waitForTimeout(500)
  await hoyScreen(page, 'movimiento-sin-conexion', 'Movimiento · Sin conexión', 'aviso en la posición; Hecho sigue funcionando', C + 'MovementSheet.svelte')
  await page.context().close()

  // Estiramiento y sin imagen (Jalón: bíceps tiene estiramientos sin media)
  const pull = [todayLog('ex-row', 60), todayLog('ex-pulldown', 55), todayLog('ex-curl', 30)]
  page = await openHoy(open, S, session(S, { phase: 2 }), pull, { programs: [S.pullProgram(), S.secondProgram()] })
  await clearToasts(page)
  await btn(page, 'Terminar entrenamiento').click()
  await page.waitForTimeout(400)
  if (await page.getByRole('button', { name: /Empezar estiramiento/ }).count()) {
    await btn(page, /Empezar estiramiento/).click()
    await page.waitForTimeout(600)
    await hoyScreen(page, 'estiramiento', 'Estiramiento', 'misma hoja, sin morado', C + 'MovementSheet.svelte')
    const nxt = page.getByRole('button', { name: 'Siguiente', exact: true }).first()
    for (let i = 0; i < 20 && !(await page.getByText('Sin imagen para este movimiento').count()) && await nxt.isEnabled(); i++) await nxt.click()
    if (await page.getByText('Sin imagen para este movimiento').count()) {
      await hoyScreen(page, 'movimiento-sin-imagen', 'Movimiento · Sin imagen', 'hueco de 112 con Google y TikTok', C + 'MovementSheet.svelte')
      pieces.push(await grab(page, [{ label: 'ExerciseMedia · sin imagen', selector: comp('ExerciseMedia'), width: 350 }]))
    }
  }
  await page.context().close()

  await card(null, { path: hoyAt('piezas-detalle'), group: HOY, name: 'Piezas de Detalle v2 · movimiento', subtitle: 'DetailSheetHead, ExerciseMedia, TitleNav, TargetPanel, DetailRow, LogDock', source: C + 'MovementSheet.svelte', snaps: pieces, viewport: '820x1300' })
}

async function detailScreens({ open, S }) {
  const pieces = []
  let page = await openHoy(open, S, session(S, { phase: 2 }))
  await page.locator('[data-phase="training"] .exercise-row').first().click()
  await page.waitForTimeout(700)
  await detScreen(page, 'pantalla-principal', 'Detalle · Principal', 'media 112, TitleNav, objetivo, coach IA, peso de hoy y dock')
  pieces.push(await grab(page, [
    { label: 'ExerciseMedia · foto + Ver animación', selector: comp('ExerciseMedia'), width: 350 },
    { label: 'TargetPanel · dos celdas', selector: comp('TargetPanel'), width: 350 },
    { label: 'DetailRow · coach IA', selector: `${comp('ExerciseDetail')} .row.ai`, width: 350 },
    { label: 'SegmentedControl · tabs', selector: `${comp('ExerciseDetail')} ${comp('SegmentedControl')}`, width: 350 },
    { label: 'WeightPanel', selector: comp('WeightPanel'), width: 350 },
    { label: 'LogDock · ⏱ + Registrar', selector: comp('LogDock'), width: 390, unfix: true },
  ]))
  await btn(page, /^Registrar \d/).click()
  await page.locator(comp('Toast')).waitFor({ timeout: 3000 })
  await detScreen(page, 'pantalla-registrado', 'Detalle · Registrado', 'borde de acento, Toast arriba, Siguiente + Descansar')
  pieces.push(await grab(page, [{ label: 'WeightPanel · registrado', selector: comp('WeightPanel'), width: 350 }, { label: 'LogDock · Siguiente + Descansar', selector: comp('LogDock'), width: 390, unfix: true }]))
  await clearToasts(page)

  // A changed weight brings the editor back, with its link to the blocks
  await btn(page, 'Más peso').click()
  await btn(page, /Series con pesos distintos/).click()
  await page.locator(`${comp('BlockRow')} .block-field-input`).nth(2).click()
  await btn(page, 'Agregar bloque').click()
  await detScreen(page, 'pantalla-bloques', 'Detalle · Series por bloque', 'tres valores por bloque, − / + del elegido', C + 'BlocksPanel.svelte')
  pieces.push(await grab(page, [{ label: 'BlockRow · peso elegido', selector: comp('BlockRow'), width: 350 }]))
  await btn(page, 'Un solo peso').click()

  await page.locator('.seg-btn', { hasText: 'Historial' }).click()
  await detScreen(page, 'pantalla-historial', 'Detalle · Historial', 'récord, cuánto subiste, gráfica y sesiones por semana', C + 'ProgressHero.svelte')
  await page.locator('.seg-btn', { hasText: 'Alternativas' }).click()
  await detScreen(page, 'pantalla-alternativas', 'Detalle · Alternativas', 'sugeridas como filas; el buscador baja al dock', C + 'AlternativesTab.svelte')
  await page.locator(`${comp('LogDock')} input`).fill('press chino')
  await detScreen(page, 'pantalla-sin-resultados', 'Detalle · Sin resultados', 'No encontramos «…» + Borrar búsqueda', C + 'AlternativesTab.svelte')
  await btn(page, 'Borrar búsqueda').click()

  await btn(page, /Pregúntale al coach/).click()
  await page.waitForTimeout(600)
  await detScreen(page, 'pantalla-coach', 'Detalle · Coach', 'saludo sin emojis y preguntas rápidas de 52', C + 'ExerciseCoachChat.svelte')
  await btn(page, 'Me duele algo').click()
  await detScreen(page, 'pantalla-me-duele', 'Detalle · Me duele algo', 'partes del cuerpo en dos columnas + Cancelar', C + 'ExerciseCoachChat.svelte')
  await btn(page, 'Volver').click()

  await page.context().setOffline(true)
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await page.locator('.seg-btn', { hasText: 'Registrar' }).click()
  await page.waitForTimeout(500)
  await detScreen(page, 'pantalla-sin-conexion', 'Detalle · Sin conexión', 'aviso en la posición, coach apagado, se guarda en el teléfono')
  await page.context().close()

  // Primera vez: sin ningún registro del ejercicio
  page = await openHoy(open, S, session(S, { phase: 2 }), [], { exerciseLogs: [] })
  await page.locator('[data-phase="training"] .exercise-row').first().click()
  await page.waitForTimeout(700)
  await detScreen(page, 'pantalla-primera-vez', 'Detalle · Primera vez', 'nota, peso en 0 y Registrar apagado')
  await page.context().close()

  await card(null, { path: detAt('piezas'), group: DET, name: 'Piezas de Detalle v2 · ejercicio', subtitle: 'media, objetivo, coach, tabs, WeightPanel, BlockRow y LogDock', source: C + 'ExerciseDetail.svelte', snaps: pieces, viewport: '820x1600' })
}
