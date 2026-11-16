# Schema (5 IndexedDB Object Stores)

## `exercises`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `name` | string | User-defined |
| `muscle` | string | e.g. "Chest" |
| `imgUrl` | string | Optional, editable |
| `gifUrl` | string | Optional, editable |
| `dictId` | string | Optional FK → dictionary entry id (set by Normalizar) |
| `tips` | string[] | Form cue list |
| `alternatives` | { name }[] | `reason` dropped 2026-10-14; `getExercise(s)` strips it from old data |

## `exerciseLogs`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `exerciseId` | string | FK → exercises.id |
| `date` | string | "YYYY-MM-DD" |
| `weight` | number | |
| `units` | string | "kg" or "lb" |

**Indexes**: `exerciseId`, `date`

## `programs`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Auto-generated |
| `name` | string | e.g. "Push / Pull / Legs" |
| `weeks` | Week[] | Array of weeks |

**Week structure**:
```js
{
  name: "Week A", subtitle: "Volume", tag: "BUILD",
  days: [{
    name: "Push", subtitle: "Chest · Shoulders · Triceps",
    exercises: [{ exerciseId: "ex-bench", sets: 4, reps: "6-8", rest: 180 }]
  }]
}
```

- Sets, reps, rest LIVE on the program exercise instance, NOT on the exercise definition
- Day duration is never stored: `dayDurationMin()` (`src/lib/program-utils.ts`) computes Σ sets × (30 s + rest)
- Duplicate exercise IDs allowed in same program (different days)

## `gymSessions`
| Field | Type | Notes |
|---|---|---|
| `id` | string | Same as `date` |
| `date` | string | "YYYY-MM-DD" |
| `seconds` | number | Time trained that day (the league's minutes) |
| `weekStart` | string | Monday of that week, "YYYY-MM-DD" |

## `settings` (singleton, id: "settings")
```js
{
  activeProgramId, currentWeekIdx, units, accentColor, language, fontScale,
  userName, profile: { weight, height, age, gender, experience },
  onboarded, onboardingStep,
  pushSubscribed, friendCode, notificationsEnabled, restDuration, weekStart,
  sessionState   // Hoy's session, below; never uploaded to the cloud
}
```

### `settings.sessionState` (`SessionState` in `src/lib/types.ts`)
| Field | Type | Notes |
|---|---|---|
| `date` | string | "YYYY-MM-DD" of the session; another day = left open (see below) |
| `phase` | number | 1 warmup · 2 training · 3 training done · 4 stretch done · 5 coach |
| `todayExDone` | number | Exercises done |
| `startedAt` / `endedAt` | number \| null | ms; time trained = `endedAt − startedAt` → `gymSessions.seconds` |
| `warmupMarks` / `stretchMarks` | number[] | Moves marked with Hecho (missing = `[]`) |
| `lastActivityAt` | number \| null | Last set logged, move marked or rest started (v2.104). Missing on older data = counts from now |
| `planned` | { exerciseId, sets, reps }[] | The day's exercises (after swaps), to list what's pending if the session is left open until another day |
| `dayName` | string | For the «Ayer · Jue 12 nov · Empuje» line |

**Session left open** (`src/lib/session-idle.ts`): started, not ended and 45 min (`IDLE_MS`) since `lastActivityAt` → it ends at `lastActivityAt + 3 min` (`TAIL_MS`), never at the moment the app is reopened. `gymSessions.seconds` is capped at 3 h (`MAX_LEAGUE_SEC`, `leagueSeconds()`) whatever slipped through.