# SvelteKit Migration — Coach Pedro AI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the vanilla HTML/CSS/JS SPA to SvelteKit + static adapter, deployable to GitHub Pages, validated by the existing Playwright E2E test.

**Architecture:** SvelteKit with `adapter-static`, `ssr = false` (IndexedDB is browser-only), file-based routes replacing hash routing. IndexedDB schema stays identical. Svelte stores replace the manual `refresh()` event bus.

**Tech Stack:** Svelte 5, SvelteKit 2, Vite, TypeScript, adapter-static, IndexedDB (unchanged), Playwright (unchanged)

---

## File Structure

```
svelte-app/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── app.html
│   ├── app.css
│   ├── lib/
│   │   ├── db.ts
│   │   ├── storage.ts
│   │   ├── types.ts
│   │   ├── push.ts
│   │   ├── ai.ts
│   │   ├── rest-timer.ts
│   │   ├── components/
│   │   │   ├── Chip.svelte
│   │   │   ├── SectionLabel.svelte
│   │   │   ├── StatBlock.svelte
│   │   │   ├── ExercisePlaceholder.svelte
│   │   │   ├── TabBar.svelte
│   │   │   ├── Sheet.svelte
│   │   │   ├── Sparkline.svelte
│   │   │   ├── LineChart.svelte
│   │   │   ├── ExerciseDetail.svelte
│   │   │   ├── Warmup.svelte
│   │   │   ├── Calendar.svelte
│   │   │   ├── CoachChat.svelte
│   │   │   └── CoachCard.svelte
│   │   ├── stores/
│   │   │   ├── settings.ts
│   │   │   ├── session.ts
│   │   │   └── ui.ts
│   │   └── data/
│   │       └── ai-prompt.js
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.ts
│   │   ├── +page.ts
│   │   ├── today/+page.svelte
│   │   ├── plan/+page.svelte
│   │   ├── history/+page.svelte
│   │   ├── you/+page.svelte
│   │   └── friends/+page.svelte
│   └── service-worker.js
├── static/
│   ├── manifest.json
│   └── (icons, favicon)
└── tests/
    └── flow.spec.js
```

---

### Task 1: Scaffold SvelteKit Project

**Files:**
- Create: `svelte-app/` directory with `npm create svelte@latest`
- Create: `svelte-app/package.json`
- Create: `svelte-app/svelte.config.js`
- Create: `svelte-app/vite.config.ts`
- Create: `svelte-app/tsconfig.json`
- Create: `svelte-app/src/app.html`

- [ ] **Step 1: Create SvelteKit project**

```bash
mkdir -p svelte-app
cd svelte-app
# Use the skeleton project template (no demo code)
npx sv create . --template minimal --types ts
```

- [ ] **Step 2: Install dependencies**

```bash
cd svelte-app
npm install
npm install -D @sveltejs/adapter-static
npm install -D playwright @playwright/test
```

- [ ] **Step 3: Configure svelte.config.js for static adapter**

Write `svelte-app/svelte.config.js`:
```js
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: 'index.html',
      precompress: false,
      strict: true
    })
  }
}
export default config
```

- [ ] **Step 4: Write app.html** (HTML shell, port from `index.html`)

Write `svelte-app/src/app.html`:
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <link rel="icon" href="%sveltekit.assets%/favicon.ico" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="theme-color" content="#0a0a0a" />
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
  <link rel="apple-touch-icon" href="%sveltekit.assets%/icons/icon-192.png" />
  <link rel="manifest" href="%sveltekit.assets%/manifest.json" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
  <script src="%sveltekit.assets%/push-config.js"></script>
  %sveltekit.head%
</head>
<body data-sveltekit-prerender="true">
  <div style="display: contents">%sveltekit.body%</div>
</body>
</html>
```

- [ ] **Step 5: Copy static assets**

```bash
# Copy from existing project to svelte-app/static/
cp ../manifest.json svelte-app/static/
cp -r ../icons svelte-app/static/
cp ../favicon.ico svelte-app/static/
cp ../push-config.js svelte-app/static/
```

- [ ] **Step 6: Verify dev server starts**

```bash
cd svelte-app
npm run dev -- --open
# Should see a blank page on localhost:5173
```

---

### Task 2: Port Data Layer (types, db, storage)

**Files:**
- Create: `svelte-app/src/lib/types.ts`
- Create: `svelte-app/src/lib/db.ts`
- Create: `svelte-app/src/lib/storage.ts`

**Source:** `db.js`, `storage.js` from the existing project.

- [ ] **Step 1: Write types.ts** — TypeScript interfaces matching all 4 IndexedDB object stores

Write `svelte-app/src/lib/types.ts`:
```ts
export interface Exercise {
  id: string
  name: string
  muscle: string
  imgUrl: string
  tips: string[]
  alternatives: { name: string; reason: string }[]
  dictId?: string
  gifUrl?: string
}

export interface ExerciseLog {
  id: string
  exerciseId: string
  date: string
  weight: number
  units: string
}

export interface ProgramExercise {
  exerciseId: string
  sets: number
  reps: string
  rest: number
}

export interface ProgramDay {
  name: string
  subtitle: string
  duration: number
  exercises: ProgramExercise[]
}

export interface ProgramWeek {
  name: string
  subtitle: string
  tag: string
  days: ProgramDay[]
}

export interface Program {
  id: string
  name: string
  weeks: ProgramWeek[]
}

export interface Settings {
  id: string
  activeProgramId: string
  currentWeekIdx: number
  units: string
  accentColor: string
  hasWatch: boolean
  userName?: string
  height?: string
  weight?: string
  sex?: string
  age?: string
  goal?: string
  experience?: string
  occupation?: string
  pushSubscribed?: boolean
  pushServerUrl?: string
  sessionState?: any
  lastCoachAnalysis?: any
  rescheduleWeekOrder?: Record<string, number>
  language?: string
}

export interface BackupData {
  exercises?: Exercise[]
  exerciseLogs?: ExerciseLog[]
  programs?: Program[]
  settings?: Settings
}
```

- [ ] **Step 2: Port db.js → db.ts**

Write `svelte-app/src/lib/db.ts` — port the IndexedDB open/CRUD helpers from `db.js`. Same functions: `openDB`, `getAll`, `get`, `put`, `del`, `getByIndex`, `generateId`. Add `import type` from `./types.ts`. No behavior changes — identical IndexedDB operations.

Key points:
- DB name stays `coach-pedro-ai`, version `1`
- Same 4 object stores: exercises, exerciseLogs, programs, settings
- All functions return Promises
- `generateId()` uses same `crypto.randomUUID()` fallback pattern

- [ ] **Step 3: Port storage.js → storage.ts**

Write `svelte-app/src/lib/storage.ts` — port the `Storage` object from `storage.js` as a class or object with async methods. Same methods:
- `getAllExercises()`, `getExercise(id)`, `saveExercise(data)`, `deleteExercise(id)`
- `getLogsForExercise(exerciseId)`, `logWeight(data)`
- `getPrograms()`, `getProgram(id)`, `saveProgram(data)`, `deleteProgram(id)`
- `getSettings()`, `saveSettings(data)`
- `findOrCreateExerciseByName(name, muscle)` — same dictionary lookup logic
- `backupAll()`, `restoreFromBackup(data)` — same localStorage mirror
- `showToast(message, duration)` — same DOM toast
- `showConfirm(message)` — same confirm dialog

- [ ] **Step 4: Verify build**

```bash
cd svelte-app
npx svelte-kit sync
npm run build
# Should exit 0
```

---

### Task 3: Port Global Styles + Svelte Stores

**Files:**
- Create: `svelte-app/src/app.css`
- Create: `svelte-app/src/lib/stores/settings.ts`
- Create: `svelte-app/src/lib/stores/session.ts`
- Create: `svelte-app/src/lib/stores/ui.ts`
- Modify: `svelte-app/src/routes/+layout.ts`

**Source:** `styles.css`, `app.js` (stores section), `views/you.js` (settings logic)

- [ ] **Step 1: Port styles.css → app.css**

Copy all CSS from `styles.css` into `svelte-app/src/app.css`. Same CSS variables, same selectors, same design tokens. No changes needed — the CSS is already global and doesn't depend on the framework.

- [ ] **Step 2: Create settings store**

Write `svelte-app/src/lib/stores/settings.ts`:
```ts
import { writable } from 'svelte/store'
import type { Settings } from '$lib/types'
import * as storage from '$lib/storage'

export const settings = writable<Settings>({
  id: 'settings',
  activeProgramId: '',
  currentWeekIdx: 0,
  units: 'kg',
  accentColor: '#d4ff3a',
  hasWatch: false,
  pushSubscribed: false,
  pushServerUrl: '',
  language: 'es'
})

export async function loadSettings() {
  const s = await storage.getSettings()
  if (s) settings.set(s)
}

export async function updateSettings(partial: Partial<Settings>) {
  const current = await storage.getSettings()
  const merged = { ...current, ...partial }
  await storage.saveSettings(merged)
  settings.set(merged)
}
```

- [ ] **Step 3: Create session store**

Write `svelte-app/src/lib/stores/session.ts` — tracks current session state (which exercises done today, current program, current week). Same state originally managed in `app.js` globals.

- [ ] **Step 4: Create UI store**

Write `svelte-app/src/lib/stores/ui.ts` — tracks rest timer state, overlay visibility, toast messages. Portable from the DOM-centric state in `app.js`.

- [ ] **Step 5: Write +layout.ts**

Write `svelte-app/src/routes/+layout.ts`:
```ts
export const prerender = true
export const ssr = false
```

This tells SvelteKit to generate static HTML at build time but only run JS client-side (IndexedDB is browser-only).

- [ ] **Step 6: Verify build**

```bash
cd svelte-app
npm run build
```

---

### Task 4: Port Layout Shell + Tab Bar

**Files:**
- Create: `svelte-app/src/routes/+layout.svelte`
- Create: `svelte-app/src/lib/components/TabBar.svelte`

**Source:** `app.js` (renderShell, tab bar rendering), `components/ui.js` (TabBar)

- [ ] **Step 1: Port TabBar component**

Write `svelte-app/src/lib/components/TabBar.svelte` — exactly 5 tabs rendered as `<a>` tags to SvelteKit routes:
- `/today` 🔥 (icon)
- `/plan` 📋 (icon)
- `/history` 📈 (icon)
- `/you` 👤 (icon)
- `/friends` 👥 (icon)

Use SvelteKit's `$page.url.pathname` to highlight active tab. Same glassmorphism style (`backdrop-filter: blur`).

- [ ] **Step 2: Port +layout.svelte**

Write `svelte-app/src/routes/+layout.svelte`:
- Import and call `loadSettings()` on mount
- Render `<TabBar />`
- Render `<slot />` for page content
- Include rest timer banner (from `app.js` `_renderRestTimerBanner`)
- Include global toast container
- Apply CSS variables from `$settings.accentColor` to `<html>` element

- [ ] **Step 3: Verify**

```bash
cd svelte-app
npm run dev
# Should show tab bar + empty content area
```

---

### Task 5: Port Shared UI Components

**Files:**
- Create: `svelte-app/src/lib/components/Chip.svelte`
- Create: `svelte-app/src/lib/components/SectionLabel.svelte`
- Create: `svelte-app/src/lib/components/StatBlock.svelte`
- Create: `svelte-app/src/lib/components/ExercisePlaceholder.svelte`
- Create: `svelte-app/src/lib/components/Sparkline.svelte`
- Create: `svelte-app/src/lib/components/LineChart.svelte`

**Source:** `components/ui.js`, `components/chart.js`

- [ ] **Step 1: Port Chip.svelte**

Same colored/tinted chip component. Props: `label`, `active`, `color`. Renders `<button>` or `<span>` with chip styling.

- [ ] **Step 2: Port SectionLabel.svelte**

Section header with optional subtitle. Props: `title`, `subtitle`. Renders `<h2>` with Space Grotesk.

- [ ] **Step 3: Port StatBlock.svelte**

Stats display block. Props: `label`, `value`, `unit`. Renders value in JetBrains Mono + label below.

- [ ] **Step 4: Port ExercisePlaceholder.svelte**

Placeholder for exercises without images. Props: `name`. Renders first letter of exercise name as colored circle.

- [ ] **Step 5: Port Sparkline.svelte**

SVG sparkline chart. Props: `data` (number[]), `width`, `height`, `color`. Port from `components/chart.js`.

- [ ] **Step 6: Port LineChart.svelte**

SVG line chart with X/Y axes. Props: `data`, `width`, `height`, `color`. Port from `components/chart.js`.

---

### Task 6: Port Data Files

**Files:**
- Copy: `svelte-app/src/lib/data/ai-prompt.js` (from `data/ai-prompt.js`, imported directly — no changes needed)

---

### Task 7: Port History Screen

**Files:**
- Create: `svelte-app/src/routes/history/+page.svelte`

**Source:** `views/history.js`

- [ ] **Step 1: Port History page**

Write `svelte-app/src/routes/history/+page.svelte`:
- On mount, load all exercises + exerciseLogs from IndexedDB
- Render muscle filter chips (flat list of unique muscles from all exercises)
- Render exercise list with sparkline for each
- Port Sparkline SVG component from `components/chart.js`
- Port ExercisePlaceholder component from `components/ui.js`
- Same DOM structure: `#history-container`, `.history-list`, `.muscle-filter`
- Language toggle support: read `$settings.language` and translate exercise names via dictionary lookup

- [ ] **Step 2: Verify**

```bash
cd svelte-app
npm run dev
# Navigate to /history — should show empty state (no data)
```

---

### Task 8: Port Plan Screen

**Files:**
- Create: `svelte-app/src/routes/plan/+page.svelte`
- Create: `svelte-app/src/lib/components/Calendar.svelte`

**Source:** `views/plan.js`, `components/calendar.js`

- [ ] **Step 1: Port Plan page**

Write `svelte-app/src/routes/plan/+page.svelte`:
- Load active program from IndexedDB
- Week tabs: render buttons for each week, highlight active week
- Day grid: render 7 day cards within the selected week
- Week switching updates `currentWeekIdx` in settings
- Same DOM selectors: week tab buttons, day cards

- [ ] **Step 2: Verify**

```bash
cd svelte-app
npm run dev
# Navigate to /plan — should show empty state or loaded program
```

---

### Task 9: Port You Screen

**Files:**
- Create: `svelte-app/src/routes/you/+page.svelte`

**Source:** `views/you.js` (1151 lines — the biggest screen)

- [ ] **Step 1: Port You page**

Write `svelte-app/src/routes/you/+page.svelte`:
- **Profile tab:** user name, height, weight, sex, age, goal, experience, occupation inputs
- **Ajustes rápidos:** units toggle, accent color picker, push notifications toggle, language toggle, hasWatch toggle
- **Programas:** list programs, create/edit/delete, select active program, Coach IA textarea
- **Ejercicios:** list exercises with muscle filter, create/edit/delete with name, muscle, imgUrl, tips, alternatives
- **Datos:** Importar con IA (textarea → `ai.ts`), JSON import/export exercises/programs/logs, normalizar ejercicios
- Same DOM selectors: `#user-name`, `#height-input`, `#weight-input`, `#sex-input`, `#age-input`, `#goal-input`, `#exp-input`, `#occ-input`, `#lang-toggle-btn`

- [ ] **Step 2: Port push.ts and ai.ts helper modules**

Write `svelte-app/src/lib/push.ts` — port `subscribePush()`, `unsubscribePush()`, `sendPushNotification()` from `app.js`. Same Web Push logic (references `PUSH_SERVER_URL` and `VAPID_PUBLIC_KEY` from global scope).

Write `svelte-app/src/lib/ai.ts` — port `importWithAI()`, `programCoach()`, `exerciseCoachChat()` from `app.js` and `data/ai-prompt.js`.

Write `svelte-app/src/lib/rest-timer.ts` — port `scheduleRestTimer()`, `cancelRestTimer()`, `_checkPendingRest()`, `_completeRest()` from `app.js`.

- [ ] **Step 3: Verify**

```bash
cd svelte-app
npm run dev
# Navigate to /you — profile form renders
```

---

### Task 10: Port Friends Screen

**Files:**
- Create: `svelte-app/src/routes/friends/+page.svelte`

**Source:** `views/friends.js`

- [ ] **Step 1: Port Friends page**

Write `svelte-app/src/routes/friends/+page.svelte`:
- Username prompt on first visit (`#username-prompt`, `#username-input`, `#username-btn`)
- Friend search (`#friend-search-input`, `#search-results`)
- Friend list (`#friends-list`) with streak display (`.friend-card`, `.friend-streak`)
- Streak counter (`.friends-my-streak`)
- Same DOM selectors as the test expects

---

### Task 11: Port Today Screen (Biggest Task)

**Files:**
- Create: `svelte-app/src/routes/today/+page.svelte`
- Create: `svelte-app/src/lib/components/ExerciseDetail.svelte`
- Create: `svelte-app/src/lib/components/Warmup.svelte`
- Create: `svelte-app/src/lib/components/Sheet.svelte`
- Create: `svelte-app/src/lib/components/CoachChat.svelte`
- Create: `svelte-app/src/lib/components/CoachCard.svelte`

**Source:** `views/today.js` (884 lines), `components/detail.js` (864 lines), `components/warmup.js` (444 lines)

- [ ] **Step 1: Port Sheet.svelte** (bottom sheet component)

Port from `components/ui.js` — same animated bottom sheet with backdrop overlay, close button, scrollable content area.

- [ ] **Step 2: Port Warmup.svelte**

Port from `components/warmup.js` — phase card with nav buttons (Anterior/Siguiente), counter (X / total), Hecho button. Same `data-phase="warmup"` attribute.

- [ ] **Step 3: Port ExerciseDetail.svelte**

Port from `components/detail.js` — the workout tab (exercise name, sets/reps/rest, Google/TikTok buttons, stepper, register weight) and history tab (weight log chart). Coach IA FAB button (`#coach-fab`) opens CoachChat overlay.

- [ ] **Step 4: Port CoachChat.svelte**

Port the coach chat overlay from `detail.js` — full-screen overlay with close button (`#coach-close-btn`), greeting ("¡Qué onda!"), quick chips ("Mejorar técnica", "¿Voy muy pesado?", etc.), message list. Uses `exerciseCoachChat()` from `$lib/ai`.

- [ ] **Step 5: Port CoachCard.svelte**

Port the post-session coach card — `#coach-card-regen` with summary, verdict pill, recommendations.

- [ ] **Step 6: Port Today page**

Write `svelte-app/src/routes/today/+page.svelte`:
- Auto-detect day, resolve current program/week/day
- Render phase cards (warmup, training, stretch) with `data-phase` attributes
- Phase progression: warmup → training (opens detail sheet) → stretch → streak overlay (`#streak-overlay`) → effort modal (`#effort-overlay`) → coach card
- Same `sessionState` management in store
- Same notification flow (watch button, push notifications)

---

### Task 12: Port Service Worker

**Files:**
- Create: `svelte-app/src/service-worker.js`

**Source:** `sw.js`

- [ ] **Step 1: Port sw.js → service-worker.js**

Copy the service worker logic into SvelteKit's service worker module. Same behavior:
- Network-first strategy with cache fallback
- Cache name uses `CACHE` version constant
- `push` event listener → `showNotification()`
- `notificationclick` → store from-notification flag + `clients.openWindow()`
- `activate` → delete old caches
- `SKIP_WAITING` for immediate updates

SvelteKit's service worker module:
```js
/// <reference types="@sveltejs/kit" />
// The build path is available as `self.__sveltekit`
```

---

### Task 13: Adapt and Run the E2E Test

**Files:**
- Create: `svelte-app/tests/flow.spec.js`
- Create: `svelte-app/playwright.config.ts`

**Source:** `tests/flow.spec.js` (the 495-line E2E test)

- [ ] **Step 1: Create Playwright config**

Write `svelte-app/playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'tests',
  webServer: {
    command: 'npm run build && npm run preview',
    port: 4173,
    timeout: 120000,
    reuseExistingServer: true
  },
  use: {
    baseURL: 'http://localhost:4173',
    headless: true
  }
})
```

- [ ] **Step 2: Adapt the test**

Copy `tests/flow.spec.js` to `svelte-app/tests/flow.spec.js` with these changes:
- Remove `location.hash = '#history'` → `page.goto('/history')`
- Remove `location.hash = '#plan'` → `page.goto('/plan')`  
- Remove `location.hash = '#today'` → `page.goto('/today')`
- Remove `location.hash = '#you'` → `page.goto('/you')`
- Remove `location.hash = '#friends'` → `page.goto('/friends')`
- Keep all DOM selectors identical (same ids, classes, data attributes, text content)
- Keep IndexedDB seeding identical (same DB name, same stores, same data structure)
- Remove `waitForFunction(() => navigator.serviceWorker.controller !== null)` or handle gracefully

- [ ] **Step 3: Run the test**

```bash
cd svelte-app
npx playwright test
```

- [ ] **Step 4: Fix issues and re-run until green**

If test fails, debug the failing assertion, fix the corresponding Svelte component, re-run. Repeat until 1 passed.

---

### Task 14: Deployment Config

- [ ] **Step 1: Configure GitHub Pages**

The `svelte-app/build/` directory is the deployable artifact. Two options:
- **Option A:** Move `svelte-app/build/*` to repository root on deploy (via GitHub Action)
- **Option B:** Configure GH Pages to serve from `svelte-app/build` (if using a source branch like `gh-pages`)

Recommended: Add a GitHub Action that builds and deploys:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: cd svelte-app && npm ci && npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: svelte-app/build
```

- [ ] **Step 2: Bump APP_VERSION + CACHE**

Update `APP_VERSION` in the app to reflect the SvelteKit migration. Update `CACHE` in service-worker.js to match.

- [ ] **Step 3: Clean up old project** (optional)

Once the SvelteKit version is live and verified, remove the old vanilla files or archive them.
