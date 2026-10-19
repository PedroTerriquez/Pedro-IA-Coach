# Data Flow

1. **App start**: Svelte store `settings` loads from IndexedDB via `init()`; if data lost → `restoreFromBackup()` (localStorage mirror)
2. **User actions**: Call `Storage.*` methods → IndexedDB → `backupAll()` (localStorage mirror) → stores update → Svelte re-renders
3. **Reactive stores** (`settings`, `ui`) drive re-renders — no manual `refresh()` needed
4. **Weight logging**: ExerciseDetail → `onLog()` → `Storage.logWeight()` → one log per exercise per day (Registrar overwrites it, without `sets`); Hoy counts it done when `sets` is empty or `≥` the planned sets, and keeps the warmup/stretch moves marked with Hecho in `settings.sessionState.warmupMarks` / `stretchMarks` (missing = `[]`)
5. **Media resolution**: `resolveExerciseMedia()` for an exercise:
   - `exercise.imgUrl` (stored override)
   - → `GYMVISUAL_OVERRIDES` (intentionally unused, kept for reference)
   - → dictionary `image` (from `exercise-dictionary.ts`)
   - → keyword-based image resolver
   - → gif fallback

## localStorage Mirror
- Key: `coach-pedro-ai-backup`
- Updated via `Storage.backupAll()` after every write
- Used by `restoreFromBackup()` on data loss