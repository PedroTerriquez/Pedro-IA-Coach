# AI Features (Cloudflare Workers AI)

All prompts live in `src/lib/brain/prompts.ts` (always Spanish) and clients call `src/lib/ai.ts`. The Worker (`push-worker/src/index.js`) runs `@cf/meta/llama-3.1-8b-instruct-fast` on Workers AI (free tier, 10k neurons/day).

## Endpoints
| Endpoint | Client function | Purpose |
|---|---|---|
| `POST /api/ai/import` | `importWithAI(text)` | Paste plain-text routine → creates exercises + program |
| `POST /api/ai/generate` | `generateProgramWithAI(prompt, profile)` | Generate full program from free text + user profile |
| `POST /api/ai/program-coach` | `programCoach(text, program, settings)` | Ask/modify active program; returns JSON program or text reply |
| `POST /api/ai/exercise-coach` | `exerciseCoachChat(name, muscle, alts, messages)` | Per-exercise multi-turn chat (coach FAB) |

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
- Sends only exercise name/muscle/alternatives + message history — **NO user profile data**

## Dictionary for AI
- `buildAIDictionary()` — full dictionary for import/generate
- `buildFilteredDictionary()` — lightweight subsets for Worker (exercise-coach, program-coach)