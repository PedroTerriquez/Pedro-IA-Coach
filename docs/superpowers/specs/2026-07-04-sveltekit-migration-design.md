# SvelteKit Migration — Coach Pedro AI

## Objetivo
Migrate the vanilla HTML/CSS/JS SPA to SvelteKit with static adapter (GitHub Pages), keeping all functionality, IndexedDB schema, and PWA behavior intact. Validate via the existing 495-line Playwright E2E test.

## Alcance
- Frontend SPA only (app.js, views/, components/, styles.css, index.html, sw.js)
- Not in scope: Cloudflare Worker (push-worker/), push-config.js, exercise dictionary data files
- IndexedDB schema stays identical — existing user data survives migration

## Estrategia
**Big bang**: Scaffold SvelteKit project in a separate directory (`svelte-app/`), port all code, adapt the E2E test, run it. If green, swap deploy source. If red, debug.

## Nuevo Structure

```
svelte-app/
├── package.json
├── svelte.config.js          (adapter-static, trailingSlash: 'never')
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── app.html              (HTML shell — minimal, loads fonts + manifest)
│   ├── app.css               (global styles — exact port of styles.css, same CSS vars)
│   ├── lib/
│   │   ├── db.ts             (port of db.js — openDB, get, getAll, put, del, getByIndex, generateId)
│   │   ├── storage.ts        (port of storage.js — Storage object, showToast, backupAll, restoreFromBackup)
│   │   ├── types.ts          (TypeScript interfaces for all 4 stores + program types)
│   │   ├── push.ts           (subscribePush, unsubscribePush, sendPushNotification)
│   │   ├── ai.ts             (importWithAI, programCoach, exerciseCoachChat)
│   │   ├── components/
│   │   │   ├── Chip.svelte
│   │   │   ├── SectionLabel.svelte
│   │   │   ├── StatBlock.svelte
│   │   │   ├── ExercisePlaceholder.svelte
│   │   │   ├── TabBar.svelte
│   │   │   ├── Sheet.svelte           (bottom sheet — port from components/ui.js)
│   │   │   ├── Sparkline.svelte       (port from components/chart.js)
│   │   │   ├── LineChart.svelte
│   │   │   ├── ExerciseDetail.svelte  (port from components/detail.js — Workout + History tabs)
│   │   │   ├── Warmup.svelte          (port from components/warmup.js)
│   │   │   ├── Calendar.svelte        (port from components/calendar.js)
│   │   │   ├── CoachChat.svelte       (coach IA overlay — from detail.js + you.js)
│   │   │   └── CoachCard.svelte       (post-session coach card)
│   │   ├── stores/
│   │   │   ├── settings.ts            (writable store synced to IndexedDB settings)
│   │   │   ├── session.ts             (writable store for current session state)
│   │   │   └── ui.ts                  (rest timer state, overlay flags)
│   │   └── data/
│   │       ├── ai-prompt.js           (ported directly from data/ai-prompt.js)
│   │       └── recovery.ts            (ported from data.js)
│   ├── routes/
│   │   ├── +layout.svelte             (app shell: status bar, tab bar, rest timer banner, overlays)
│   │   ├── +layout.ts                 (export const prerender = true; export const ssr = false — IndexedDB is browser-only)
│   │   ├── +page.ts                   (redirect to /today)
│   │   ├── today/
│   │   │   └── +page.svelte           (port of views/today.js — phase cards, warmup/training/stretch)
│   │   ├── plan/
│   │   │   └── +page.svelte           (port of views/plan.js — week tabs + day grid)
│   │   ├── history/
│   │   │   └── +page.svelte           (port of views/history.js — exercise list + muscle filter + sparklines)
│   │   ├── you/
│   │   │   └── +page.svelte           (port of views/you.js — profile, settings, CRUD, import/export, AI imp)
│   │   └── friends/
│   │       └── +page.svelte           (port of views/friends.js)
│   └── service-worker.js              (port of sw.js — network-first, push handling, notificationclick. SvelteKit requires single file)
├── static/
│   ├── manifest.json                  (unchanged)
│   ├── icons/                         (all PWA icons, unchanged)
│   ├── fonts/                         (Space Grotesk + JetBrains Mono)
│   └── favicon.ico
└── tests/
    └── flow.spec.js                   (adapted from tests/flow.spec.js)
```

## Lo que se queda igual

| Aspecto | Detalle |
|---|---|
| IndexedDB schema | 4 stores (exercises, exerciseLogs, programs, settings), mismos campos, mismo DB name `coach-pedro-ai` |
| CSS design tokens | `--bg`, `--surface`, `--text`, `--accent`, `--border`, `--radius-*` — los mismos valores |
| Selectores DOM | `#user-name`, `#coach-fab`, `.stepper-inc`, `[data-phase="warmup"]` — los mismos IDs/classes |
| Cloudflare Worker | `push-worker/` untouched, mismos endpoints |
| push-config.js | Se queda en la raíz, SvelteKit app lo referencia desde `src/lib/push.ts` |
| Service Worker logic | Push events, notificationclick, cache strategies — idénticos, ported a SvelteKit module |

## Lo que cambia

| Antes | Después | Razón |
|---|---|---|
| Hash routing (`#today`) | SvelteKit file routes (`/today`) | Elimina hash, rutas limpias, beneficio de SvelteKit |
| `location.hash = '#x'` | `goto('/x')` | Navegación SvelteKit |
| `window.appRefresh()` manual | Svelte stores reactivas | Al cambiar IndexedDB, stores se actualizan → UI se re-renderiza sola |
| `refresh()` callback manual | Svelte reactivity | Goto navegación recarga data via `+layout.ts` load function |
| `document.createElement` / innerHTML | Componentes `.svelte` | Svelte compila a JS optimizado |
| Sin build step | Vite + SvelteKit | `npm run dev` para desarrollo, `npm run build` para deploy |
| Event bus + `mount()`/`unmount()` | Svelte lifecycle (`onMount`, `onDestroy`) | Lifecycle del framework |
| `importWithAI()` en `app.js` global | `import { importWithAI } from '$lib/ai'` | Módulos ES, no globales |

## Data Flow

### Antes (vanilla)
```
User action → Storage.method() → IndexedDB → backupAll() → refresh() → manual DOM mutation
```

### Después (SvelteKit)
```
User action → storage.method() → IndexedDB → backupAll() → store.update()
                                                              ↓
                                              Svelte reactivity → affected components re-render
```

## Detalles de Routing

- SvelteKit `adapter-static` con `trailingSlash: 'never'`
- `+layout.ts`: `export const prerender = true; export const ssr = false` — IndexedDB solo disponible en browser
- Load function in layout: reads settings, exercises, programs from IndexedDB → populates stores
- Every page has access to `$settings`, `$exercises`, `$program` via stores
- Navigation: tab bar uses SvelteKit's `<a href="/today">` or `goto()`
- Index route `/` + `/today` both show the today screen

## Servicio de Notificaciones Push

- `src/lib/push.ts` exports `subscribePush()`, `unsubscribePush()`, `sendPushNotification()`
- `scheduleRestTimer()`, `cancelRestTimer()`, `_checkPendingRest()` → `src/lib/rest-timer.ts`
- Service Worker: `src/service-worker/index.js` — port of sw.js
- SvelteKit's service worker module handles build (separate bundle)

## Deploy

1. `npm run build` genera `build/`
2. GH Pages se configura para servir `svelte-app/build/` (o mover build/ al root)
3. `npm run preview` para verificar localmente
4. Bump CACHE version + APP_VERSION como antes

## Test Adaptation

El test `tests/flow.spec.js` se copia a `svelte-app/tests/flow.spec.js` con cambios mínimos:

| Línea original | Cambio |
|---|---|
| `location.hash = '#you'` | `page.goto('/you')` |
| `location.hash = '#today'` | `page.goto('/today')` |
| `location.hash = '#plan'` | `page.goto('/plan')` |
| `location.hash = '#history'` | `page.goto('/history')` |
| `location.hash = '#friends'` | `page.goto('/friends')` |
| `page.goto('/')` + esperar hash | `page.goto('/today')` |

Selectores DOM (ids, classes, data attributes) se mantienen idénticos para que las assertions sigan funcionando.

## Validación

1. `npm run build` → exit 0
2. `npx playwright test` → 1 passed (full flow)
3. Manual: abrir PWA en Safari, verificar datos existentes en IndexedDB
