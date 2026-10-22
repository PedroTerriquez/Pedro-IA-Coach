# Project Structure (Full)

```
src/
  app.html                 → App shell (fonts, splash, script preloads)
  app.css                  → CSS variables, design tokens, global styles
  app.d.ts                 → Global types ($service-worker module decl)
  service-worker.js        → SvelteKit SW: network-first, caches scoped by build hash ($service-worker)
  routes/
    +layout.svelte         → App shell: TabBar, Toast, RestTimerFullscreen + RestTimerBanner (minimizado), Onboarding, Coach FAB
    +page.svelte           → Redirect: new user → /you, otherwise → /today
    today/                 → Session auto-detect, warmup, rest timer, ⌚ watch button
    plan/                  → Plan v2: week switch, week strip, day rows, Reprogramar
    history/               → Historial v2: month calendar + day panel (Días), progress rows (Ejercicios)
    friends/               → Friends + shared/assigned programs
    you/                   → Stats, settings, exercise/program CRUD, JSON import/export, AI import, admin link
  lib/
    routes.ts              → Tab route definitions (ROUTES with base)
    config.ts              → PUSH_SERVER_URL + VAPID_PUBLIC_KEY (intentionally public)
    pwa.ts                 → APP_VERSION (version + build date), PWA/install helpers
    db.ts                  → IndexedDB open/CRUD helpers (openDB, getAll, get, put, del, getByIndex, generateId)
    storage.ts             → Data service layer (Storage object): CRUD, backupAll, restoreFromBackup, migrations, dedup, import/export JSON
    types.ts               → Exercise, ExerciseLog, Program, Settings, Week, Day, etc.
    ai.ts                  → importWithAI, generateProgramWithAI, programCoach, exerciseCoachChat
    coach-analysis.ts      → runCoachAnalysis (post-workout insights)
    push.ts                → subscribePush, unsubscribePush, sendPushNotification, notifyWatch
    rest-timer.ts          → scheduleRestTimer, adjustRestTimer, restartRestTimer, completeRest, cancelRestTimer, checkPendingRest, nextSetIndex
    exercise-utils.ts      → getExerciseDisplayName (es/en), findById, keyword helpers
    calendar-utils.ts      → Date/week/day helpers, makeDayStatusFn (done/rest/missed/future/none)
    history-view.ts        → Historial v2: day entries, month bounds, calendar cells, exercise progress, dock
    stores/
      settings.ts          → settings store (reactive, persisted to IndexedDB)
      ui.ts                → toast store, confirm, prompt
    components/            → 58 Svelte components (TabBar, ExerciseDetail, DetailSheet, WeightPanel, ProgressHero, CoachChat, MonthCalendar, HistoryDayPanel, MovementSheet, SessionSteps, RestTimerBanner, MediaPicker, ...)
    data/
      exercise-dictionary.ts → 171 entries + IMG_BASE/EX_GIF_BASE/_IMG/_GIF + resolveExerciseMedia
      warmup.ts              → warmup/stretch sequences by muscle group
      warmup-components.ts   → warmup movements
      warmup-gifs.ts         → warmup GIF paths
      body-parts.ts          → body-part pickers for coach chat
      recovery.ts            → RECOVERY_TIPS (rest days)
    brain/
      prompts.ts             → AI prompts (always Spanish)
      dictionary.ts          → buildAIDictionary / buildFilteredDictionary (lightweight subsets for Worker)
    admin/
      media-file.ts          → pure: findEntryRanges, applyFileText, fromUrl/toUrl
push-worker/
  src/index.js           → Cloudflare Worker: push, rest-timer queue, AI (import, program-coach, exercise-coach), users/friends
  wrangler.toml          → Worker config (KV, Queue, [ai], VAPID vars)
  package.json           → web-push dependency
scripts/
  bump-version.sh        → Bumps APP_VERSION minor + sets description (run before every commit)
tests/
  big.spec.cjs           → SINGLE E2E suite (Playwright): the full user flow from an empty app + a few tests apart. Guardrail EXPECTED_STEPS (steps that ran, in order). Do not add new test files.
vite.config.ts           → SvelteKit + Vite config, __BUILD_TIME__ define, dev-only plugins (e.g. mediaEditorPlugin)
playwright.config.cjs    → base URL includes trailing slash (`/Pedro-IA-Coach/`)
AGENTS.md                ← This file (minimal core)
```

## Key Directories
| Path | Purpose |
|------|---------|
| `src/routes/` | SPA pages (no SSR) |
| `src/lib/` | Shared logic, stores, components, data |
| `src/lib/stores/` | Reactive Svelte stores (settings, ui, session) |
| `src/lib/data/` | Static data (dictionary, warmups, recovery) |
| `src/lib/brain/` | AI prompts & dictionary builders |
| `push-worker/` | Cloudflare Worker (push, AI, queue) |
| `tests/` | Single E2E file (big.spec.cjs) |