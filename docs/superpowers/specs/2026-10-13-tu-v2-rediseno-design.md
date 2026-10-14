# Design: Tú v2 — resumen con puertas, hojas y chat solo-texto

Fecha: 2026-10-13
Estado: Aprobado

## Why

La vista Tú es un segmentado de 4 pestañas con inputs de 72 × 28 px y selects nativos, acento en todas partes, acciones peligrosas junto a las frecuentes («Sobrescribir», «Eliminar» al lado de «Editar», restaurar sin confirmar) y jerga («ROUTINE_IMPORT v1.0», «IA Powered», «1 semana(s)»). El rediseño «Tú · Nuevo» en Claude Design lo resuelve, y Tú es la primera sección que migra: fija los componentes compartidos nuevos que reusarán las demás.

## What

Tú queda como en el grupo **«Tú · Nuevo»** (cards 01–06 y 10–13; 07–09 son fase 2) usando **«Compartidos · Nuevo»**:

- **Resumen** (01): «Tú» + «{nombre}.» + «{experiencia} · {objetivo}», 3 baldosas (entrenos, semanas, ejercicios — sin Racha), tarjeta del programa activo con fila «Ver y cambiar programas · N» y un grupo de filas: Mis datos «6 de 7», Ejercicios «N», Ajustes, Copia de seguridad. Cada fila abre una subpantalla con «‹ Tú».
- **Mis datos** (01, 12): 7 filas (Estatura, Peso, Edad, Sexo, Objetivo, Experiencia, Profesión); vacío = «Agregar». Números en hoja con NumberStepper (estatura ±1 cm, peso ±0.5 kg, edad ±1), opciones en lista que guarda al tocar, profesión en hoja de texto. Dock: «Agregar {campo}» cuando falta alguno.
- **Primera vez** (05): sin ningún programa, el resumen es «Hola.» con 2 pasos (Tus datos «N de 7», Tu programa) y dock «Completar mis datos» (abre la guía «Mis datos · 1 de 7» con Saltar / Siguiente) o «Crear programa» si ya están los 7.
- **Programas** (02, 08, 13): tarjeta del activo (punto de acento «Programa activo», ⋯, «Editar días y ejercicios», entrada IA «Mejorar con el coach · Gratis»); «Otros programas» con «Activar» y ⋯ (Editar, Duplicar, Eliminar con confirmación en la hoja). Dock «Crear programa» → hoja con 3 caminos: Platícalo con el coach, Pega tu rutina (IA, apagados sin conexión con «Necesita internet») y Desde cero.
- **Chat solo-texto** (13) para los 3 caminos con IA: mensajes del coach sin burbuja, del usuario en burbuja, etiquetas de lo elegido, chips fijos por chat, campo + enviar, botón principal fijo abajo apagado mientras el coach escribe.
  - Con el coach: hoja de selección (días 3/4/5/6, equipo, enfoque, zonas con molestia) → chat → «Crear este programa».
  - Pega tu rutina: hoja de pegar (ejemplo, «Pegar lo que copiaste», «Escribirla aquí», conteo de líneas) → chat (lo pegado como burbuja «Tu rutina · N líneas») → «Crear este programa».
  - Mejorar: chat → «Crear versión nueva» → hoja «Versión nueva» (nombre sugerido «{programa} · v2», switch «Usarla desde hoy» encendido) → toast «Versión nueva activa. La anterior sigue abajo.»
  - Programa nuevo y pegado terminan en la pantalla «Listo, {nombre}.» con «Ver en Hoy» y «Ver programa» (card 07 · Creado, sin ProgramPreview).
- **Editor de programa** (11): hoja completa con pie fijo; semanas con rótulo editable (hoja Editar semana), días como grupos (hoja Editar día: nombre, chips L–D, duración solo mostrada, Quitar día), ejercicios como filas (hoja Editar ejercicio del día: nombre con sugerencias, series y descanso con stepper, repeticiones como texto), ✕ con confirmación en la fila, Añadir ejercicio/día/semana. Desde cero = mismo editor vacío; guardar sin nombre marca el error.
- **Duración del día calculada** (glosario): Σ series × (30 s + descanso), redondeado al minuto. Deja de ser un campo guardado en toda la app.
- **Ejercicios** (03, 10): lista con miniatura y músculo en español; buscador y + abajo sobre la TabBar; sin resultados ofrece «Crear "{búsqueda}"». Ejercicio abierto: Consejos, Alternativas y 3 botones — Datos (EditExerciseSheet: nombre, músculo, imagen opcional; al final «Eliminar ejercicio» con confirmación que dice cuántos registros se borran), Consejos (lista editable) y Alternativas (nombre + motivo). Nuevo ejercicio en hoja con sugerencias de músculo «De tu lista».
- **Ajustes** (04, 12): Unidades (segmentado compacto kg/lb), Tamaño de texto, Idioma y Color de acento (5 colores + «Otro» = selector libre) en hojas que guardan al tocar; Smart Watch (switch); Notificaciones (hoja según estado: sin pedir / activadas con «Enviar una de prueba» / denegadas con pasos); Instalar app (hoja de 3 pasos o el prompt nativo).
- **Copia de seguridad** (04, 12): dock «Guardar copia» (descarga todo, hoja de resultado); Restaurar una copia (confirma ofreciendo guardar antes; **mezcla** como hoy); Exportar / Importar ejercicios (importar **no pisa** los que ya tienes); Mantenimiento: Ordenar con el diccionario (confirmación, resultado «N de M ordenados», subpantalla «Sin coincidencia» que abre Datos de cada uno) y Modo debug de IA (hoja con contraseña / estado, último intercambio, Mostrar, Copiar todo, Desactivar).
- **Sin conexión** (06): todo funciona; solo lo de IA se apaga y lo dice.

## Constraints

### Must
- Fuente de verdad: grupo **«Tú · Nuevo»** (cards 00–06 y 10–13, piezas en `components/tu-v2/tu2.css`, `tu2.js`, `tu2-edit.js`, `tu2-hojas.js`, `tu2-chat.js`, `tu2-coach.js`) y **«Compartidos · Nuevo»** (`components/compartidos-v2/`, reglas en su `00-notas.html`). Leerlas con DesignSync `get_file` (projectId en `docs/design-system.md`). Donde Tú y Compartidos difieren, gana lo que Compartidos · 00 Notas eligió (ej. NumberStepper de círculos de 58 y cifra de 56).
- Copy de la UI en español, tal como en las cards, salvo las desviaciones aprobadas abajo.
- Acento solo en: botón principal, lo logrado, punto de «Programa activo» y entradas con IA. Seleccionado / encendido en blanco.
- Áreas de toque ≥ 44 px; filas 56; botón principal 56.
- Estrategia de compartidos (aprobada) y registro en `docs/design-migration.md`:
  - **Reemplazo** (cambia para todas las vistas): `SectionLabel`, `PageHeader`, `Icon`, `SearchInput`, y en `Sheet` el radio 28 + fondo 60 %.
  - **Variante nueva + deuda** (la vieja se queda para las vistas sin migrar): `Button` (tamaños 56 y 44 pastilla), `FilterChip`/`ChipRow`, `SegmentedControl` (compacto), `StatsGrid`/`StatBlock` (baldosas), `EmptyState` (título/texto/acción, tarjeta/centrado), `TextInput` (campo 52 con etiqueta/unidad/error), `NumberStepper` (de hoja), `Sheet` (cabecera con `title` y cerrar 44, `full`, pie fijo), `CoachChat` (look nuevo; Detalle conserva el viejo y su `.coach-close-btn`).
  - **Nuevos compartidos**: `NavRow` (+ grupo), `Switch`, `SubpageHeader`, `IconButton`, `NextStepDock`, `Tag`, `OptionList`, `EditSheet` (base reutilizable: título, cuerpo, Guardar/Cancelar, acción peligrosa al final con confirmación en la hoja), `EditExerciseSheet` (sobre `EditSheet`; la misma de Historial · Nuevo 02, Tú le suma eliminar), `EditableList`, `InlineConfirm`, `ResultSheet`, `AIEntry`, `ChatMessage`/`ChatDock`.
- Todo componente que quede sin importadores se **borra** (y su card en `scripts/ds/groups.mjs`). Lista esperada: `ProfileCard`, `QuickSettingsCard`, `AccentToggle`, `CardRow`, `ProgramCreateForm`, `ProgramEditorIACard`, `NewExerciseForm`, `NormalizeCard`, `DataImportSection`, `DataExportSection`, `ActionRow`, `DeleteButton`. Verificar con grep al final; `CyberpunkCard`, `DebugAIToggle`, `CenterDialog` siguen en uso fuera de Tú.
- La duración se calcula con una sola función en `src/lib/` y se usa en todos los lugares que la muestran.
- El banner de onboarding (`+layout`) deja de mostrarse en `/you`; sus pasos 0–1 dicen lo mismo que «Primera vez». Al crear el primer programa por cualquier camino, si `!onboarded && onboardingStep <= 1` → `onboardingStep: 2` (hoy solo lo hace `ProgramEditor`), para que Hoy siga con los pasos 2–3.
- Los prompts nuevos (pegar → chat, crear desde lo pegado) viven en `src/lib/brain/prompts.ts`, en español. Sin cambios al Worker: `/api/ai/program-chat` y `/api/ai/generate-program` ya toman el `systemPrompt` del cliente.
- Mantener los ids y `data-component` existentes que aún tengan sentido; los nuevos componentes llevan `data-component`.

### Must Not
- **No** hacer commit, push, bump de versión ni deploy: Pedro lo pide aparte. Esto sustituye el paso de commit de la política del implementer; sí correr `npm run check`, `npx playwright test` y `npm run build`.
- No modificar el look de otras secciones más allá de lo que trae el reemplazo de los compartidos de arriba; anotar en `docs/design-migration.md` lo que se ve desalineado.
- No construir skeletons; no construir ProgramPreview, ChangeList ni contador de versión (07–09).
- No borrar ningún grupo «· Nuevo» ni las cards «Tú · v1» del proyecto de Claude Design.
- No tocar el Worker ni su esquema (`duration_min` sigue en el esquema de `push-worker/src/index.js:56`; la app lo ignora).
- No agregar archivos de test; no quitar pasos de `EXPECTED_STEPS`.

### Out of Scope
- Fase 2 de las notas: chats con propuesta estructurada (07–09), fecha de la última copia y aviso, lista cerrada de músculos, historial de peso corporal.
- Skeletons de carga (anotar en «Pendiente: skeletons»).
- Rediseño de Hoy, Plan, Historial, Amigos, Detalle, Shell y Admin.
- Migrar o limpiar el `duration` ya guardado en programas del teléfono (se ignora y desaparece al volver a guardar el programa).

### Desviaciones del diseño aprobadas
- **Restaurar una copia mezcla** (como hoy): la hoja no dice «se reemplaza». Texto: «Agrega lo del archivo y actualiza lo que ya tienes. Lo que no viene en el archivo se queda.» Se mantiene «Guardar copia primero».
- **Importar ejercicios no pisa**: un ejercicio del archivo cuyo id o nombre (sin mayúsculas) ya existe se ignora. Resultado «Nuevos N · Ya los tenías M».
- **Guardar copia** conserva el nombre de archivo actual `training-backup-YYYY-MM-DD.json`; exportar ejercicios conserva `ejercicios-YYYY-MM-DD.json`.
- **Nombre en el encabezado**: `settings.userName` (default «Pedro»); «Hola.» en primera vez. No se agrega fila de nombre.

## Current State

- **Ruta** `src/routes/you/+page.svelte` (976 líneas): `activeTab` con `SegmentedControl` de 4 pestañas; toda la lógica vive aquí: `saveProfileField`, `toggleUnits`, `onAccentChange`, `toggleWatch`, `onFontScaleChange`, `onNotifClick`, `toggleLang`, `createNewProgram`, `activateProgram`, `duplicateProgram`, `deleteProgram` (usa `confirm()`), `openImproveChat`, `openGenerateChat`, `createAgreedProgram`, `onProgramApplied`, CRUD de ejercicios (`saveNewExercise`, `saveEdit`, `deleteExerciseConfirm` con `confirm()`), `activateDebug`/`deactivateDebug`, `submitAIImport`, `onExercisesImport` (hace `put` → pisa), `onLogsImport` (`Storage.importLogsAndSettings`, mezcla), `onExercisesExport`, `onLogsExport`, `runDictMigration`. Las estadísticas en `stats` (racha incluida). Reaprovechar la lógica; partir la vista en componentes por subpantalla (código en funciones pequeñas).
- **Componentes de Tú**: `ProfileCard`, `QuickSettingsCard` (+ `AccentToggle`, `CardRow`, `InstallGuide`; `FONT_SCALES` = 1 / 1.15 / 1.3 con etiquetas Normal / Grande / Extra grande), `ProgramCard`, `ProgramCreateForm`, `ProgramEditor` (329 líneas; `initEditor`, `save` resuelve nombres con `Storage.findOrCreateExerciseByName`, `weekday` 1–7, sube `onboardingStep` a 2), `ProgramEditorIACard`, `ProgramChat` (envuelve `CoachChat`, `apply` + `onapplied`), `ExerciseListItem`, `NormalizeCard`, `NewExerciseForm`, `DataImportSection`/`DataExportSection` (`ActionRow`).
- **Chat**: `src/lib/components/CoachChat.svelte` maneja `thread`, `kickoff` oculto que espera conexión, `send`, `busy`, snippets `chips` y `footer`; lo usa también `ExerciseCoachChat` (Detalle). Saludos en `src/lib/program-chat.ts` (`generateGreeting`, `improveGreeting`, `GENERATE_KICKOFF`).
- **IA** (`src/lib/ai.ts`): `generateProgramChat(thread, overrides)` y `programCoachChat(thread, program)` → `/api/ai/program-chat`; `generateProgramWithAI(overrides, thread)` → `/api/ai/generate-program` (guarda y activa, `currentWeekIdx: 0`); `programCoach(program, thread)` → `/api/ai/program-coach` (guarda como `«{nombre} — {fecha hora}»` y activa); `importWithAI(text)` → `/api/ai/import`; `buildProgramFromAIResponse` llena `duration` desde `duration_min` (línea ~97). Prompts en `src/lib/brain/prompts.ts` (`FORMAT_IMPORT`, `FORMAT_GENERATE`, `FORMAT_PROGRAM_COACH` piden `duration_min`; `FORMAT_GENERATE_CHAT`, `FORMAT_PROGRAM_CHAT`).
- **Duración**: `ProgramDay.duration: number` en `src/lib/types.ts:39`; se escribe en `ProgramEditor` y en `you/+page.svelte:224` (crear con 3 días); se muestra en `DayCard.svelte:66` (`{duration}m`) vía `PlanReorder.svelte:145` y la ruta de Plan. `scripts/ds/seed.mjs:42-44` la siembra.
- **Datos**: `Settings` (types.ts) tiene `height, weight, sex, age, goal, experience, occupation` como string; valores de opción actuales: sexo `Masculino/Femenino/Otro`, objetivo `hipertrofia/fuerza/perdida de grasa/recomposicion/rendimiento`, experiencia `principiante/intermedio/avanzado` — conservar los valores guardados y mostrar sus etiquetas. `settings.update({...})` persiste y propaga. Storage: `getExercises`, `saveExercise`, `deleteExercise`, `getPrograms`, `saveProgram`, `deleteProgram`, `getAllLogs`, `exportLogsAndSettings`, `importLogsAndSettings`, `migrateExercisesToDictionary({force})` (devuelve `migrated, merged, skipped, skippedNames, dictMissing`).
- **Músculos** se guardan como texto libre, a veces en inglés (`Chest`, `Quadriceps`); no hay helper de traducción. Agregar uno de solo-visualización en `src/lib/exercise-utils.ts`.
- **Onboarding**: `+layout.svelte:56-62` `getBannerStep()` muestra pasos 0–1 en `ROUTES.you`; `+page.svelte` raíz manda a `/you` a usuarios nuevos.
- **Push**: `notifyWatch`/`sendPushNotification` en `src/lib/push.ts` para «Enviar una de prueba».
- **Red**: `online` en `src/lib/stores/network.ts`.
- **Compartidos actuales**: ver `docs/design-migration.md` (todos «pendiente»). `Button` usa `variant` + `size: 'md'|'sm'`; `Sheet` tiene `open`, `header` snippet y cerrar flotante; `NumberStepper` tiene `size`, `layout`, `onstep`; `FilterChip` `variant: 'mono'|'sans'`, `size`; `ChipRow` `scroll`, `label`; `StatsGrid` `columns: 3|4`, `variant: 'default'|'card'`; `EmptyState` solo `message`; estilos de campo globales `.input-field` / `.input-field-mono` en `src/app.css:152-165`.
- **Tests**: `tests/big.spec.cjs` con `seedIndexedDB(page, {exercises, program, settings})` (línea 188), `mockApiRoutes(page)` (257), `SEED` (75). Tests de Tú en líneas 272–360 (flujo completo, steps 1, 2 y 13 en 684–716), 742 (Tamaño de texto), 943–1152 (Programas: 3 tests), 1154–1287 (Datos: 2 tests), 1289–1351 (Ejercicios CRUD), 2865 (roundtrip).
- **Design system**: `scripts/ds/groups.mjs` → `tu` (línea 257) recorre las pestañas viejas y escribe `vistas/tu/*`; `compartidos` escribe `compartidos/*`. `scripts/ds/manifest.mjs` solo conoce `Nuevo · Hoy` y `Archivo · Amigos v1`, pero el manifiesto remoto ya tiene grupos renombrados (`Hoy · v1`, `Tú · v1`, `Plan · v1`, `Historial`, `Detalle de ejercicio · v1`, `Amigos · v1 archivo`) y 6 grupos «· Nuevo» (`Compartidos`, `Detalle de ejercicio`, `Historial`, `Hoy`, `Plan`, `Tú`).

## Tasks

### T1: Duración calculada
**What:** `dayDurationMin(exercises)` en `src/lib/calendar-utils.ts` (o un `program-utils.ts` nuevo): Σ `sets × (30 + rest)` s / 60, redondeado. Quitar `duration` de `ProgramDay` en `types.ts`; dejar de escribirlo en `ai.ts` (`buildProgramFromAIResponse`), `you/+page.svelte` y el editor; quitar `duration_min` de `FORMAT_IMPORT`, `FORMAT_GENERATE` y `FORMAT_PROGRAM_COACH`. `DayCard`/`PlanReorder`/Plan muestran el cálculo. Actualizar `scripts/ds/seed.mjs`.
**Files:** `src/lib/types.ts`, `src/lib/calendar-utils.ts`, `src/lib/ai.ts`, `src/lib/brain/prompts.ts`, `src/lib/components/DayCard.svelte`, `src/lib/components/PlanReorder.svelte`, `src/routes/plan/+page.svelte`, `scripts/ds/seed.mjs`
**Verify:** `npm run check`; Empuje del ejemplo (4×120, 3×90, 3×60) da 21.

### T2: Helpers de Tú
**What:** En `src/lib/exercise-utils.ts`: `muscleLabel(muscle)` (inglés → español para mostrar: Chest→Pecho, Back→Espalda, Shoulders→Hombro, Biceps→Bíceps, Triceps→Tríceps, Quadriceps→Cuádriceps, Hamstrings→Femoral, Glutes→Glúteo, Calves→Pantorrilla, Abs/Core→Abdomen…; lo demás tal cual). Utilidades para: datos completos «N de 7», etiquetas de opciones del perfil, nombre sugerido de versión («{nombre} · v2», incrementando si existe), y `markFirstProgramCreated()` (onboardingStep 0–1 → 2). Importar ejercicios sin pisar: `importExercisesKeepingExisting(list)` en `storage.ts` → `{ added, skipped }`.
**Files:** `src/lib/exercise-utils.ts`, `src/lib/storage.ts`, `src/lib/program-chat.ts`
**Verify:** `npm run check`

### T3: Prompts y cliente IA para «Pega tu rutina» y versiones
**What:** En `prompts.ts`: `FORMAT_PASTE_CHAT` (interpreta lo pegado, lo describe día por día en texto con series × reps, pregunta lo que no entendió; si no hay días ni ejercicios, pide el formato con un ejemplo) y el prompt para crear desde la plática (programa completo en JSON con los ejercicios y series acordados, sin `duration_min`). En `ai.ts`: `pasteRoutineChat(thread)` (→ `/api/ai/program-chat`) y `createProgramFromPaste(thread)` (→ `/api/ai/generate-program`, guarda y activa). `programCoach` acepta `{ name, activate }` de la hoja «Versión nueva» y deja de agregar fecha y hora. Saludos/kickoffs en `program-chat.ts` con el copy de la card 13 (sin emoji).
**Files:** `src/lib/brain/prompts.ts`, `src/lib/ai.ts`, `src/lib/program-chat.ts`
**Verify:** `npm run check`

### T4: Compartidos — reemplazos
**What:** `SectionLabel` (sin barra, gris 45 %, slot derecho), `PageHeader` (`sub` opcional), `Icon` (trazo 2, juego de Compartidos · 13 + `spark`, `save`), `SearchInput` (52 px, relleno 6 %, radio 16, borrar 44, `count` y `size="lg"` de 56), `Sheet` (radio 28, fondo 60 %). Mantener props existentes.
**Files:** `src/lib/components/{SectionLabel,PageHeader,Icon,SearchInput,Sheet}.svelte`
**Verify:** `npm run check`; Amigos, Hoy (RestDayView) y Admin siguen funcionando.

### T5: Compartidos — variantes nuevas
**What:** Agregar sin romper: `Button` tamaños `lg` (56, radio 18, 17 px) y `pill` (44, 15 px) con colores nuevos (secundario blanco, danger `#ff7a6e` sobre rojo 14 %, text 48/15, dashed 1 px, `danger-text`); `FilterChip` `variant="choice"` (44, blanco al seleccionar) y `outline`; `ChipRow` `layout: 'wrap'|'scroll'|'eq'|'days'`; `SegmentedControl` `size="compact"`; `StatsGrid` `variant="tiles"` + `StatBlock` en baldosa; `EmptyState` `title`/`text`/acciones y `variant: 'card'|'center'`; `TextInput` `variant="field"` con `label`, `unit`, `error`; `NumberStepper` `variant="sheet"`; `Sheet` `title`, `full`, snippet `footer`; `CoachChat` `look="nuevo"` (cabecera ‹ + título + eyebrow, `ChatMessage`, `ChatDock` con chips, campo, botón principal y caption). Cada variante vieja queda como deuda.
**Files:** `src/lib/components/{Button,FilterChip,ChipRow,SegmentedControl,StatsGrid,StatBlock,EmptyState,TextInput,NumberStepper,Sheet,CoachChat}.svelte`
**Verify:** `npm run check`; tests de Detalle, Hoy y Amigos pasan sin cambios.

### T6: Compartidos nuevos
**What:** `NavRow` + `NavGroup`, `Switch`, `SubpageHeader`, `IconButton`, `NextStepDock`, `Tag`, `OptionList`, `EditSheet`, `EditExerciseSheet` (sobre `EditSheet`; prop para sumar «Eliminar ejercicio» con el conteo de registros), `EditableList`, `InlineConfirm`, `ResultSheet` (ok / error con reintentar), `AIEntry`, `ChatMessage`, `ChatDock`. Medidas y estados de Compartidos · 14 y Tú · 10–13.
**Files:** `src/lib/components/*.svelte` nuevos
**Verify:** `npm run check`

### T7: Editor de programa v2
**What:** Reescribir `ProgramEditor` según card 11 sobre `Sheet full` + `EditSheet`: Editar semana (nombre, etiqueta con chips Base / Carga / Descarga, Quitar semana), Editar día (nombre, chips L–D → `weekday`, duración mostrada, Quitar día con conteo), Editar ejercicio del día (sugerencias de tus ejercicios, series y descanso con stepper, repeticiones texto), ✕ con `InlineConfirm`, Añadir ejercicio/día/semana, error de nombre vacío. Desde cero = editor vacío con estado «Aún no hay días». Conservar `save()` y su resolución de nombres; llamar `markFirstProgramCreated()`.
**Files:** `src/lib/components/ProgramEditor.svelte`
**Verify:** `npm run check`

### T8: Subpantallas de Tú
**What:** Componentes por subpantalla (nombres a elección del implementer, ej. `YouHub`, `YouFirstTime`, `ProfileData` + guía 1 de 7, `ProgramsScreen` + hoja Crear programa + hoja de selección del coach + hoja Pegar + `ProgramChat` v2 + hoja Versión nueva + pantalla Listo, `ExercisesScreen` + ejercicio abierto (rediseño de `ExerciseListItem`) + hojas Consejos / Alternativas / Nuevo ejercicio, `SettingsScreen` + hojas de Tamaño / Idioma / Color / Notificaciones / Instalar (rehacer `InstallGuide` como hoja de pasos), `BackupScreen` + hojas de resultado, diccionario, subpantalla Sin coincidencia y Debug IA). Navegación interna con estado en la ruta (no rutas nuevas) y «‹ Tú» para volver.
**Files:** `src/lib/components/*.svelte`, `src/lib/components/ProgramCard.svelte`, `ProgramChat.svelte`, `ExerciseListItem.svelte`, `InstallGuide.svelte`, `TextArea.svelte`
**Verify:** `npm run check`

### T9: Ruta Tú
**What:** Reescribir `src/routes/you/+page.svelte`: carga datos, decide primera vez (sin programas) o resumen, monta subpantallas y hojas, conserva toda la lógica listada en Current State (CRUD, export/import, diccionario, debug, notificaciones). Estadísticas sin racha; «—» en vez de 0 sin registros.
**Files:** `src/routes/you/+page.svelte`
**Verify:** `npm run check`; `npm run dev` y recorrer las cards 01–06, 10–13.

### T10: Onboarding fuera de Tú
**What:** En `getBannerStep()` quitar los pasos 0–1 en `ROUTES.you`; asegurar que crear el primer programa por cualquier camino sube a paso 2.
**Files:** `src/routes/+layout.svelte`
**Verify:** el banner no aparece en `/you` sin datos; en Hoy aparece el paso 2 tras crear un programa.

### T11: Borrar componentes huérfanos
**What:** grep de importadores de cada componente tocado o retirado; borrar los que queden sin uso (lista esperada en Must) y sus cards en `scripts/ds/groups.mjs`.
**Files:** `src/lib/components/*`, `scripts/ds/groups.mjs`
**Verify:** `npm run check`; `npm run build`.

### T12: Tests existentes (aprobados por Pedro el 2026-10-13)
**What:** Actualizar, dejando la intención vieja en un comentario «Changed 2026-10-13 with Tú v2 (approved by Pedro)…»:
1. Flujo completo — Step 1 (valores sembrados visibles en las filas de Mis datos), Step 2 (fila Ejercicios abre la subpantalla tras hidratar), Step 13 (Ajustes › Idioma en hoja). Nombres de step sin cambio.
2. Tamaño de texto — elegir Grande / Extra grande / Normal en la hoja; mismo zoom y persistencia.
3. Programas · crear/activar/duplicar/eliminar — Crear programa › Desde cero; Activar en Otros programas; Duplicar y Eliminar desde ⋯ con confirmación en la hoja.
4. Coach de programa — Mejorar con el coach; chips presentes (promesa «sin chips» cambiada); «Crear versión nueva» → hoja con nombre «Programa Activo · v2» y switch → nueva activa, la anterior en Otros programas; mismo cuerpo de request a `/api/ai/program-coach`; reabrir empieza de cero.
5. Generar programa — Crear programa › Platícalo con el coach; chips «4» y «Rodilla»; «Crear este programa»; mismo cuerpo a `/api/ai/generate-program`.
6. Datos · IA, diccionario y JSON — Pega tu rutina abre el chat (mock `/api/ai/program-chat` y `/api/ai/generate-program`) y crea el programa; Ordenar con el diccionario con confirmación y hoja de resultado; exportar / importar ejercicios con hojas de resultado (importar no pisa); Restaurar con el JSON de logs.
7. Sin coincidencia — resultado → subpantalla «Sin coincidencia» con «Ejercicio Inventado X7».
8. Ejercicios CRUD — buscar, crear con la hoja, editar con Datos, eliminar con confirmación en la hoja; el conteo sigue en `#ex-count` (o equivalente visible).
9. Roundtrip — Guardar copia (archivo `training-backup-…`), vaciar, Restaurar, verificar en Mis datos y Ejercicios.
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

### T13: Test nuevo
**What:** El escenario de Test Scenarios abajo.
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test -g "Tú v2"`

### T14: Docs
**What:** `docs/design-migration.md`: marcar actualizados los compartidos tocados (sección «Tú», resumen del cambio), registrar los nuevos, la deuda de cada variante vieja, «Pendiente: skeletons» (Tú: resumen, programas, ejercicios), y en «Otras secciones desalineadas» lo que cambió fuera (RestDayView por SectionLabel; Amigos/Admin por SearchInput; hojas viejas por radio 28; Plan con duración calculada; el editor de ejercicio de Historial sigue en línea). `AGENTS.md`: quitar `duration: 65` del ejemplo de Week y decir que la duración del día se calcula (una línea). `docs/design-system.md`: los grupos «· Nuevo» se conservan como referencia al implementarse (corregir la línea que dice que se borran).
**Files:** `docs/design-migration.md`, `AGENTS.md`, `docs/design-system.md`
**Verify:** lectura.

### T15: Cards del design system
**What:** Reescribir el recorrido `tu` en `scripts/ds/groups.mjs` para la vista nueva, escribiendo en `vistas/tu2/` con grupo `Tú` (no pisar `vistas/tu/`, que queda como «Tú · v1»); cards de pantallas (resumen, primera vez, Mis datos, Programas, Crear programa, chat, editor, Ejercicios, ejercicio abierto, Ajustes, Copia) y de los componentes de Tú. Actualizar `compartidos` con los compartidos nuevos y las variantes. En `manifest.mjs`: agregar a `handMade` / `ORDER` todos los grupos remotos que no tienen copia local, con sus nombres actuales (`Compartidos · Nuevo`, `Detalle de ejercicio · Nuevo`, `Historial · Nuevo`, `Hoy · Nuevo`, `Plan · Nuevo`, `Tú · Nuevo` con 00–13, `Amigos · v1 archivo`, y los `· v1` existentes incluido `Tú · v1` con sus 19 rutas en `vistas/tu/`); comparar contra el `_ds_manifest.json` remoto antes de subir y que no se pierda ninguna card. Correr `npm run build && npm run preview -- --port 8080 --strictPort`, `node scripts/ds/build.mjs tu compartidos`, `node scripts/ds/preview.mjs` y revisar la hoja de contacto; `node scripts/ds/manifest.mjs`; subir con DesignSync (`finalize_plan` → `write_files`) solo `vistas/tu2/**`, `compartidos/**` y `_ds_manifest.json`. Sin `delete_files`.
**Files:** `scripts/ds/groups.mjs`, `scripts/ds/manifest.mjs`, `scripts/ds/seed.mjs`
**Verify:** el panel muestra «Tú», «Tú · v1», «Compartidos» y todos los «· Nuevo».

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- grep: ningún archivo en `src/lib/components/` sin importadores (salvo `/admin`).
- No se hizo commit, push, bump ni deploy.
- Manual (no lo cubre la suite): «Enviar una de prueba» llega al iPhone y al Watch con notificaciones activadas; la hoja de Notificaciones en estado «denegadas» en un iPhone real; «Pegar lo que copiaste» lee el portapapeles en Safari (el test escribe el texto); «Instalar app» en Safari iOS; respuestas reales de llama en los 3 chats (el test usa mocks).

## Test Scenarios

### Nuevo: `test.describe('Tú v2 — primera vez, programa desde cero y ajustes')` — un `test()`
**Seed:** `seedIndexedDB` con `exercises: []`, sin programa, settings `{ id: 'settings', activeProgramId: null, currentWeekIdx: 0, units: 'kg', accentColor: '#d4ff3a', hasWatch: false, language: 'es', onboarded: false, onboardingStep: 0 }`.
**Steps y asserts:**
1. `goto('you')` → se ve «Hola.», los pasos «Tus datos · 0 de 7» y «Tu programa», el dock «Completar mis datos»; `[data-component="OnboardingBanner"]` no existe.
2. Completar mis datos → «Mis datos · 1 de 7» «¿Cuánto mides?»; + dos veces → 172; Siguiente → peso; − una vez y Siguiente; Saltar el resto → hoja cerrada; el paso dice «2 de 7».
3. Crear programa → hoja con 3 caminos → Desde cero → Guardar sin nombre → «Ponle un nombre para guardarlo.» y el editor sigue abierto.
4. Nombre «Torso Test»; Añadir día → Editar día: nombre «Empuje», chip L → Guardar; Añadir ejercicio → «Press Banca», series 4, reps «8-10», descanso 120 → Guardar; la fila del día dice «Lunes · ≈ 10 min · 1 ejercicio».
5. Guardar → el resumen normal: tarjeta «Programa activo» con «Torso Test»; Mis datos «2 de 7».
6. `goto('plan')` → la tarjeta del día muestra «10m».
7. `goto('you')` → Ajustes → Unidades lb → recargar → sigue lb.
8. `goto('you')` → Ejercicios → buscar «Remo Z» → «No tienes «Remo Z»» y «Crear «Remo Z»» → tocar → aparece en la lista; el conteo dice 2.
9. Sin errores de página (`pageerror`).

### Cambiados (ver T12, con el sí de Pedro)
Flujo completo (steps 1, 2, 13), Tamaño de texto, Programas ×3, Datos ×2, Ejercicios CRUD, Roundtrip.

### Fuera de la suite (manual)
Push de prueba y Watch, permisos reales de notificaciones, portapapeles en Safari, instalación PWA, respuestas reales de la IA.
