# NormalizeCard → ActionRow + Auto-normalización al crear programa

Fecha: 2026-08-10
Estado: Aprobado

## Contexto

- `NormalizeCard` (You → Ejercicios) muestra un card con dos botones: **Completar** (normalización normal, no fuerza) y **Sobrescribir** (fuerza datos canónicos del diccionario), más una línea de estado con enlace "ver más" para ejercicios sin match.
- La migración normal (`migrateExercisesToDictionary({ force: false })`) está limitada por el flag de localStorage `dict_migration_v2`: tras la primera ejecución es un no-op (`alreadyDone: true`).
- El patrón visual de fila en You → Datos es `ActionRow` (título + descripción + estado + botón).

## Objetivo

1. `NormalizeCard` debe verse como `ActionRow` (estilo You → Datos).
2. Dejar **solo** el botón **Sobrescribir** (fuerza).
3. La normalización normal (no force) debe aplicarse **siempre**, automáticamente, al momento de crear un programa nuevo — sin flag de una-sola-vez.

## Decisiones

### 1. Auto-normalización al crear programa

En `Storage.saveProgram()` (`src/lib/storage.ts`):

- Antes de guardar, leer si el programa ya existe (`get('programs', program.id)`).
- Si **no existe** (programa nuevo): después del `put`, llamar `migrateExercisesToDictionary({ force: false })`.
- Si **existe** (edición): guardar sin normalizar.

Cubre todos los caminos de creación: manual (`createNewProgram`), editor nuevo (`ProgramEditor` con `isNew`), IA import/generate/coach (`src/lib/ai.ts`). Las ediciones reutilizan el id → no re-normalizan.

La dedup (`_deduplicateGroup` → `_reassignProgramRefs`) ya reasigna referencias de programas al fusionar ejercicios, por lo que correr la migración **después** del `put` del programa nuevo es seguro.

### 2. Quitar el flag `dict_migration_v2`

- Eliminar el chequeo `localStorage.getItem(FLAG) === 'done'` y el `setItem`.
- Eliminar el campo `alreadyDone` de la respuesta y su manejo en `runDictMigration` (You).
- `migrateExercisesToDictionary({ force })` corre siempre. La rama `dictMissing` se mantiene.

### 3. `NormalizeCard` → estilo `ActionRow`

Reescribir `src/lib/components/NormalizeCard.svelte` componiendo `ActionRow`:

- `title`: "Limpia y ordena tus ejercicios" (se mantiene).
- `description` (reescrita): "Sobrescribe nombre, músculo, imagen, tips y alternativas con los del diccionario. Lo personalizado se reemplaza."
- `statusContent` snippet con `#dict-migrate-status` y el enlace `#ver-mas-link` (se conservan los IDs que usan los tests).
- Botón único "Sobrescribir" → `onforce`.
- Se elimina el botón "Completar" y la prop `onmigrate`.

### 4. You (`src/routes/you/+page.svelte`)

- Quitar `onmigrate={() => runDictMigration(false)}` del uso de `<NormalizeCard>`.
- En `runDictMigration`, eliminar la rama `result.alreadyDone`.

### 5. Tests (`tests/big.spec.cjs`)

- El paso que hace click en "Completar" (línea ~999) pasa a hacer click en "Sobrescribir" y seguir esperando "Actualizados" en `#dict-migrate-status`. (La auto-normalización ya dejó los ejercicios normalizados tras el import con IA; el texto "Actualizados" sigue presente en la respuesta del run forzado.)
- El bloque describe de "ver más" ya usa "Sobrescribir" — sin cambios.
- `EXPECTED_STEPS` no cambia (son los labels Step 1–15).

## No tocar

- `findOrCreateExerciseByName`: ya normaliza ejercicios nuevos.
- Dedup/merge internos: se reutilizan tal cual.
- `AGENTS.md` no requiere cambios (no menciona el flag explícitamente).

## Criterios de aceptación

- Crear cualquier programa nuevo (manual, editor, IA) normaliza los ejercicios existentes automáticamente.
- Editar un programa existente no re-normaliza.
- La fila de normalización en You → Ejercicios tiene el aspecto de `ActionRow`, solo con "Sobrescribir".
- `npm run check`, `npm run build` y `npx playwright test` pasan.
