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
  async hoy({ open, S }) {
    const G = 'Hoy'
    const D = 'Detalle de ejercicio'
    const page = await open(world(S))
    const at = (p) => `vistas/hoy/${p}`
    const det = (p) => `vistas/detalle-ejercicio/${p}`

    await page.go('today')
    await page.card({ path: at('pantalla-inicio'), group: G, name: 'Hoy · Inicio de sesión', subtitle: 'calentamiento sigue, entrenamiento y estiramiento bloqueados', source: 'src/routes/today/+page.svelte', screen: true })
    const phaseStart = await grab(page, [
      { label: 'PhaseCard · sigue', selector: '[data-phase="warmup"]' },
      { label: 'PhaseCard · bloqueada', selector: '[data-phase="training"]' },
    ])
    await page.card({ path: at('phase-header'), group: G, name: 'PhaseHeader', subtitle: 'título del día + chip de semana (+ TimerRing con sesión en curso)', source: C + 'PhaseHeader.svelte', specimens: [{ label: 'PhaseHeader', selector: comp('PhaseHeader') }], viewport: '420x220' })
    await page.card({ path: at('locked-card'), group: G, name: 'LockedCard', subtitle: 'fase que aún no se puede abrir', source: C + 'LockedCard.svelte', specimens: [{ label: 'LockedCard', selector: comp('LockedCard') }], viewport: '420x280' })

    // Calentamiento
    await page.locator('[data-phase="warmup"]').click()
    await page.card({ path: at('warmup'), group: G, name: 'Warmup · Calentamiento', subtitle: 'un movimiento a la vez, Anterior / Hecho / Siguiente', source: C + 'Warmup.svelte', screen: true, fold: true, settle: 900 })
    await btn(page, 'Hecho').click()
    await page.locator(comp('CenterToast')).waitFor({ timeout: 3000 })
    await page.card({ path: at('center-toast'), group: G, name: 'CenterToast', subtitle: 'aviso centrado que se cierra solo (aquí: inicia tu Watch)', source: C + 'CenterToast.svelte', screen: true, fold: true })
    await clearToasts(page)

    await page.card({ path: at('pantalla-entrenando'), group: G, name: 'Hoy · Entrenando', subtitle: 'calentamiento hecho, TrainingCard con la lista del día', source: 'src/routes/today/+page.svelte', screen: true })
    await page.card({ path: at('training-card'), group: G, name: 'TrainingCard', subtitle: 'ejercicios del día con progreso', source: C + 'TrainingCard.svelte', specimens: [{ label: 'TrainingCard · 0 de 3', selector: '[data-phase="training"]' }], viewport: '420x520' })
    const phaseDone = await grab(page, [{ label: 'PhaseCard · completada', selector: '[data-phase="warmup"]' }])
    const timerRing = await grab(page, [{ label: 'PhaseHeader con sesión en curso', selector: comp('PhaseHeader'), width: 390 }, { label: 'TimerRing', selector: comp('TimerRing'), optional: true }])

    // Detalle de ejercicio
    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await page.waitForTimeout(700)
    await page.card({ path: det('pantalla-entreno'), group: D, name: 'Detalle · Entreno', subtitle: 'hoja completa: hero, coach IA, stats y registro de bloques', source: C + 'ExerciseDetail.svelte', screen: true })
    await page.card({ path: det('exercise-hero'), group: D, name: 'ExerciseHero', subtitle: 'imagen/gif, nombre, músculo y búsquedas', source: C + 'ExerciseHero.svelte', specimens: [{ label: 'ExerciseHero', selector: comp('ExerciseHero'), width: 390 }], viewport: '460x520' })
    await page.card({ path: det('workout-tab'), group: D, name: 'WorkoutTab', subtitle: 'bloques series × reps × peso, Registrar e Iniciar descanso', source: C + 'WorkoutTab.svelte', specimens: [{ label: 'WorkoutTab · sin registrar', selector: '.detail-scroll .tab-content, .detail-scroll [data-component="WorkoutTab"]', width: 390 }], viewport: '460x640' })
    await page.card({ path: det('number-stepper'), group: D, name: 'NumberStepper + StepButton', subtitle: '− valor + para peso, reps y series', source: C + 'NumberStepper.svelte', specimens: [{ label: 'NumberStepper', selector: comp('NumberStepper'), distinct: true }, { label: 'StepButton', selector: '.detail-scroll .step-btn', distinct: true, row: true }], viewport: '460x420' })

    await btn(page, 'Más peso').click()
    await btn(page, /Registrar ·/).click()
    await page.waitForTimeout(700)
    await page.card({ path: det('pantalla-registrado'), group: D, name: 'Detalle · Registrado', subtitle: 'después de Registrar: aparece Iniciar descanso', source: C + 'ExerciseDetail.svelte', screen: true })

    await page.getByRole('button', { name: 'Historial' }).last().click()
    await page.waitForTimeout(500)
    await page.card({ path: det('pantalla-historial'), group: D, name: 'Detalle · Historial', subtitle: 'gráfica de progreso, récord y registros', source: C + 'HistoryTab.svelte', screen: true })
    await page.card({ path: det('history-tab'), group: D, name: 'HistoryTab + LineChart', subtitle: 'gráfica + stats + lista de registros', source: C + 'HistoryTab.svelte', specimens: [{ label: 'HistoryTab', selector: comp('HistoryTab'), width: 390 }], viewport: '460x640' })

    await page.getByRole('button', { name: /Alternativas/ }).last().click()
    await page.waitForTimeout(500)
    await page.card({ path: det('pantalla-alternativas'), group: D, name: 'Detalle · Alternativas', subtitle: 'buscador arriba + alternativas sugeridas', source: C + 'AlternativesTab.svelte', screen: true })
    await page.card({ path: det('alternatives-tab'), group: D, name: 'AlternativesTab', subtitle: 'buscador sobre todo el diccionario + lista', source: C + 'AlternativesTab.svelte', specimens: [{ label: 'AlternativesTab', selector: comp('AlternativesTab'), width: 390 }], viewport: '460x560' })

    // Coach IA del ejercicio
    await page.locator('.coach-cyber-btn').click()
    await page.waitForTimeout(700)
    await page.card({ path: det('coach-chat'), group: D, name: 'ExerciseCoachChat · inicio', subtitle: 'saludo + chips rápidos', source: C + 'ExerciseCoachChat.svelte', screen: true, fold: true })
    await page.getByText('Me duele algo').first().click()
    await page.waitForTimeout(500)
    await page.card({ path: det('coach-chat-dolor'), group: D, name: 'ExerciseCoachChat · Me duele algo', subtitle: 'selector de parte del cuerpo según el músculo', source: C + 'ExerciseCoachChat.svelte', screen: true, fold: true })
    await page.locator('.coach-close-btn').click()
    await page.waitForTimeout(400)

    // Terminar los tres ejercicios
    await page.locator('.seg-btn', { hasText: 'Registrar' }).click()
    for (let i = 0; i < 2; i++) {
      await btn(page, 'Siguiente').click()
      await page.waitForTimeout(500)
      await btn(page, 'Más peso').click()
      await btn(page, /Registrar ·/).click()
      await page.waitForTimeout(700)
    }
    await btn(page, 'Cerrar').click()
    await clearToasts(page)
    await page.card({ path: at('pantalla-estiramiento'), group: G, name: 'Hoy · Falta estirar', subtitle: 'entrenamiento completo, estiramiento desbloqueado', source: 'src/routes/today/+page.svelte', screen: true })
    await page.card({
      path: at('phase-card'), group: G, name: 'PhaseCard', subtitle: 'sigue / bloqueada / completada, con StatusBadge y ProgressBar', source: C + 'PhaseCard.svelte', viewport: '820x760',
      snaps: [phaseStart, phaseDone, await grab(page, [{ label: 'PhaseCard · entrenamiento completo', selector: '[data-phase="training"]' }, { label: 'PhaseCard · estiramiento sigue', selector: '[data-phase="stretch"]' }])],
    })
    await page.card({ path: at('timer-ring'), group: G, name: 'TimerRing', subtitle: 'tiempo de sesión dentro del PhaseHeader', source: C + 'TimerRing.svelte', snaps: [timerRing], viewport: '420x320' })

    await page.locator('[data-phase="stretch"]').click()
    await page.card({ path: at('stretch'), group: G, name: 'Warmup · Estiramiento', subtitle: 'mismo componente en modo stretch', source: C + 'Warmup.svelte', screen: true, fold: true, settle: 900 })
    await btn(page, 'Hecho').click()
    await page.locator('#streak-overlay').waitFor({ timeout: 6000 })
    await page.card({ path: at('streak-overlay'), group: G, name: 'StreakOverlay', subtitle: 'celebración de racha al terminar', source: C + 'StreakOverlay.svelte', screen: true, fold: true, settle: 700 })
    await page.locator('#effort-overlay').waitFor({ timeout: 8000 })
    await page.card({ path: at('effort-selector'), group: G, name: 'EffortSelector', subtitle: '¿cómo estuvo? dentro de CenterDialog', source: C + 'EffortSelector.svelte', screen: true, fold: true, settle: 600 })
    await page.locator('#effort-overlay [data-effort="Justo"]').click()
    await page.locator(comp('CoachResultCard')).waitFor({ timeout: 10000 })
    await page.card({ path: at('pantalla-coach'), group: G, name: 'Hoy · Análisis del coach', subtitle: 'CoachResultCard con veredicto, objetivo y recomendaciones', source: C + 'CoachResultCard.svelte', screen: true, settle: 1200 })

    await page.context().close()

    // Día de descanso
    const rest = await open(world(S, { programs: [S.restDayProgram()] }))
    await rest.go('today')
    await rest.card({ path: at('pantalla-descanso'), group: G, name: 'Hoy · Día de descanso', subtitle: 'RestDayView con tips de recuperación', source: C + 'RestDayView.svelte', screen: true })
    await rest.context().close()

    // Sin programa
    const empty = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
    await empty.go('today')
    await empty.card({ path: at('pantalla-sin-programa'), group: G, name: 'Hoy · Sin programa', subtitle: 'OnboardingView dentro de GlowCard', source: C + 'OnboardingView.svelte', screen: true })
    await empty.context().close()
  },

  // ───────────────────────────────── Plan ─────────────────────────────────
  async plan({ open, S }) {
    const G = 'Plan'
    const at = (p) => `vistas/plan/${p}`
    const src = 'src/routes/plan/+page.svelte'
    const page = await open(world(S))
    await page.go('plan')
    await page.card({ path: at('pantalla'), group: G, name: 'Plan · Semana', subtitle: 'tabs de semana + un DayCard por día; hoy abierto con sus ExerciseRow', source: src, screen: true })
    await page.card({ path: at('day-card'), group: G, name: 'DayCard', subtitle: 'hoy / entreno / descanso', source: C + 'DayCard.svelte', specimens: [{ label: 'DayCard · variantes', selector: comp('DayCard'), distinct: true, max: 4 }], viewport: '420x620' })
    await page.card({ path: at('exercise-row'), group: G, name: 'ExerciseRow', subtitle: 'fila de ejercicio: miniatura, nombre, músculo, series × reps', source: C + 'ExerciseRow.svelte', specimens: [{ label: 'ExerciseRow', selector: comp('ExerciseRow'), max: 3 }], viewport: '420x340' })
    await page.locator('#plan-week-tabs .week-tab').nth(1).dispatchEvent('click')
    await page.waitForTimeout(400)
    await page.card({ path: at('week-tabs'), group: G, name: 'Tabs de semana', subtitle: 'selector de semana con etiqueta (BUILD / STRENGTH)', source: src, specimens: [{ label: 'Semana 2 activa', selector: '#plan-week-tabs', width: 390 }], viewport: '460x200' })
    await page.locator('#plan-reprogram-btn').dispatchEvent('click')
    await page.waitForTimeout(600)
    await page.card({ path: at('pantalla-reprogramar'), group: G, name: 'Plan · Reprogramar', subtitle: 'modo edición: mover días, recorrer la semana, restablecer', source: C + 'PlanReorder.svelte', screen: true })
    await page.card({ path: at('plan-reorder'), group: G, name: 'PlanReorder', subtitle: 'lista de días arrastrables', source: C + 'PlanReorder.svelte', specimens: [{ label: 'PlanReorder', selector: '.reorder-list', width: 370 }], viewport: '440x900' })
    await page.context().close()

    const empty = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
    await empty.go('plan')
    await empty.card({ path: at('pantalla-sin-programa'), group: G, name: 'Plan · Sin programa', subtitle: 'estado vacío', source: src, screen: true })
    await empty.context().close()
  },

  // ─────────────────────────────── Historial ───────────────────────────────
  async historial({ open, S }) {
    const G = 'Historial'
    const at = (p) => `vistas/historial/${p}`
    const src = 'src/routes/history/+page.svelte'
    const page = await open(world(S))
    await page.go('history')
    await page.card({ path: at('pantalla-constancia'), group: G, name: 'Historial · Constancia', subtitle: 'racha + calendario del mes + día seleccionado', source: src, screen: true })
    await page.card({ path: at('calendar'), group: G, name: 'Calendar', subtitle: 'racha, mes con estados (entrenado / descanso / faltaste / hoy) y detalle del día', source: C + 'Calendar.svelte', specimens: [{ label: 'Calendar', selector: comp('Calendar'), width: 390 }], viewport: '460x1100' })
    await page.locator('.cal-day, .calendar-root button').filter({ hasText: /^1$/ }).first().click().catch(() => {})
    await page.waitForTimeout(400)
    await page.card({ path: at('pantalla-dia-entrenado'), group: G, name: 'Historial · Día entrenado', subtitle: 'al tocar un día hecho se listan sus ejercicios', source: C + 'Calendar.svelte', screen: true })
    await page.locator('.seg-btn', { hasText: 'Ejercicios' }).click()
    await page.waitForTimeout(600)
    await page.card({ path: at('pantalla-ejercicios'), group: G, name: 'Historial · Ejercicios', subtitle: 'chips de músculo + lista con sparkline, último peso y delta', source: src, screen: true })
    await page.card({ path: at('fila-ejercicio'), group: G, name: 'Fila de ejercicio + Sparkline', subtitle: 'tarjeta de la lista con tendencia', source: C + 'Sparkline.svelte', specimens: [{ label: 'ex-card', selector: '.ex-card', max: 2 }, { label: 'Sparkline', selector: comp('Sparkline') }], viewport: '420x380' })
    await page.locator('.ex-edit-btn').first().click()
    await page.waitForTimeout(400)
    await page.card({ path: at('pantalla-editar'), group: G, name: 'Historial · Editar ejercicio', subtitle: 'formulario en línea dentro de la fila', source: src, screen: true })
    await page.context().close()

    const empty = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
    await empty.go('history')
    await empty.card({ path: at('pantalla-vacia'), group: G, name: 'Historial · Vacío', subtitle: 'sin programa activo', source: src, screen: true })
    await empty.context().close()
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
  // skipped regenerating the Tú cards this round, so the walk for the new view
  // (vistas/tu2/) is still to be written; until then this group captures nothing.
  async tu() {
    console.log('· Tú: recorrido pendiente para Tú v2 (vistas/tu2/); no se genera nada')
  },

  // ───────────────────────────────── Shell ─────────────────────────────────
  async shell({ open, S }) {
    const G = 'Shell'
    const at = (p) => `shell/${p}`
    const page = await open(world(S))
    await page.go('today')
    await page.card({ path: at('tab-bar'), group: G, name: 'TabBar', subtitle: 'barra flotante con blur, tab activo en acento', source: C + 'TabBar.svelte', specimens: [{ label: 'TabBar · Hoy activo', selector: comp('TabBar'), width: 390, unfix: true }], viewport: '460x200' })

    await page.locator('[data-phase="warmup"]').click()
    await btn(page, 'Hecho').click()
    await clearToasts(page)
    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await btn(page, 'Más peso').click()
    await btn(page, /Registrar ·/).click()
    await page.locator(comp('Toast')).waitFor({ timeout: 3000 })
    await page.card({ path: at('toast'), group: G, name: 'Toast', subtitle: 'confirmación breve arriba de la pantalla', source: C + 'Toast.svelte', specimens: [{ label: 'Toast', selector: comp('Toast'), unfix: true }], viewport: '420x160' })
    await clearToasts(page)
    await btn(page, 'Iniciar').click()
    await page.locator(comp('RestTimerFullscreen')).waitFor({ timeout: 3000 })
    await page.getByRole('button', { name: 'Minimizar' }).click()
    await page.locator(comp('RestTimerBanner')).waitFor({ timeout: 3000 })
    await btn(page, 'Cerrar').click().catch(() => {})
    await page.waitForTimeout(500)
    await page.card({ path: at('rest-timer-banner-pantalla'), group: G, name: 'RestTimerBanner · en contexto', subtitle: 'descanso minimizado flotando sobre Hoy', source: C + 'RestTimerBanner.svelte', screen: true, fold: true })
    await page.card({ path: at('rest-timer-banner'), group: G, name: 'RestTimerBanner', subtitle: 'anillo + tiempo + ejercicio + saltar', source: C + 'RestTimerBanner.svelte', specimens: [{ label: 'RestTimerBanner', selector: comp('RestTimerBanner'), width: 366, unfix: true }], viewport: '440x240' })

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

    await page.go('today')
    await collect('chips', [{ label: 'Chip (pill de estado)', selector: comp('Chip'), distinct: true, row: true }])
    await collect('progress', [{ label: 'StatusBadge', selector: comp('StatusBadge'), distinct: true, row: true }, { label: 'ProgressBar · 0 %', selector: comp('ProgressBar'), width: 300 }])
    await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    await page.locator('[data-phase="warmup"]').click()
    await btn(page, 'Hecho').click()
    await clearToasts(page)
    await collect('progress', [{ label: 'StatusBadge · completado', selector: comp('StatusBadge'), distinct: true, row: true }])
    await page.locator('[data-phase="training"] .exercise-row').first().click()
    await page.waitForTimeout(600)
    await collect('stats', [{ label: 'StatsGrid card · StatBlock con acento', selector: `${comp('ExerciseDetail')} ${comp('StatsGrid')}`, width: 366 }])
    await collect('segmented', [{ label: 'SegmentedControl · 3 opciones', selector: `${comp('ExerciseDetail')} ${comp('SegmentedControl')}`, width: 366 }])
    await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    await btn(page, 'Más peso').click()
    await btn(page, /Registrar ·/).click()
    await btn(page, 'Cerrar').click()
    await clearToasts(page)
    await collect('progress', [{ label: 'ProgressBar · 1 de 3', selector: comp('ProgressBar'), width: 300 }])
    for (const r of ['plan', 'friends', 'you']) {
      await page.go(r)
      await collect('icons', [{ label: 'Icon', selector: comp('Icon'), distinct: 'html', row: true, max: 40 }])
    }
    await page.context().close()

    const empty = await open({ exercises: [], settings: S.settings({ activeProgramId: null }) })
    await empty.go('today')
    bag.glow = [await grab(empty, [{ label: 'GlowCard', selector: comp('GlowCard'), width: 366 }])]
    await empty.context().close()

    const cards = [
      ['button', 'Button', 'primary, secondary, danger, ghost, text, dashed · md y sm', 'Button.svelte', '820x900'],
      ['chips', 'Chip, ChipRow y FilterChip', 'pills de estado y chips de filtro (mono y sans, sm y lg)', 'FilterChip.svelte', '820x560'],
      ['segmented', 'SegmentedControl', '2, 3 y 4 opciones', 'SegmentedControl.svelte', '820x360'],
      ['inputs', 'TextInput y SearchInput', 'campos de texto', 'TextInput.svelte', '820x640'],
      ['stats', 'StatsGrid + StatBlock', 'cuadrícula de cifras', 'StatBlock.svelte', '820x280'],
      ['progress', 'ProgressBar + StatusBadge', 'avance y estado de fase', 'ProgressBar.svelte', '820x360'],
      ['page-header', 'PageHeader', 'eyebrow + título de vista', 'PageHeader.svelte', '460x220'],
      ['section-label', 'SectionLabel', 'rótulo de sección con barra de acento', 'SectionLabel.svelte', '420x220'],
      ['empty', 'EmptyState', 'mensaje centrado para listas vacías o carga', 'EmptyState.svelte', '420x220'],
      ['glow', 'GlowCard', 'tarjeta con resplandor de acento', 'GlowCard.svelte', '440x560'],
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
