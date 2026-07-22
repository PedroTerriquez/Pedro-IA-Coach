# IA-Powered Program Generation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Generate from scratch" feature that creates a complete training program from the user's profile data + optional quick overrides (days/week, equipment, focus), and reorganize the Programas tab with Manual / IA Powered sub-tabs.

**Architecture:** New Worker endpoint `/api/ai/generate-program` receives user profile + overrides, calls Gemini with a generation-specific prompt, returns the same IMPORT_SCHEMA format. Client adds `generateProgramWithAI()` function, reorganizes the Programas tab with `SegmentedControl`, and adds chip-based override UI.

**Tech Stack:** SvelteKit, TypeScript, Cloudflare Workers, Gemini 2.5 Pro, IndexedDB

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/brain/prompts.ts` | Modify | Add `FORMAT_GENERATE` + `buildGeneratePrompt()` |
| `push-worker/src/index.js` | Modify | Add `POST /api/ai/generate-program` endpoint |
| `src/lib/ai.ts` | Modify | Add `generateProgramWithAI(overrides)` |
| `src/routes/you/+page.svelte` | Modify | Reorganize Programas tab, add Generate section |

---

### Task 1: Add `FORMAT_GENERATE` prompt + `buildGeneratePrompt()`

**Files:**
- Modify: `src/lib/brain/prompts.ts`

- [ ] **Step 1: Add `FORMAT_GENERATE` constant after `FORMAT_IMPORT`**

Open `src/lib/brain/prompts.ts`. After the `FORMAT_IMPORT` constant (line ~58), add:

```typescript
export const FORMAT_GENERATE = `Genera un programa de entrenamiento completo basado en el perfil del usuario y sus preferencias. SOLO JSON, sin markdown, sin explicaciones.

─ PERFIL DEL USUARIO ─
Usa estos datos para personalizar el programa:
- Edad, sexo, peso corporal, estatura
- Objetivo (hipertrofia, fuerza, pérdida de grasa, recomposición, rendimiento)
- Experiencia (principiante, intermedio, avanzado)
- Ocupación (para estimar nivel de actividad diaria y recuperación)

─ PREFERENSIAS (si se proporcionan) ─
- daysPerWeek: número de días por semana → determina el split:
  • 3 días: Full Body (A/B alternado)
  • 4 días: Upper/Lower
  • 5 días: Push/Pull/Legs + Upper + Lower (o Arnold split)
  • 6 días: Push/Pull/Legs × 2
- equipment: "gimnasio" (todas las máquinas/barra/mancuernas), "mancuernas" (solo dumbbells + banco), "calistenia" (peso corporal)
- focus: "upper" (priorizar torso), "lower" (priorizar piernas), "full" (cuerpo completo equilibrado)

─ REGLAS POR NIVEL DE EXPERIENCIA ─
- Principiante: 2-3 ejercicios/día, enfoque en compuestos, 3 series, 60-90s descanso
- Intermedio: 3-4 ejercicios/día, mezcla compuestos/aislamientos, 3-4 series, 60-120s descanso
- Avanzado: 4-5 ejercicios/día, variaciones avanzadas, 4-5 series, 90-180s descanso

─ REGLAS POR OBJETIVO ─
- Hipertrofia: 8-12 reps, 90s descanso, volumen moderado-alto
- Fuerza: 3-5 reps, 180s descanso, intensidad alta
- Pérdida de grasa: 10-15 reps, 45-60s descanso, circuitos posibles
- Recomposición: mixto (compuestos pesados + accessorios con volumen)
- Rendimiento: variación de rep ranges, énfasis en patrones de movimiento

─ ESTRUCTURA ─
Genera 4 semanas. Cada semana puede tener tag: "VOLUMEN", "FUERZA", o "".
Usa nombres de ejercicios del DICCIONARIO cuando sea posible. Si no existe, sigue la convención: "Nombre Común (Especificidad)".

─ FORMATO DE SALIDA (JSON) ─
{
  "program_name": string (descriptivo, ej: "Upper/Lower — Hipertrofia Intermedia"),
  "weeks": [{
    "name": string (ej: "Semana 1"),
    "tag": "VOLUMEN" | "FUERZA" | "",
    "days": [{
      "name": string (ej: "Upper A"),
      "subtitle": string (músculos del día),
      "duration_min": number (estimado),
      "exercises": [{
        "exercise_name": string,
        "muscle": string (grupo muscular principal),
        "sets": number,
        "reps": string (rango "8-12" o número "10"),
        "rest_sec": number
      }]
    }]
  }]
}`
```

- [ ] **Step 2: Add `buildGeneratePrompt()` function**

After the `buildProgramCoachPrompt` function (line ~151), add:

```typescript
const _generatePromptCache = new Map<PromptLanguage, string>()

export function buildGeneratePrompt(language: PromptLanguage = 'es'): string {
  if (!_generatePromptCache.has(language)) {
    _generatePromptCache.set(language, `${buildAIRole(language)}\n\n${FORMAT_GENERATE}`)
  }
  return _generatePromptCache.get(language)!
}
```

- [ ] **Step 3: Verify no syntax errors**

Run: `npx tsc --noEmit` from project root.
Expected: No errors (or only pre-existing ones unrelated to this change).

- [ ] **Step 4: Commit**

```bash
git add src/lib/brain/prompts.ts
git commit -m "feat: add FORMAT_GENERATE prompt for program generation from scratch"
```

---

### Task 2: Add `POST /api/ai/generate-program` Worker endpoint

**Files:**
- Modify: `push-worker/src/index.js`

- [ ] **Step 1: Add the generate-program endpoint**

Open `push-worker/src/index.js`. Add the following block after the `/api/ai/import` endpoint (after line ~340, before `/api/ai/program-coach`):

```javascript
if (url.pathname === '/api/ai/generate-program') {
  try {
    const { userProfile, overrides, systemPrompt, language } = await req.json()

    const overrideBlock = overrides
      ? '\n\nPREFERENSIAS DEL USUARIO:\n' + JSON.stringify(overrides)
      : ''
    const profileBlock = userProfile
      ? '\n\nPERFIL DEL USUARIO:\n' + JSON.stringify(userProfile)
      : ''
    const fullPrompt = 'Genera un programa de entrenamiento completo para este usuario.' + profileBlock + overrideBlock

    const { text, provider } = await callAI([
      { role: 'system', content: systemPrompt || '' },
      { role: 'user', content: fullPrompt },
    ], env, { model: 'gemini-2.5-pro', responseFormat: 'json', responseSchema: IMPORT_SCHEMA, safetySettings: GEMINI_SAFETY })

    const parsed = parseAIResponse(text)
    if (!parsed) return respond({ error: 'La IA no generó JSON válido. Intenta de nuevo.', raw: text, _provider: provider }, 502)

    return respond({ ...parsed, _provider: provider })
  } catch (err) {
    return respond({ error: 'Error de IA: ' + err.message }, 500)
  }
}
```

- [ ] **Step 2: Verify Worker compiles**

Run: `cd push-worker && npx wrangler deploy --dry-run 2>&1 | head -20`
Expected: No syntax errors in the output.

- [ ] **Step 3: Commit**

```bash
git add push-worker/src/index.js
git commit -m "feat: add /api/ai/generate-program Worker endpoint"
```

---

### Task 3: Add `generateProgramWithAI()` to `ai.ts`

**Files:**
- Modify: `src/lib/ai.ts`

- [ ] **Step 1: Add the `ProgramOverrides` type and `generateProgramWithAI` function**

Open `src/lib/ai.ts`. After the `importWithAI` function (after line ~105), add:

```typescript
export interface ProgramOverrides {
  daysPerWeek?: number
  equipment?: string
  focus?: string
}

export async function generateProgramWithAI(overrides: ProgramOverrides = {}): Promise<void> {
  const settings = await Storage.getSettings()
  const language = resolveLanguage(settings)
  const userProfile = buildUserProfile(settings)

  const res = await fetch(`${PUSH_SERVER_URL}/api/ai/generate-program`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userProfile,
      overrides,
      language,
      systemPrompt: buildGeneratePrompt(language),
    })
  })

  if (!res.ok) throw new Error(`AI generation failed: ${res.status}`)

  const data = await res.json()
  if (!data.weeks || data.weeks.length === 0) {
    throw new Error('La IA no pudo generar un programa válido')
  }

  const programName = data.program_name || 'Generado con IA'

  const weeks: Program['weeks'] = []
  for (const w of data.weeks) {
    const days: Program['weeks'][0]['days'] = []
    for (const d of (w.days || [])) {
      const exercises: Program['weeks'][0]['days'][0]['exercises'] = []
      for (const ex of (d.exercises || [])) {
        const exercise = await Storage.findOrCreateExerciseByName(ex.exercise_name || ex.name, ex.muscle || '', { noFuzzy: true })
        exercises.push({
          exerciseId: exercise.id,
          sets: ex.sets || 3,
          reps: String(ex.reps || '10'),
          rest: ex.rest_sec || ex.rest || 90,
        })
      }
      days.push({
        name: d.name || 'Día',
        subtitle: d.subtitle || '',
        duration: d.duration_min || d.duration || 60,
        exercises,
      })
    }
    weeks.push({
      name: w.name || 'Semana 1',
      subtitle: w.subtitle || '',
      tag: w.tag || '',
      days,
    })
  }

  const program: Program = {
    id: await generateId(),
    name: programName,
    weeks
  }

  await Storage.saveProgram(program)

  const s = await Storage.getSettings()
  s.activeProgramId = program.id
  s.currentWeekIdx = 0
  await Storage.saveSettings(s)
}
```

- [ ] **Step 2: Add the import for `buildGeneratePrompt`**

At the top of `src/lib/ai.ts`, update the import from `prompts.ts` (line 7):

Change:
```typescript
import { buildImportPrompt, buildProgramCoachPrompt, type PromptLanguage } from '$lib/brain/prompts'
```

To:
```typescript
import { buildImportPrompt, buildProgramCoachPrompt, buildGeneratePrompt, type PromptLanguage } from '$lib/brain/prompts'
```

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit` from project root.
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai.ts
git commit -m "feat: add generateProgramWithAI function"
```

---

### Task 4: Reorganize Programas tab with sub-tabs + add Generate section

**Files:**
- Modify: `src/routes/you/+page.svelte`

This is the largest task. It reorganizes the Programas tab and adds the Generate from scratch UI.

- [ ] **Step 1: Add new state variables**

In the `<script>` block of `you.js`, add these state variables near the other program-related state (around line 62-68):

```typescript
// Program sub-tab state
let programSubTab = $state<'manual' | 'ia'>('manual')

// Generate from scratch state
let generateDaysPerWeek = $state<number | null>(null)
let generateEquipment = $state<string | null>(null)
let generateFocus = $state<string | null>(null)
let generatingProgram = $state(false)
let generateStatus = $state('')
```

- [ ] **Step 2: Add the `submitGenerate` function**

After the `submitCoach` function (around line 315), add:

```typescript
async function submitGenerate() {
  generatingProgram = true
  generateStatus = '⏳ Generando programa…'
  try {
    const overrides: Record<string, any> = {}
    if (generateDaysPerWeek) overrides.daysPerWeek = generateDaysPerWeek
    if (generateEquipment) overrides.equipment = generateEquipment
    if (generateFocus) overrides.focus = generateFocus

    const settings = await Storage.getSettings()
    const language = settings.language === 'en' ? 'en' : 'es'
    const res = await fetch(`${PUSH_SERVER_URL}/api/ai/generate-program`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userProfile: buildUserProfile(settings),
        overrides,
        language,
        systemPrompt: buildGeneratePrompt(language),
      })
    })
    const data = await res.json()
    if (!data.weeks || data.weeks.length === 0) throw new Error('La IA no pudo generar un programa válido')
    for (const week of data.weeks) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          const resolved = await Storage.findOrCreateExerciseByName(
            ex.name || ex.exerciseId, ex.muscle || '', { noFuzzy: true }
          )
          ex.exerciseId = resolved.id
        }
      }
    }
    const program: Program = {
      id: await generateId(),
      name: data.program_name || 'Generado con IA',
      weeks: data.weeks
    }
    await Storage.saveProgram(program)
    await settings.update({ activeProgramId: program.id })
    generateStatus = `✅ "${program.name}" generado con ${program.weeks.length} semana(s)`
    programSubTab = 'manual'
    refresh()
  } catch (err: any) {
    generateStatus = `❌ ${err.message}`
  } finally {
    generatingProgram = false
  }
}
```

- [ ] **Step 3: Add imports for new dependencies**

Update the imports at the top of the script block. Add `buildGeneratePrompt` to the prompts import (line 3):

Change:
```typescript
import { buildImportPrompt, buildProgramCoachPrompt } from '$lib/brain/prompts'
```

To:
```typescript
import { buildImportPrompt, buildProgramCoachPrompt, buildGeneratePrompt } from '$lib/brain/prompts'
```

Also add `PUSH_SERVER_URL` import if not already present (check line 4):
```typescript
import { PUSH_SERVER_URL } from '$lib/config'
```

And add `buildUserProfile` if not already imported (check line 4):
```typescript
import { buildUserProfile } from '$lib/ai'
```

- [ ] **Step 4: Replace the Programas tab content**

Find the `{:else if activeTab === 'programas'}` block (around line 612). Replace the entire content inside this block with:

```svelte
{:else if activeTab === 'programas'}
  <div class="section-pad">
    <SegmentedControl
      options={[
        { label: 'Manual', value: 'manual' },
        { label: 'IA Powered', value: 'ia' }
      ]}
      bind:value={programSubTab}
    />
  </div>

  {#if programSubTab === 'manual'}
    <div class="section-pad-sm">
      <ProgramCreateForm
        bind:value={newProgramName}
        oncreate={createNewProgram}
      />
    </div>

    {#if programs.length === 0}
      <EmptyState message="No hay programas todavía. Crea o importa uno." />
    {:else}
      <div class="program-list">
        {#each programs as p (p.id)}
          <ProgramCard
            program={p}
            isActive={$settings.activeProgramId === p.id}
            {accent}
            totalExercises={getTotalExercises(p)}
            onactivate={activateProgram}
            onduplicate={duplicateProgram}
            ondelete={deleteProgram}
          />
        {/each}
      </div>
    {/if}

  {:else if programSubTab === 'ia'}
    <div class="section-label-wrap"><SectionLabel {accent}>Importar con IA</SectionLabel></div>
    <div class="card section-card">
      <div class="card-content">
        <div class="card-title">Pega tu rutina en texto</div>
        <div class="card-subtitle">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
        <div class="ai-textarea-wrap">
          <TextArea value={aiInput} rows={8} placeholder="Ejemplo:&#10;Lunes - Pecho y Triceps&#10;Press banca 4x8-10&#10;Press inclinado 3x10&#10;Aperturas 3x12&#10;Fondos 3x10&#10;Patada triceps 3x12" oninput={(val) => aiInput = val} />
        </div>
        <div id="ai-status" class="status-text">{aiStatus}</div>
      </div>
      <Button variant="primary" {accent} fullWidth onclick={submitAIImport} disabled={importingAI}>{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</Button>
    </div>

    <div class="section-label-wrap"><SectionLabel {accent}>Generar desde cero</SectionLabel></div>
    <div class="card section-card">
      <div class="card-content">
        <div class="card-title">Generar programa desde cero</div>
        <div class="card-subtitle">La IA crea un programa completo basado en tu perfil y preferencias.</div>

        <div class="chip-group">
          <div class="chip-group-label">Días por semana</div>
          <div class="chip-row">
            {#each [3, 4, 5, 6] as d}
              <button class="chip-btn" class:chip-active={generateDaysPerWeek === d} onclick={() => generateDaysPerWeek = generateDaysPerWeek === d ? null : d}>{d}d</button>
            {/each}
          </div>
        </div>

        <div class="chip-group">
          <div class="chip-group-label">Equipo</div>
          <div class="chip-row">
            {#each [{ v: 'gym', l: 'Gimnasio' }, { v: 'mancuernas', l: 'Mancuernas' }, { v: 'calistenia', l: 'Calistenia' }] as e}
              <button class="chip-btn" class:chip-active={generateEquipment === e.v} onclick={() => generateEquipment = generateEquipment === e.v ? null : e.v}>{e.l}</button>
            {/each}
          </div>
        </div>

        <div class="chip-group">
          <div class="chip-group-label">Enfoque</div>
          <div class="chip-row">
            {#each [{ v: 'upper', l: 'Upper Body' }, { v: 'lower', l: 'Lower Body' }, { v: 'full', l: 'Full Body' }] as f}
              <button class="chip-btn" class:chip-active={generateFocus === f.v} onclick={() => generateFocus = generateFocus === f.v ? null : f.v}>{f.l}</button>
            {/each}
          </div>
        </div>

        <div class="status-text">{generateStatus}</div>
      </div>
      <Button variant="primary" {accent} fullWidth onclick={submitGenerate} disabled={generatingProgram}>{generatingProgram ? '⏳ Generando…' : 'Generar programa con IA'}</Button>
    </div>

    <CoachIACard
      {accent}
      {coachInput}
      {coachStatus}
      {coachResponseVisible}
      {coachResponseText}
      {coachProvider}
      oninput={(val) => coachInput = val}
      onsubmit={submitCoach}
    />
  {/if}
```

- [ ] **Step 5: Remove the Importar con IA section from the Datos tab**

Find the Datos tab block (`{:else if activeTab === 'datos'}`). Remove the "Importar con IA" section (the `SectionLabel` + card with the textarea and button). Keep only: Importar (JSON), Exportar, and Mantenimiento sections.

Specifically, remove these lines from the datos tab:

```svelte
<div class="section-label-wrap"><SectionLabel {accent}>Importar con IA</SectionLabel></div>
<div class="card section-card">
  <div class="card-content">
    <div class="card-title">Pega tu rutina en texto</div>
    <div class="card-subtitle">Describe tu rutina como se la dirías a un entrenador. La IA creará el programa y los ejercicios automáticamente.</div>
    <div class="ai-textarea-wrap">
      <TextArea value={aiInput} rows={8} placeholder="Ejemplo:..." oninput={(val) => aiInput = val} />
    </div>
    <div id="ai-status" class="status-text">{aiStatus}</div>
  </div>
  <Button variant="primary" {accent} fullWidth onclick={submitAIImport} disabled={importingAI}>{importingAI ? '⏳ Procesando…' : 'Importar con IA'}</Button>
</div>
```

- [ ] **Step 6: Add chip styles**

Add these CSS rules inside the `<style>` block:

```css
.chip-group { margin-top: 14px; }
.chip-group-label { font-size: 11px; color: rgba(255,255,255,0.5); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; font-weight: 500; }
.chip-row { display: flex; gap: 6px; flex-wrap: wrap; }
.chip-btn {
  padding: 6px 14px;
  border-radius: 9999px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  color: rgba(255,255,255,0.6);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.chip-btn.chip-active {
  background: var(--accent);
  color: #0a0a0a;
  border-color: var(--accent);
  font-weight: 600;
}
```

- [ ] **Step 7: Verify no build errors**

Run: `npm run check` from project root.
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add src/routes/you/+page.svelte
git commit -m "feat: reorganize Programas tab with Manual/IA Powered sub-tabs and add Generate from scratch"
```

---

### Task 5: Deploy Worker + version bump

**Files:**
- Modify: `push-worker/src/index.js` (already changed in Task 2)
- Modify: `src/lib/ai.ts` (already changed in Task 3)

- [ ] **Step 1: Deploy the Worker**

Run: `cd push-worker && npm install && npx wrangler deploy`
Expected: Worker deployed successfully, output includes the worker URL.

- [ ] **Step 2: Bump version**

Run: `bash scripts/bump-version.sh` (if available) or manually update:
- `APP_VERSION` in `src/lib/ai.ts` or the relevant config file
- `CACHE` in `src/service-worker.js`

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "chore: deploy worker and bump version for IA generate program feature"
```

- [ ] **Step 4: Push**

```bash
git push
```
