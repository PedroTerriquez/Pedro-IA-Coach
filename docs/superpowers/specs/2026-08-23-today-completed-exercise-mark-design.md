# Design: Marcar ejercicios completados en Hoy

**Fecha:** 2026-08-23
**Estado:** Aprobado (Opción A)

## Problema

En la pestaña Hoy, la TrainingCard muestra cuántos ejercicios se han hecho
(`todayExDone`) en la barra de progreso, pero las filas de ejercicios no
indican visualmente cuáles ya están completados y cuáles faltan.

## Decisión (Opción A)

Marca verde por ejercicio: anillo verde alrededor del thumbnail + badge "✓"
verde en la esquina del thumb + nombre atenuado. La row completa no cambia de
fondo ni se tacha (evita leerse como "deshabilitado").

## Fuente de verdad

La misma que ya usa el contador: un log en `exerciseLogs` con `date == hoy` y
`weight > 0` para el `exerciseId` del ejercicio del día. No hay estado nuevo
que persistir. Sin swap activo, el ID mostrado coincide con el ID del programa
(`buildTodayExercises` solo reemplaza el ID si hay swap; ExerciseDetail registra
el log con ese mismo ID).

Nota conocida (fuera de alcance): con swap activo, `loadTodayLogs()` cuenta por
ID original mientras los logs llevan el ID del reemplazo. El marcado seguirá al
contador (IDs originales) para no divergir visualmente de la barra de progreso.

## Cambios

### 1. `src/routes/today/+page.svelte`

- Nuevo estado `doneIds = $state<Record<string, true>>({})`.
- En `loadTodayLogs()`: construir `doneIds` desde los logs de hoy
  (`weight > 0`), junto al conteo existente.
- Pasar `{doneIds}` a `<TrainingCard>` (solo se renderiza cuando quedan
  ejercicios pendientes; al completar todo, la card pasa a PhaseCard "completed"
  como hoy).

### 2. `src/lib/components/TrainingCard.svelte`

- Nuevo prop opcional `doneIds?: Record<string, true>`.
- Por cada row: `done={!!doneIds?.[ex.exerciseId]}`.

### 3. `src/lib/components/ExerciseRow.svelte`

- Nuevo prop opcional `done?: boolean` (default `false`).
- Cuando `done`: clase `row-done` + atributo `data-done="true"` (y
  `"false"` cuando no). Estilos: borde verde (#34c759 iOS green) de 1.5px en
  `.ex-thumb`, badge circular verde con ✓ posicionado en la esquina superior
  derecha del thumb, nombre con `opacity ~0.55`.
- El resto de usos de ExerciseRow (Plan, etc.) no pasan `done` → sin cambio
  visual.

## Test E2E (`tests/big.spec.cjs`)

Nuevo bloque `test.describe('Hoy — ejercicios completados marcados')` con
exactamente UN `test()` (regla del guardrail):

1. Seed: programa de 2 ejercicios (Press Banca + Press Militar, mismos IDs del
   SEED existente), settings con `sessionState { date: hoy, phase: 3,
   todayExDone: 1 }` y un log de hoy para `ex-bench` con peso > 0.
2. Ir a `/today`: con `phase >= 2` el warmup cuenta como hecho y la
   TrainingCard muestra las rows directamente.
3. Assert: la row de Press de Banca tiene `data-done="true"` (y clase
   `row-done`); la row de Press Militar tiene `data-done="false"`.
4. Reload: el marcado persiste (se recalcula desde IndexedDB, no es estado
   efímero).

No se toca el flujo principal ni `EXPECTED_STEPS`.

## Verificación

- `npm run check`
- `npm run build`
- `npx playwright test`
- Manual: `npm run dev` → marcar pesos en ejercicios → ver filas verdes.
