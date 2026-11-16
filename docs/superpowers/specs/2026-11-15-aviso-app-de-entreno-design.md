# Design: Aviso de app de entreno

Fecha: 2026-11-15
Estado: Aprobado

## Why

Al terminar el calentamiento, la app muestra «Inicia tu Smart Watch» solo si el usuario activó el interruptor «Smart Watch» en Ajustes. El aviso es seco, no dice para qué sirve, y el interruptor existe únicamente para esconderlo. Coach Pedro no puede abrir el entreno de Fitness/Workout por el usuario (una PWA no tiene forma de hacerlo; la única vía sería un Atajo de iOS, que se descartó), así que lo mejor es una invitación clara y opcional.

## What

- Al terminar el calentamiento sale **siempre** un aviso centrado de 2 s que invita, si el usuario quiere, a iniciar su app de entreno para registrar también ahí.
- El texto y la composición (título/subtexto, ícono) los define el diseño aprobado en Claude Design para este aviso; el implementador copia el texto tal cual de esa card.
- Se elimina el interruptor «Smart Watch» de Tú › Ajustes y el campo `hasWatch` de los ajustes.

## Constraints

### Must
- Reusar `CenterToast` (`message`, y `subtext` si el diseño lo usa); duración 2000 ms, como hoy.
- Mismo momento que hoy: `onWarmupComplete()` en `src/routes/today/+page.svelte`.
- Ajustes guardados con `hasWatch` (teléfonos existentes, copias de seguridad, nube) se cargan sin error; el campo sobrante se ignora.
- Copia literal del diseño aprobado; en español como el resto de los avisos de Hoy.

### Must Not
- Ningún botón, enlace ni Atajo (`shortcuts://`) en el aviso.
- No depender de ningún ajuste para mostrarlo.
- No tocar los otros usos de `CenterToast` (p. ej. «Estira bb»).

### Out of Scope
- Abrir Fitness/Workout o iniciar un entreno en el Apple Watch.
- Mostrar el aviso si el usuario se salta el calentamiento.
- Notificaciones al Watch del descanso (`notifyWatch`, rest timer) — no cambian.

## Current State

- `src/routes/today/+page.svelte:399-405` — `onWarmupComplete()`: `if ($settings.hasWatch) centerToast = { iconSvg: WATCH_SVG, message: 'Inicia tu Smart Watch', duration: 2000 }`. `WATCH_SVG` en la línea 43.
- `src/lib/components/CenterToast.svelte` — props `iconSvg`, `message`, `subtext`, `duration`.
- `src/lib/components/SettingsScreen.svelte:69-74` — `NavGroup` con `NavRow «Smart Watch»` + `Switch #watch-switch`, junto a `#notif-row`.
- `hasWatch`: `src/lib/types.ts:88`, `src/lib/storage.ts:269` (defaults de `getSettings`), `src/lib/stores/settings.ts:26`, `docs/schema.md:62`.
- Diseño: `scripts/ds/groups.mjs:382` siembra `hasWatch: false` en el helper `session`; cards de Ajustes (`settings`) y de la sesión de Hoy.
- Tests: `tests/big.spec.cjs:331-335` (activa `#watch-switch`, comprueba `hasWatch`), `:1194-1198` (aviso «Inicia tu Smart Watch» visible y se va tras `elapse(2000)`); seeds con `hasWatch: false` en `:2768`, `:3001`, `:3574`.

## Tasks

### T1: Quitar `hasWatch` de tipos y defaults
**What:** Borrar `hasWatch` de `Settings` y de los defaults; quitarlo del seed de `scripts/ds/groups.mjs` y de `docs/schema.md`. Los ajustes viejos que lo traigan se dejan pasar sin migración.
**Files:** `src/lib/types.ts`, `src/lib/storage.ts`, `src/lib/stores/settings.ts`, `scripts/ds/groups.mjs`, `docs/schema.md`
**Verify:** `npm run check`

### T2: Aviso siempre, con el texto del diseño
**What:** En `onWarmupComplete()` quitar el `if ($settings.hasWatch)` y poner el `message`/`subtext` (e ícono si cambia) del diseño aprobado, `duration: 2000`.
**Files:** `src/routes/today/+page.svelte`
**Verify:** `npm run check`

### T3: Quitar el interruptor «Smart Watch»
**What:** Borrar el `NavRow «Smart Watch»` y su `Switch` de Ajustes; `#notif-row` queda en su grupo. Limpiar `#watch-switch` de `src/lib/test-ids.json` si está.
**Files:** `src/lib/components/SettingsScreen.svelte`, `src/lib/test-ids.json`
**Verify:** `npm run check`

### T4: Tests
**What:** Aplicar los escenarios de abajo; quitar `hasWatch` de los seeds.
**Files:** `tests/big.spec.cjs`
**Verify:** `npx playwright test`

### T5: Cards de diseño
**What:** Regenerar y subir las cards de Ajustes y del aviso al terminar el calentamiento (`docs/design-system.md`); borrar la variante con interruptor Watch si existe.
**Files:** `scripts/ds/*`
**Verify:** cards actualizadas en Claude Design

## Validation

- `npm run check`
- `npx playwright test`
- `npm run build`
- Manual check: ninguno extra (el aviso es solo texto; lo cubre la suite).

## Test Scenarios

Cambios aprobados por Pedro (2026-11-15) al flujo principal de `tests/big.spec.cjs`:

1. **Ajustes sin interruptor Watch** (~línea 331, en Tú › Ajustes, con la app ya onboarded)
   - Pasos: se elimina el clic en `#watch-switch` y el `expect.poll(... hasWatch).toBe(true)`.
   - Aserción: `#watch-switch` tiene `count 0`; las unidades en lb siguen guardándose.
2. **Aviso de app de entreno al terminar el calentamiento** (~línea 1194, tras «Terminar calentamiento»; el flujo ya no activó ningún ajuste de reloj)
   - Aserción: `[data-component="CenterToast"]` con el texto nuevo del diseño es visible; tras `elapse(2000)` deja de verse.
   - Esto también prueba que el aviso sale sin ajuste de Watch.

Sin `test()` nuevos.
