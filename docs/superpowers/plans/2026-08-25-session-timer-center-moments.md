# Timer de sesión + momentos centrados — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revivir el flujo legado de sesión: timer desde que abres el calentamiento hasta cerrar estiramiento (persistido), overlay centrado "Inicia tu Smart Watch" (2s) tras warmup con `hasWatch`, overlay "Estira bb" con tiempo transcurrido al completar ejercicios, y stat "Duración" en la card del coach.

**Architecture:** Un componente nuevo `CenterToast.svelte` (port del `showCenterToast` legacy) controlado por un estado `centerToast` en la página Hoy. El timer reutiliza `startedAt`/`endedAt` ya existentes, ahora persistidos en `sessionState` y asignados en los momentos correctos. La duración viaja dentro de `lastCoachAnalysis.sessionDurationSec` hacia `CoachResultCard`.

**Tech Stack:** SvelteKit 2 + Svelte 5 runes, Playwright (archivo único, guardrail `EXPECTED_STEPS`).

**Spec:** `docs/superpowers/specs/2026-08-25-session-timer-center-moments-design.md`

---

### Task 0: Asset de Pedro

- [ ] **Step 1: Recuperar imagen del historial**

Run: `git show 75f0cd2~1:data/Gemini_Generated_Image_skjbz4skjbz4skjb.png > static/images/pedro.png && file static/images/pedro.png`
Expected: `PNG image data, 896 x 1195` (crear `static/images/` si no existe).

---

### Task 1: Test E2E que falla (TDD)

**Files:**
- Modify: `tests/big.spec.cjs` (append al final)

- [ ] **Step 1: Añadir bloque nuevo**

Pegar al final del archivo (reutiliza `SEED`, `buildDayArray`, `seedIndexedDB`, `mockApiRoutes`):

```js
// ── Hoy: timer de sesión y momentos centrados ──
// Revival del legado: overlay "Inicia tu Smart Watch" al terminar warmup
// (si hasWatch), overlay "Estira bb" con tiempo al completar ejercicios, y
// duración total en la card del coach.
test.describe('Hoy — timer de sesión y momentos', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-timer', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: true, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  test('watch moment tras warmup, Estira bb al completar, duración en coach card', async ({ page }) => {
    test.setTimeout(90000)
    await mockApiRoutes(page)

    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: SEED.exercises,
      program: {
        id: 'prog-timer',
        name: 'Programa Timer',
        weeks: [{
          name: 'Semana 1', subtitle: '', tag: 'BUILD',
          days: buildDayArray({
            name: 'Empuje',
            subtitle: 'Press Banca · Press Militar',
            duration: 60,
            exercises: [
              { exerciseId: 'ex-bench', sets: 4, reps: '8-10', rest: 120 },
              { exerciseId: 'ex-military', sets: 3, reps: '10-12', rest: 90 },
            ],
          }),
        }],
      },
      settings: { ...SETTINGS },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    // ── Warmup → momento watch ──
    await page.locator('[data-phase="warmup"]').click()
    await page.waitForTimeout(500)
    const hechoBtn = page.getByRole('button', { name: 'Hecho' })
    await expect(hechoBtn).toBeVisible({ timeout: 3000 })
    await hechoBtn.click()

    const watchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Inicia tu Smart Watch' })
    await expect(watchToast).toBeVisible({ timeout: 2000 })
    await expect(watchToast).not.toBeVisible({ timeout: 4000 })

    // ── Loguear ambos ejercicios ──
    await page.locator('[data-phase="training"]').click()
    await page.waitForTimeout(500)

    const stepperInc = page.locator('.stepper-inc').first()
    await expect(stepperInc).toBeVisible()
    await stepperInc.click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: /Registrar ·/ }).click()
    await page.waitForTimeout(600)

    // Si aparece el botón Iniciar (prompt de descanso), ignorarlo: Siguiente navega igual.
    await page.getByRole('button', { name: 'Siguiente' }).first().click()
    await page.waitForTimeout(400)

    await page.locator('.stepper-inc').first().click()
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: /Registrar ·/ }).click()
    await page.waitForTimeout(600)

    // Cerrar sheet → la rama de completado dispara el overlay Estira bb
    await page.getByRole('button', { name: 'Cerrar' }).first().click()

    const stretchToast = page.locator('[data-component="CenterToast"]', { hasText: 'Estira bb' })
    await expect(stretchToast).toBeVisible({ timeout: 3000 })
    await expect(stretchToast).toContainText(/seg|min/)
    await expect(stretchToast).not.toBeVisible({ timeout: 5000 })

    // ── Stretch → esfuerzo → coach card con Duración ──
    await page.locator('[data-phase="stretch"]').click()
    await page.waitForTimeout(500)
    const stretchHecho = page.getByRole('button', { name: 'Hecho' })
    await expect(stretchHecho).toBeVisible({ timeout: 3000 })
    await stretchHecho.click()
    await page.waitForTimeout(600)

    // Streak se auto-descarta (~2.6s) y abre el selector de esfuerzo
    await expect(page.locator('#streak-overlay')).not.toBeVisible({ timeout: 6000 })
    const effortOverlay = page.locator('#effort-overlay')
    await expect(effortOverlay).toBeVisible({ timeout: 5000 })
    await effortOverlay.locator('[data-effort="Justo"]').click()

    const coachCard = page.locator('#coach-card-regen')
    await expect(coachCard).toBeVisible({ timeout: 10000 })
    await expect(coachCard).toContainText('Duración')
    // Solo Duración usa formato m:ss en la card
    expect(await coachCard.locator('text=/\\d{1,3}:\\d{2}/').count()).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Correrlo y verificar FAIL esperado**

Run: `lsof -ti:8080 | xargs kill -9 2>/dev/null; npx playwright test -g "timer de sesión"` (timeout 300000ms)
Expected: FAIL — `[data-component="CenterToast"]` no existe todavía.

---

### Task 2: Componente `CenterToast.svelte`

**Files:**
- Create: `src/lib/components/CenterToast.svelte`

- [ ] **Step 1: Crear el componente**

```svelte
<script lang="ts">
  let {
    imageSrc = '',
    iconSvg = '',
    message,
    subtext = '',
    timeLabel = '',
    accent = 'var(--accent)',
    duration = 3000,
    onclose = () => {}
  }: {
    imageSrc?: string
    iconSvg?: string
    message: string
    subtext?: string
    timeLabel?: string
    accent?: string
    duration?: number
    onclose?: () => void
  } = $props()

  let closing = $state(false)

  $effect(() => {
    const t = setTimeout(() => { closing = true }, duration)
    return () => clearTimeout(t)
  })

  $effect(() => {
    if (!closing) return
    const t = setTimeout(() => onclose(), 350)
    return () => clearTimeout(t)
  })
</script>

<div class="center-toast-overlay" class:closing data-component="CenterToast">
  <div class="center-toast-body" style="color:{accent}">
    {#if imageSrc}
      <img src={imageSrc} alt="" class="toast-img" />
    {:else if iconSvg}
      <div class="toast-icon">{@html iconSvg}</div>
    {/if}
    <div class="toast-message">{message}</div>
    {#if subtext}<div class="toast-subtext">{subtext}</div>{/if}
    {#if timeLabel}
      <div class="toast-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        {timeLabel}
      </div>
    {/if}
  </div>
</div>

<style>
  .center-toast-overlay {
    position: fixed;
    inset: 0;
    z-index: 90;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: centerToastFadeIn 0.3s ease;
  }

  .center-toast-overlay.closing {
    transition: opacity 0.35s ease;
    opacity: 0;
  }

  .center-toast-body {
    text-align: center;
    animation: centerToastFadeUp 0.4s ease;
    max-width: 86vw;
  }

  .toast-img {
    max-width: 180px;
    max-height: 180px;
    width: auto;
    height: auto;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  .toast-icon {
    display: inline-flex;
  }

  .toast-message {
    margin-top: 20px;
    font-family: var(--font-sans);
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
  }

  .toast-subtext {
    margin-top: 14px;
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: -0.2px;
    line-height: 1.4;
  }

  .toast-time {
    margin-top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }

  @keyframes centerToastFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes centerToastFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
</style>
```

- [ ] **Step 2: Alinear z-index con StreakOverlay**

Leer `src/lib/components/StreakOverlay.svelte` y usar en `.center-toast-overlay` el MISMO valor numérico de `z-index` que ese overlay (reemplazar el `90` si difiere). No modificar StreakOverlay.

---

### Task 3: Cablear página Hoy (`src/routes/today/+page.svelte`) + tipos

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/routes/today/+page.svelte`

- [ ] **Step 1: Tipos** — localizar el tipo de `sessionState` dentro de `Settings` en `src/lib/types.ts` y extenderlo con campos opcionales `startedAt?: number | null` y `endedAt?: number | null` (si está declarado como interfaz/nombre propio, tocar ahí; si es literal inline, editar el literal).

- [ ] **Step 2: Imports y constantes** — añadir a los imports existentes:

```ts
import { base } from '$app/paths'
import CenterToast from '$lib/components/CenterToast.svelte'
```

Y cerca de las constantes de fecha (`DAYS_LONG`, etc.):

```ts
// Port literal del TOAST_SVG_WATCH del legacy (components/ui.js pre-migración)
const WATCH_SVG = `<svg width="72" height="72" viewBox="0 0 72 72" fill="none"><rect x="14" y="6" width="44" height="60" rx="13" stroke="currentColor" stroke-width="2.5" fill="none"/><rect x="20" y="16" width="32" height="30" rx="6" fill="currentColor" fill-opacity="0.06"/><circle cx="36" cy="30" r="5" fill="currentColor" fill-opacity="0.2"/><path d="M30 28h12v2H30z" fill="currentColor"/><path d="M30 32h8v2H30z" fill="currentColor" fill-opacity="0.5"/><circle cx="36" cy="54" r="3" fill="currentColor" fill-opacity="0.15"/><rect x="28" y="3" width="16" height="4" rx="2" fill="currentColor" fill-opacity="0.12"/></svg>`

type CenterToastData = {
  imageSrc?: string
  iconSvg?: string
  message: string
  subtext?: string
  timeLabel?: string
  duration: number
}
```

- [ ] **Step 3: Estado y helpers** — junto a `let endedAt = $state<number | null>(null)`:

```ts
let centerToast = $state<CenterToastData | null>(null)
```

Y después de `persistPhase()` (o zona de helpers):

```ts
  function startSessionTimer() {
    if (!startedAt) {
      startedAt = Date.now()
      persistPhase()
    }
  }

  function formatElapsed(startMs: number, endMs: number): string {
    const sec = Math.max(0, Math.floor((endMs - startMs) / 1000))
    const mm = Math.floor(sec / 60)
    const ss = sec % 60
    return mm > 0 ? `${mm} min ${ss} seg` : `${ss} seg`
  }
```

- [ ] **Step 4: Arranque del timer** —

  a) PhaseCard Calentamiento: `onclick={() => showWarmup = true}` → `onclick={() => { startSessionTimer(); showWarmup = true }}`

  b) En `openTrainingDetail()` y `openExerciseDetailAt(idx)`, después de los dos guards `return` iniciales, primera línea ejecutable: `startSessionTimer()`

- [ ] **Step 5: Fin del timer** —

  a) `onStretchComplete()`: antes de `persistPhase()` añadir `if (!endedAt) endedAt = Date.now()`

  b) Rama sin stretch de `loadTodayLogs()` — reemplazar la rama completa por:

```ts
    if (count >= exercisesTotal && exercisesTotal > 0 && !completionToastShown && !stretchDone && !showDetail) {
      completionToastShown = true
      phase = 'stretch'
      stretchDone = false
      if (!hasStretch) {
        if (!endedAt) endedAt = Date.now()
        phase = 'complete'
        showCoach = true
        showEffortAfterStreak()
      } else {
        centerToast = {
          imageSrc: `${base}/images/pedro.png`,
          message: 'Estira bb',
          subtext: 'Ya no tienes 20 añitos',
          timeLabel: startedAt ? formatElapsed(startedAt, Date.now()) : '',
          duration: 3000,
        }
      }
      persistPhase()
    }
```

- [ ] **Step 6: Persistencia** — `persistPhase()` completo queda:

```ts
  function persistPhase() {
    if (!program) return
    let p = 1
    if (warmupDone) p = 2
    if (todayExDone >= exercisesTotal && warmupDone) p = 3
    if (stretchDone) p = 4
    if (showCoach) p = 5
    const sessionState = { date: todayDate, phase: p, todayExDone, startedAt, endedAt }
    Storage.saveSettings({ ...$settings, sessionState })
    settings.update({ sessionState } as any)
  }
```

Y en el bloque de restauración del `onMount` (`if (s.sessionState?.date === todayDate)`), justo tras `todayExDone = exDone`:

```ts
        if ((s.sessionState as any).startedAt) startedAt = (s.sessionState as any).startedAt
        if ((s.sessionState as any).endedAt) endedAt = (s.sessionState as any).endedAt
```

- [ ] **Step 7: Momento watch** — en `onWarmupComplete()` reemplazar:

```ts
    if ($settings.hasWatch) {
      toast.show('Inicia tu Smart Watch')
    }
```

por:

```ts
    if ($settings.hasWatch) {
      centerToast = { iconSvg: WATCH_SVG, message: 'Inicia tu Smart Watch', duration: 2000 }
    }
```

(Si el import de `toast` queda sin otros usos en el archivo, dejarlo — hay otros usos.)

- [ ] **Step 8: Duración hacia el análisis** — en `onEffort()`, sustituir la línea `s.lastCoachAnalysis = { ...result, date: todayDate, effort: coachEffort, weekIdx }` por:

```ts
      s.lastCoachAnalysis = {
        ...result,
        date: todayDate,
        effort: coachEffort,
        weekIdx,
        sessionDurationSec: startedAt ? Math.round(((endedAt ?? Date.now()) - startedAt) / 1000) : undefined,
      }
```

- [ ] **Step 9: resetDay** — añadir `centerToast = null` junto a las demás limpiezas.

- [ ] **Step 10: Template** — junto a los demás overlays (después del `{#if streakModalShow}`):

```svelte
{#if centerToast}
  <CenterToast
    imageSrc={centerToast.imageSrc}
    iconSvg={centerToast.iconSvg}
    message={centerToast.message}
    subtext={centerToast.subtext}
    timeLabel={centerToast.timeLabel}
    duration={centerToast.duration}
    {accent}
    onclose={() => centerToast = null}
  />
{/if}
```

---

### Task 4: Stat "Duración" en `src/lib/components/CoachResultCard.svelte`

- [ ] **Step 1: Helper en el script** (después de los props):

```ts
  function formatDuration(sec?: number): string {
    if (sec == null || sec < 0) return '—'
    return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
  }
```

- [ ] **Step 2: Grid y bloque** — `StatsGrid columns={3}` → `columns={4}`, y añadir cuarto StatBlock tras PRs:

```svelte
    <StatBlock value={formatDuration(analysis?.sessionDurationSec)} label="Duración" {accent} />
```

---

### Task 5: Verificación incremental

- [ ] **Step 1:** Run: `npm run check` → 0 errors
- [ ] **Step 2:** Run: `npx playwright test -g "timer de sesión"` → PASS

Si el paso "Siguiente" tras Registrar no navega (apareció prompt Iniciar bloqueante), seguir el patrón del flujo principal (steps 8 del suite): clickear `Iniciar` cuando sea visible antes de navegar.

---

### Task 6: Suite completa

- [ ] Run: `lsof -ti:8080 | xargs kill -9 2>/dev/null; npx playwright test` → 23 passed (22 previos + nuevo). Si un test previo se rompe, arreglar antes de continuar.

---

### Task 7: Versión + commit + push (política AGENTS.md)

- [ ] **Step 1:** `bash scripts/bump-version.sh` y editar `_VER_DESC` en `src/lib/pwa.ts`, p. ej. `'feat: regresa timer de sesión, Estira bb y momento smart watch'`
- [ ] **Step 2:** Revisar `git status && git diff --stat`; luego:

```bash
git add static/images/pedro.png src/lib/components/CenterToast.svelte src/routes/today/+page.svelte src/lib/components/CoachResultCard.svelte src/lib/types.ts src/lib/pwa.ts tests/big.spec.cjs
git commit -m "feat(vX.YZ): timer de sesión completo + momentos centrados (Estira bb / Smart Watch)"
```

NO commitear `docs/superpowers/`.
- [ ] **Step 3:** `npx playwright test` → PASS
- [ ] **Step 4:** `git push`
