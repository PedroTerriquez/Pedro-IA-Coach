# Screens

| Route | View | Notes |
|---|---|---|
| `/today` (default) | Auto-detect day, session or rest day, warmup, rest timer | `src/routes/today/+page.svelte` |
| `/plan` | Week tabs + day cards | `src/routes/plan/+page.svelte` |
| `/history` | Exercise list + muscle filter + sparklines | `src/routes/history/+page.svelte` |
| `/friends` | Friend codes + shared/assigned programs | `src/routes/friends/+page.svelte` |
| `/you` | Stats, settings, CRUD, import/export, AI import, admin link | `src/routes/you/+page.svelte` |
| `/admin` (dev) | Dictionary media review/editing (image/gif) | `src/routes/admin/+page.svelte` |

## Layout Shell (`+layout.svelte`)
- TabBar (5 tabs)
- Toast system
- RestTimerFullscreen + RestTimerBanner (minimized)
- Onboarding flow
- Coach FAB (floating action button)