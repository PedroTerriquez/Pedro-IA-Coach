# Diseño: Corpus de nombres de ejercicios no encontrados (Unmatched Exercise Names)

Fecha: 2026-08-29
Estado: Aprobado

## Contexto

El comando Normalizar (`migrateExercisesToDictionary` → `_assignDictIdsAndNormalize` en `src/lib/storage.ts`) intenta resolver cada ejercicio del usuario contra el diccionario (`exercise-dictionary.ts`, 166 entradas). Cuando no encuentra match, el nombre se agrega a `skippedNames` y se muestra localmente ("sin match / ver más").

Queremos que esos nombres viajen a un almacenamiento en Cloudflare **separado** de amigos/push, para reunir un corpus crowdsourced de nombres que el diccionario no resolvió. El objetivo es que el autor de la app los revise desde la pantalla `/admin` y los vaya agregando al diccionario (con ayuda de IA), ampliando la cobertura del normalizador.

Es una herramienta **solo para admins** — sin suite de tests; verificación manual con `curl`.

## Decisiones

- Almacenamiento: **nuevo KV namespace** `UNMATCHED_KV` (separado físicamente de `PUSH_KV`). Clave = nombre normalizado (sin prefijo). Valor = nombre original + timestamp.
- Deduplicación: por **sobreescritura idempotente** de la clave (si el nombre normalizado ya existe, se sobreescribe). Sin read-modify-write → sin problemas de eventual consistency de KV.
- Solo se guardan **nombres únicos** (sin conteos ni metadatos de usuario).
- Captura: únicamente cuando corre el comando Normalizar y hay `skippedNames` (no en otras creaciones de ejercicios).
- Visualización: **pestaña nueva en la pantalla `/admin` existente** (no una pantalla nueva).

## Arquitectura

```
runDictMigration (you/+page.svelte)
        │  skippedNames
        ▼
reportUnmatchedNames(names)   [cliente, src/lib/unmatched.ts]
        │  POST /api/unmatched/report
        ▼
Cloudflare Worker → UNMATCHED_KV  (put idempotente por clave normalizada)
        ▲
GET /api/unmatched/list
        │
admin → pestaña "Nombres" (búsqueda + copiar)
```

## Almacenamiento (Cloudflare)

Namespace: `UNMATCHED_KV` (nuevo, binding en `wrangler.toml`).

Clave: `normalizeExerciseName(name)` — el mismo normalizador del diccionario
(NFD, lowercase, quita acentos/`-_/`/ruido, colapsa espacios).

Valor:
```json
{ "name": "Press inclinado mancuernas", "firstSeen": "2026-08-29" }
```

- `name` = ortografía original reportada por el usuario (para el admin ver cómo se escribió de verdad).
- `firstSeen` = primera fecha de reporte (`YYYY-MM-DD`).
- Dedup: `put` con la misma clave sobreescribe → único por nombre normalizado.

## Endpoints del Worker (`push-worker/src/index.js`)

Patrón idéntico a los `friends_*`. En `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "UNMATCHED_KV"
id = "<id de npx wrangler kv:namespace create UNMATCHED_KV>"
```

### `POST /api/unmatched/report`
- Body: `{ names: string[] }`
- Por cada nombre:
  - `normalizado = normalize(name)`; si normalizado vacío → skip
  - longitud del nombre original ≤ 64 chars, si no → skip
  - `UNMATCHED_KV.put(normalizado, JSON.stringify({ name, firstSeen: hoy }))` — si ya existe la clave, preservar `firstSeen` original (leer valor previo y conservar su `firstSeen`).
- Batch ≤ 200 nombres por request; si excede → `400`.
- Respuesta: `{ stored, skipped }` con conteos.
- Error → `500 { error }` (catch igual que friends).

### `GET /api/unmatched/list`
- `UNMATCHED_KV.list()` completo, ordenado por nombre normalizado.
- Respuesta: `{ names: [{ name, firstSeen }] }`.

## Flujo de reporte (cliente)

Nuevo módulo `src/lib/unmatched.ts` con `reportUnmatchedNames(names: string[]): Promise<void>`:
- Normaliza y dedup local (evita re-subir duplicados).
- `fetch(POST PUSH_SERVER_URL/api/unmatched/report)`.
- Falla silenciosa: `console.warn` y nunca lanza — no debe afectar la UX de Normalizar.

En `runDictMigration` (`src/routes/you/+page.svelte:521`), tras obtener `result.skippedNames`:
- si `skippedNames.length > 0` → `reportUnmatchedNames(skippedNames)` (fire-and-forget).

## Pestaña admin "Nombres" (`/admin`)

- Nuevo tab `unmatched` junto a `dict` / `warmup` / `stretch`.
- Al abrir el tab: `GET /api/unmatched/list`, con estados de carga / error / vacío.
- Lista con:
  - búsqueda por texto (`SearchInput`).
  - badge "sin match" original + `firstSeen`.
  - botón copiar por nombre (clipboard).
  - botón "copiar todos" (un nombre por línea).
- Despliegue solo si `PUSH_SERVER_URL` está definido; si no, mensaje de aviso.

## Límites y errores

- Sin auth (público, igual que friends). Protección mínima anti-spam: batch ≤ 200, nombre ≤ 64 chars, eliminación de nombres normalizados vacíos.
- Report fallido → silencioso en cliente.
- Fallo del list en admin → mensaje de error con retry.

## Fuera de alcance (YAGNI)

- Conteos / nº de usuarios distintos (se decidió "solo nombres únicos").
- Reporte automático en otras creaciones de ejercicios (solo comando Normalizar).
- Rate limiting por IP / auth de reporte.
- Importación automática de la lista al diccionario (se agrega manualmente con ayuda de IA).

## Verificación

- Manual: `curl -X POST {PUSH_SERVER_URL}/api/unmatched/report -H 'Content-Type: application/json' -d '{"names":[...]}'` y `curl {PUSH_SERVER_URL}/api/unmatched/list`.
- Pre-commit: `bash scripts/bump-version.sh` (corre `npm run check` + `npx playwright test`), `npm run build`, commit + push.