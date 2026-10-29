# Screens

| Route | View | Notes |
|---|---|---|
| `/today` (default) | Auto-detect day, session or rest day, warmup, rest timer. Hoy v2: SessionSteps + NextStepDock; an exercise is done when today's log has weight and no `sets` (Registrar) or `sets ≥` planned; warmup/stretch marks in `sessionState.warmupMarks`/`stretchMarks` | `src/routes/today/+page.svelte` (logic in `src/lib/session-steps.ts`) |
| `/plan` | Plan v2: WeekSwitch + PlanWeekStrip (progress, friends who trained today from the Amigos cache) + DayRow per day, today open as DayPanel; dock trains today or says what's next; Reprogramar = ReprogramSheet → «Me salté un día» (pending days from today) or Mover (PlanReorder) | `src/routes/plan/+page.svelte` (logic in `src/lib/plan-week.ts`) |
| `/history` | Historial v2: Días = month header with ‹ › (oldest log's month → this one) + MonthCalendar + HistoryDayPanel (what was logged that day, or what the plan had; «Marcar como hecho» writes `__day__`); Ejercicios = muscle chips + ExerciseProgressRow (latest logged first; Editar opens EditExerciseSheet); ViewSwitchDock switches the two | `src/routes/history/+page.svelte` (logic in `src/lib/history-view.ts`, day states in `calendar-utils.ts`) |
| `/friends` | Friend codes + shared/assigned programs | `src/routes/friends/+page.svelte` |
| `/you` | Stats, settings, CRUD, import/export, AI import, admin link | `src/routes/you/+page.svelte` |
| `/admin` (dev) | Dictionary media review/editing (image/gif) | `src/routes/admin/+page.svelte` |

## Layout Shell (`+layout.svelte`)
- TabBar (5 tabs)
- Toast system
- SeriesModeScreen + RestTimerBanner (minimized)
- Onboarding flow
- Coach FAB (floating action button)