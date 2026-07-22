# Design: IA-Powered Program Generation from Scratch

## Problem

The current AI import feature (`/api/ai/import`) only works when the user pastes an existing routine text. The system prompt explicitly rejects non-routine input ("create a program from scratch" → error). Users want to generate a complete training program from their profile data without having to write a routine first.

## Solution

Reorganize the Programas tab with sub-tabs and add a "Generate from scratch" feature that uses the user's profile data + optional quick overrides to create a complete multi-week program via AI.

## UI Changes

### Programas Tab Reorganization

**Current:** Flat layout — Create form → Program cards → Coach IA card.

**New:** Two sub-tabs via `SegmentedControl`:

| Sub-tab | Content |
|---|---|
| **Manual** | `ProgramCreateForm` + program list cards (unchanged) |
| **IA Powered** | Import textarea (moved from Datos) + Generate from scratch section + Coach IA card |

Datos tab keeps: Import (JSON), Export, Maintenance. The "Importar con IA" section moves out of Datos into IA Powered.

### Generate From Scratch Section

Located in the IA Powered sub-tab, below the existing import textarea.

```
┌─────────────────────────────────────┐
│ Generar programa desde cero         │
│ La IA crea un programa completo     │
│ basado en tu perfil y preferencias. │
│                                     │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│ │ 3d  │ │ 4d  │ │ 5d  │ │ 6d  │   │  ← Days/week chips
│ └─────┘ └─────┘ └─────┘ └─────┘   │
│                                     │
│ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│ │ Gimnasio │ │Mancuernas│ │Calis.│ │  ← Equipment chips
│ └──────────┘ └──────────┘ └──────┘ │
│                                     │
│ ┌─────────┐ ┌──────────┐ ┌───────┐ │
│ │Upper B. │ │Lower B.  │ │Full B.│ │  ← Focus chips
│ └─────────┘ └──────────┘ └───────┘ │
│                                     │
│ [ Generar programa con IA ]         │
│ ⏳ Generando...                     │
└─────────────────────────────────────┘
```

**Behavior:**
- Chips are single-select per group (tap to toggle, one active at a time)
- All overrides are optional — if nothing selected, AI uses profile defaults
- Button calls `generateProgramWithAI(overrides)` → POST to Worker
- On success: program saved + auto-activated, toast shows, switch to Manual tab to see it
- Same `IMPORT_SCHEMA` response format (program_name, weeks, days, exercises)

## Backend Changes

### New endpoint: `POST /api/ai/generate-program`

Request body:
```json
{
  "userProfile": {
    "age": "28",
    "sex": "Masculino",
    "body_weight": "80kg",
    "height_cm": "175",
    "goal": "hipertrofia",
    "experience": "intermedio",
    "occupation": "Ingeniero",
    "units": "kg"
  },
  "overrides": {
    "daysPerWeek": 4,
    "equipment": "gym",
    "focus": "upper"
  },
  "systemPrompt": "...",
  "language": "es"
}
```

Response: Same `IMPORT_SCHEMA` format (program_name, weeks, days, exercises).

### New prompt: `FORMAT_GENERATE` in `prompts.ts`

The system prompt instructs the AI to:
1. Generate a complete multi-week program based on the user's profile
2. Apply overrides when provided:
   - `daysPerWeek` → determines split (3d=Full Body, 4d=Upper/Lower, 5d=PPL/Arnold, 6d=PPL×2)
   - `equipment` → limits exercise selection (gym=all, mancuernas=dumbbells only, calis=bodyweight)
   - `focus` → prioritizes muscle groups (upper/lower/full)
3. Use the exercise dictionary to pick real exercises; new exercises follow naming conventions
4. Respect experience level:
   - Principiante → 2-3 exercises/day, compound focus, 3 sets
   - Intermedio → 3-4 exercises/day, mix compound/isolation, 3-4 sets
   - Avanzado → 4-5 exercises/day, advanced variations, 4-5 sets
5. Respect goal:
   - Hipertrofia → 8-12 reps, 90s rest
   - Fuerza → 3-5 reps, 180s rest
   - Pérdida de grasa → circuits, 45s rest
   - Recomposición → mixed approach
6. Generate 4 weeks minimum (can be extended based on complexity)
7. Return the same JSON schema as the import endpoint

### Exercise handling

Non-dictionary exercises are handled by the existing `findOrCreateExerciseByName` flow — the AI returns exercise_name + muscle, and the client creates new Exercise entries in IndexedDB if no match is found. No changes needed here.

## Files Changed

| File | Change |
|---|---|
| `src/routes/you/+page.svelte` | Reorganize Programas tab with sub-tabs (Manual / IA Powered); move import textarea + Coach IA into IA Powered; add Generate section with chips |
| `src/lib/ai.ts` | Add `generateProgramWithAI(overrides)` function |
| `src/lib/brain/prompts.ts` | Add `FORMAT_GENERATE` prompt + `buildGeneratePrompt()` |
| `push-worker/src/index.js` | Add `POST /api/ai/generate-program` endpoint |
| `src/lib/components/DataImportSection.svelte` | May be reused or inlined in IA Powered tab |

## Data Flow

```
User taps "Generar programa con IA"
  │
  ├── 1. Read profile from Settings (age, sex, weight, height, goal, experience, occupation)
  │
  ├── 2. Read chip overrides (daysPerWeek, equipment, focus)
  │
  ├── 3. POST /api/ai/generate-program { userProfile, overrides, systemPrompt, language }
  │         │
  │         ├── Worker calls Gemini with FORMAT_GENERATE prompt + profile + overrides
  │         │
  │         └── Returns IMPORT_SCHEMA JSON (program_name, weeks, days, exercises)
  │
  ├── 4. Client iterates exercises: findOrCreateExerciseByName(name, muscle)
  │
  ├── 5. Build Program object → Storage.saveProgram() + auto-activate
  │
  └── 6. Toast + switch to Manual tab to show the new program
```

## Non-goals

- No changes to the exercise dictionary
- No changes to IndexedDB schema
- No changes to existing import flow (it stays in IA Powered tab, unchanged)
- No changes to Coach IA or Exercise Coach flows
