# Design: Cuenta con copia en la nube y mudanza del hosting a Cloudflare (gratis)

Fecha: 2026-10-14
Estado: Aprobado

## Why

La app vive en dos plataformas: el frontend está en GitHub Pages (`/Pedro-IA-Coach`) y el backend en un Cloudflare Worker (`coach-pedro-ai`). Pedro quiere todo en Cloudflare, gratis. Cambiar la dirección de la app hace que el iPhone la vea como una app nueva y vacía (ver glosario: *Dirección de la app*). Para que nadie pierda sus datos en la mudanza, primero llega la **cuenta** (usuario + correo + contraseña) con su **copia en la nube**. Así, en la app nueva basta con iniciar sesión.

## What

Dos fases que se publican **por separado y en este orden**.

**Fase A — Cuenta y copia en la nube** (se publica en la app actual de GitHub Pages):
- **Tú → tarjeta «Guarda tus datos en la nube»**, visible mientras no haya cuenta. Abre una hoja que pide el usuario (solo si aún no tiene), el correo y la contraseña. Al crear la cuenta, el usuario queda *protegido* y se sube la primera copia completa. Después, la tarjeta pasa a ser una fila «Cuenta» con el estado: «Guardado hoy 18:42» o «Pendiente de subir».
- **Subida automática** al marcar el último ejercicio del día, y otra vez si termina de estirar. Los cambios hechos fuera del entreno esperan al siguiente.
- **Corrección incluida:** hoy los minutos de gym y la liga solo se guardan después de estirar (`today/+page.svelte:416`). A partir de este cambio se guardan al marcar el último ejercicio, haya o no estiramiento.
- **Iniciar sesión** desde la bienvenida de una instalación nueva (Tú → «Hola.» → «Ya tengo cuenta»). Los datos de la nube se **agregan** al teléfono, como al restaurar una copia de seguridad, y la app va a Hoy.
- **«¿Olvidaste tu contraseña?»** muestra «Escríbele a Pedro». Pedro borra la cuenta con un comando documentado; los datos de la nube se conservan, y el usuario vuelve a proteger su nombre y sube su copia.
- **Amigos:** escribir un usuario *protegido* ya no te convierte en él: aparece «Ese usuario está protegido» y se abre el inicio de sesión. Renombrar un usuario protegido exige la sesión.

**Fase B — Hosting en Cloudflare** (se publica cuando Pedro lo decida, después de que su gente haya protegido su usuario):
- El build estático se sirve desde un **Worker de solo assets** en la raíz de `https://<nombre>.pollothe.workers.dev/`. El nombre propuesto es `fitfriends`, pendiente de confirmar. `base` pasa a `''`.
- Cada push a `main` publica en Cloudflare con GitHub Actions. GitHub Pages deja de recibir publicaciones, pero su última versión sigue viva hasta que Pedro la apague.
- El Worker `coach-pedro-ai` acepta la nueva dirección y conserva `github.io` mientras convivan.

## Constraints

### Must
- **Todo gratis:** el plan Free de Workers, con D1 para la nube (5 GB, 5 M filas leídas/día, 100 k filas escritas/día, sin tarjeta) y static assets para el hosting. Sin dominio propio.
- D1 en el **mismo Worker `coach-pedro-ai`** (binding `DB`). El esquema vive en un archivo de migración versionado.
- Contraseñas con **PBKDF2-SHA-256 de Web Crypto** y una sal aleatoria por cuenta. Nunca se guardan en claro. Mínimo 8 caracteres. El correo se valida con un formato básico y se guarda, pero no se usa para enviar nada.
- Token de sesión: 32 bytes aleatorios. El cliente lo guarda en `localStorage` y D1 guarda solo su hash. **No caduca.**
- La copia en la nube incluye las 5 colecciones de IndexedDB: `exercises`, `exerciseLogs`, `programs`, `gymSessions` y `settings`. Al aplicarla en otro teléfono **no** se pisan los campos propios del dispositivo: `pushSubscribed`, `pushServerUrl` y `sessionState`.
- **Subida incremental:** el cliente guarda en `localStorage` un hash corto por registro y manda solo lo que cambió y los ids borrados, en tandas de ≤ 500 registros. La bajada también va paginada. El objetivo es no pasar el límite de **10 ms de CPU por petición** del plan Free.
- Si la subida falla, se marca como pendiente y se reintenta al abrir la app o al volver a ella (`visibilitychange`), nunca en segundo plano. Funciona aunque iOS congele la PWA: no depende de cerrarla.
- Hay que publicar y desplegar la Fase A antes de empezar la Fase B.
- Textos solo en español, como el resto de Tú y Amigos.
- Respaldo de SPA en Cloudflare: `assets.not_found_handling = "single-page-application"`.
- En `tests/big.spec.cjs:4565`, la aserción nueva conserva en un comentario la intención original.

### Must Not
- Sin inicio de sesión con Google ni Apple. Apple está descartado por su costo (Apple Developer Program, ~99 USD/año).
- Sin envío de correos: ni recuperación por código ni verificación del correo (requiere dominio propio o plan de pago).
- Sin «Cerrar sesión» ni «Borrar mi cuenta» en la app. Lo hace Pedro con un comando.
- No subir a la nube con cada registro, ni en otros momentos que los dos acordados.
- No cambiar el flujo del modal de racha, el de esfuerzo ni la tarjeta del coach al terminar.
- No fusionar el frontend con el Worker `coach-pedro-ai`. No agregar `wrangler` como dependencia de la raíz.
- No cambiar el nombre visible fuera de `static/manifest.json`, donde ya dice «FitFriends».
- No crear una pantalla de «nos mudamos».

### Out of Scope
- Recuperar la contraseña por correo. Paso futuro, cuando haya dominio; el correo ya queda guardado.
- Tabla de amistades en D1 que reemplace la liga en KV. Paso futuro.
- Proteger con token `user/sync`, `friends/add` y `friends/remove`: siguen confiando en el nombre de usuario. Solo cambian el registro y el renombrado.
- Sincronizar entre dos teléfonos en uso a la vez. La nube es la copia de respaldo y gana la última subida.
- Dominio propio. Renombrar el repo o el Worker. Apagar GitHub Pages, que es un paso manual.

## Current State

**Datos locales**
- `src/lib/db.ts`: IndexedDB `coach-pedro-ai` v2 con 5 stores (`STORES`): `exercises`, `exerciseLogs`, `programs`, `settings`, `gymSessions`. Todos tienen `keyPath: 'id'`. Helpers: `getAll`, `get`, `put`, `del`, `getByIndex`, `generateId`. AGENTS.md dice «4 object stores», pero son 5.
- `src/lib/storage.ts`:
  - `exportLogsAndSettings()` (:466) arma `{ exercises, programs, exerciseLogs, gymSessions, settings }`. Es el patrón para la foto completa.
  - `importLogsAndSettings()` (:511) hace `put` registro por registro: agrega y actualiza, nunca borra. Es el patrón para aplicar la bajada.
  - `recordGymSession(date, seconds)` (:194) es idempotente por fecha.
  - Borrados: `deleteExercise` (:86, también borra sus logs), `deleteProgram` (:229) y la deduplicación (:402, :432).
- `src/lib/types.ts`: `Settings.username` (:92) es el *usuario* de amigos y `Settings.userName` (:76) es el nombre para mostrar. La cuenta se liga a `username`.

**Hoy**, en `src/routes/today/+page.svelte`:
- Fin de ejercicios por hidratación (:349-369): pone `endedAt` y la fase `stretch`; si no hay estiramiento, llama `showEffortAfterStreak()`.
- Fin de ejercicios por check (:428-437): mismo patrón, sin `endedAt`.
- `onStretchComplete()` (:409) llama `showEffortAfterStreak()`.
- `showEffortAfterStreak()` (:441-464) muestra el modal de racha y, **solo ahí**, hace `recordGymSession` y `syncUserToWorker`. Esa es la causa del bug.

**Tú**
- `src/routes/you/+page.svelte:169` muestra `YouFirstTime` si `firstTime`, y si no, `YouHub`.
- `src/lib/components/YouFirstTime.svelte` es la bienvenida «Hola.», con 2 pasos y `NavGroup`.
- `src/lib/components/YouHub.svelte` tiene `NavGroup`/`NavRow`. La fila `you-row-copia` dice «Tus datos viven solo en este teléfono».
- Componentes que se reutilizan: `Sheet`, `NavGroup`, `NavRow`, `Button`, `ResultSheet`, `NextStepDock`, `Icon`.

**Amigos**
- `src/routes/friends/+page.svelte`:
  - `handleSubmitUsername()` (:163) acepta un nombre existente porque `registerUser` trata el 409 como éxito (:160-162).
  - `handleRename()` (:178).
  - `refreshRegistered()` usa `checkUserExists`.
- `src/lib/push.ts`: `registerUser`, `renameUser`, `checkUserExists`, `syncUserToWorker`, y `postJSON(path, body, retries)` como helper.

**Worker**
- `push-worker/src/index.js`:
  - `ALLOWED_ORIGINS` (:3); `respond()`/CORS (:366).
  - `/api/user/register` (:549), `/api/user/check` (:562) y `/api/user/rename` (:591), que usa `moveUserRecord`, `moveFriendsList` y `renameInFriendLists`.
  - Usuarios en KV `user_${username}` y amigos en `friends_${username}`.
- `push-worker/wrangler.toml`: tiene KV, Queue y AI, pero no D1.
- `push-worker/README.md` documenta los endpoints.

**Hosting**
- `svelte.config.js`: `paths.base: '/Pedro-IA-Coach'`, `fallback: 'index.html'`. Las rutas usan `base` (`src/lib/routes.ts`, `src/lib/share.ts:10`). El service worker usa `$service-worker`. El manifest usa `start_url`/`scope` relativos.
- `.github/workflows/deploy.yml`: Node 22, `npm install`, `npm run build`, `upload-pages-artifact`, `deploy-pages`.
- `src/lib/config.ts`: `PUSH_SERVER_URL = 'https://coach-pedro-ai.pollothe.workers.dev'`. El subdominio de la cuenta es `pollothe`.
- Tests y scripts que dependen de la ruta base:
  - `playwright.config.cjs` (`baseURL`, `webServer.url`).
  - `tests/big.spec.cjs:4152`, `:4174` y `:4565`.
  - `scripts/ds/build.mjs:11` (`BASE`) y `scripts/ds/capture.mjs:8` (`PUBLIC`), con sus regex en `:198-199`.
  - `README.md` (líneas 10, 29, 95, 116 y 149).
- El build tiene 77 archivos y pesa 2.3 MB, muy por debajo de los límites de static assets.

**Tests**
- `mockFriendsWorker(page, api)` (`tests/big.spec.cjs:4101`) responde `{status:'ok'}` a cualquier `/api/` desconocido. Los tests actuales no se rompen con las llamadas nuevas.
- Helpers `LEAGUE.*` (:4040-4096) y `logWeightToday(page)` (:4140).

## Tasks

### Fase A — Cuenta y copia en la nube

#### T1: Esquema D1
**What:**
- Crear `push-worker/migrations/0001_cuentas.sql` con tres tablas:
  - `accounts(username TEXT PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL, uploaded_at TEXT)`
  - `sessions(token_hash TEXT PRIMARY KEY, username TEXT NOT NULL, created_at TEXT NOT NULL)`
  - `records(username TEXT NOT NULL, store TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(username, store, id))`
- Agregar el binding `[[d1_databases]] binding = "DB"` con `database_name = "coach-pedro-db"` y `migrations_dir = "migrations"` en `wrangler.toml`. El `database_id` sale de `npx wrangler d1 create coach-pedro-db`.

**Files:** `push-worker/migrations/0001_cuentas.sql`, `push-worker/wrangler.toml`
**Verify:** `cd push-worker && npx wrangler d1 migrations apply coach-pedro-db --local` sin errores.

#### T2: Endpoints de cuenta y nube en el Worker
**What:** Funciones pequeñas de un solo propósito (`hashPassword`, `verifyPassword`, `newToken`, `accountFromToken`, …) y estos endpoints:
- `POST /api/account/create {username, email, password}`:
  - Responde 400 si la validación falla, y 409 `{protected:true}` si ya existe una cuenta con ese usuario.
  - Si falta, crea el `user_${username}` en KV, igual que hace `register`.
  - Guarda la cuenta y una sesión, y responde `{token}`.
- `POST /api/account/login {username, password}`: responde 401 `{error:'Usuario o contraseña incorrectos'}`, o `{token, email}` si todo está bien.
- `POST /api/cloud/upload` (`Authorization: Bearer <token>`), con body `{ upserts: [{store, id, data}], deletes: [{store, id}] }` de ≤ 500 elementos:
  - Usa `env.DB.batch()` con `INSERT … ON CONFLICT DO UPDATE` y `DELETE`.
  - Actualiza `accounts.uploaded_at` y responde `{uploadedAt}`.
  - Responde 401 si el token no es válido.
- `GET /api/cloud/download?after=<store:id>` (con Bearer): devuelve hasta 1000 registros ordenados por `(store, id)`, más `{ next }` mientras queden.
- `/api/user/check`: agrega `protected: boolean` a la respuesta.
- `/api/user/register`: responde 403 `{protected:true}` si el usuario tiene cuenta.
- `/api/user/rename`:
  - Si el usuario viejo tiene cuenta, exige un Bearer válido de ese usuario (403 si no).
  - Si el nuevo nombre ya tiene cuenta, responde 409.
  - Con cuenta, mueve `username` en `accounts`, `sessions` y `records` dentro de la misma operación.

PBKDF2 con `PBKDF2_ITERATIONS = 100000` (el máximo que permite Workers), en una constante.

**Files:** `push-worker/src/index.js`, `push-worker/README.md` (endpoints y el comando para borrar una cuenta: `npx wrangler d1 execute coach-pedro-db --remote --command "DELETE FROM sessions WHERE username='X'; DELETE FROM accounts WHERE username='X'"`)
**Verify:**
- `npx wrangler dev` + `curl`: crear, iniciar sesión, subir dos registros, bajar, contraseña incorrecta (401), token falso (401), renombrar sin token (403).
- `npx wrangler tail` en remoto, sin errores de «exceeded CPU» en create, login y en una subida de 500 registros. Si aparecen, bajar `PBKDF2_ITERATIONS` a 50000 y dejar nota en el README.

#### T3: Cliente de cuenta y nube
**What:** `src/lib/cloud.ts` con funciones atómicas:
- `getAccount()`/`saveAccount()`: `localStorage` `cloud-account` `{username, email, token}`.
- `createAccount(username, email, password)`, `login(username, password)`, `isValidEmail`, `MIN_PASSWORD = 8`.
- `buildSnapshot()`: reusa la forma de `exportLogsAndSettings`, con `settings` como un registro de id `settings`.
- `diffSnapshot(snapshot, hashes)`: devuelve `{upserts, deletes}`. El hash es FNV-1a del JSON. Los hashes se guardan en `localStorage` `cloud-hashes`.
- `uploadSnapshot()`: manda tandas de ≤ 500 y guarda los hashes después de cada tanda aceptada. Si algo falla, marca el estado pendiente.
- `downloadAll()`: recorre las páginas y aplica con `put`. Conserva del `settings` local `pushSubscribed`, `pushServerUrl` y `sessionState`. Después guarda los hashes de lo bajado y llama `backupAll()`.
- `getUploadStatus()`: `localStorage` `cloud-upload` `{lastAt, pending}`.
- `retryPendingUpload()`.

Si no hay cuenta, todo es no-op. Sin `PUSH_SERVER_URL`, también no-op.
**Files:** `src/lib/cloud.ts`, `src/lib/push.ts` (`checkUserExists` devuelve también `protected`, `registerUser` distingue el 403 de protegido, `renameUser` manda el Bearer si hay cuenta)
**Verify:** `npm run check`

#### T4: Hoy — fin de ejercicios guarda, sincroniza y sube
**What:**
- Extraer `onExercisesDone()`: `recordGymSession`, `syncUserToWorker` (si hay `username`) y `uploadSnapshot()`. Se llama desde los dos puntos de fin de ejercicios (:349 y :428), haya o no estiramiento.
- En el check (:428), poner `endedAt` igual que en la hidratación.
- Quitar de `showEffortAfterStreak()` el guardado y la sincronización, sin tocar el modal.
- `onStretchComplete()` llama `uploadSnapshot()` otra vez.
- Ninguna de las dos llamadas bloquea la UI: `.catch(() => {})`.

**Files:** `src/routes/today/+page.svelte`
**Verify:** `npx playwright test -g "Nube — sube al terminar"`

#### T5: Reintento al abrir o volver a la app
**What:** En el layout, al montar y en `visibilitychange` a visible, llamar `retryPendingUpload()`.
**Files:** `src/routes/+layout.svelte`
**Verify:** escenario «Nube — sin conexión al terminar».

#### T6: Hoja de cuenta (crear e iniciar sesión)
**What:** `AccountSheet.svelte` (usa `Sheet`) con dos modos:
- **`crear`:**
  - Campo «Usuario» solo si `settings.username` está vacío (2-20 caracteres, como Amigos).
  - Campos «Correo» y «Contraseña» (`type=password`, mínimo 8).
  - Botón «Guardar en la nube».
  - Errores en línea: «Correo no válido» y «Mínimo 8 caracteres». Con 409: «Ese usuario ya está protegido» y un enlace «Iniciar sesión».
  - Al terminar: guarda `username` en settings (registrándolo si hacía falta), sube la copia y muestra el `ResultSheet` «Tus datos están en la nube».
- **`entrar`:**
  - Campos «Usuario» y «Contraseña», y el botón «Iniciar sesión».
  - Con 401: «Usuario o contraseña incorrectos».
  - Enlace «¿Olvidaste tu contraseña?», que muestra «Escríbele a Pedro para restablecerla.».
  - Al terminar: `downloadAll()`, `settings.load()` y `goto(ROUTES.today)`.

**Files:** `src/lib/components/AccountSheet.svelte`
**Verify:** `npm run check`

#### T7: Tú — tarjeta, fila de cuenta y «Ya tengo cuenta»
**What:**
- **`YouHub`, sin cuenta:** tarjeta arriba de los `NavGroup` con el título «Guarda tus datos en la nube», el texto «Protege tu usuario con correo y contraseña y recupera todo en otro teléfono.» y el botón «Crear cuenta». Abre `AccountSheet` en modo `crear`.
- **`YouHub`, con cuenta:** fila `you-row-cuenta` con la etiqueta «Cuenta», el usuario y el correo, y el valor «Guardado hoy 18:42», «Guardado el 12 oct» o «Pendiente de subir».
- La fila `you-row-copia` dice «Tus datos viven solo en este teléfono» solo si no hay cuenta. Con cuenta no lleva `sub`.
- **`YouFirstTime`:** un `NavGroup` con «Ya tengo cuenta» y el texto «Inicia sesión y recupera tus datos», que abre `AccountSheet` en modo `entrar`.
- **`OnboardingView`:** el texto «Esta app no almacena nada en servidores…» pasa a «Todo lo que registras vive en este celular. Crea tu cuenta en Tú para guardarlo también en la nube.».

**Files:** `src/lib/components/YouHub.svelte`, `src/lib/components/YouFirstTime.svelte`, `src/lib/components/OnboardingView.svelte`, `src/routes/you/+page.svelte`
**Verify:** escenarios 1, 2 y 4.

#### T8: Amigos — usuario protegido
**What:**
- En `handleSubmitUsername()`, antes de registrar, consultar `checkUserExists`. Si el usuario está `protected`, no guardar ni registrar: mostrar «Ese usuario está protegido» y abrir `AccountSheet` en modo `entrar` con el usuario ya escrito.
- `handleRename` manda el Bearer (ya lo hace T3) y muestra el 403 como «Inicia sesión para cambiar tu usuario».

**Files:** `src/routes/friends/+page.svelte`
**Verify:** escenario «Nube — usuario protegido en Amigos».

#### T9: Despliegue del Worker (Fase A)
**What:** `npx wrangler d1 create coach-pedro-db` (poner el id en `wrangler.toml`), `npx wrangler d1 migrations apply coach-pedro-db --remote` y `npx wrangler deploy`.
**Files:** `push-worker/wrangler.toml`
**Verify:** el `curl` de T2 contra `https://coach-pedro-ai.pollothe.workers.dev`.

#### T10: Tests de la Fase A
**What:** Los escenarios 1 a 6b de «Test Scenarios», con el Worker simulado con `page.route` (extender `mockFriendsWorker` con `account/*` y `cloud/*`, y registrar los bodies en `api.calls`).
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

#### T11: Cards del design system (Fase A)
**What:** Agregar a `scripts/ds/groups.mjs` estas cards:
- En el grupo «Tú · Actual» (`vistas/tu2/`): tarjeta «Guarda tus datos en la nube», fila Cuenta (guardado y pendiente), `AccountSheet` en `crear` (con y sin campo usuario, con error) y en `entrar` (con error y «¿Olvidaste…?»), y «Hola.» con «Ya tengo cuenta».
- En «Amigos»: el estado «Ese usuario está protegido».

Regenerar, revisar y subir según `docs/design-system.md`. No tocar «· Nuevo».
**Files:** `scripts/ds/groups.mjs`, `scripts/ds/seed.mjs` (si hace falta una cuenta de ejemplo)
**Verify:** `node scripts/ds/build.mjs tu amigos` y `node scripts/ds/preview.mjs`.

#### T12: AGENTS.md (Fase A)
**What:** Solo corregir líneas existentes:
- «4 object stores» → 5, con `gymSessions` en Schema.
- En Stack/Worker, mencionar D1 (`DB`) para cuentas.
- En la tabla de AI/Worker no se agregan secciones: el detalle está en este spec.

**Files:** `AGENTS.md`
**Verify:** lectura.

> **Release Fase A:** bump, commit, push (publica en GitHub Pages) y despliegue del Worker. **El implementer se detiene aquí.** La Fase B empieza solo cuando Pedro lo pida.

### Fase B — Hosting en Cloudflare

#### T13: Base en la raíz
**What:** `paths.base` → `''` en `svelte.config.js`.
**Files:** `svelte.config.js`
**Verify:** `npm run build`; `build/index.html` referencia `/_app/...`.

#### T14: Config del Worker de hosting
**What:** `wrangler.jsonc` en la raíz con `name: "fitfriends"`, un `compatibility_date` reciente y `assets: { directory: "./build", not_found_handling: "single-page-application" }`, sin `main`. Agregar `.wrangler/` a `.gitignore`.
**Files:** `wrangler.jsonc`, `.gitignore`
**Verify:** `npm run build && npx wrangler deploy --dry-run`

#### T15: Deploy con GitHub Actions
**What:** Reemplazar `.github/workflows/deploy.yml`: checkout, Node 22, `npm install`, `npm run build` y `cloudflare/wrangler-action@v3` (`apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}`, `accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}`, `command: deploy`). Quitar los permisos y pasos de Pages.
**Files:** `.github/workflows/deploy.yml`
**Verify:** YAML válido; la ejecución real se revisa a mano.

#### T16: Worker acepta la nueva dirección
**What:** Agregar `'https://fitfriends.pollothe.workers.dev'` a `ALLOWED_ORIGINS`, conservando `github.io`, y actualizar el comentario. Desplegar el Worker.
**Files:** `push-worker/src/index.js`
**Verify:** `curl -si -X OPTIONS -H 'Origin: https://fitfriends.pollothe.workers.dev' https://coach-pedro-ai.pollothe.workers.dev/api/ping` devuelve ese origen en `Access-Control-Allow-Origin`.

#### T17: Scripts del design system en la raíz
**What:** `BASE` → `http://localhost:8080/` y `PUBLIC` → `https://fitfriends.pollothe.workers.dev/`. Las regex de `capture.mjs:198-199` reescriben `url(/...)` hacia `PUBLIC`.
**Files:** `scripts/ds/build.mjs`, `scripts/ds/capture.mjs`
**Verify:** generar una card; sus imágenes apuntan al nuevo dominio.

#### T18: Tests a la raíz
**What:**
- `playwright.config.cjs`: `baseURL: 'http://localhost:8080/'` y `webServer.url: 'http://localhost:8080'`, con los comentarios actualizados.
- `tests/big.spec.cjs:4152`: quitar el recorte del prefijo. `:4174`: `base = http://localhost:<port>/`.
- `tests/big.spec.cjs:4565`: `expect(copied).toContain(new URL(page.url()).origin + '/')` con el comentario `// Antes: '/Pedro-IA-Coach/'. Promesa: el texto compartido lleva el enlace a la app.` (aprobado por Pedro el 2026-10-14).
- Agregar el escenario 7.

**Files:** `playwright.config.cjs`, `tests/big.spec.cjs`
**Verify:** `npx playwright test`

#### T19: Documentación (Fase B)
**What:**
- AGENTS.md: solo líneas existentes:
  - Stack: base path y Deploy («Cloudflare Workers static assets vía `.github/workflows/deploy.yml`»).
  - Build/Deploy: base path.
  - Project Structure: la línea de `playwright.config.cjs` y `wrangler.jsonc`.
  - Tests: la línea de Build.
- README raíz y `push-worker/README.md`: URL y hosting nuevos.

**Files:** `AGENTS.md`, `README.md`, `push-worker/README.md`
**Verify:** `grep -n "Pedro-IA-Coach\|GitHub Pages" AGENTS.md README.md` solo deja menciones al repo o a la convivencia temporal.

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- Fase A: `cd push-worker && npx wrangler d1 migrations apply coach-pedro-db --remote && npx wrangler deploy`, más los `curl` de T2 y `wrangler tail` sin errores de CPU.
- Fase B: `npx wrangler deploy --dry-run` (raíz). Desplegar el Worker con T16 **antes** del primer push de la Fase B.
- Revisión manual de la Fase A, en el iPhone con la app de GitHub:
  1. Tú → «Crear cuenta» → «Guardado hoy …».
  2. Entrenar y marcar el último ejercicio **sin estirar** → la hora de «Guardado» cambia, y en Amigos tus minutos suben.
  3. Pedro borra la cuenta de prueba con el comando del README → en el siguiente entreno la subida da 401 y Tú vuelve a mostrar la tarjeta «Guarda tus datos en la nube».
- Revisión manual de la Fase B:
  1. La Action «Deploy» termina en verde.
  2. `https://fitfriends.pollothe.workers.dev/` abre, y recargar en `/history` no da 404.
  3. Al instalar en el iPhone, el icono dice **FitFriends**.
  4. Tú → «Hola.» → «Ya tengo cuenta» → aparecen tus entrenos, programas y racha.
  5. Activar notificaciones → «Iniciar» un descanso → «Descanso terminado» llega al Watch.

### Riesgos y notas
- **10 ms de CPU por petición (plan Free):** PBKDF2 y las tandas grandes son lo más caro. Hay que medirlo con `wrangler tail` (T2) y ajustar las iteraciones o el tamaño de tanda si hace falta.
- **Cuenta borrada por Pedro:** el teléfono conserva un token que ya no sirve. La subida da 401. En ese caso el cliente borra `cloud-account` y vuelve a mostrar la tarjeta «Guarda tus datos en la nube» (incluirlo en T3 y T7).

### Antes del despliegue (pendiente, lo hace Pedro)
**Fase A**
1. `npx wrangler d1 create coach-pedro-db` y pasar el id al implementer (o dejar que lo corra él con tu sesión de wrangler).
2. Avisar a tu gente: «Actualiza la app y crea tu cuenta en Tú».

**Fase B**
1. Confirmar el nombre `fitfriends`, que define la URL. Si cambia, se ajustan T14, T16 y T17.
2. Crear un API token en Cloudflare (plantilla «Edit Cloudflare Workers») y copiar el Account ID.
3. GitHub → Settings → Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID`.
4. Avisar a tu gente: «Instala desde la nueva dirección e inicia sesión».

### Después del despliegue (manual)
1. Regenerar y subir las cards del design system (T17), para que sus imágenes no dependan de `github.io`.
2. Cuando todos hayan hecho la mudanza: apagar GitHub Pages (Settings → Pages) y quitar `github.io` de `ALLOWED_ORIGINS`, con su propio deploy del Worker.

## Test Scenarios

Todos siguen el mismo patrón: un `test.describe()` con un `test()`, `seedIndexedDB()` una sola vez y el Worker simulado con `page.route` (registrando los bodies).

### 1. «Nube — proteger mi usuario»
- **Seed:** `LEAGUE.settings()` (`username: 'TestUser'`), `LEAGUE.program()`, `LEAGUE.exercises`, dos logs y un `gymSession`. Sin `cloud-account`.
- **Pasos:**
  1. Ir a Tú. Se ve la tarjeta «Guarda tus datos en la nube» → «Crear cuenta».
  2. No hay campo «Usuario».
  3. Correo `ana@` → «Correo no válido». Contraseña `1234` → «Mínimo 8 caracteres».
  4. Correo `test@mail.com`, contraseña `secreta123` → «Guardar en la nube».
  5. Recargar.
- **Aserciones:**
  - `account/create` recibió `{username:'TestUser', email:'test@mail.com', password:'secreta123'}`.
  - `cloud/upload` recibió `upserts` con los 2 logs, el programa, los ejercicios, el `gymSession` y `settings`.
  - Se ve el resultado «Tus datos están en la nube».
  - La tarjeta ya no está y la fila `you-row-cuenta` muestra «Guardado hoy». Sigue así después de recargar.
  - La fila de copia ya no dice «solo en este teléfono».
- **Variante en el mismo test:** antes del paso 4, el mock responde 409 una vez → «Ese usuario ya está protegido», con el enlace «Iniciar sesión» visible.

### 2. «Nube — sin usuario todavía»
- **Seed:** settings sin `username`, con programa activo.
- **Pasos:** Tú → «Crear cuenta». Se ve el campo «Usuario»; llenar `Nuevo`, correo y contraseña → guardar.
- **Aserciones:**
  - `account/create` lleva `username:'Nuevo'`.
  - Después de recargar, Amigos muestra la liga de `Nuevo` sin pedir usuario.

### 3. «Nube — sube al terminar los ejercicios, sin estirar»
- **Seed:** cuenta en `localStorage` (`cloud-account`) y `cloud-hashes` vacíos. Programa del día con 2 ejercicios y estiramiento. `username: 'TestUser'`.
- **Pasos:**
  1. Hoy → registrar los 2 ejercicios por la UI. Aparece «Estira bb».
  2. No estirar. Ir a Tú.
  3. Volver a Hoy → completar el estiramiento.
- **Aserciones:**
  - Antes de estirar ya hubo un `user/sync` con `gymTime > 0` y un `cloud/upload` cuyos `upserts` incluyen los 2 logs de hoy y el `gymSession` de hoy (`seconds > 0`).
  - Tú → Cuenta muestra «Guardado hoy».
  - Al terminar de estirar hay un segundo `cloud/upload`.
  - No hubo ningún `cloud/upload` al registrar solo el primer ejercicio.

### 3b. «Nube — sin cuenta, los minutos se guardan igual sin estirar»
- **Seed:** como el 3, pero sin `cloud-account`.
- **Pasos:** registrar los 2 ejercicios y no estirar.
- **Aserciones:**
  - Hubo `user/sync` con `gymTime > 0`.
  - Ninguna llamada a `cloud/*`.
  - Amigos → mi tarjeta muestra los minutos de hoy.

### 4. «Nube — iniciar sesión en un teléfono nuevo»
- **Seed:** IndexedDB vacío (instalación nueva). El mock de `account/login` responde 401 con `secreta000` y `{token, email}` con `secreta123`. `cloud/download` devuelve en 2 páginas un programa activo, ejercicios, 3 logs, `settings` (con `username:'TestUser'`, `onboarded:true`, `pushSubscribed:true` y un `sessionState` viejo) y un `gymSession`.
- **Pasos:**
  1. Abrir `/` → Tú «Hola.» → «Ya tengo cuenta».
  2. Probar «¿Olvidaste tu contraseña?».
  3. `TestUser` / `secreta000` → error.
  4. `TestUser` / `secreta123`.
- **Aserciones:**
  - Se ve «Escríbele a Pedro para restablecerla.».
  - Con la contraseña mala se ve «Usuario o contraseña incorrectos».
  - Con la buena se llega a `/today` con el día del programa.
  - Historial muestra los 3 logs.
  - En IndexedDB, `settings.pushSubscribed` sigue en `false` (se conservó el del teléfono) y no hay `sessionState` viejo.
  - Tú muestra la fila Cuenta y no la tarjeta.

### 5. «Nube — usuario protegido en Amigos»
- **Seed:** settings sin `username`. `user/check` responde `{exists:true, protected:true}` para `Ana`.
- **Pasos:** Amigos → escribir `Ana` → «Listo».
- **Aserciones:**
  - Se ve «Ese usuario está protegido».
  - Se abre la hoja de inicio de sesión con `Ana` ya escrito.
  - No hubo `user/register`, y `settings.username` sigue vacío.
- **Continuación:** iniciar sesión como `Ana` (mock ok) → Mi perfil → renombrar a `Anita`. La petición `user/rename` lleva `Authorization: Bearer <token>`.

### 6. «Nube — sin conexión al terminar»
- **Seed:** como el 3.
- **Pasos:**
  1. `cloud/upload` hace `route.abort()`. Registrar los 2 ejercicios.
  2. Ir a Tú.
  3. Quitar el abort y recargar la app.
- **Aserciones:**
  - Con la red caída, Tú → Cuenta muestra «Pendiente de subir».
  - Después de recargar hay un `cloud/upload` con los logs de hoy, y Cuenta muestra «Guardado hoy».

### 6b. «Nube — cuenta borrada por Pedro»
- **Seed:** como el 3. `cloud/upload` responde 401.
- **Pasos:** registrar los 2 ejercicios → ir a Tú.
- **Aserciones:**
  - La fila Cuenta ya no está y vuelve la tarjeta «Guarda tus datos en la nube».
  - `localStorage` ya no tiene `cloud-account`.

### 7. «Cloudflare: la app vive en la raíz» (Fase B)
- **Seed:** `seedIndexedDB()` con `onboarded: true`, usuario y programa activo.
- **Pasos:**
  1. `goto('/')`.
  2. Recorrer las pestañas de la TabBar.
  3. Recargar en `/history` y en `/friends`.
  4. `GET /manifest.json`.
  5. Leer `registration.scope`.
- **Aserciones:**
  - `/` termina en `/today`.
  - Ningún `href` de la TabBar contiene `/Pedro-IA-Coach`.
  - Las vistas cargan después de recargar.
  - `manifest.json` → 200 con `start_url === "."` y `name === "FitFriends"`.
  - El scope es `<origen>/`.

### Tests existentes que cambian (con el sí de Pedro, 2026-10-14)
- `tests/big.spec.cjs:4565` («Compartir mi usuario», Amigos v2), en la Fase B: `'/Pedro-IA-Coach/'` → `origin + '/'`. La promesa se mantiene: el texto compartido lleva el enlace a la app.
- Solo infraestructura: el servidor de prueba (`:4152`, `:4174`) y `playwright.config.cjs`.
- Ninguna otra promesa cambia. Los mocks actuales responden `{status:'ok'}` a lo desconocido, y `user/check` sin `protected` se lee como no protegido.

### Fuera del alcance del suite (revisión manual en Validation)
- El Worker real con D1, PBKDF2 y el límite de CPU.
- El comando de Pedro para borrar una cuenta.
- La mudanza completa: crear la cuenta en la app de GitHub e iniciar sesión en la de Cloudflare.
- La GitHub Action y el respaldo de SPA en producción.
- El nombre «FitFriends» bajo el icono en el iPhone.
- El push real y su espejo en el Apple Watch desde la nueva instalación.

## Paso futuro (no se construye aquí)

- **Recuperar la contraseña por correo:** el Worker genera un código de 6 dígitos (KV, 15 min) y lo envía. Requiere un servicio de envío: Resend gratis (100/día) con un **dominio propio** (~10 USD/año), o Cloudflare Email Sending (plan Workers de 5 USD/mes). El correo ya está guardado desde la Fase A. Se descartó enviar desde Gmail.
- **Tabla de amistades en D1** que reemplace `friends_${username}` y `user_${username}` en KV, y que proteja con token `user/sync` y `friends/*`.

Fuentes: [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Queues en plan gratis](https://developers.cloudflare.com/changelog/2026-02-04-queues-free-plan/), [Static assets / SPA](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/), [Email Sending (solo plan de pago)](https://developers.cloudflare.com/email-routing/email-sending/), [Sign in with Apple requiere membresía (Akamai)](https://techdocs.akamai.com/identity-cloud/docs/the-sign-in-with-apple-social-login-configuration-guide).
