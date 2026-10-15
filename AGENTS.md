# Coach Pedro AI — Project Context (Minimal Core)

> **Reference docs**: All detailed sections moved to `docs/` — see links below.

## Stack
- SvelteKit 2 + Svelte 5 (runes) + TypeScript, Vite 8
- `@sveltejs/adapter-static`, base path `/Pedro-IA-Coach`, SPA fallback (`index.html`)
- Mobile-first (iPhone PWA), dark mode only; desktop browsers work too (`npm run dev`)
- IndexedDB for all persistence (4 object stores) + localStorage mirror (`coach-pedro-ai-backup`)
- No runtime backend — Cloudflare Worker (`push-worker/`) for Web Push, AI (Workers AI), users/friends
- Deploy: GitHub Pages via `.github/workflows/deploy.yml` (push to `main`)
- Entry: `src/routes/` (SPA). No SSR — all routes static, client-rendered

## Project Structure (Key Dirs)
```
src/routes/           → SPA pages (today, plan, history, friends, you, admin)
src/lib/              → Shared logic, stores, components, data
  stores/             → Reactive stores: settings, ui, session
  data/               → Static data: dictionary, warmups, recovery
  brain/              → AI prompts & dictionary builders
  admin/              → Media admin pure functions (dev only)
push-worker/          → Cloudflare Worker (push, AI, queue)
tests/                → Single E2E file: big.spec.cjs
```

## Schema (4 IndexedDB Stores)
| Store | Key Fields |
|-------|------------|
| `exercises` | id, name, muscle, imgUrl, gifUrl, dictId, tips, alternatives[] |
| `exerciseLogs` | id, exerciseId, date, weight, units (kg/lb) — indexes: exerciseId, date |
| `programs` | id, name, weeks[] (Week: name, subtitle, tag, days[] with exercises: exerciseId, sets, reps, rest) |
| `settings` (singleton) | activeProgramId, currentWeekIdx, units, accentColor, language, fontScale, userName, profile{}, onboarded, pushSubscribed, friendCode, notificationsEnabled, restDuration, weekStart |

> Full schema: [`docs/schema.md`](docs/schema.md)

## Key Design Decisions
- Exercises are standalone entities — programs reference by ID; optional `dictId` links to dictionary
- Dictionary (`exercise-dictionary.ts`) = single source of canonical names, media URLs, keywords
- Media resolution: `exercise.imgUrl` → dictionary `image` → keyword resolver → gif fallback
- Programs own per-instance sets/reps/rest; duplicate exercise IDs allowed across days
- Logs are flat `exerciseLogs` — no workout grouping; history computed by scanning per exerciseId
- No seed data — app starts empty, user creates or imports
- Active program picked from You; Today/Plan use active program
- Week-day: Mon=0..Sun=6 (converted from JS Sun=0 via `(jsDay+6)%7`)
- Weight logging auto-creates exerciseLog; no "start workout" ceremony
- Onboarding required first launch (redirects to You) — disabled when `onboarded=true`
- Language: `settings.language` (es/en); names via `getExerciseDisplayName()`

## Screens
| Route | View |
|-------|------|
| `/today` | Auto-detect day, session/rest, warmup, rest timer |
| `/plan` | Week tabs + day cards |
| `/history` | Exercise list + muscle filter + sparklines |
| `/friends` | Friend codes + shared/assigned programs |
| `/you` | Stats, settings, CRUD, import/export, AI import, admin link |
| `/admin` (dev) | Dictionary media review/editing |

> Full screens: [`docs/screens.md`](docs/screens.md)

## Design Tokens
- Colors: `--bg:#0a0a0a`, `--surface:#141414`, `--text:#fafafa`, `--accent:#d4ff3a` (configurable), `--border:rgba(255,255,255,0.06)`
- Fonts: Space Grotesk (headings/UI), JetBrains Mono (data/numbers)
- Corners: 14-18px cards, 20-28px sheets, 9999px tab bar (glassmorphism + blur)

> Full tokens: [`docs/design-tokens.md`](docs/design-tokens.md)

## Version Tracking & Commit Policy
- `APP_VERSION` in `src/lib/pwa.ts`: `${_VER_BASE} · ${__BUILD_TIME__} · ${_VER_DESC}`
- **Bump minor +1 every commit** (`v2.15` → `v2.16`), update `_VER_DESC` (~10 words)
- **`bash scripts/bump-version.sh` before every commit** — runs `npm run check` + `npx playwright test` FIRST, aborts if they fail
- Then `npm run build`, `git add`, `git commit`, `git push`
- Never bypass the test gate; never commit untracked files outside scope

> Full policy: [`docs/commit-policy.md`](docs/commit-policy.md)

## Tests & Verification
- **E2E**: `npx playwright test` → runs `tests/big.spec.cjs` (single file, `EXPECTED_STEPS` guardrail)
- **NEVER delete/rename/weaken existing `test()` without asking** — they're the record of promised behavior
- **Type check**: `npm run check` (svelte-check)
- **Build**: `npm run build` (adapter-static, base `/Pedro-IA-Coach`)
- All three must pass before push

## Reference Docs (in `docs/`)
| File | Covers |
|------|--------|
| [`platform-context.md`](docs/platform-context.md) | Device, browser, iOS constraints, Watch mirror |
| [`project-structure.md`](docs/project-structure.md) | Full directory tree with all files |
| [`schema.md`](docs/schema.md) | Full IndexedDB schema tables |
| [`screens.md`](docs/screens.md) | All routes with component paths |
| [`design-tokens.md`](docs/design-tokens.md) | Colors, typography, spacing, corners |
| [`data-flow.md`](docs/data-flow.md) | App start, user actions, reactive stores, weight logging, media resolution |
| [`exercise-dictionary.md`](docs/exercise-dictionary.md) | 171 entries, URL bases, resolution pipeline, dictId link |
| [`media-admin.md`](docs/media-admin.md) | `/admin` dev UI, catalogs, write path, prod read-only |
| [`push-notifications.md`](docs/push-notifications.md) | Architecture, files, config/secrets, troubleshooting |
| [`adr-rest-timer.md`](docs/adr-rest-timer.md) | Worker queue decision, 6 rules, key points |
| [`ai-features.md`](docs/ai-features.md) | 4 endpoints, import flow, exercise coach FAB, AI dictionary |
| [`commit-policy.md`](docs/commit-policy.md) | Implementer commit steps, version rules, verification |
| [`prior-art.md`](docs/prior-art.md) | Design prototype location, IndexedDB as source of truth |

## Build/Deploy
- `npm run dev` local, `npm run build` static output, `npm run preview` test build
- GitHub Pages: push to `main` → `.github/workflows/deploy.yml` builds/deploys to `/Pedro-IA-Coach`
- Base path `/Pedro-IA-Coach` (must match `vite.config.ts` and Playwright base URL)