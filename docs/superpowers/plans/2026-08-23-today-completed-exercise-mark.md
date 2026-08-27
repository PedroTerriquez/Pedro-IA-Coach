# Marcar ejercicios completados en Hoy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Marcar visualmente en verde los ejercicios ya completados (log de hoy con peso > 0) dentro de la TrainingCard de la pestaña Hoy, con test E2E en `tests/big.spec.cjs`.

**Architecture:** Flujos de datos existentes sin cambios: la página Hoy calcula `todayExDone` desde `exerciseLogs`; se añade un `Record<exerciseId, true>` (`doneIds`) calculado junto al conteo y se propaga página → `TrainingCard` → `ExerciseRow` como prop `done`. El marcado es puro CSS + badge SVG verde (#34c759) sobre el thumbnail. Sin estado nuevo persistido.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), Playwright E2E (archivo único con guardrail `EXPECTED_STEPS`).

**Spec:** `docs/superpowers/specs/2026-08-23-today-completed-exercise-mark-design.md`

---

### Task 1: Test E2E que falla (TDD)

**Files:**
- Modify: `tests/big.spec.cjs` (añadir bloque al final del archivo)

- [ ] **Step 1: Añadir el nuevo bloque `test.describe` al final de `tests/big.spec.cjs`**

Pegar al final del archivo (después del último `test.describe` existente). Reutiliza los helpers `SEED`, `seedIndexedDB` y `buildDayArray` ya definidos arriba en el mismo archivo:

```js
// ── Hoy: ejercicios completados marcados en verde ──
// Un ejercicio del día cuenta como hecho cuando existe exerciseLog de hoy
// con peso > 0 (misma fuente que todayExDone). La TrainingCard debe marcar
// cada fila con data-done="true|false" y badge verde en las hechas.
test.describe('Hoy — ejercicios completados marcados', () => {
  const SETTINGS = {
    id: 'settings', activeProgramId: 'prog-done', currentWeekIdx: 0, units: 'kg',
    accentColor: '#d4ff3a', hasWatch: false, pushSubscribed: false, pushServerUrl: '',
    sessionState: null, lastCoachAnalysis: null, rescheduleWeekOrder: {}, language: 'es',
  }

  function getTodayStr() {
    return new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)
  }

  test('marks rows of logged exercises as done and persists after reload', async ({ page }) => {
    const today = getTodayStr()
    await page.goto('today')
    await page.waitForTimeout(600)
    await seedIndexedDB(page, {
      exercises: SEED.exercises,
      program: {
        id: 'prog-done',
        name: 'Programa Done',
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
      // Log real de hoy para ex-bench: es la fuente de verdad del marcado.
      exerciseLogs: [{ id: 'log-bench-done', exerciseId: 'ex-bench', date: today, weight: 60, units: 'kg' }],
      // phase 2 = calentamiento hecho → la TrainingCard muestra las rows
      // directamente en el tab Hoy (sin interactuar con overlays).
      settings: { ...SETTINGS, sessionState: { date: today, phase: 2, todayExDone: 1 } },
    })
    await page.waitForTimeout(200)
    await page.reload()
    await page.waitForTimeout(1000)

    const benchRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Press de Banca con Barra' })
    const militaryRow = page.locator('[data-component="ExerciseRow"]', { hasText: 'Press Militar' })

    // Press Banca tiene log de hoy → marcado. Press Militar no → sin marcar.
    await expect(benchRow).toHaveAttribute('data-done', 'true')
    await expect(benchRow).toHaveClass(/row-done/)
    await expect(militaryRow).toHaveAttribute('data-done', 'false')

    // Badge verde solo en el thumbnail de la fila hecha.
    await expect(benchRow.locator('.ex-done-badge')).toBeVisible()
    await expect(militaryRow.locator('.ex-done-badge')).toHaveCount(0)

    // El marcado se recalcula desde IndexedDB en cada carga — sobrevive reload.
    await page.reload()
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-component="ExerciseRow"]', { hasText: 'Press de Banca con Barra' })).toHaveAttribute('data-done', 'true')
  })
})
```

- [ ] **Step 2: Correr solo este escenario y verificar que FALLA**

Run: `npx playwright test -g "ejercicios completados"`
Expected: FAIL — `toHaveAttribute('data-done', 'true')` no se cumple porque `ExerciseRow` aún no renderiza `data-done`.

---

### Task 2: Prop `done` en `ExerciseRow.svelte`

**Files:**
- Modify: `src/lib/components/ExerciseRow.svelte`

- [ ] **Step 1: Añadir el prop `done` a la firma**

En el destructuring de `$props()` (línea 2), añadir `done = false` después de `selected = false` y su tipo después de `selected?: boolean`:

```ts
let { name, muscle, imgUrl, sets, reps, weight, units = 'kg', accent = 'var(--accent)', weightIsTarget = false, selectable = false, selected = false, done = false, onclick, actions }: {
    name: string
    muscle: string
    imgUrl?: string
    sets?: number
    reps?: string
    weight?: number
    units?: string
    accent?: string
    weightIsTarget?: boolean
    selectable?: boolean
    selected?: boolean
    done?: boolean
    onclick?: (e?: MouseEvent) => void
    actions?: import('svelte').Snippet
  } = $props()
```

- [ ] **Step 2: Aplicar clase, atributo y badge en el markup**

Reemplazar el `<button>` y el `.ex-thumb` actuales por:

```svelte
<button class="exercise-row" class:selected class:row-done={done} data-component="ExerciseRow" data-done={done ? 'true' : 'false'} {onclick} type="button">
  <div class="ex-thumb">
    {#if imgUrl}
      <img src={imgUrl} alt="" />
    {:else}
      <div class="ex-placeholder"></div>
    {/if}
    {#if done}
      <div class="ex-done-badge">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
    {/if}
  </div>
```

(el resto del botón — `.ex-info`, `.ex-meta`, `.ex-actions` — queda igual)

- [ ] **Step 3: Añadir los estilos**

Dentro de `<style>`, añadir `position: relative;` a `.ex-thumb` (para posicionar el badge dentro del área recortada por `overflow: hidden`) y las reglas nuevas al final:

```css
.ex-thumb {
    position: relative;
    width: 44px;
    /* ...resto igual... */
}
```

```css
.exercise-row.row-done .ex-thumb {
    box-shadow: inset 0 0 0 1.5px #34c759;
}

.exercise-row.row-done .ex-name {
    opacity: 0.55;
}

.ex-done-badge {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #34c759;
    display: flex;
    align-items: center;
    justify-content: center;
}
```

Nota: se usa `box-shadow: inset` en vez de `border` para no alterar el layout del thumb de 44px. Los demás usos de `ExerciseRow` (Plan, History) no pasan `done` → cero cambio visual.

---

### Task 3: Prop `doneIds` en `TrainingCard.svelte`

**Files:**
- Modify: `src/lib/components/TrainingCard.svelte`

- [ ] **Step 1: Añadir el prop y pasarlo a las filas**

En `$props()`: añadir `doneIds = null` tras `exercisesById = {}` y su tipo tras `exercisesById?: Record<string, any>`:

```ts
  let {
    day,
    accent = 'var(--accent)',
    phaseLabel = 'Fase 02',
    title = 'Entrenamiento',
    todayExDone = 0,
    exercisesTotal = 0,
    exercisesById = {},
    doneIds = null,
    onclick = () => {},
    onExerciseClick = null
  }: {
    day: { name?: string; exercises?: Array<{ exerciseId: string; sets?: number; reps?: string }> }
    accent?: string
    phaseLabel?: string
    title?: string
    todayExDone?: number
    exercisesTotal?: number
    exercisesById?: Record<string, any>
    doneIds?: Record<string, true> | null
    onclick?: () => void
    onExerciseClick?: ((idx: number) => void) | null
  } = $props()
```

Y en el `<ExerciseRow>` del `{#each}` añadir la línea `done`:

```svelte
        <ExerciseRow
          name={getExerciseDisplayName(resolved) || resolved.name}
          muscle={resolved.muscle || ''}
          {imgUrl}
          sets={ex.sets}
          reps={ex.reps}
          {accent}
          done={!!doneIds?.[ex.exerciseId]}
          onclick={onExerciseClick ? (e?: MouseEvent) => { e?.stopPropagation(); onExerciseClick!(i) } : undefined}
        />
```

---

### Task 4: Calcular `doneIds` en `src/routes/today/+page.svelte`

**Files:**
- Modify: `src/routes/today/+page.svelte`

- [ ] **Step 1: Nuevo estado**

Tras la línea `let todayExDone = $state(0)` añadir:

```ts
let doneIds = $state<Record<string, true>>({})
```

- [ ] **Step 2: Poblar `doneIds` en `loadTodayLogs()`**

Reemplazar el inicio de la función (el conteo) por una versión que también construya el mapa — misma condición, cero lógica nueva:

```ts
  async function loadTodayLogs() {
    const logs = await getLogsForDate(todayDate)
    const nextDone: Record<string, true> = {}
    const count = day ? day.exercises.filter(ex => {
      const isDone = logs.some(l => l.exerciseId === ex.exerciseId && l.weight > 0)
      if (isDone) nextDone[ex.exerciseId] = true
      return isDone
    }).length : 0
    doneIds = nextDone
    if (count !== todayExDone) {
      todayExDone = count
      persistPhase()
    }
```

(el resto de la función — `weightInputs`, toast de completado — queda igual)

- [ ] **Step 3: Limpiar en `resetDay()`**

Añadir `doneIds = {}` junto a `todayExDone = 0` dentro de `resetDay()`:

```ts
    todayExDone = 0
    doneIds = {}
```

- [ ] **Step 4: Pasarlo a `<TrainingCard>`**

En el bloque `{:else if warmupDone && todayExDone < exercisesTotal}`:

```svelte
            <TrainingCard
              {day}
              {accent}
              {todayExDone}
              {exercisesTotal}
              {exercisesById}
              {doneIds}
              onclick={openTrainingDetail}
              onExerciseClick={openExerciseDetailAt}
            />
```

---

### Task 5: Verificación completa

- [ ] **Step 1: Type check**

Run: `npm run check`
Expected: sin errores.

- [ ] **Step 2: Test E2E nuevo en verde**

Run: `npx playwright test -g "ejercicios completados"`
Expected: PASS (1 test).

- [ ] **Step 3: Suite completa**

Run: `npx playwright test`
Expected: PASS — el flujo principal (15 pasos del guardrail) intacto; las rows del paso 6 ahora llevan `data-done="false"` pero ninguna aserción previa inspecciona atributos de fila.

---

### Task 6: Versión + commit + push (política AGENTS.md)

- [ ] **Step 1: Bump de versión y descripción**

Run: `bash scripts/bump-version.sh`
Luego editar `_VER_DESC` en `src/lib/pwa.ts`: describir el cambio (~10 palabras), p. ej. `'Marca ejercicios completados en verde en la pestaña Hoy'`.

- [ ] **Step 2: Commit**

Run: `git status && git diff && git log --oneline -3` para revisar; luego:

```bash
git add src/routes/today/+page.svelte src/lib/components/TrainingCard.svelte src/lib/components/ExerciseRow.svelte src/lib/pwa.ts tests/big.spec.cjs
git commit -m "feat(vX.YZ): marca ejercicios completados en verde en Hoy"
```

NO commitear `docs/superpowers/` (prohibido por AGENTS.md).

- [ ] **Step 3: Suite completa post-commit**

Run: `npx playwright test`
Expected: PASS. Si falla, arreglar antes de pushear.

- [ ] **Step 4: Push**

Run: `git push`
