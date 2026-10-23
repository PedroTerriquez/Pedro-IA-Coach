# AI Features

All prompts live in `src/lib/brain/prompts.ts` (always Spanish, persona `buildAIRole`: "Act as an Elite Personal Trainer…") and clients call `src/lib/ai.ts`. The Worker (`push-worker/src/index.js`) uses Gemini 2.5 Flash with a `responseSchema` (`IMPORT_SCHEMA` / `PROGRAM_COACH_SCHEMA`) and falls back to `@cf/meta/llama-3.1-8b-instruct-fast` on Workers AI. The client sends its own `systemPrompt` + `messages`.

## Endpoints
| Endpoint | Client function | Purpose |
|---|---|---|
| `POST /api/ai/import` | `importWithAI(text)` | Paste plain-text routine → creates exercises + program |
| `POST /api/ai/program-chat` | `generateProgramChat`, `pasteRoutineChat`, `programCoachChat` | Plain-text chat before creating / changing a program |
| `POST /api/ai/generate-program` | `generateProgramWithAI`, `createProgramFromPaste`, review pass | Agreed conversation → program JSON |
| `POST /api/ai/program-coach` | `programCoach(program, thread, opts)` | Agreed changes → new version of the program |
| `POST /api/ai/exercise-coach` | `exerciseCoachChat(name, muscle, alts, messages)` | Per-exercise multi-turn chat (coach FAB) |

## Two passes: draft + review
«Platícalo con el coach» (create) and «Mejorar con el coach» (new version) write the program in two calls:
1. **Draft** — `generate-program` / `program-coach` with the conversation.
2. **Review** — `reviewProgram()` posts the draft to `generate-program` with `buildReviewPrompt` (same persona + `FORMAT_REVIEW`) and the same conversation. The reviewer removes redundant same-muscle / same-pattern work in a day, excess per-session volume and heavy overlap on consecutive days, without undoing what was agreed. If the review fails or returns no weeks, the draft is saved (fail-soft).

«Pega tu rutina» and «Importar con IA» are not reviewed: they copy the user's routine.

## Import with AI Flow
1. User pastes routine in You → Datos → "Importar con IA"
2. `importWithAI(text)` bundles `{ text, systemPrompt, dictionary: buildAIDictionary() }` → POST to Worker
3. Worker returns structured JSON (program/week/day/exercise data)
4. Client iterates: `Storage.findOrCreateExerciseByName(name, muscle)` (uses dictionary, auto-fills image/gif/tips)
5. Builds program with `exerciseId` refs → `Storage.saveProgram()` → auto-activate → toast

## Exercise Coach (FAB)
Floating "Coach IA" button in ExerciseDetail opens a multi-turn chat overlay.
- Quick chips: Mejorar técnica, Me duele algo, ¿Voy muy pesado?, Variante fácil
- "Me duele algo" shows a body-part picker based on muscle group
- Sends exercise name/muscle/alternatives, the user profile and the message history

## Dictionary for AI
- `buildAIDictionary()` — full dictionary for import/generate/review
- `buildFilteredDictionary()` — lightweight subsets for Worker (exercise-coach, program-coach)
