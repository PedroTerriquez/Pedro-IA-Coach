# Design: Admin de Imágenes/GIFs de Ejercicios

Fecha: 2026-08-07
Estado: Aprobado

## Objetivo

Un admin visual (desktop, `npm run dev`) para revisar los 166 ejercicios del
diccionario, previsualizar su **imagen** y su **gif**, corregir las URLs que estén
mal y **reescribir directamente** las líneas `image:` / `gif:` de cada entrada en
`src/lib/data/exercise-dictionary.ts`.

El usuario corrige él mismo los errores de media que se autogeneraron (los URLs de
free-exercise-db y ExerciseGymGifsDB son a menudo incorrectos). El código fuente
sigue siendo la única fuente de verdad.

## Contexto

- Diccionario: `src/lib/data/exercise-dictionary.ts` — 166 entradas. Cada una tiene:
  - `id: 'press-banca-barra',`
  - `image: _IMG('Barbell_Bench_Press_-_Medium_Grip'),`
  - `gif: _GIF('pectorals/barbell-bench-press'),`
- Bases y helpers (mismo archivo):
  - `IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'`
  - `EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/'`
  - `_IMG(p)` → `IMG_BASE + p + '/0.jpg'`
  - `_GIF(path)` → `EX_GIF_BASE + '/' + path + '.gif'`
- `resolveExerciseMedia(exercise)` (línea 2599) usa `exercise.imgUrl` primero, luego
  `entry.image` del diccionario, etc. El preview del admin muestra **directamente**
  `entry.image` / `entry.gif` (los valores que se editan), no el fallback resuelto.
- Los ejercicios guardados en IndexedDB copian `imgUrl`/`gifUrl` del diccionario al
  crearse (`storage.ts: findOrCreateExerciseByName`). Por eso, tras corregir el
  diccionario, el dispositivo necesita re-normalizar: ya existe **Tú → Datos →
  Mantenimiento → Normalizar (Forzar)** que sobreescribe `imgUrl`/`gifUrl` con los
  valores del diccionario.
- El proyecto es SvelteKit 5 (runes) + Vite + TS, `adapter-static`, base
  `/Pedro-IA-Coach`. Dev corre en `http://localhost:5173/Pedro-IA-Coach/`.

## Decisiones

1. **Plataforma**: desktop, misma app SvelteKit, `npm run dev`.
2. **Guardado**: escritura directa en disco vía un plugin de Vite (`configureServer`),
   endpoint `POST /__admin/dictionary-save`, **solo en dev**. Reescribe las líneas
   `image:`/`gif:` de las entradas indicadas.
3. **Objetivo de edición**: cada entrada del diccionario directamente. NO se usa el
   bloque `GYMVISUAL_OVERRIDES`.
4. **Alcance**: los 166 ejercicios, con filtro por músculo + buscador.
5. **Encontrar URLs**: buscador de candidatos (gifs de ExerciseGymGifsDB + imágenes de
   free-exercise-db, vía GitHub git-trees API, cacheadas en `localStorage`) **y**
   campo para pegar URL manual.

## Cambios

### 1. `vite.config.ts` — plugin de escritura (dev only)

- Función `mediaEditorPlugin()` con `configureServer` → middleware en
  `POST /__admin/dictionary-save`.
- Body: `{ fixes: [{ id, image?, gif? }] }`.
- Lee `src/lib/data/exercise-dictionary.ts` (ruta validada, nunca una ruta arbitraria).
- Para cada fix:
  - Localiza la entrada por la línea `id: '<id>',` (al inicio de línea, indentada).
  - El bloque de la entrada abarca desde esa línea hasta la siguiente línea que cierra
    el objeto (`  },` con la indentación estándar de 2 espacios). Dentro de ese rango
    reemplaza la línea `image:` (si `fix.image` viene definido) y la línea `gif:` (si
    `fix.gif` viene definido). Cada entrada tiene exactamente una línea `image:` y una
    `gif:`, así que el reemplazo es unívoco.
  - **Serialización**: si la URL es absoluta y empieza con `IMG_BASE` → guarda
    `_IMG('<dir>')` (el resto de la ruta). Si empieza con `EX_GIF_BASE` → guarda
    `_GIF('<path>')` (ruta sin `.gif`). Si no coincide con ninguna base → string crudo
    entre comillas simples (escape de `'` y `\`).
- Respuesta `{ ok: true, changed: [{ id }] }` o `{ ok: false, error }`.
- Devuelve 404 si no se llama en dev.

### 2. `src/lib/admin/catalogs.ts` — catálogos para el buscador

- `fetchGifCatalog()`: fetch `https://api.github.com/repos/JahelCuadrado/ExerciseGymGifsDB/git/trees/v1.1.0?recursive=1` → filtra paths `.gif` → `[{ path, url: EX_GIF_BASE + path }]` (~1323).
- `fetchImageCatalog()`: fetch `https://api.github.com/repos/yuhonas/free-exercise-db/git/trees/main?recursive=1` → filtra paths `exercises/<Dir>/0.jpg` → `[{ dir, url: IMG_BASE + dir + '/0.jpg' }]` (~873).
- Cache en `localStorage` (claves `admin_gif_catalog`, `admin_img_catalog`, con
  `fetchedAt`). Refetch si expiró (> 1 día) o botón "Actualizar catálogos".
- Tokenización de búsqueda: lowercase, split por `_`/`-`/espacio; match por inclusión
  de tokens. `searchGifCatalog(q)`, `searchImageCatalog(q)` devuelven hasta ~50
  resultados.
- Manejo de rate-limit / error de red: `search*` devuelve `null` + flag de error; el UI
  muestra aviso y el pegado manual sigue funcionando.

### 3. `src/lib/admin/editor.ts` — estado de borradores

- Store Svelte `createMediaEditorStore()`:
  - `drafts: Record<id, { image?: string; gif?: string }>`
  - `markDirty(id, field, value)`, `discard(id)`
  - `dirtyCount` (derivado)
  - `save()` → `fetch('/__admin/dictionary-save', POST)` con `fixes` = drafts como array.
    - Éxito → limpia drafts + toast "Guardado en exercise-dictionary.ts".
    - Sin endpoint (producción/preview) → toast error "Solo disponible en `npm run dev`".

### 4. `src/routes/admin/+page.svelte` — UI

- Detecta `import.meta.env.DEV` para habilitar Guardar.
- Header: título "Media Admin" + contador `Guardar (n)` + botón "Actualizar catálogos".
- Filtro por músculo (chips, de los valores únicos del diccionario) + `SearchInput`
  por nombre es/en/alias.
- Lista en grilla de tarjetas (mismo lenguaje visual de la app):
  - Miniatura de **imagen** (`entry.image`) y de **gif** (animado, `entry.gif`).
  - `onerror` en la imagen → badge "⚠️ no carga".
  - Nombre es/en, músculo.
  - Botón "Editar" → abre los campos `image`/`gif` + botones "Buscar gif" /
    "Buscar imagen" + pegado manual.
  - Fila con borrador → borde accent + botón "Descartar".
- Nota en producción: "Admin de solo lectura — corre `npm run dev` para editar".
- El HMR de Vite recarga el diccionario al reescribirse, así el preview refleja el
  valor guardado sin recargar.

### 5. `src/lib/components/MediaPicker.svelte` — buscador de candidatos

- Overlay full-screen (reusa el patrón visual de `CoachChat.svelte`).
- Tabs "GIFs" / "Imágenes", input de búsqueda, grilla de miniaturas.
- Clic en un candidato → emite `{ kind: 'gif'|'image', url }` → llena el campo
  correspondiente en el borrador.
- Indica total de resultados; mensaje claro si el catálogo no cargó.

### 6. `src/routes/you/+page.svelte` — acceso discreto

- En la sección **Datos → Mantenimiento**, una fila "Revisar imágenes del diccionario"
  que navega a `/admin`.

### 7. Workflow post-cambio (documentado en AGENTS.md y para el usuario)

1. `npm run dev` → `/admin` → corregir → **Guardar**.
2. `git diff src/lib/data/exercise-dictionary.ts` → revisar → commit + push.
3. En el teléfono: app actualizada → **Tú → Datos → Mantenimiento → Normalizar
   (Forzar)** → sobreescribe `imgUrl`/`gifUrl` de los ejercicios guardados con el
   diccionario corregido.

## Fuera de alcance

- NO tocar `GYMVISUAL_OVERRIDES`.
- NO auto-detección de imágenes "incorrectas" (solo badge de no-carga vía `onerror`).
- NO editar los ejercicios del usuario en IndexedDB desde el admin (se resuelve con
  re-normalizar en el dispositivo).
- NO incluir el catálogo GYMVISUAL (hasaneyldrm/exercises-dataset, 17MB) en el
  buscador por ahora.

## Verificación

- `npm run dev` → `/admin`: 166 filas, filtro por músculo, buscador, previews.
- Editar imagen/gif de una entrada → Guardar → el cambio aparece en
  `exercise-dictionary.ts` (`git diff`) y el preview se actualiza por HMR.
- URL de una base conocida se guarda como `_IMG(...)`/`_GIF(...)`; URL arbitraria como
  string crudo.
- `npm run build` → `/admin` se renderiza read-only con el aviso.
- `npx playwright test` sigue pasando (la ruta `/admin` no rompe el tab flow).
