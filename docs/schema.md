# Schema (4 IndexedDB Object Stores)

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

## `settings` (singleton, id: "settings")
```js
{
  activeProgramId, currentWeekIdx, units, accentColor, language, fontScale,
  userName, profile: { weight, height, age, gender, experience },
  onboarded, onboardingStep,
  hasWatch, pushSubscribed, friendCode, notificationsEnabled, restDuration, weekStart
}
```