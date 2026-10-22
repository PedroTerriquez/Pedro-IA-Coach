# Design: Historial v2

Fecha: 2026-10-22
Estado: Aprobado

## Why

Historial es la última vista principal que no ha migrado al diseño nuevo. La tarjeta de racha ocupa el primer tercio de la pantalla y repite lo que ya está en Amigos. Las faltas se marcan en rojo, los toques son chicos (celdas de 38 px) y «Marcar como hecho» queda fuera de pantalla. El día entrenado no muestra pesos y la lista de ejercicios mezcla inglés con «+15.0» sin unidad.

## What

Implementar el grupo «Historial · Nuevo» de Claude Design (cards 00–04 de `components/historial-v2/`, con `hist2.js` / `hist2.css` como referencia). La card 05 «Alternativa · Línea de tiempo» queda fuera.

- **Cabecera**: eyebrow «Historial · {año}», el mes como título («Octubre.») y «● N entrenos este mes» (o «Aún sin entrenos este mes»). Flechas de 44 px junto al título.
- **Calendario** (`MonthCalendar`): celdas de 44 px. Solo el día entrenado lleva color (acento con número oscuro); descanso, sin registrar y pasado se ven igual en gris; los días futuros, más tenues. El día tocado va en blanco y hoy lleva anillo blanco. Sin rojo, sin leyenda y sin tarjeta de racha.
- **Mes inicial y límites**: abre en el mes del último día entrenado y lo selecciona. Sin días entrenados, abre en hoy. La flecha › se apaga en el mes actual; la ‹ se apaga en el mes del registro más antiguo (sin registros, solo existe el mes actual).
- **Panel del día** (`HistoryDayPanel`), debajo del calendario:
  - **Hecho**: fecha («Martes 6 oct»), título (el nombre del día del programa), «{músculos} · N ejercicios» y check. Muestra **exactamente lo registrado** ese día: si hiciste una alternativa, sale la alternativa y no el original. Primero en el orden del día del programa y los extras al final. Cada fila: foto, nombre, músculo (con series × reps si el registro las trae, o los bloques) y el peso a la derecha. Tocar una fila abre `ExerciseDetail` con «{día} · k de N», igual que hoy.
  - **Marcado a mano**: igual de título, «Marcado a mano · sin pesos» y lo programado de ese día sin peso.
  - **Hoy sin registrar**: «Hoy · {día} {d} {mes}», «Hoy toca {día}», «{músculos} · N ejercicios», «Cuando lo registres en Hoy, aparece aquí con tus pesos.» y el enlace «Ir a Hoy →».
  - **Sin registrar** (día pasado de entreno): tag «Sin registrar», «¿Lo hiciste y no lo anotaste?», botón secundario de 56 «✓ Marcar como hecho» y, bajo «Lo que tocaba», lo programado atenuado y sin peso.
  - **Descanso**: «Descanso» + «Día de recuperación», sin botón.
  - **Futuro**: el nombre del día y lo programado atenuado bajo «Lo que toca», sin botón.
  - **Fuera de la ventana del programa** (status `none`): solo la fecha y «Sin registro», sin botón.
- **Marcar como hecho**: guarda el registro `__day__` de siempre. El día pasa a acento, el conteo del mes sube y el dock dice «Listo. Ya cuenta en tu semana.» hasta que se toca otro día o se cambia de pestaña.
- **Ejercicios**: cabecera «Historial» / «Ejercicios.» / «Tu último peso y cuánto has subido».
  - Filtros de 44 px en español (`muscleLabel`). Etiqueta «N ejercicios · lo último arriba» (con filtro: «N de {músculo}») y el enlace «Editar».
  - Solo salen los ejercicios con al menos un registro, ordenados por la fecha de su último registro, del más reciente al más viejo.
  - Fila (`ExerciseProgressRow`): nombre, «{músculo} · {cuándo}» (hoy, ayer, hace N días hasta 6, después «12 oct»), gráfica gris con el último punto blanco, último peso en 19 px mono con la unidad, y debajo la subida («+25 kg» / «−5 kg»; sin línea si es 0 o hay un solo registro). Con un solo registro no hay gráfica.
  - La fila entera abre el Detalle, como hoy (sin objetivo, `sets: 0`).
- **Modo editar**: «Editar» cambia la gráfica y las cifras por un lápiz de 44 px y el enlace pasa a «Listo» (etiqueta «Toca el lápiz para editar»). En este modo la fila no abre el Detalle. El lápiz abre `EditExerciseSheet`, la misma de Tú y **con «Eliminar ejercicio»** y el conteo de registros. Al guardar o eliminar se recarga la lista.
- **Dock** (`ViewSwitchDock`): `SegmentedControl` Días / Ejercicios de 44 fijo sobre la TabBar, con caption y botón principal opcionales (mismo patrón que `NextStepDock`).
- **Primera vez** (programa activo, cero registros): en Días, calendario limpio con hoy marcado, panel «Tu primer entreno aparece aquí» / «Cada día que registres se marca en el calendario y al tocarlo ves qué hiciste.» y dock «Ir a entrenar →» que lleva a Hoy. En Ejercicios: «Todavía no hay pesos», su texto, 3 filas fantasma y el mismo botón.
- **Sin programa**: «Sin programa activo» bajo el mes (sin flechas), «Elige un programa para empezar», calendario fantasma y dock «Elegir un programa →» con la caption «Se elige en Tú → Programas»; el botón lleva a Tú. La pestaña Ejercicios funciona igual si hay registros.
- **Sin conexión**: todo igual. Caption del dock «Tu historial está guardado en tu teléfono»; con el panel «Sin registrar» abierto, «Marcar funciona sin internet».
- **Carga**: sin esqueleto, como en Plan (IndexedDB responde en milisegundos). No se muestra «Cargando...»: la vista no pinta nada hasta tener los datos.

## Constraints

### Must
- Svelte 5 runes, tokens `--cv-*` y los componentes compartidos ya actualizados: `PageHeader`, `Button` (`size="lg"`), `SegmentedControl` (`size="tabs"`), `FilterChip` (`variant="choice"`), `ChipRow` (`layout="scroll"`), `EditExerciseSheet`, `Icon`, `IconButton`, `ExerciseRow`.
- Reglas de estado del día en `src/lib/calendar-utils.ts` (`makeDayStatusFn`); nada de lógica de fechas dentro del componente.
- La lista de lo registrado en un día y la fila de progreso (cuándo, subida) son funciones puras en `src/lib/` (p. ej. `history-view.ts`), probadas a través del flujo E2E.
- Nombres con `getExerciseDisplayName()` y músculos con `muscleLabel()`; unidades de `settings.units`.
- Selectores estables para el test: `data-component` en cada componente nuevo y `data-state` en cada celda (`done` / `rest` / `missed` / `future` / `none`) y en el panel.

### Must Not
- Sin rojo para faltas (el rojo queda para borrar y para Sin conexión).
- No tocar las cards «Historial · Nuevo» ni «Historial · v1» en Claude Design.
- No cambiar el formato del registro `__day__` ni la racha (sigue en Amigos y en el cierre de Hoy).
- Sin dependencias nuevas.

### Out of Scope
- La card 05 (línea de tiempo) y la «Fase 2» de las notas: pesos para un día marcado a mano, deshacer el marcado, buscador en Historial y récords en la lista.
- Esqueleto de carga.
- Enlace directo a Tú → Programas (el botón lleva a Tú, como el de Plan).

## Current State

- `src/routes/history/+page.svelte` (419 líneas): `SegmentedControl` Constancia / Ejercicios arriba; `Calendar`; lista `.ex-card` con `Sparkline` en acento, «+25.0» y el editor en línea de tres inputs (`toggleEdit` / `saveEdit`). Abre `ExerciseDetail` con `sets: 0`.
- `src/lib/components/Calendar.svelte` (705): tarjeta de racha, cuadrícula de 38 px, leyenda, panel `.cal-detail` con píldoras («Completado», «No fuiste»…) y `markAsDone()` → `storage.logWeight('__day__', 0, 'kg', undefined, undefined, dateStr)`. Abre el Detalle con `detailPosition` / `nextInList` (`session-steps.ts`), `onLog` y `startRestFromExercise`. Solo lo importa Historial: se **borra** y su panel y su Detalle pasan a la página o a `HistoryDayPanel`. Lo que reexporta en `<script module>` ya vive en `calendar-utils.ts`.
- `src/lib/components/Sparkline.svelte`: solo lo usa Historial. Se extiende (gris + último punto blanco) o se reemplaza dentro de `ExerciseProgressRow`; si queda sin importadores, se borra.
- `src/lib/calendar-utils.ts` → `makeDayStatusFn`: `done` (peso > 0 o `__day__`), `future`, `none` (antes de 9 semanas), `rest`, `missed`; devuelve `{ date, dow, day, isRest, exercises, status, logs }`. `logs` son los registros de esa fecha y de ahí sale lo registrado.
- `src/lib/streak.ts:43`: `__day__` ya cuenta como día entrenado en la racha.
- Ya existe un `DayPanel` de Plan (`src/lib/components/DayPanel.svelte`); el de Historial se llama `HistoryDayPanel` para no chocar.
- Patrones a copiar: `NextStepDock.svelte` (dock fijo sobre la TabBar con espaciador), `PlanEmpty.svelte` (filas fantasma), `FirstRunView.svelte` (`goto(ROUTES.you)`), `EditExerciseSheet` como la usa `ExercisesScreen.svelte` (con `ondelete` y `logCount`), `src/routes/plan/+page.svelte` (caption del dock sin conexión con `navigator.onLine` y los eventos `online` / `offline`).
- Tests actuales: Step 10 (`'Completado'`, `.cal-detail`), Step 10b (`.ex-card`, `.ex-last`, `.ex-delta` «+25.0», `.chips-row`), Step 12b (`getByRole('button', { name: 'Constancia' })`) y Step 13 (nombres en inglés en `history`). Ningún test cubre «Marcar como hecho».
- Cards: `scripts/ds/groups.mjs` → walk `historial` escribe en `vistas/historial/` («Historial · v1»).

## Tasks

### T1: Reglas puras de la vista
**What:** En `src/lib/history-view.ts`:
- `dayEntries(rec, exercisesMap)`: lo registrado en el día (registros con peso, sin `__day__`), en el orden del programa y los extras al final, con nombre, músculo, foto, peso, unidades y series × reps o bloques.
- `exerciseProgress(logs, today)`: último peso, subida, «cuándo» y los puntos de la gráfica.
- `monthBounds(logs, today)`: primer mes y mes actual.
- `initialDay(logsByDate, today)`: último día entrenado, o hoy.

**Files:** `src/lib/history-view.ts`
**Verify:** `npm run check`

### T2: MonthCalendar
**What:** Cuadrícula L–D de celdas de 44 px con los estados del diseño (`data-state`, `.sel`, `.now`), una prop `ghost` (sin programa) y `onselect`.
**Files:** `src/lib/components/MonthCalendar.svelte`
**Verify:** `npm run check`

### T3: HistoryDayPanel
**What:** Las variantes hecho, marcado, hoy, sin registrar, descanso, futuro, none y primera vez. Las filas usan `ExerciseRow` (variante `plan` o una nueva `history` si hace falta) y la variante sin registrar trae el botón «Marcar como hecho».
**Files:** `src/lib/components/HistoryDayPanel.svelte`, `src/lib/components/ExerciseRow.svelte` (solo si hace falta una variante)
**Verify:** `npm run check`

### T4: ExerciseProgressRow
**What:** La fila normal y la variante `editing` con el lápiz de 44 (`IconButton`, `label="Editar {nombre}"`), con la gráfica gris y el último punto blanco. Decidir aquí si se extiende o se borra `Sparkline`.
**Files:** `src/lib/components/ExerciseProgressRow.svelte`, `src/lib/components/Sparkline.svelte`
**Verify:** `npm run check`

### T5: ViewSwitchDock
**What:** Dock fijo sobre la TabBar con caption opcional, snippet para el botón principal y `SegmentedControl size="tabs"` Días / Ejercicios (`bind:value`). Deja un espaciador al final de la página.
**Files:** `src/lib/components/ViewSwitchDock.svelte`
**Verify:** `npm run check`

### T6: Página Historial
**What:** Reescribir `+page.svelte` con la cabecera del mes y sus flechas, MonthCalendar, HistoryDayPanel, «Marcar como hecho», el Detalle desde el panel y desde la lista, Ejercicios (filtros, orden, modo editar con `EditExerciseSheet` y eliminar), primera vez, sin programa, sin conexión y el dock. Borrar `Calendar.svelte` y todo lo que quede huérfano.
**Files:** `src/routes/history/+page.svelte`, `src/lib/components/Calendar.svelte` (borrar)
**Verify:** `npm run check`; `npm run dev` en emulación móvil

### T7: Tests E2E
**What:** Los escenarios de abajo: pasos nuevos 0c, 4c y 5c en `EXPECTED_STEPS` y Step 10, 10b y 12b reescritos. Ajustar Step 14 si cuenta registros (el `__day__` de 12b es uno más).
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

### T8: Documentación
**What:** En `docs/design-migration.md`, poner Historial como migrada: quitar sus entradas de Deuda y de «Otras secciones desalineadas», agregar los componentes nuevos y marcar como borrado lo que quede huérfano (p. ej. la variante `md` de `SegmentedControl` o `ChipRow` sin `layout`, si ya nadie las usa). Actualizar `docs/screens.md` y `docs/project-structure.md`.
**Files:** `docs/design-migration.md`, `docs/screens.md`, `docs/project-structure.md`
**Verify:** lectura

### T9: Cards «Historial · Actual»
**What:** Que el walk `historial` de `scripts/ds/groups.mjs` escriba en `vistas/historial2/` («Historial · Actual») con una card por estado (con datos, hoy, sin registrar, marcado, Ejercicios, filtro, modo editar, la hoja de editar con Eliminar, primera vez de Días y de Ejercicios, sin programa y sin conexión) y una por componente nuevo, para que reflejen lo implementado. Regenerar, revisar con `preview.mjs` y subir con DesignSync, fusionando el `_ds_manifest.json` remoto (ver `docs/design-system.md` → Pendiente). No se tocan `vistas/historial/` ni `components/historial-v2/`.
**Files:** `scripts/ds/groups.mjs`, `design-system/vistas/historial2/**`
**Verify:** `node scripts/ds/build.mjs historial`; `node scripts/ds/preview.mjs <scratch> vistas/historial2`

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- Manual check: ninguno fuera del suite. La subida de las cards (T9) se revisa en el panel de Claude Design.

## Test Scenarios

Todos van dentro del flujo único de `tests/big.spec.cjs`.

### Step 0c: Historial — Sin programa (nuevo, después de 0b)
**Estado:** app vacía, sin programa.
**Pasos / asserts:** `goto('history')` → «Sin programa activo», «Elige un programa para empezar», calendario fantasma, sin botones «Mes anterior» / «Mes siguiente», caption «Se elige en Tú → Programas». «Elegir un programa» lleva a `/you`.

### Step 4c: Historial — Primera vez (nuevo, después de 4b)
**Estado:** programa activo, cero registros.
**Pasos / asserts:**
- «Aún sin entrenos este mes», ninguna celda `data-state="done"`, la celda de hoy con `.now`, «Tu primer entreno aparece aquí», «Mes siguiente» y «Mes anterior» desactivados.
- «Ir a entrenar» lleva a `/today`.
- Volver y tocar Ejercicios: «Todavía no hay pesos» y «Ir a entrenar».

### Step 5c: Historial — Antes de entrenar hoy (nuevo, después de restaurar la copia en Step 5)
**Estado:** historial restaurado, hoy sin registrar.
**Pasos / asserts:**
- Abre seleccionado el último día entrenado, que no es hoy. El panel está en estado hecho, con pesos («kg») y sin «Sin registrar».
- Tocar hoy: «Hoy toca {día}» e «Ir a Hoy», que lleva a `/today`.

### Step 10: Historial — Días (reescrito)
**Estado:** hoy entrenado (Press Banca, Press Militar, Fondos por una alternativa, bloques).
**Pasos / asserts:**
- Título «{Mes}.» y «N entrenos este mes». Hoy seleccionado y en `done`.
- El panel trae Press de Banca y Press Militar con su peso y la **alternativa** registrada en Step 8f; el original reemplazado no aparece. No hay ids crudos.
- La página no contiene «Racha actual», «Faltaste» ni «No fuiste».
- Una fila del panel abre el Detalle con sus alternativas; la pestaña Historial muestra récord, subida y sesiones (los asserts actuales de ProgressHero y HistoryList se conservan). Cerrar.
- Tocar un día de descanso: «Día de recuperación» y ningún «Marcar como hecho».
- Si queda un día futuro en el mes: «Lo que toca» y ningún botón.
- «Mes siguiente» desactivado. «Mes anterior» hasta que se apaga: el mes visible es el del registro más antiguo.

### Step 10b: Historial — Ejercicios (reescrito)
**Pasos / asserts:**
- Las filas (`[data-component="ExerciseProgressRow"]`) son solo los ejercicios con registros; un ejercicio creado sin registros no sale. La primera es uno registrado hoy.
- Press de Banca con Barra: «85 kg», «+25 kg», «Pecho · hoy» y su gráfica. Peso Muerto: «+10 kg».
- Ningún filtro vacío. «Isquiotibiales» deja solo Peso Muerto y «Todos» devuelve el total.
- Tocar una fila abre el Detalle; cerrar.
- «Editar»: aparecen «Listo» y un lápiz por fila. Tocar el nombre de una fila no abre el Detalle. El lápiz abre la hoja de editar con «Eliminar ejercicio» (no se toca). Renombrar, Guardar → la fila muestra el nombre nuevo y queda guardado en IndexedDB. Devolver el nombre original y tocar «Listo».

### Step 12b: Offline — Las vistas y lo que pide internet (ampliado)
**Estado:** sin conexión.
**Pasos / asserts:**
- `goto('history')` abre con el dock «Tu historial está guardado en tu teléfono» (reemplaza el assert de «Constancia» por «Días»).
- «Mes anterior», tocar una celda `data-state="missed"` → «Sin registrar», «¿Lo hiciste y no lo anotaste?» y la caption «Marcar funciona sin internet».
- «Marcar como hecho» → la celda pasa a `done`, el panel dice «Marcado a mano · sin pesos», el dock «Listo. Ya cuenta en tu semana.» y el conteo del mes sube en 1.
- En IndexedDB hay un registro `__day__` con esa fecha; tras `reload` la celda sigue en `done`.

### Tests existentes que cambian (con el sí de Pedro, 2026-10-22)
- Step 10, Step 10b y el assert de Historial en Step 12b: se reescriben con el diseño nuevo y conservan su promesa (nombres resueltos, sin ids crudos, abrir el Detalle, último peso, subida, filtro por músculo y que abre sin conexión).
- Step 14: ajustar si cuenta los registros (el `__day__` de Step 12b es uno más).
