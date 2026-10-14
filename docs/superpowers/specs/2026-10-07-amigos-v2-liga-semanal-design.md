# Design: Amigos v2 — liga semanal

Fecha: 2026-10-07
Estado: Aprobado

## Why

La pestaña Amigos repite datos (racha y minutos arriba y otra vez en mi fila), usa emojis, deja "Mi Perfil" ocupando la parte alta, el buscador al fondo y un bote de basura en cada fila que se toca por error entre series. El rediseño "Nuevo · Amigos" (v2) en Claude Design lo resuelve con una sola tarjeta, un podio sobrio y hojas inferiores.

## What

`/friends` implementa las cards `components/amigos-v2/01…07` de Claude Design, con todos sus estados **menos el esqueleto de carga**:

- **Principal:** encabezado con las fechas de la semana y mi avatar; tarjeta "Tu racha"; liga con podio (top 3) y lista; botón "Agregar amigo" al final.
- **Detalle de amigo** (hoja): racha, minutos, comparación contra mí, "Quitar de mi liga" con confirmación Cancelar / Quitar.
- **Agregar amigo** (hoja): buscador, resultados con "En tu liga" o "Agregar", sin resultados, "Compartir mi usuario".
- **Primera vez y liga chica:** elegir usuario (registra al instante), sin amigos, con 1 amigo.
- **Mi perfil** (hoja desde mi avatar): ver, cambiar usuario (renombra en el servidor), sin registrar.
- **Sin conexión:** liga guardada con la fecha de los datos; Agregar, Quitar y Guardar desactivados con su explicación.

### Decisiones de la entrevista

| Tema | Decisión |
|---|---|
| Racha | Sin cambios: `computeStreakWeeks`. La semana en curso suma al llegar al umbral (`streakThreshold`) |
| Racha en 0 | Etiqueta "Racha nueva" y, en grande, "`hechos` de `necesarios`" + "entrenos esta semana". Nunca se muestra un 0 de racha |
| Quitar amigo | De un solo lado, como hoy. No toca la liga del otro |
| Compartir mi usuario | `navigator.share`; si no existe, copia al portapapeles y toast "Copiado" |
| Cambiar usuario | Renombra en el Worker (endpoint nuevo). Nombre tomado → se rechaza |
| "Listo" en primera vez | Guarda y registra de una vez |
| Nombre ya registrado en primera vez | Se acepta, como hoy (única forma de recuperar el usuario al reinstalar) |
| Datos viejos de un amigo | Se corrigen en el cliente al mostrarlos, sin cambiar el Worker |
| Campo de texto | Arriba de la hoja o pantalla, con foco al abrir. Sin "dock" que siga al teclado |
| Carga | "Cargando…" simple, como hoy. Sin skeleton |

### Reglas de la liga

- **Semana:** siempre lunes a domingo (`mondayOf`), sin importar `settings.weekStart`: la liga tiene que ser la misma para todos.
- **Participantes:** yo + amigos, sin duplicados (se descarta un amigo con mi mismo usuario).
- **Orden:** minutos de la semana descendente; empate → `lastUpdate` más reciente primero.
- **Minutos:** `Math.floor(gymTime / 60)`.
- **Dato viejo:** si la fecha local de `lastUpdate` es anterior al lunes de esta semana, sus minutos cuentan como 0. El punto "Entrenó hoy" solo se muestra si `exercisedToday` es `true` **y** la fecha local de `lastUpdate` es hoy.
- **Podio:** solo con 3 o más participantes. Los 3 primeros van al podio (orden visual 2-1-3) y el resto en lista. Con menos de 3, solo lista.
- **Fila:** posición, avatar (con punto si entrenó hoy), nombre (+ "Tú" en la mía), "N semanas seguidas" / "1 semana seguida" / "Empezando racha" (racha 0), y "N min".
- **Leyenda** "Entrenó hoy" solo si alguien lleva el punto.
- **Tocar** una fila o columna del podio abre el detalle de ese amigo; tocar la mía abre Mi perfil.

### Tarjeta "Tu racha"

- `necesarios = streakThreshold(daysPerWeek)`; `hechos` = días entrenados de lunes a hoy (misma regla que la racha: `weight > 0` o `exerciseId === '__day__'`); `faltan = max(0, necesarios − hechos)`.
- Racha > 0: etiqueta "Tu racha", número grande y "semana seguida" / "semanas seguidas".
- Racha 0: etiqueta "Racha nueva", "`hechos` de `necesarios`" y "entrenos esta semana".
- A la derecha: minutos + "min esta semana".
- Siete días L M X J V S D: entrenado → relleno de acento; hoy sin entrenar → contorno; resto apagado.
- Frase: gana la primera regla que se cumpla. Las negritas son las partes variables.

| # | Condición | Frase |
|---|---|---|
| 1 | racha 0 y mejor racha > 0 | Volviste. Tu mejor racha es de **N semanas**; te faltan **K entrenos** para empezar otra. |
| 2 | racha 0 y mejor racha 0 | Te faltan **K entrenos** esta semana para tu primera semana de racha. |
| 3 | racha > 0 y `hechos` = 0 | Tu racha de **N semanas** sigue viva. Te faltan **K entrenos** esta semana para llegar a N+1. |
| 4 | sin amigos | Llevas **E entrenos** esta semana. Te faltan **K** para sumar tu semana N+1. — si `faltan` = 0: Llevas **E entrenos** esta semana. Ya sumaste tu semana N. |
| 5 | voy primero | Vas **primero** esta semana. Bien hecho. |
| 6 | 2 participantes y voy segundo | *Amigo* va adelante por **X min**. Te quedan **D días** para alcanzarlo. |
| 7 | resto | Vas **#P de T**. Con **X min** más pasas a *Amigo*. |

`X = max(1, minutos del de arriba − los míos)`. `D` = días que quedan contando hoy (domingo → "Te queda **1 día**"). Singulares: "1 semana", "1 entreno", "1 día".

### Encabezado

`PageHeader` con título "Amigos." y eyebrow "`5–11 oct` · cierra el domingo" (lunes: "· empieza la semana"; domingo: "· cierra hoy"). En `action`, un botón con mi avatar y `aria-label="Mi perfil"`.

### Textos por estado

- **Elegir usuario** (`#username-prompt`): avatar con la inicial de lo escrito, "Elige tu usuario", "Así te encuentran tus amigos para ver quién entrena más cada semana.", campo mono con contador "5/20", botón "Listo" (desactivado con menos de 2 caracteres).
- **Sin amigos:** "Entrena con tu gente", "Agrega a tus amigos por su usuario y vean cada semana quién suma más minutos. No necesitan aceptar.", botón primario "Agregar amigo" y botón de texto "Compartir mi usuario".
- **2 participantes:** bajo la lista, "Agregar amigo" primario y "Con más amigos, la semana se pone más reñida." Con 3 o más, "Agregar amigo" es secundario.
- **Agregar amigo:** título "Agregar amigo", campo "Usuario de tu amigo", "Busca por usuario. No necesitan aceptar."
  - Sin escribir: "¿Tu amigo aún no tiene la app?", "Mándale tu usuario **pedro** para que te agregue cuando entre.", "Compartir mi usuario".
  - Buscando: "Buscando…".
  - Resultados: avatar, nombre, racha; "En tu liga" (con check) si ya es amigo, si no botón "Agregar". Al agregar: toast "*Sofía* está en tu liga", la fila pasa a "En tu liga" y la hoja sigue abierta.
  - Sin resultados: "No encontramos a «*rodrigx*»", "Revisa cómo se escribe o pídele su usuario. Si aún no tiene la app, invítale.", "Compartir mi usuario".
- **Detalle:** avatar, nombre, "Entrenó hoy · #1 esta semana" (o "#3 esta semana"), dos cifras ("semanas seguidas", "min esta semana"), barras "Minutos esta semana" (amigo vs. "Tú", relativas al mayor de los dos), "Quitar de mi liga".
  - Confirmar: "¿Quitar a *Ana* de tu liga?", "Dejarás de ver su progreso. No le avisamos y puedes volver a agregarle cuando quieras.", "Cancelar" / "Quitar". Al quitar: la hoja se cierra y toast "*Ana* ya no está en tu liga".
- **Mi perfil:** avatar, usuario en mono, "Así te encuentran tus amigos", lápiz (`aria-label="Editar usuario"`), dos cifras ("semanas seguidas" — con racha 0: "—" y "racha nueva" — y "amigos en tu liga"), "Compartir mi usuario".
  - Cambiar usuario: "Cambiar usuario", "Tus amigos verán el cambio en su liga.", campo mono con contador, "Guardar". Nombre tomado: "Ese usuario ya está tomado" bajo el campo, sin cerrar. Éxito: toast "Usuario actualizado".
  - Sin registrar: "Solo visible en este teléfono", "Aún no pueden encontrarte", "Registra tu usuario para aparecer en la liga de tus amigos. Tus entrenos siguen guardados en tu teléfono.", "Registrar mi usuario". Sin lápiz.
- **Sin conexión:** `#friends-cached` dice "Datos del *5 oct, 18:42*. Se actualizan al volver la conexión."; "Agregar amigo" desactivado + "Necesitas internet para agregar amigos."; "Quitar de mi liga" desactivado + "Necesitas internet para quitar amigos."; "Guardar" desactivado + "Necesitas internet para cambiar tu usuario."
- **Compartir:** texto "Agrégame en Coach Pedro AI: mi usuario es *pedro*" + URL de la app.

## Constraints

### Must
- Reusar `Sheet`, `Button`, `PageHeader`, `SearchInput`, `TextInput`, `StatBlock`, `EmptyState` y los tokens de `src/app.css`.
- Tomar medidas, tamaños y colores de `components/amigos-v2/amigos2.css` y `amigos2.js` en Claude Design (leerlos con `DesignSync get_file`, projectId en `docs/design-system.md`).
- Lógica de liga, días y frases en un módulo puro de `src/lib/`, con funciones pequeñas de un solo propósito.
- Las frases se devuelven como partes `{ text, bold }`: los usuarios son texto ajeno y no se pintan con `{@html}`.
- Acento solo para: días entrenados, el punto "Entrenó hoy" y la acción principal.
- Conservar los ids `#username-prompt`, `#username-input`, `#username-btn`, `#friends-list`, `#friends-cached`, `#friend-search-input` y la clase `.sr-item`.
- Seguir sincronizando mis datos al cargar (`syncUserToWorker`) y guardando la lista en `friends-cache`.

### Must Not
- Sin esqueletos de carga ni componente/infraestructura de skeleton.
- Sin "dock" sobre el teclado ni código de `visualViewport`.
- No cambiar el aspecto de `Button`, `Sheet`, `Toast` ni otros compartidos fuera de Amigos (los tamaños de 52 px se resuelven dentro de los componentes de Amigos).
- No cambiar `src/lib/streak.ts` ni la regla de racha.
- No cambiar el formato de `user_*` / `friends_*` en KV ni los endpoints existentes.
- Sin emojis en la vista ni en sus toasts.
- Sin dependencias nuevas, sin campos nuevos en `settings`, sin migraciones.

### Out of Scope
- Esqueleto de carga (card 06, estado "Cargando").
- Amistad mutua, solicitudes, privacidad.
- Propuesta v1 y sus alternativas B y C; todo lo de "fase 2" (porras, empujón, feed, récords, retos, historial de semanas, minutos por día).
- Micro-animaciones de cambio de posición.
- Traducción al inglés de los textos de la vista (hoy la interfaz es solo en español).
- Indicador de "sin registrar" fuera de Mi perfil.
- Limpieza de las copias locales viejas en `design-system/components/amigos/`.

## Current State

- `src/routes/friends/+page.svelte` (360 líneas): todo el estado y las llamadas. `loadFriends()` calcula `myStreak`, `exercisedToday`, `myGymSeconds`, sincroniza y pide `/api/friends/list`; si falla lee `friends-cache` de `localStorage` y pone `cachedAt`. `handleSubmitUsername()` solo guarda en `settings` (no registra). `handleUsernameSave()` solo guarda en `settings`: el servidor conserva el nombre viejo y la lista `friends_<viejo>`. `addFriend()` limpia la búsqueda al terminar. `removeFriend()` avisa "Requiere internet" si `$online` es falso.
- `src/lib/components/Leaderboard.svelte`: arma `[yo, ...amigos]`, quita duplicados y ordena por `gymTime` y luego `lastUpdate`. Mi entrada lleva `exercisedToday: false` fijo.
- `src/lib/components/FriendCard.svelte`: fila con medallas 🏆🥈🥉, badge "Yo", minutos y bote de basura con confirmación de 3 s.
- `src/lib/components/UsernameEditor.svelte`: avatar con acento, lápiz "Editar nombre", botón "Registrar usuario".
- `src/lib/components/SearchResults.svelte`: props `query, searching, results, addingFriend, accent, onadd`; filas `.sr-item`.
- `src/lib/components/Sheet.svelte`: `open` (bindable), snippets `header` y `children`, `onclose`; trae su propio botón de cerrar.
- `src/lib/streak.ts`: `trainingDaysPerWeek`, `streakThreshold`, `computeStreakWeeks`, `computeBestStreakWeeks` (la mejor racha ya existe). `trainedDates` e `isTrained` no están exportadas.
- `src/lib/storage.ts`: `getWeeklyGymSeconds(weekStart)`, `getAllLogs`, `getSettings`, `getPrograms`, `saveSettings`. `src/lib/calendar-utils.ts`: `mondayOf`, `toLocalDateStr`.
- `src/lib/push.ts`: `postJSON(path, body, attempts)`, `registerUser` (trata 409 como éxito), `checkUserExists` (devuelve `true` si falla la red), `syncUserToWorker`.
- `src/lib/stores/network.ts`: store `online` (ping real al Worker).
- `push-worker/src/index.js` (líneas ~488–608): `/api/user/register`, `/api/user/check`, `/api/user/sync` (crea el registro si no existe), `/api/friends/search` (pagina `user_`), `/api/friends/add`, `/api/friends/remove`, `/api/friends/list` (devuelve `username, streak, exercisedToday, gymTime, lastUpdate`). KV: `user_<usuario>` y `friends_<usuario>` = `[{ friendUsername, addedAt }]`.
- `scripts/ds/groups.mjs` (`amigos`, línea ~184): genera `vistas/amigos/{pantalla, leaderboard, friend-card, username-editor, pantalla-busqueda, search-results, pantalla-sin-conexion, pantalla-sin-amigos, pantalla-elegir-nombre}`. `scripts/ds/build.mjs` simula `/api/friends/search` y `/api/user/check`. `scripts/ds/manifest.mjs` tiene `'Nuevo · Amigos'` en `ORDER`.
- Tests que tocan Amigos en `tests/big.spec.cjs`: flujo completo Step 12 (~630), roundtrip JSON (~2958), `Friends — ranking, username y eliminar amigo` (3517, dos tests), `Offline — funciones que requieren internet` (~3854). `seedIndexedDB` acepta `exercises`, `exerciseLogs`, `program`, `settings` y limpia `gymSessions`.

## Tasks

### T1: Módulo de liga
**What:** `src/lib/league.ts`, puro y sin Svelte: `isStale`, `trainedToday`, `buildLeague(me, friends, today)` (corrige datos viejos, quita duplicados, ordena, asigna posición), `weekDays(logs, today)` (7 estados: entrenado / hoy pendiente / nada), `weekProgress(logs, daysPerWeek, today)` (`hechos`, `necesarios`, `faltan`), `weekPhrase(...)` (tabla de 7 reglas → partes `{ text, bold }`), `weekEyebrow(today)`, `avatarHue(username)`. Exportar `isTrained` desde `streak.ts` para reusarla (sin cambiar su comportamiento).
**Files:** `src/lib/league.ts`, `src/lib/streak.ts`
**Verify:** `npm run check`

### T2: Compartir y renombrar en el cliente
**What:** `shareUsername(username)` (share nativo, si no portapapeles; devuelve `'shared' | 'copied' | 'failed'`; ignora `AbortError`). `renameUser(oldName, newName)` en `push.ts` → `'ok' | 'taken' | 'error'` contra `POST /api/user/rename`.
**Files:** `src/lib/share.ts`, `src/lib/push.ts`
**Verify:** `npm run check`

### T3: Avatar
**What:** `Avatar.svelte`: inicial sobre tono apagado derivado del usuario (`avatarHue`), tamaño por prop, punto de acento opcional `today`.
**Files:** `src/lib/components/Avatar.svelte`
**Verify:** `npm run check`

### T4: WeekCard
**What:** Tarjeta "Tu racha" / "Racha nueva": cifra grande, minutos, siete días y frase por partes.
**Files:** `src/lib/components/WeekCard.svelte`
**Verify:** `npm run check`

### T5: Liga — podio y filas
**What:** `LeagueRow.svelte` reemplaza a `FriendCard.svelte` (se borra). `Leaderboard.svelte` recibe la liga ya calculada y pinta leyenda, podio (≥ 3) y filas; emite `onselect(username)`.
**Files:** `src/lib/components/LeagueRow.svelte`, `src/lib/components/Leaderboard.svelte`, `src/lib/components/FriendCard.svelte` (borrar)
**Verify:** `npm run check`

### T6: Hoja Detalle de amigo
**What:** `FriendDetail.svelte` dentro de `Sheet`: cifras, barras de comparación, "Quitar de mi liga" → confirmación Cancelar / Quitar; desactivado sin conexión.
**Files:** `src/lib/components/FriendDetail.svelte`
**Verify:** `npm run check`

### T7: Hoja Agregar amigo
**What:** `AddFriend.svelte` dentro de `Sheet`: `SearchInput` arriba con foco al abrir, estados sin escribir / buscando / resultados / sin resultados. `SearchResults.svelte` gana la prop `inLeague: string[]` y muestra "En tu liga" en lugar del botón; usa `Avatar`.
**Files:** `src/lib/components/AddFriend.svelte`, `src/lib/components/SearchResults.svelte`
**Verify:** `npm run check`

### T8: Hoja Mi perfil
**What:** `ProfileSheet.svelte` reemplaza a `UsernameEditor.svelte` (se borra): ver, cambiar usuario (campo arriba, contador, error de nombre tomado, desactivado sin conexión) y sin registrar.
**Files:** `src/lib/components/ProfileSheet.svelte`, `src/lib/components/UsernameEditor.svelte` (borrar)
**Verify:** `npm run check`

### T9: Ruta `/friends`
**What:** Reescribir la página con las piezas anteriores. "Listo" guarda y llama a `registerUser` antes de cargar la liga. Renombrar: `renameUser` → en `'ok'` guarda `settings.username`, recarga la liga y avisa; en `'taken'` muestra el error. Agregar deja la hoja abierta y recarga la liga. Estados sin amigos, 2 participantes, sin conexión y "Cargando…". Quitar el banner `.friends-my-streak` y las secciones Mi Perfil / Buscar.
**Files:** `src/routes/friends/+page.svelte`
**Verify:** `npm run check`; `npm run dev` y abrir `/friends`

### T10: Worker — renombrar usuario
**What:** `POST /api/user/rename` `{ username, newUsername }`. 400 si falta alguno, si son iguales o si el nuevo no mide 2–20. 409 `{ error: 'Ese usuario ya está tomado' }` si existe `user_<nuevo>`. Si no: copia `user_<viejo>` (o crea uno base si no existía) a `user_<nuevo>` con `username` y `lastUpdate` actualizados; mueve `friends_<viejo>` a `friends_<nuevo>`; borra las claves viejas; recorre todas las `friends_*` (paginando como `/api/friends/search`) y cambia `friendUsername` viejo → nuevo, sin dejar duplicados.
**Files:** `push-worker/src/index.js`
**Verify:** `cd push-worker && npx wrangler dev` y `curl -X POST …/api/user/rename -d '{"username":"a","newUsername":"b"}'`: ok, luego 409 al repetir con un nombre existente

### T11: Tests
**What:** Agregar los 9 escenarios de "Test Scenarios" y actualizar los 5 tests existentes listados ahí, dejando la intención anterior en un comentario. No tocar `EXPECTED_STEPS` ('Step 12: Friends' se queda).
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

### T12: Design system
**What:** Actualizar el recorrido `amigos` en `scripts/ds/groups.mjs` a las pantallas y componentes nuevos (liga, sin amigos, 1 amigo, elegir usuario, detalle, confirmar quitar, agregar con resultados, sin resultados, mi perfil, cambiar usuario, sin registrar, sin conexión; `Avatar`, `WeekCard`, `LeagueRow`, `Leaderboard`, `SearchResults`). Regenerar el grupo, revisar con `preview.mjs`, correr `manifest.mjs` y subir. Borrar del proyecto `vistas/amigos/friend-card`, `vistas/amigos/username-editor` y `components/amigos-v2/**`; quitar `'Nuevo · Amigos'` de `ORDER` si ya no quedan cards en ese grupo.
**Files:** `scripts/ds/groups.mjs`, `scripts/ds/build.mjs`, `scripts/ds/manifest.mjs`, `design-system/vistas/amigos/**`
**Verify:** `node scripts/ds/build.mjs amigos && node scripts/ds/preview.mjs /tmp/ds vistas/amigos` y revisar la hoja de contacto

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- Deploy del Worker **antes** del `git push` de la app: `cd push-worker && npx wrangler deploy` (sin `/api/user/rename`, "Cambiar usuario" falla).
- Manual check (cubiertos por la suite): liga con podio, detalle y quitar, agregar, primera vez, mi perfil y renombrar, racha nueva, datos viejos, sin conexión.
- Manual check (la suite no los alcanza):
  - iPhone: "Compartir mi usuario" abre el menú nativo con el texto y el enlace.
  - iPhone: al abrir Agregar amigo, Elegir usuario y Cambiar usuario, el teclado no tapa el campo.
  - Worker real: `curl` a `/api/user/rename` y comprobar que `/api/friends/list` de quien tenía agregado al usuario devuelve el nombre nuevo.

## Test Scenarios

Cada escenario es un `test.describe()` nuevo con un solo `test()`, sembrado una vez con `seedIndexedDB()` y con el Worker simulado con `page.route()`. Para los minutos propios, sembrar `gymSessions` (ampliar `seedIndexedDB` con un campo opcional si hace falta).

### 1. Amigos v2 — liga con podio, tarjeta y detalle
- **Seed:** usuario `TestUser`, programa de 4 días, logs que dan racha > 0 y entreno hoy, sesiones de gym de esta semana. `/api/friends/list` → 4 amigos con minutos distintos, dos por encima de mí.
- **Pasos / asserts:** la tarjeta muestra racha, minutos y hoy marcado; frase "Vas #3 de 5. Con X min más pasas a …"; podio con 3 columnas en orden de minutos y 2 filas; "Tú" en la mía; ningún 🏆🥈🥉 en la página. Tocar una fila abre la hoja con las dos cifras y las barras. "Quitar de mi liga" → "Cancelar" deja al amigo; otra vez → "Quitar" llama a `/api/friends/remove`, cierra la hoja, muestra el toast y el amigo desaparece.

### 2. Amigos v2 — liga chica
- **Seed:** `TestUser` con racha > 0 y entreno esta semana.
- **Pasos / asserts:** lista vacía → "Entrena con tu gente", botón primario "Agregar amigo", "Compartir mi usuario", frase de la regla 4. Recargar con 1 amigo por delante → sin podio, 2 filas, frase "… va adelante por X min. Te quedan D días…", pie "Con más amigos…". Recargar con 2 amigos → aparece el podio.

### 3. Amigos v2 — racha nueva
- **Seed:** logs con 3 semanas completas hace más de un mes, nada después; programa activo de 4 días.
- **Pasos / asserts:** "Racha nueva", "0 de 3", frase "Volviste. Tu mejor racha es de 3 semanas; te faltan 3 entrenos…"; ningún "0 semanas". Ir a Hoy, registrar un peso, volver → "1 de 3" y el día de hoy marcado.

### 4. Amigos v2 — racha viva y voy primero
- **Seed:** semanas pasadas completas (racha > 0), sin logs esta semana; sesiones de gym de esta semana; 2 amigos con menos minutos.
- **Pasos / asserts:** "Tu racha de N semanas sigue viva. Te faltan K entrenos…". Registrar un peso en Hoy y volver → "Vas primero esta semana. Bien hecho." y yo en el centro del podio.

### 5. Amigos v2 — primera vez y registro
- **Seed:** `settings` sin `username`.
- **Pasos / asserts:** "Elige tu usuario"; con 1 letra "Listo" está desactivado; contador "N/20". Con `/api/user/register` → 500 y `/api/user/check` → `{ exists: false }`: tras "Listo" se ve la principal con "0 de 4" y la frase de la regla 2; el avatar abre Mi perfil con "Aún no pueden encontrarte" y sin lápiz. Con register → 200: "Registrar mi usuario" hace el POST y el aviso desaparece.

### 6. Amigos v2 — agregar amigo
- **Seed:** `TestUser` con `Ana` en la liga. Búsqueda → `Ana`, `Anabel`.
- **Pasos / asserts:** "Agregar amigo" abre la hoja con `#friend-search-input` enfocado y el bloque "¿Tu amigo aún no tiene la app?". Escribir "An" → `Ana` muestra "En tu liga" sin botón; `Anabel` tiene "Agregar". Agregar → POST a `/api/friends/add`, toast "Anabel está en tu liga", la fila pasa a "En tu liga" y la hoja sigue abierta; al cerrarla, Anabel está en la liga. Buscar "zzq" → "No encontramos a «zzq»". Con `navigator.share` ausente, "Compartir mi usuario" copia el texto y muestra "Copiado".

### 7. Amigos v2 — mi perfil y renombrar
- **Seed:** `TestUser` registrado, 2 amigos.
- **Pasos / asserts:** el avatar del encabezado abre Mi perfil con `TestUser`, la racha y "2" amigos. Lápiz → "Cambiar usuario"; "Guardar" desactivado si no cambia. Con `/api/user/rename` → 409: "Ese usuario ya está tomado", la hoja sigue abierta y el usuario no cambia. Con → 200: el POST lleva `{ username: 'TestUser', newUsername: 'Pedro' }`, toast "Usuario actualizado", Mi perfil muestra `Pedro`; tras recargar sigue `Pedro` y la lista se pide con `username=Pedro`.

### 8. Amigos v2 — datos viejos
- **Seed:** `TestUser` con minutos esta semana. Amigos: `Viejo` (`lastUpdate` de hace 8 días, `gymTime` 9000, `exercisedToday: true`), `Ayer` (`lastUpdate` de ayer, `gymTime` 3600, `exercisedToday: true`), `Hoy` (`lastUpdate` ahora, `gymTime` 1800, `exercisedToday: true`).
- **Pasos / asserts:** `Viejo` aparece con "0 min", sin punto y en último lugar; `Ayer` conserva 60 min sin punto; `Hoy` lleva el punto y se ve la leyenda "Entrenó hoy". Si el test corre en lunes, `Ayer` cuenta como dato viejo: calcular las fechas de forma que el caso sea estable.

### 9. Amigos v2 — sin conexión
- **Seed:** `TestUser` con 1 amigo cargado en línea (para llenar la caché).
- **Pasos / asserts:** pasar a offline y recargar: la liga sigue visible; `#friends-cached` dice "Datos del … Se actualizan al volver la conexión."; "Agregar amigo" desactivado con "Necesitas internet para agregar amigos."; en el detalle, "Quitar de mi liga" desactivado con su línea; en Mi perfil → Cambiar usuario, "Guardar" desactivado con su línea. Sin errores de JS.

### Tests existentes que cambian (autorizado por Pedro el 2026-10-07)

| Test | Promesa anterior (queda en comentario) | Nueva comprobación |
|---|---|---|
| `Friends — ranking, username y eliminar amigo` › *renders rank with medals + Yo badge, edits username, removes friend with 2-step confirm* | Medallas 🏆🥈🥉, badge "Yo", "130 minutos de gym esta semana", vacío "Aún no tienes amigos", lápiz en la página, bote de basura en la fila con 2 toques | Orden por minutos en podio y filas, "Tú", "130 min", vacío "Entrena con tu gente", editar desde Mi perfil (con `/api/user/rename` simulado), quitar desde el detalle con Cancelar / Quitar |
| `Friends — ranking, username y eliminar amigo` › *registro manual: botón junto al lápiz aparece si el usuario no existe y avisa si ya existe* | Botón "Registrar usuario" en la página | "Registrar mi usuario" dentro de Mi perfil: aparece si no existe, desaparece al registrar y no aparece si ya existe |
| *full user flow: … → friends* (Step 12) | `.friends-my-streak` con "Racha", `.username-editor .name-text`, buscador visible en la página | Tarjeta "Tu racha" visible, `TestUser` dentro de Mi perfil, abrir "Agregar amigo" y ahí buscar "Ana" y agregarla |
| `Offline — funciones que requieren internet` › *friends shows the cached list and AI coach is disabled offline* | "Sin conexión · última actualización", `#friend-search-offline`, sin `#friend-search-input` | `#friends-cached` con "Datos del …", "Agregar amigo" desactivado con "Necesitas internet para agregar amigos." |
| Roundtrip de JSON (~línea 2958) | `RoundTripUser` en `.username-editor .name-text` | `RoundTripUser` visible al abrir Mi perfil |

### Fuera del alcance de la suite

| Qué | Comprobación manual |
|---|---|
| Menú nativo de compartir en iOS | En el iPhone, tocar "Compartir mi usuario" y ver el menú con texto y enlace |
| Teclado de iOS sobre los campos | En el iPhone, abrir las tres pantallas con campo y confirmar que se ve lo que escribes |
| `/api/user/rename` contra KV real | `curl` tras `wrangler deploy` y revisar `/api/friends/list` de un amigo |
