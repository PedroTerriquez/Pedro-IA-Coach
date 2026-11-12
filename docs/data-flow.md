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
- Keys: `idb_backup_<store>` (one per store: exercises, exerciseLogs, programs, gymSessions, settings)
- Updated via `Storage.backupAll()` after every write
- Used by `restoreFromBackup()` on data loss

## Cloud copy (`src/lib/cloud.ts`, Worker D1)
- Optional account (Tú → «Guarda tus datos en la nube»); `localStorage`: `cloud-account` {username, email, token}, `cloud-hashes` (FNV-1a per `store:id`), `cloud-upload` {lastAt, pending}
- `uploadSnapshot()` sends only changed/deleted records (≤ 500 per batch) when the exercises end (Hoy `onExercisesDone`, once per day) and when the stretch ends; a failed upload is `pending` and retried on app open / `visibilitychange`; a 401 forgets the account
- `downloadAll()` (Iniciar sesión) adds the cloud records like a backup restore, keeping this phone's `pushSubscribed`, `pushServerUrl`, `sessionState` (never uploaded)
- Spec: `docs/superpowers/specs/2026-10-14-migracion-hosting-cloudflare-design.md`