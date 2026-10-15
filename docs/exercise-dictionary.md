# Exercise Dictionary & Media

## Source
`src/lib/data/exercise-dictionary.ts` — 171 entries

## URL Bases
- `IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'`
- `EX_GIF_BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/'`

## Helpers
- `_IMG(dir)` → `IMG_BASE + dir + '/0.jpg'`
- `_GIF(path)` → `EX_GIF_BASE + path + '.gif'`

## Media Resolution Pipeline (`resolveExerciseMedia`)
1. `exercise.imgUrl` (stored override)
2. `GYMVISUAL_OVERRIDES` (per-exercise block, intentionally unused — edit dictionary entries directly)
3. Dictionary entry `image` (from `dictId` link)
4. Keyword-based image resolver
5. GIF fallback

## Dictionary Link
- Stored exercises carry optional `dictId` → dictionary entry id
- `findOrCreateExerciseByName()` copies `image`/`gif` from dictionary entry when creating exercises
- `getExerciseDisplayName(es/en)` resolves localized names