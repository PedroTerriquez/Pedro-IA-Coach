# Media Admin (Dev Only)

## Access
`/admin` (desktop) — opened from You → Datos → Mantenimiento → "Revisar imágenes del diccionario"

## Features
- **List**: compact rows with 112px img+gif thumbnails and ok/✕ badges
- **Pagination**: letter chips (A-Z) — default A, no "all" view
- **Filters**: muscle chips + name/id search
- **Edit flow**: edit-img/edit-gif → picker with GitHub tree catalogs:
  - free-exercise-db images (cached 24h in `admin_img_catalog`)
  - ExerciseGymGifsDB gifs (cached 24h in `admin_gif_catalog`)
  - Manual URL field
- **Drafts queue**: in-memory → "Guardar (n)" applies all

## Write Path (Dev Only)
- `src/lib/admin/media-file.ts` — pure: `findEntryRanges`, `applyFileText`, `fromUrl`/`toUrl`
- Serializes URLs back to `_IMG('<dir>')` / `_GIF('<path>')`
- `mediaEditorPlugin()` in `vite.config.ts` serves `POST /__admin/dictionary-save` (dev-only)
- Rewrites `src/lib/data/exercise-dictionary.ts` on disk

## Production
- Save button and plugin exist only when `import.meta.env.DEV`
- Preview/prod builds show "solo lectura"

## Testing
- **Not covered by E2E**: suite runs against prod preview build (dev-only save flow can't run)
- Admin save path verified manually with curl in dev