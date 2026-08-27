# Design: Timer de sesión completo + momentos centrados (revival del legado)

**Fecha:** 2026-08-25
**Estado:** Aprobado (Opción A)

## Problema

La migración a Svelte perdió tres piezas de la experiencia de sesión que existían
en la app vanilla:

1. **Timer de sesión completo**: arrancaba al iniciar el calentamiento y corría
   hasta el final del estiramiento.
2. **Momentos centrados** (`showCenterToast`, overlay full-screen con blur):
   - Warmup completo + `hasWatch` → *"Inicia tu Smart Watch"* (~2s)
   - Último ejercicio completado → foto de Pedro + *"Estira bb"* +
     *"Ya no tienes 20 añitos"* + tiempo transcurrido (3s)
3. **Duración total** al terminar, visible en la vista post-workout.

Hoy solo queda un timer parcial (`startedAt` arranca al primer paso completado,
`endedAt` nunca se asigna) y un toast inferior sin gracia para el watch.

## Referencia legado (git history)

- Commit pre-borrado: `75f0cd2~1`
- Overlay: `components/ui.js` → `showCenterToast()` + `TOAST_SVG_WATCH` +
  `TOAST_IMG_TRAINER`
- Llamadas: `views/today.js` (watch tras warmup onComplete; "Estira bb" al
  completar ejercicios)
- Imagen de Pedro: `data/Gemini_Generated_Image_skjbz4skjbz4skjb.png`
  (PNG 896×1195 RGBA, recuperable con
  `git show 75f0cd2~1:data/Gemini_Generated_Image_skjbz4skjbz4skjb.png`)

## Decisión

Port fiel como componente Svelte reutilizable + timer persistido + duración en
la card del coach. Sin anillo congelado "Total" en vista coach (Opción C
descartada: redundante con el stat Duración).

## 1. Componente nuevo: `src/lib/components/CenterToast.svelte`

Props (Svelte 5 runes):

```ts
{
  imageSrc?: string      // foto centrada (max-width/height 180px, radius 16px, sombra)
  iconSvg?: string       // SVG inline 72px coloreado con accent, vía {@html}
  message: string        // 24px Space Grotesk bold, --text
  subtext?: string       // 16px rgba(255,255,255,0.65), line-height 1.4
  timeLabel?: string     // fila mono (JetBrains Mono) con ícono reloj + texto
  accent?: string = 'var(--accent)'
  duration?: number = 3000
  onclose?: () => void
}
```

Comportamiento:

- Overlay `position:fixed; inset:0; z-index` al mismo nivel de apilamiento que
  `StreakOverlay` (verificar valor real al implementar), fondo
  `rgba(0,0,0,0.7)` + `backdrop-filter: blur(16px)` (+ prefijo `-webkit-`),
  contenido flex column centrado.
- Animaciones: fadeIn 0.3s al montar; fadeUp 0.4s en el bloque interior.
- Auto-dismiss: `setTimeout(duration)` → estado `closing` (opacity→0,
  transition 0.35s) → `onclose?.()`. Limpieza del timeout en `$effect`
  teardown.
- Atributo `data-component="CenterToast"` para E2E.
- Solo se renderiza si hay `imageSrc` o `iconSvg` (uno de los dos); nunca ambos.

## 2. Asset

`git show 75f0cd2~1:data/Gemini_Generated_Image_skjbz4skjbz4skjb.png >
static/images/pedro.png`

Se referencia con `import { base } from '$app/paths'` → `` `${base}/images/pedro.png` ``.

## 3. Timer de sesión — ciclo completo (`src/routes/today/+page.svelte`)

Estado existente reutilizado: `startedAt`, `endedAt` (ya existen, hoy huérfanos).

**Arranque** — nuevo helper interno:

```ts
function startSessionTimer() {
  if (!startedAt) { startedAt = Date.now(); persistPhase() }
}
```

Call sites:

- `onclick` de la PhaseCard Calentamiento → `startSessionTimer()` antes de
  `showWarmup = true`
- `openTrainingDetail()` y `openExerciseDetailAt()` → `startSessionTimer()`
  (fallback para días sin calentamiento)
- El `$effect` existente que arranca al primer paso hecho se conserva como
  última red.

**Fin** — asignar `endedAt = Date.now()` en:

- `onStretchComplete()` (camino normal con stretch)
- Rama de completado de `loadTodayLogs()` cuando `!hasStretch` (antes de la
  cadena racha → esfuerzo → coach)

El intervalo vivo ya se detiene solo cuando `endedAt` existe; durante la fase
de estiramiento el ring sigue corriendo (correcto).

**Persistencia** — `persistPhase()` escribe y el `onMount` restaura:

```ts
sessionState: { date, phase, todayExDone, startedAt, endedAt }
```

Restauración en mount (si `sessionState.date === todayDate`):
`startedAt`/`endedAt` se leen tal cual. Wall-clock ⇒ inmune a suspensión iOS.
Si `sessionState` indica sesión completa pero no trae `endedAt`, no se
inventa: queda `null` (la vista coach no muestra ring).

**Tipos**: extender el tipo de `sessionState` en `src/lib/types.ts` con
`startedAt?: number | null; endedAt?: number | null`.

`resetDay()` ya pone `startedAt`/`endedAt` en null; añadir `centerToast = null`.

## 4. Momento watch (`onWarmupComplete`)

Reemplazar el `toast.show('Inicia tu Smart Watch')` actual por:

```ts
if ($settings.hasWatch) {
  centerToast = {
    iconSvg: WATCH_SVG,           // port literal de TOAST_SVG_WATCH (legacy ui.js)
    message: 'Inicia tu Smart Watch',
    duration: 2000,
  }
}
```

Sin `hasWatch`: nada (comportamiento legacy).

## 5. Momento "Estira bb" (`loadTodayLogs`, rama de completado)

Dentro de la rama `count >= exercisesTotal … && !completionToastShown`,
cuando `hasStretch` (y solo entonces — evita chocar con la cadena
racha/esfuerzo/coach que ya maneja el caso sin stretch):

```ts
centerToast = {
  imageSrc: `${base}/images/pedro.png`,
  message: 'Estira bb',
  subtext: 'Ya no tienes 20 añitos',
  timeLabel: startedAt ? formatElapsed(startedAt, Date.now()) : undefined,
  duration: 3000,
}
```

`formatElapsed(start, end)` → `"42 min 13 seg"` / `"45 seg"` (formato legacy).
El resto de la rama (phase='stretch', persist) queda igual; el overlay cubre
mientras la card de Estiramiento aparece debajo.

## 6. Duración total — `CoachResultCard.svelte`

- `StatsGrid` pasa de `columns={3}` a `{4}`.
- Nuevo `StatBlock`: label **"Duración"**, valor `formatDuration(analysis?.sessionDurationSec)`
  → `'—'` si null; si no `m:ss` (minutos sin tope: `${Math.floor(s/60)}:${pad(s%60)}`),
  fuente mono ya propia del componente.
- Fuente del dato: en `onEffort()` (today page), al guardar análisis:

```ts
s.lastCoachAnalysis = { ...result, date, effort, weekIdx,
  sessionDurationSec: startedAt ? Math.round(((endedAt ?? Date.now()) - startedAt) / 1000) : undefined }
```

Vive dentro del objeto persistido existente ⇒ sobrevive recargas sin tipos
nuevos fuera de `lastCoachAnalysis` (tipo `any` ya declarado).

## 7. Test E2E (`tests/big.spec.cjs`)

Nuevo bloque `test.describe('Hoy — timer de sesión y momentos')`, UN `test()`
(guardrail intacto):

1. Seed: `SEED.exercises` (Chest/Shoulders ⇒ warmup real), programa de 2
   ejercicios (ex-bench + ex-military), sin logs, settings con `hasWatch: true`.
2. `/today` → tap `[data-phase="warmup"]` → sheet → botón **Hecho**.
3. Assert `[data-component="CenterToast"]` visible con texto *"Inicia tu Smart
   Watch"*; esperar a que desaparezca (timeout ≥ 3.5s).
4. Abrir entrenamiento, registrar peso en ambos ejercicios (stepper +
   `Registrar ·`, navegar con `Siguiente`), cerrar sheet (**Cerrar**).
5. Assert CenterToast visible con *"Estira bb"* y patrón `/\d+ seg|\d+ min/`;
   esperar su desaparición.
6. Tap card Estiramiento → **Hecho** → StreakOverlay auto-pasa → esfuerzo
   **Justo** → assert `#coach-card-regen` contiene valor de Duración que matchee
   `/^\d{1,3}:\d{2}$/`.

`mockApiRoutes(page)` al inicio por seguridad. Waits generosos (patrón del
archivo: 400–1000ms). No tocar `EXPECTED_STEPS` ni pasos previos.

## Archivos

| Acción | Path |
|---|---|
| Crear | `src/lib/components/CenterToast.svelte` |
| Crear | `static/images/pedro.png` (desde git history) |
| Modificar | `src/routes/today/+page.svelte` |
| Modificar | `src/lib/components/CoachResultCard.svelte` |
| Modificar | `src/lib/types.ts` (sessionState) |
| Modificar | `tests/big.spec.cjs` (append) |

## Edge cases

- Reload a mitad de sesión: timer continúa desde `sessionState.startedAt`.
- Día sin warmup items: timer arranca al abrir el primer detalle de ejercicio.
- Día sin stretch: sin toast "Estira bb" (la cadena completa ya gestiona el
  cierre); duración se calcula igual al entrar a coach.
- `resetDay()`: limpia timer, toasts y `sessionState` (ya existe, añadir
  `centerToast`).
- Toast vs StreakOverlay solapándose: no ocurren en el mismo instante (watch =
  tras warmup; estira = al completar ejercicios; streak = tras stretch).

## Verificación

`npm run check` · `npm run build` · `npx playwright test` · manual con
`npm run dev` (activar Smartwatch en Tú → Ajustes para ver el momento watch).
