# Design: Hoy v2 y Detalle de ejercicio v2 (con Calentamiento y Estiramiento sobre Detalle)

Fecha: 2026-10-15
Estado: Aprobado

## Why

En Hoy la acción principal está arriba y es pequeña, el acento está en todas partes, los bloqueos ocupan media pantalla y regañan, y el calentamiento tiene los controles fuera del pulgar. El cierre habla en jerga («WORKOUT_ANALYSIS», emojis). En Detalle, Registrar queda bajo el pliegue, hay dos acciones principales en acento y después de registrar no se ve qué sigue. Calentamiento y Estiramiento son una hoja aparte que no se parece a Detalle. Los rediseños «Hoy · Nuevo» y «Detalle de ejercicio · Nuevo» de Claude Design lo resuelven con los mismos datos.

## What

**Hoy** queda como «Hoy · Nuevo» 00, 01, 03, 04, 06 y la parte sin conexión de 07:

- **Encabezado** (PageHeader): eyebrow «{Dow d mmm} · {week.name}[ · {week.subtitle}]» (sin `week.tag`), título «{day.name}.» en **1 renglón con «…»**, sub con los músculos del día en español («Pecho · Hombro»). A la derecha, el reloj de sesión en texto mono «00:11 / en sesión» mientras `startedAt && !endedAt` (reemplaza a PhaseHeader + TimerRing).
- **SessionSteps**: 3 fases numeradas (Calentamiento, Entrenamiento, Estiramiento). Solo la actual se despliega con su lista (encabezado «N · Nombre · X de Y»). Las hechas se pliegan en fila de 68 px con borde de acento, check y «N de N hechos». Las de después, en fila «Después ⌄» con su subtítulo («Activación dinámica · 4 movimientos», «Pecho · Hombro · 3 ejercicios», «Enfriamiento · 6 movimientos»). Cualquier fila plegada se abre con un toque para ver su lista. Reemplaza a PhaseCard, TrainingCard y LockedCard.
- **ExerciseRow v2** (variante aditiva, Plan e Historial no cambian): 76 px, miniatura, nombre hasta **2 renglones con «…»**, línea secundaria y estados:
  - *siguiente*: fondo más claro y borde blanco;
  - *en curso* (solo ejercicios): «Serie {n+1} de {M} · Última {peso}» + marcas de series (n encendidas);
  - *hecho*: borde de acento + check; ejercicios con «Hoy {series} × {peso}», movimientos con su músculo;
  - normal: ejercicios «{músculo} · Última {peso}» y «{series} × {reps}» a la derecha; movimientos solo el músculo, **nada a la derecha**.
- **NextStepDock** (ya existe) con un solo botón principal y caption:
  - antes de calentar: «{N} movimientos, uno a la vez» · «Empezar calentamiento»; primer entreno de la vida (sin ningún `exerciseLog`): caption «Tu primer entreno. Empieza suave: {N} movimientos.»;
  - calentamiento a medias: «Movimiento {k} de {N}» · «Seguir con {primer movimiento sin marcar}»;
  - entrenamiento sin empezar el ejercicio: «Ejercicio {k} de {N} · {series} series» · «Empezar con {ejercicio}»;
  - ejercicio en curso: sin caption · «Registrar serie {n+1} de {ejercicio}»;
  - falta estirar: «Último paso · {N} movimientos» · «Empezar estiramiento»;
  - sin conexión: el caption pasa a «Sin internet también se guarda todo en tu teléfono.»
  - El botón abre la hoja del paso: Warmup en el movimiento indicado o Detalle en el ejercicio indicado.
- **Cierre**: «Terminar sesión» → **StreakScreen** (pantalla completa: «Tu racha», número de 150 px, «semanas seguidas», «¡Sigue así!», botón «Seguir»; **no se cierra sola**) → **hoja de esfuerzo** (Sheet: «¿Cómo sentiste la sesión?», «Así Pedro te da mejor feedback.», 4 opciones con barras de intensidad sin emojis, «Ahora no») → **resumen**:
  - eyebrow «Hoy · terminado en {min} min»;
  - «Tu coach» con Avatar «Pedro» y `analysis`;
  - «Para la próxima» con `proximo_objetivo` y `recommendations`;
  - tres cifras sin acento (volumen, récords, duración);
  - «Reiniciar día» como botón de texto.
  - Tras «Ahora no» (o sin análisis): eyebrow y duración, botón secundario «Pedir análisis al coach» que reabre la hoja de esfuerzo, y «Reiniciar día».
- **Sin programa** (06): «Bienvenido» / «Entrenemos.» / «Arma tu rutina una vez. Después, cada día verás aquí qué te toca.». Tres pasos («Arma tu rutina», «Entrena desde Hoy», «Suma con tus amigos») y nota de privacidad con ícono candado: «Tus datos viven solo en este teléfono. Respáldalos cada 2 semanas en **Tú → Copia de seguridad**.» Dock «Armar mi rutina» → Tú.
- **Avisos**: «Inicia tu Smart Watch» y «Estira bb» se quedan en **CenterToast** como hoy.
- **Pie**: se quita la línea de versión; **el botón ↻ se queda** (Pedro lo decide después).
- El día de descanso (RestDayView) no cambia.

**Calentamiento y Estiramiento** («Hoy · Nuevo» v2 · 08–12) son **la hoja de Detalle v2** con otro contenido:

- Cabecera de Detalle: agarradera, cerrar ↓ y posición «Calentamiento · **k de N**» / «Estiramiento · **k de N**».
- **ExerciseMedia** de 112 px: el GIF encajado entero (`contain`) con botón «Ver en grande» y las píldoras Google / TikTok (misma búsqueda que Detalle, con el nombre del movimiento). Sin imagen: hueco de la misma altura con «Sin imagen para este movimiento» y las píldoras.
- **TitleNav** de Detalle: nombre de 28 px hasta **2 renglones con «…»**, músculo debajo en texto y flechas ← → de 56 px. Las flechas solo navegan. Si el movimiento tiene `stallbar`, un badge pequeño «STALLBAR» junto al músculo.
- **TargetPanel de una celda**: la **frase completa** de `duracion` en texto (no se convierte en cifra). Los genéricos no tienen `duracion` y no muestran objetivo.
- **Fila «Cómo se hace · N pasos»** (la fila del coach sin IA), cerrada por defecto. Abierta muestra Posición inicial / Ejecución / Respiración. En los genéricos tiene un solo paso con `desc`.
- **LogDock**: caption «Después: {siguiente movimiento}» y **una fila con dos botones**: «Siguiente» (secundario) y «Hecho» (primario). Hecho marca el movimiento y avanza. Siguiente avanza sin marcar. En el último, la caption es «Último movimiento», Siguiente queda apagado y el primario dice «Terminar calentamiento» / «Terminar estiramiento», que cierra la fase aunque haya movimientos sin marcar.
- **Completado**: posición «· listo», panel resumen «Calentamiento listo · X de N hechos» con la lista de los marcados. Dock con un botón «Empezar con {primer ejercicio sin hacer}» (cierra la hoja y abre su Detalle; caption «Después: Entrenamiento · N ejercicios»). En estiramiento, caption «Lo último de hoy» y botón «Terminar sesión» (cierre).
- Sin conexión: OfflineBanner en el lugar de la posición, el media dice «la imagen carga al volver la conexión» y la caption «Sin internet también puedes seguir». Hecho funciona.
- Los movimientos marcados se guardan en la sesión del día y sobreviven a recargar.
- Se cumple la comparativa v2 · 12: posición, media, flechas, nombre y botón principal a la misma altura que en Detalle.

**Detalle de ejercicio** queda como «Detalle de ejercicio · Nuevo» 00–05 y la parte sin conexión de 06:

- Cabecera (posición «{día} · **k de N**» cuando viene de una lista), media 112 con «Ver animación» (alterna imagen/GIF) y Google / TikTok, TitleNav (nombre 2 renglones máx.), objetivo de dos celdas «{series} × {reps} · series × reps» y «{m:ss} · de descanso». Si `sets` es 0 (abierto desde Historial) no se muestra el objetivo.
- Fila del coach con tratamiento IA «Pregúntale al coach · IA». Sin conexión: «El coach necesita internet», apagada.
- Segmentado Registrar / Historial / Alternativas (Alternativas solo si hay curadas o está cambiado, como hoy).
- **WeightPanel**: «Peso de hoy · Última vez {peso}», − / + de 58 px y número de 56 px. **Se puede tocar el número para escribir** (`inputmode="decimal"`). Caption «Igual en las {N} series · de 5 en 5 {unidad}» y link «Series con pesos distintos ›».
  - Registrado: borde de acento, check, «Registrado hoy · {N} series[ · tu nuevo récord]» y caption «Toca − o + para corregirlo».
  - **Sin «Borrar registro de hoy»**: cambiar el peso vuelve el botón a «Registrar {nuevo} {u}» y registrar sobrescribe el de hoy.
- **Bloques** (02): «Series por bloque» con «Un solo peso». Bloque k con tres valores de 56 px (series × reps · kg), cada uno tocable para escribir; el elegido muestra − / + debajo («de 2.5 en 2.5 kg» en peso, de 1 en series y reps). «+ Agregar bloque» y quitar bloque. Dock «Registrar {N} series» con caption «{N} series · {pesos}». Registrado: recap «Bloque k · s × r — {peso}» y «Editar bloques ›».
- **LogDock**:
  - antes de registrar: [⏱ {m:ss}] (secundario 112 px, `aria-label="Iniciar descanso"`, hace lo que hoy hace «⚡ Iniciar») + [Registrar {peso} {u}];
  - registrado: [Siguiente ›] + [⏱ Descansar {m:ss}];
  - la caption es «Después: {siguiente} · {series} × {reps}» si hay siguiente, nada si no (Siguiente apagado);
  - en la pestaña Alternativas el dock es el buscador.
- **Historial** (03): «Tu récord», cifra de 64 px «{max} {u} · {fecha corta}», la frase «Subiste {Δ} {u} desde el {d de mes}.» y la gráfica blanca con el último punto en acento y fechas extremas. Después, sesiones agrupadas por semana («Esta semana», «Semana pasada», «{d} – {d} {mes}»): fecha «Mié 7 oct», «{series} × {reps}» o «Récord» en acento, peso y Δ contra la anterior. Muestra las 3 semanas más recientes y «Ver las {N} sesiones» expande todo. Vacío: «Aquí verás cómo subes» / «Cada vez que registres {ejercicio} sumamos un punto a la gráfica. Hoy puede ser el primero.»
- **Alternativas** (03): «Sugeridas para {ejercicio}» con filas foto + nombre + músculo (sin motivo) y «Toca una para cambiar el ejercicio.». El buscador baja al dock. Sin resultados: «No encontramos «{q}»» / «Prueba con el músculo, como «pecho», o con menos palabras.» + «Borrar búsqueda». Sin curadas: «Sin sugerencias para este» / «Busca abajo cualquier ejercicio del diccionario y cámbialo.» «Volver a {original}» se conserva.
- **Coach** (04): cabecera ‹ «**Coach** · {ejercicio}» ✕, saludo sin emojis, «Preguntas rápidas» en lista de 52 px («Mejorar técnica», «Me duele algo», «¿Voy muy pesado?», «Dame una variante»), campo + enviar. «Me duele algo» → partes del cuerpo (`bodyPartsFor`) en botones de 56 en dos columnas + «Cancelar» de texto.
- **Primera vez con el ejercicio** (05): sin registros, nota «Tu primera vez con {ejercicio}» / «Elige un peso con el que hagas 10 repeticiones limpias. Lo puedes cambiar la próxima vez.». El peso arranca vacío (0), Registrar queda apagado en 0 y la caption es «Ajusta con − y +, luego registra».
- **Sin conexión** (06): OfflineBanner en la posición, caption «Sin internet también se guarda en tu teléfono», Toast «Guardado en tu teléfono · {peso} {u}».

**Shell** (cambia en toda la app, aprobado):

- **Toast** pasa arriba de la pantalla (bajo la barra de estado). Textos de Detalle sin emoji: «Guardado · 80 kg», «Cambiado a {nombre} por hoy», «Volviste a {nombre}». Los textos de otras vistas no cambian.
- **RestTimerBanner** minimizado pasa abajo, sobre la TabBar (en el lugar del dock), en todas las vistas y encima de cualquier dock. Anillo blanco sin brillo y meta «Sigue la serie {setIndex+1} de {sets}» (o «{sets} × {reps}» si no hay `setIndex`). En Hoy, el NextStepDock se oculta mientras el banner está visible.

**Regla de ejercicio hecho** (cambia en toda la app, aprobada): un ejercicio está *hecho* cuando su registro de hoy tiene peso > 0 y viene de Registrar (`sets` vacío) o tiene `sets ≥` las series planeadas. Si tiene `sets` menor está *en curso*. El entrenamiento termina (pasa al estiramiento, se fija `endedAt`, sale «Estira bb») cuando todos están hechos.

## Constraints

### Must
- Fuente de verdad: Claude Design, proyecto en `docs/design-system.md`. Se leen con DesignSync `get_file`:
  - **Hoy · Nuevo**: `components/hoy-v2/00-notas.html`, `01`, `03`, `04`, `06`, `07` (solo `S.offline`), `v2-08` a `v2-12`; piezas en `hoy2.js`/`hoy2.css`, `hoyw.js`/`hoyw.css`.
  - **Detalle de ejercicio · Nuevo**: `components/detalle-v2/00-notas.html` a `06`; piezas en `det2.js`/`det2.css`.
  - Medidas del CSS de las cards, no de las notas (p. ej. el media mide 112 px).
- Calentamiento y Estiramiento reutilizan las piezas de Detalle v2 con **variantes aditivas**, sin una hoja hermana. Las piezas viven en componentes propios y las usan las dos hojas: `DetailSheetHead`, `ExerciseMedia`, `TitleNav`, `TargetPanel` (`one`), `DetailRow` (coach IA / «Cómo se hace»), `LogDock` (uno o dos botones).
- Recorte con «…»: nombres en TitleNav y en filas de SessionSteps a 2 renglones (`-webkit-line-clamp: 2`); título del día a 1 renglón; botón principal y caption del dock a 1 renglón.
- Acento solo para: botón principal, lo hecho (borde, check, series, «Récord», «tu nuevo récord», último punto de la gráfica) y el tratamiento IA del coach. Lo actual va en blanco con fondo más claro. Sin morado en estiramiento.
- Áreas de toque ≥ 44 px; filas de ejercicio 76, fases plegadas 68, botones principales y flechas 56.
- Copy en español como en las cards, salvo las desviaciones aprobadas en este documento. Músculos en español con `muscleLabel` (`src/lib/exercise-utils.ts`).
- Compartidos según `docs/design-migration.md`: usar las variantes «actualizado» (Button `lg`, Sheet nueva, StatBlock `tile`, EmptyState nuevo, NumberStepper `sheet` para el WeightPanel si encaja, Icon, SectionLabel). Si algo de las cards contradice una variante ya actualizada, se registra como conflicto en ese doc y se le pregunta a Pedro.
- Código en funciones pequeñas de un solo propósito. La lógica pura (estados de fila, regla de hecho, textos del dock, agrupación del historial) va en `src/lib/`, fuera de los `.svelte`.
- `getExerciseDisplayName()` para todos los nombres de ejercicio; `units` (kg/lb) en todo peso mostrado.
- Componentes que queden sin importadores se borran, junto con sus cards en `scripts/ds/groups.mjs`.

### Must Not
- No agregar datos al diccionario ni a `exercise-warmup.ts` (sin campo de dosis).
- No cambiar la TabBar, RestDayView ni las vistas Plan, Historial, Amigos y Tú, salvo lo heredado del Toast, el banner de descanso y la hoja de Detalle que abren.
- No tocar el flujo del rest timer (`armRest`, cola del Worker, notificaciones) ni `RestTimerFullscreen`. Solo cambia dónde y cómo se pinta el banner minimizado.
- No mover «Inicia tu Smart Watch» ni «Estira bb» fuera de CenterToast.
- No borrar ni debilitar tests existentes más allá de lo aprobado en T15.
- No subir cards a los grupos «· Nuevo» ni reemplazar el manifiesto remoto entero.

### Out of Scope
- Todas las secciones «Fase 2» de Hoy, v2 · 08 y Detalle: entrenar en día de descanso, saltar calentamiento, duración estimada, qué toca mañana, tocar «última vez» para copiar, temporizador de estiramiento, cambiar movimiento, amigos/récords compartidos, peso sugerido.
- Detalle 07 (Modo serie), Hoy 02 (Calentamiento v1), Hoy 05 (Día de descanso) y v2 · 13 (ajuste de TitleNav).
- Esqueletos y estados de carga (se siguen viendo como hoy); se anotan en «Pendiente: skeletons».
- Mover la línea de versión a Tú; decidir el ↻.
- Toast con ícono.

## Current State

- **Ruta Hoy** `src/routes/today/+page.svelte` (752 líneas):
  - Estado: `phase`, `warmupItems`/`stretchItems` (de `resolvePanelItems(muscles, 'warmup'|'stretch')`, `src/lib/data/warmup-components.ts`), `todayExercises` (`buildTodayExercises` con `todaySwapsMap`), `doneIds`/`todayExDone` (`loadTodayLogs`: hecho = log de hoy con `weight > 0`), `startedAt`/`endedAt`, `warmupDone`/`stretchDone`/`showCoach`, `coachResult`.
  - Persistencia en `settings.sessionState = { date, phase 1..5, todayExDone, startedAt, endedAt }` vía `persistPhase()` (siempre `settings.update`, nunca el store en memoria).
  - Cierre: `showEffortAfterStreak` (racha si `streakShownDate !== hoy`; `recordGymSession`; `syncUserToWorker`), `onStreakDone` (hoy se dispara solo con un `$effect` de 2600 ms), `onEffort` → `runCoachAnalysis` → `Storage.saveCoachAnalysis`, `resetDay`.
  - «Estira bb» (`centerToast` con `pedro.png` y `formatElapsed`) en `loadTodayLogs`; «Inicia tu Smart Watch» en `onWarmupComplete` si `$settings.hasWatch`.
  - Pie `.footer-bar` con `APP_VERSION` y ↻.
- **Componentes de Hoy**: `PhaseHeader` (+ `TimerRing`), `PhaseCard` (+ `ProgressBar`, `StatusBadge`), `TrainingCard` (usa `ExerciseRow` con `data-done`), `LockedCard` (`#today-locked-warmup-stretch`), `Warmup.svelte` (Sheet propia; `items[].{name, tag, imgUrl, gif, posInicial, ejecucion, respiracion, duracion, desc, stallbar}`; Hecho llama `onComplete` de una), `CenterDialog` + `EffortSelector` (`data-effort`, `#effort-overlay`), `StreakOverlay` (`#streak-overlay`, «Semanas consecutivas»), `CoachResultCard` (`CyberpunkCard` «WORKOUT_ANALYSIS v1.0», campos `analysis`, `proximo_objetivo`, `recommendations`, `streak_weeks`, `total_volume`, `pr_count`, `sessionDurationSec`), `OnboardingView` (`GlowCard`, `goto(ROUTES.you)`), `RestDayView`, `CenterToast`.
- **Importadores**:
  - Solo los usa Hoy: `PhaseCard`, `TrainingCard`, `LockedCard`, `PhaseHeader`, `StreakOverlay`, `CoachResultCard`, `OnboardingView`, `Warmup`, `EffortSelector`.
  - `TimerRing` solo lo usa `PhaseHeader`. `CyberpunkCard` y `LoadingSpinner` solo los usa `CoachResultCard`. `ProgressBar` lo usan `PhaseCard`, `Warmup` y `TrainingCard`. `StatusBadge` solo `PhaseCard`.
  - `CenterDialog` lo usan Hoy y `MediaPickerDialog`. `GlowCard` lo usan Hoy, `OnboardingView` y `RestDayView`.
- **Detalle** `src/lib/components/ExerciseDetail.svelte` (592 líneas, v1):
  - Arriba, pills Anterior / ⚡Iniciar / Siguiente; `ExerciseHero` (imagen/GIF, `.hero-name`, Google/TikTok con `displayName + ' exercise'`); botón coach «cyberpunk» + `DebugAIToggle`; `StatsGrid` de 4; `SegmentedControl` (`.seg-btn`); `WorkoutTab`, `HistoryTab`, `AlternativesTab`; `ExerciseCoachChat` (envuelve `CoachChat` look classic, chips en `ChipRow scroll`, partes con `bodyPartsFor`).
  - Lógica a conservar: `pendingWeight`/`blocks`/`advanced`/`savedKey`/`isDirty`, `handleSave` (`logWeight` simple o por bloques; hoy hace toast «✅ …»), `handleIniciar` → `onStartRest` (`startRestFromExercise`, cuenta una serie con `nextSetIndex`), `selectAlternative`/`revertAlternative` (`swapExerciseForToday`), swipe ←/→.
  - `handleClear` («× Eliminar registro de hoy» en `WorkoutTab`) **no borra nada**: solo limpia el formulario. Se elimina.
- **Quién abre Detalle**: `today/+page.svelte`, `plan/+page.svelte:394`, `history/+page.svelte:273` (con `sets: 0`) y `Calendar.svelte:327`. Props: `exercise, open, accent, units, hasPrev, hasNext, isToday, onNavigate, onClose, onLog, onStartRest, onSwap, onRevert`. Para la posición y «Después:» agregar props opcionales (`positionLabel`, `nextExercise`) sin romper a los demás.
- **Series**:
  - `src/lib/set-log.ts`: `logToSets`, `getTodaySets`, `saveSetEntry`/`persistSets` (escribe `sets` = total y `blocks` si difieren; emite `SET_LOG_EVENT`).
  - `src/lib/rest-timer.ts`: `getSetIndex(exerciseId)` (Iniciar del día, en `localStorage`) y `restBannerState` (incluye `setIndex`, `sets`, `reps`).
  - Registrar simple en Detalle llama `logWeight(id, peso, units)` sin `sets`.
- **Shell** `src/routes/+layout.svelte`: monta `RestTimerFullscreen`, `RestTimerBanner` (minimizado), `Toast` (`toastState`; hoy `bottom: 100px`), `OfflineBanner`. Red en `online` (`src/lib/stores/network.ts`).
- **NextStepDock** existe (`bottom: 102px`, caption, espaciador) y lo usa Tú. **ExerciseRow** lo usan TrainingCard, Plan y Calendar.
- **Tipos** `src/lib/types.ts:86`: `sessionState?: {date, phase, todayExDone, startedAt?, endedAt?} | any`.
- **Datos de calentamiento** `src/lib/data/exercise-warmup.ts` (81 entradas con `duracion` en frase). Los genéricos de `warmup-components.ts` solo traen `desc`.
- **Tests** `tests/big.spec.cjs` (4758 líneas):
  - Helpers: `seedIndexedDB` (l. 188), `mockApiRoutes`, `SEED`, `waitWarmupIdle` (l. 283), `buildDayArray`, `storedSettings`, `readEndedAt`.
  - Hoy: flujo completo (l. 318, steps 3, 4, 6, 9, 10), «Warmup detail sheet rendering» (l. 826, 3 tests), alternativa marca la fila (l. 3160), marks rows done (l. 3319), watch/Estira bb (l. 3389).
  - Detalle: ~15 tests usan `.hero-name`, `.seg-btn`, `.alt-card`, «Registrar ·», «Guardado ·», «Actualizar», «Iniciar», `input[inputmode="decimal"]`.
- **Design system**:
  - `scripts/ds/groups.mjs` → recorrido `hoy` (l. 25, escribe `vistas/hoy/*` y `vistas/detalle-ejercicio/*`).
  - Las cards generadas van a grupos «Hoy · Actual» (`vistas/hoy2/`) y «Detalle de ejercicio · Actual» (`vistas/detalle-ejercicio2/`).
  - El manifiesto se sube **fusionado** con el `_ds_manifest.json` remoto (ver `docs/design-system.md` › Pendiente).

## Tasks

### T1: Sesión del día con movimientos marcados
**What:** En `types.ts`, `sessionState` suma `warmupMarks?: number[]` y `stretchMarks?: number[]` (índices de los movimientos marcados con Hecho). Si faltan, son `[]`; no hace falta migración porque viajan con settings en la copia y en el mirror. `resetDay` los limpia.
**Files:** `src/lib/types.ts`
**Verify:** `npm run check`

### T2: Lógica pura de la sesión
**What:** `src/lib/session-steps.ts` con funciones pequeñas:
- `exerciseStatus(planned, todayLog)` → `'pending' | 'now' | 'done'` y `setsDone`, según la regla de hecho.
- `isTrainingDone(exercises)`.
- `firstPending(list)`.
- `firstUnmarked(marks, total)`.
- `dockStep(state)` → `{ caption, label, target }` para cada estado del What, incluidos el primer entreno y sin conexión.
- `sessionEyebrow(date, week)` y `dayMuscles(exercises)` con `muscleLabel`.

Reemplazar el cálculo de `doneIds`/`todayExDone` en Hoy por `exerciseStatus`, para que el desbloqueo del estiramiento, `endedAt` y «Estira bb» usen la regla nueva.
**Files:** `src/lib/session-steps.ts`, `src/routes/today/+page.svelte`
**Verify:** `npm run check`; escenarios 5 y 6.

### T3: Lógica pura del historial de un ejercicio
**What:** `src/lib/exercise-history.ts` con:
- `recordOf(logs)`;
- `gainSentence(logs, units)` («Subiste {Δ} {u} desde el {d de mes}.»; sin frase si Δ ≤ 0 o hay un solo registro);
- `groupByWeek(logs, today)` con las etiquetas «Esta semana», «Semana pasada», «{d} – {d} {mes}»;
- `sessionLine(log)` (`{sets} × {reps}` o «Récord» si es el máximo);
- `deltaPrev`;
- `shortDate` («Mié 7 oct»).
**Files:** `src/lib/exercise-history.ts`
**Verify:** `npm run check`; escenario 18.

### T4: Shell — Toast arriba y banner de descanso abajo
**What:**
- `Toast.svelte`: posición arriba (`top: calc(var(--safe-top) + 10px)`), sin cambiar su API.
- `RestTimerBanner.svelte`: anclado abajo sobre la TabBar (misma altura que NextStepDock, `z-index` sobre los docks), anillo `#fafafa` sin brillo y meta «Sigue la serie {setIndex+1} de {sets}» (pasar `setIndex` desde `+layout.svelte`). Se ve igual en todas las vistas.
**Files:** `src/lib/components/Toast.svelte`, `src/lib/components/RestTimerBanner.svelte`, `src/routes/+layout.svelte`
**Verify:** escenario 7.

### T5: Piezas de Detalle v2
**What:** Componentes nuevos según `det2.css`/`hoyw.css`:
- `DetailSheetHead` (agarradera, cerrar ↓ de 44, slot de posición u OfflineBanner);
- `ExerciseMedia` (112 px; `cover` para foto, `contain` + «Ver en grande» para GIF de movimientos, «Ver animación» que alterna en ejercicios; píldoras Google/TikTok 44 px; variante sin imagen y variante sin conexión);
- `TitleNav` (nombre 28 a 2 renglones, músculo, slot de badge, flechas de 56 con `aria-label` «Anterior»/«Siguiente»);
- `TargetPanel` (dos celdas, o `one` con texto libre);
- `DetailRow` (variante `ai` del coach y `plain` desplegable para «Cómo se hace»);
- `LogDock` (caption a 1 renglón + 1 o 2 botones; variante buscador).
**Files:** `src/lib/components/DetailSheetHead.svelte`, `ExerciseMedia.svelte`, `TitleNav.svelte`, `TargetPanel.svelte`, `DetailRow.svelte`, `LogDock.svelte`
**Verify:** `npm run check`

### T6: WeightPanel y bloques
**What:** `WeightPanel.svelte` reemplaza a `WorkoutTab`:
- Peso de hoy con − / + y número editable al tocarlo (`inputmode="decimal"`).
- Estado registrado con borde, check, «tu nuevo récord» (peso > máximo previo) y caption.
- Link «Series con pesos distintos».
- Primera vez (sin registros): nota y peso 0.

`BlockRow.svelte`: los tres valores de 56 tocables y editables, − / + del elegido (series y reps de 1 en 1, peso de 2.5 en 2.5), quitar bloque, «Agregar bloque», recap registrado.

Se eliminan «Eliminar registro de hoy» y `handleClear`. Al cambiar un valor registrado, el botón vuelve a «Registrar …» y sobrescribe.
**Files:** `src/lib/components/WeightPanel.svelte`, `src/lib/components/BlockRow.svelte`
**Verify:** escenarios 15–17 y 21.

### T7: Historial y Alternativas v2
**What:**
- `ProgressHero.svelte` + lista por semana reemplazan a `HistoryTab`: usa T3, `LineChart` en blanco con el último punto en acento si admite variante (si no, un SVG simple), «Ver las N sesiones» y el vacío.
- `AlternativesTab`: lista de filas con `ExerciseRow` v2 y la búsqueda pasa al `LogDock` en modo buscador. Mantiene `searchExerciseEntries` y el revert.
- Textos sin resultados y vacío como en el What.
**Files:** `src/lib/components/ProgressHero.svelte`, `src/lib/components/HistoryTab.svelte` (reemplazado), `src/lib/components/AlternativesTab.svelte`
**Verify:** escenarios 18 y 19.

### T8: Coach del ejercicio v2
**What:** `ExerciseCoachChat` con el look de la card 04:
- cabecera ‹ / «**Coach** · {ejercicio}» / ✕;
- `QuickAskList` (filas de 52 con chevron);
- partes del cuerpo en grilla 2 × 56 + «Cancelar»;
- saludo sin emojis.

Si `CoachChat` `look="nuevo"` (actualizado por Tú) lo cubre, usarlo y retirar `look: 'classic'` si queda sin uso. La fila del coach en Detalle se apaga sin conexión con «El coach necesita internet».
**Files:** `src/lib/components/ExerciseCoachChat.svelte`, `src/lib/components/CoachChat.svelte`
**Verify:** escenario 20.

### T9: ExerciseDetail v2
**What:** Rearmar `ExerciseDetail.svelte` con T5–T8:
- orden: cabecera, media, TitleNav, objetivo, fila coach, segmentado, panel, LogDock;
- swipe ←/→ igual que hoy;
- props nuevas opcionales `positionLabel`, `nextExercise`;
- textos de Toast sin emoji, y versión «Guardado en tu teléfono · …» si `!$online`;
- `DebugAIToggle` se conserva junto a la fila del coach.

Hoy, Plan, Calendar e Historial pasan la posición y el siguiente cuando tienen lista. Borrar `ExerciseHero`, `WorkoutTab` y lo demás que quede huérfano.
**Files:** `src/lib/components/ExerciseDetail.svelte`, `src/routes/plan/+page.svelte`, `src/lib/components/Calendar.svelte`, `src/routes/history/+page.svelte`
**Verify:** escenarios 14–22; comparativa (23).

### T10: Hoja de movimiento (Calentamiento / Estiramiento)
**What:** Reescribir `Warmup.svelte` (o reemplazarlo por `MovementSheet.svelte`) sobre las piezas de T5:
- props `items`, `mode`, `startIdx`, `marks`, `onMark(idx)`, `onFinish()`, `onStartNext()`;
- posición «Calentamiento · k de N»;
- objetivo `one` con `duracion` (nada en genéricos);
- «Cómo se hace» cerrada; badge STALLBAR;
- dock [Siguiente][Hecho] y el último con «Terminar …»;
- panel Completado; estados sin imagen y sin conexión;
- swipe como hoy.

Quitar `ProgressBar` y el título centrado.
**Files:** `src/lib/components/Warmup.svelte` o `MovementSheet.svelte`
**Verify:** escenarios 2–4, 13 y 23.

### T11: Componentes de Hoy v2
**What:**
- `SessionSteps.svelte` (fase abierta / hecha / después, despliegue al toque, filas de 76).
- `ExerciseRow` variante aditiva `session` (estados siguiente / en curso con marcas / hecho, líneas del What, nombre a 2 renglones; Plan e Historial sin cambios visuales).
- `StreakScreen.svelte` (botón «Seguir», sin temporizador, `id="streak-overlay"`).
- `EffortSheet.svelte` (Sheet, barras de intensidad, `data-effort`, «Ahora no», `id="effort-overlay"`).
- `SessionSummary.svelte` (Avatar «Pedro», textos, cifras con StatBlock `tile`, «Pedir análisis al coach», «Reiniciar día»).
- `FirstRunView.svelte` (sin programa).
**Files:** `src/lib/components/SessionSteps.svelte`, `ExerciseRow.svelte`, `StreakScreen.svelte`, `EffortSheet.svelte`, `SessionSummary.svelte`, `FirstRunView.svelte`
**Verify:** `npm run check`

### T12: Ruta Hoy v2
**What:** Rearmar `today/+page.svelte`:
- PageHeader con reloj en texto; SessionSteps; NextStepDock con `dockStep` (oculto mientras `restBannerState.visible && minimizado`).
- Abrir Warmup en `firstUnmarked` o en el movimiento tocado; `onMark` persiste en `sessionState`.
- «Empezar con …» abre Detalle en `firstPending`.
- Cierre: StreakScreen → EffortSheet → SessionSummary. Quitar el `$effect` de 2600 ms.
- Sin programa: FirstRunView. Primer entreno: caption.
- Pie: quitar `APP_VERSION`, dejar ↻.

Conservar `persistPhase`, `recordGymSession`, `syncUserToWorker`, «Estira bb» y «Inicia tu Smart Watch» en CenterToast.
**Files:** `src/routes/today/+page.svelte`
**Verify:** escenarios 1–13.

### T13: Borrar huérfanos
**What:** Grep de importadores y borrar los que queden sin uso. Lista esperada: `PhaseCard`, `TrainingCard`, `LockedCard`, `PhaseHeader`, `TimerRing`, `StreakOverlay`, `EffortSelector`, `CoachResultCard`, `CyberpunkCard`, `LoadingSpinner`, `OnboardingView`, `ProgressBar`, `StatusBadge`, `ExerciseHero`, `WorkoutTab`, `HistoryTab` (si se reemplaza) y `Warmup` (si se reemplaza). Verificar también `GlowCard` (RestDayView lo usa: se queda), `CenterDialog` (MediaPickerDialog lo usa: se queda), `StepButton`, `NumberStepper` default y `LineChart`. Quitar sus cards de `scripts/ds/groups.mjs`.
**Files:** `src/lib/components/*`, `scripts/ds/groups.mjs`
**Verify:** `npm run check`; `npm run build`.

### T14: Docs
**What:**
- `docs/design-migration.md`:
  - marcar actualizados `ExerciseDetail`, `ExerciseRow` (variante `session`), `NextStepDock` (lo usa Hoy), `Toast`, `RestTimerBanner`, `CoachChat` y `SegmentedControl` si se usó su variante;
  - registrar los compartidos nuevos de T5, T6 y T11;
  - quitar la deuda resuelta;
  - en «Pendiente: skeletons» anotar Hoy, Detalle y la hoja de movimiento;
  - en «Otras secciones desalineadas» anotar el Toast arriba, el banner abajo, la regla de hecho y el Detalle nuevo abierto desde Plan e Historial.
- `docs/screens.md` y `docs/data-flow.md`: una línea cada uno con la regla de hecho y `warmupMarks`/`stretchMarks`.
- AGENTS.md no cambia.
**Files:** `docs/design-migration.md`, `docs/screens.md`, `docs/data-flow.md`
**Verify:** lectura.

### T15: Tests existentes (aprobados por Pedro el 2026-10-15)
**What:** Adaptar sin borrar ninguno. Dejar en cada uno un comentario «Changed 2026-10-15 with Hoy/Detalle v2 (approved by Pedro): …» con la intención vieja.
1. **Flujo completo** (los nombres de step no cambian):
   - Step 3: SessionSteps en lugar de `[data-phase]` y `#today-locked-warmup-stretch`; el estiramiento se ve como «Después».
   - Step 4: en la hoja, Anterior/Siguiente con las flechas; Hecho avanza; «Terminar calentamiento» en el último.
   - Step 6: fila de entrenamiento.
   - Step 9: `#streak-overlay` con «semanas seguidas»; sigue visible después de 3 s; tocar «Seguir».
   - Step 10: `#effort-overlay` como hoja, `data-effort="Justo"`; el resumen tiene «Tu coach» y no «WORKOUT_ANALYSIS».
2. **Warmup detail sheet rendering**:
   - Secciones: abrir «Cómo se hace» y ver Posición inicial / Ejecución / Respiración; la frase de duración está en el objetivo.
   - Genéricos: «Cómo se hace» con el `desc`, sin «Posición inicial».
   - STALLBAR: avanzar con la flecha → «Estiramiento · 2 de N» → `STALLBAR` visible.
3. **Watch / Estira bb / duración**: se conservan los dos CenterToast; se termina el calentamiento con «Terminar calentamiento»; la racha se cierra con «Seguir».
4. **Selectores** (misma promesa):
   - alternativa marca la fila (TimerRing → reloj en texto; `[data-phase]` → filas; `.ex-done-badge` → estado hecho);
   - marks rows done; Anterior/Siguiente en Detalle; E2E alternativa; buscar en el diccionario (buscador en el dock); el peso nuevo reemplaza (botón «Registrar {peso} {u}» tras cambiar el peso); arranca desde caché (`.exercise-row`).
   - Los tests de Detalle con «Registrar ·», «Guardado ·», «Actualizar», «⚡ Iniciar», `.hero-name`, `.seg-btn`, `.alt-card` y el coach pasan a los textos y selectores nuevos.
   - Los tests que siembran registros de timer con `sets` menor que lo planeado y esperan «hecho» se ajustan a la regla nueva (sembrar todas las series o registrar con Registrar).
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

### T16: Tests nuevos
**What:** Los 23 escenarios de Test Scenarios, cada uno en su `test.describe()` con un solo `test()`.
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test -g "Hoy v2|Detalle v2"`

### T17: Cards del design system
**What:** Reescribir el recorrido `hoy` en `scripts/ds/groups.mjs`:
- **Hoy · Actual** en `vistas/hoy2/`: antes de empezar, calentamiento a mitad, entrenando, en curso, descansando, falta estirar, esfuerzo, racha, resumen, sin programa, primer entreno, sin conexión.
- **Detalle de ejercicio · Actual** en `vistas/detalle-ejercicio2/`: principal, registrado, bloques, historial, alternativas, sin resultados, coach, me duele algo, primera vez, sin conexión.
- Calentamiento, estiramiento, último, completado, sin imagen y sin conexión en «Hoy · Actual».
- Cards de componentes (SessionSteps, ExerciseRow v2, StreakScreen, EffortSheet, SessionSummary, piezas de T5) y Shell (Toast, RestTimerBanner).

No pisar `vistas/hoy/` ni `vistas/detalle-ejercicio/` («· v1»), ni nada «· Nuevo».

Pasos:
1. `npm run build && npm run preview -- --port 8080 --strictPort`
2. `node scripts/ds/build.mjs hoy shell`
3. `node scripts/ds/preview.mjs` y revisar la hoja de contacto.
4. Bajar el `_ds_manifest.json` remoto (`get_file`) y agregarle solo las cards nuevas.
5. Subir con DesignSync solo `vistas/hoy2/**`, `vistas/detalle-ejercicio2/**`, `shell/**` y el manifiesto fusionado, sin `delete_files`. Antes de subir, decirle a Pedro qué toca.
**Files:** `scripts/ds/groups.mjs`, `scripts/ds/seed.mjs`
**Verify:** el panel muestra «Hoy · Actual», «Detalle de ejercicio · Actual» y todos los «· Nuevo» y «· v1» intactos.

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- grep: ningún componente de `src/lib/components/` sin importadores (salvo `/admin`).
- No commit, push, bump ni deploy (eso lo hace el implementer según `docs/commit-policy.md`). No hay cambios en el Worker.
- Manual (no lo cubre la suite):
  - En un iPhone real: el banner de descanso abajo con la app en segundo plano y al volver; el Toast arriba bajo la isla dinámica (safe area); el reloj del Watch con «Inicia tu Smart Watch»; las notificaciones del descanso siguen igual.
  - El recorte de nombres de 40+ caracteres con la fuente real y el tamaño de texto Grande.

## Test Scenarios

Todos con `seedIndexedDB()` y la UI real. Datos base: programa con día «Empuje» (Press Banca `Chest` 4 × 8-10 / 120 s; Press Militar `Shoulders` 3 × 10-12 / 90 s), semana `{ name: 'Semana 1', subtitle: 'Volumen', tag: 'BUILD' }`, `hasWatch: false`. «Hoy» = `getTodayStr()`.

### Nuevos

1. **`Hoy v2 — antes de empezar`**
   - Seed: base, sin `sessionState`, con un registro de ayer.
   - Asserts:
     - eyebrow contiene «Semana 1 · Volumen» y no «BUILD»; título «Empuje.»; sub «Pecho · Hombro»;
     - Calentamiento abierta con sus movimientos (`ExerciseRow` sin texto a la derecha); Entrenamiento y Estiramiento con «Después»;
     - dock «Empezar calentamiento» con caption «{N} movimientos, uno a la vez»;
     - no existen `#today-locked-warmup-stretch`, `[data-component="PhaseCard"]` ni el texto `APP_VERSION`; el ↻ existe.
2. **`Hoy v2 — calentamiento movimiento a movimiento`**
   - Seed: base.
   - Pasos:
     - tocar el dock → «Calentamiento · 1 de N»; el objetivo contiene «12 a 15 repeticiones»; «Posición inicial» no visible;
     - tocar «Cómo se hace» → se ven Posición inicial / Ejecución / Respiración; la flecha Anterior está apagada;
     - Hecho → «2 de N»; Siguiente → «3 de N»; cerrar ↓.
   - Asserts:
     - fila 1 hecha, fila 2 no; dock «Seguir con {movimiento 2}» y caption «Movimiento 2 de N»;
     - recargar → lo mismo; `sessionState.warmupMarks` = `[0]`.
3. **`Hoy v2 — terminar calentamiento y empezar el entrenamiento`**
   - Seed: base con `warmupMarks: [0]`.
   - Pasos: abrir, ir con la flecha al último → Siguiente apagado, primario «Terminar calentamiento», caption «Último movimiento»; tocar.
   - Asserts:
     - «Calentamiento · listo» y «1 de N hechos» … (los marcados), dock «Empezar con Press Banca»;
     - tocar → Detalle de Press Banca abierto; cerrar → Calentamiento plegada como hecha; `sessionState.phase` ≥ 2.
4. **`Hoy v2 — hoja de movimiento sin imagen y sin conexión`**
   - Seed: base; abrir en el movimiento sin `image`/`gif` de pecho (o sembrar músculo cuyo movimiento no tenga media).
   - Asserts:
     - «Sin imagen para este movimiento» y las píldoras Google y TikTok;
     - `context.setOffline(true)` y disparar `offline` → «Sin conexión» en la cabecera y caption «Sin internet también puedes seguir»; Hecho avanza.
5. **`Hoy v2 — entrenando con un ejercicio en curso`**
   - Seed: `phase: 2`, `startedAt` hace 5 min, registros de hoy: Press Banca `{weight: 80}` sin `sets`, Press Militar `{weight: 40, sets: 1, reps: '10'}`; registro de ayer de Press Militar 40.
   - Asserts:
     - Press Banca hecha con «Hoy 4 × 80 kg»; Press Militar en curso «Serie 2 de 3 · Última 40 kg» con 1 de 3 marcas encendidas;
     - reloj de sesión visible; Estiramiento con «Después»;
     - dock «Registrar serie 2 de Press Militar» → abre Detalle con «Press Militar»; `endedAt` sigue `null`.
6. **`Hoy v2 — entrenamiento terminado al completar las series`**
   - Seed: como el 5, pero Press Militar `{ sets: 3 }`.
   - Asserts:
     - CenterToast «Estira bb»; Estiramiento abierta; dock «Empezar estiramiento», caption «Último paso · {N} movimientos»;
     - reloj de sesión oculto; `endedAt` no `null`.
7. **`Hoy v2 — descanso minimizado abajo`**
   - Seed: `phase: 2`.
   - Pasos: fila Press Banca → Detalle → «Iniciar descanso» → minimizar el timer → cerrar Detalle.
   - Asserts:
     - `RestTimerBanner` visible, con su `boundingBox().y` > mitad del viewport y encima de la TabBar; texto «Sigue la serie»;
     - el NextStepDock de Hoy no visible;
     - `goto('plan')` → el banner sigue abajo.
8. **`Hoy v2 — cierre: estiramiento, racha, esfuerzo y resumen`**
   - Seed: `phase: 3`, ejercicios hechos, `streakShownDate` vacío; `mockApiRoutes` con análisis (`analysis`, `proximo_objetivo`, `recommendations`, `total_volume`, `pr_count`).
   - Pasos: Empezar estiramiento → ir al último → «Terminar estiramiento» → «Estiramiento · listo» → «Terminar sesión».
   - Asserts:
     - `#streak-overlay` con «semanas seguidas», todavía visible a los 3 s; «Seguir» → `#effort-overlay` con 4 opciones y ningún emoji;
     - «Justo» → «Tu coach», texto del análisis, «Para la próxima», recomendaciones, las 3 cifras y «Reiniciar día»; no aparece «WORKOUT_ANALYSIS»;
     - recargar → el resumen sigue.
9. **`Hoy v2 — Ahora no y pedir análisis después`**
   - Seed: como el 8 con `streakShownDate` = hoy.
   - Pasos: terminar → hoja de esfuerzo → «Ahora no».
   - Asserts: «Hoy · terminado en» y «Pedir análisis al coach»; tocar → `#effort-overlay` visible.
10. **`Hoy v2 — sin programa`**
    - Seed: sin programa ni ejercicios.
    - Asserts: «Entrenemos.», los 3 pasos, «Tú → Copia de seguridad»; «Armar mi rutina» → la URL termina en `/you`.
11. **`Hoy v2 — primer entreno`**
    - Seed: base sin ningún `exerciseLog`.
    - Asserts: caption que empieza con «Tu primer entreno.»
12. **`Hoy v2 — sin conexión en Hoy`**
    - Seed: como el 5; offline.
    - Asserts: caption «Sin internet también se guarda todo en tu teléfono.»
13. **`Hoy v2 — nombres largos recortados`**
    - Seed: día con nombre de 60 caracteres; ejercicio «Flexiones dinámicas excéntricas contra pared con pausa isométrica».
    - Asserts:
      - el título del día mide un renglón (alto ≤ 1.3 × `line-height`) y tiene `text-overflow: ellipsis`;
      - el nombre en la fila y en la hoja mide ≤ 2 renglones.
14. **`Detalle v2 — pantalla principal`**
    - Seed: base con registros previos de Press Banca (75); abrir desde Plan en Press Banca.
    - Asserts:
      - posición «… 1 de 2»; píldoras Google y TikTok; nombre; flechas «Anterior» (apagada) y «Siguiente»;
      - «4 × 8-10» y «2:00»; «Pregúntale al coach» con «IA»; segmentado; «Peso de hoy» y «Última vez 75 kg»;
      - botón «Iniciar descanso» y «Registrar 75 kg»; caption «Después: Press Militar · 3 × 10-12».
15. **`Detalle v2 — registrar y sobrescribir`**
    - Seed: como el 14.
    - Pasos: «Registrar 75 kg».
    - Asserts:
      - «Registrado hoy»; Toast «Guardado · 75 kg» con `boundingBox().y` < 200; botones «Siguiente» y «Descansar 2:00»; no existe «Borrar registro» ni «Eliminar registro»;
      - + → «Registrar 80 kg» → tocar → recargar y reabrir: «80» y un solo registro de hoy en IndexedDB.
16. **`Detalle v2 — nuevo récord`**
    - Seed: máximo previo 75.
    - Pasos: escribir 80 en el número y registrar.
    - Asserts: «tu nuevo récord».
17. **`Detalle v2 — series por bloque`**
    - Pasos: «Series con pesos distintos» → tocar el peso del bloque 1 → aparecen − / + → + → «Agregar bloque».
    - Asserts:
      - el dock dice «Registrar {N} series»; tocar → recap «Bloque 1 · …» y «Bloque 2 · …» con pesos, y «Editar bloques»;
      - «Un solo peso» vuelve al panel simple.
18. **`Detalle v2 — historial`**
    - Seed: Press Banca con 8 registros en 4 semanas (60 → 80).
    - Pasos: pestaña Historial.
    - Asserts:
      - «Tu récord», «80», «Subiste 20 kg desde el …»;
      - etiquetas «Esta semana» y «Semana pasada»; fecha con día abreviado en español; «Récord» en la fila del máximo;
      - «Ver las 8 sesiones» → 8 filas.
      - Abrir Press Militar sin registros → «Aquí verás cómo subes».
19. **`Detalle v2 — alternativas`**
    - Seed: `SEED.exercises[0]` con alternativas curadas.
    - Pasos: pestaña Alternativas.
    - Asserts:
      - «Sugeridas para …» con filas con imagen; el buscador está en el dock (bajo la mitad de la pantalla);
      - escribir «zzzz» → «No encontramos «zzzz»» y «Borrar búsqueda» → vuelve la lista;
      - en un ejercicio sin curadas → «Sin sugerencias para este».
20. **`Detalle v2 — coach`**
    - Pasos: «Pregúntale al coach».
    - Asserts:
      - «Preguntas rápidas» con 4 filas visibles completas; «Me duele algo» → botones de partes del cuerpo y «Cancelar»;
      - cerrar; offline → la fila dice «El coach necesita internet» y está deshabilitada.
21. **`Detalle v2 — primera vez con el ejercicio`**
    - Seed: sin registros de Press Banca.
    - Asserts: «Tu primera vez con Press Banca»; el botón Registrar está deshabilitado; caption «Ajusta con − y +, luego registra»; + → «Registrar 5 kg» habilitado.
22. **`Detalle v2 — sin conexión`**
    - Seed: como el 14; offline.
    - Asserts: «Sin conexión» en la cabecera; caption «Sin internet también se guarda en tu teléfono»; registrar → Toast «Guardado en tu teléfono · 75 kg».
23. **`Hoy v2 — comparativa Detalle / Calentamiento`**
    - Seed: base con nombres de una línea.
    - Pasos:
      - abrir Detalle de Press Banca y medir `boundingBox().y` de posición, media, flechas, nombre y botón principal; cerrar;
      - abrir el calentamiento en un movimiento de nombre corto y medir lo mismo.
    - Asserts: cada par difiere ≤ 2 px.

### Cambiados (T15, con el sí de Pedro)
Flujo completo (steps 3, 4, 6, 9, 10), Warmup detail sheet rendering ×3, watch / Estira bb / duración, alternativa marca la fila, marks rows done, Anterior/Siguiente en Detalle, E2E alternativa, buscar en el diccionario, el peso nuevo reemplaza, arranca desde caché y los tests de Detalle que usan los textos y selectores viejos.

### Fuera de la suite (manual)
Banner de descanso y notificaciones en iPhone real con la app en segundo plano; Watch; safe area del Toast arriba; recorte con la fuente real y el tamaño de texto Grande.
