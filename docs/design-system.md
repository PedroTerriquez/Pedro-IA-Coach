# Design system en Claude Design

Proyecto **"Training with Pedro — Design System"**, projectId `b0cb0621-bd00-46bb-983d-f45eda792441`
(https://claude.ai/design/p/b0cb0621-bd00-46bb-983d-f45eda792441).

Es el espejo visual de la app: cada vista y cada componente tiene una card. Los diseños nuevos se piden ahí, sobre esas cards, y luego se implementan en el código.

## La regla

Todo cambio visual en `src/routes/`, `src/lib/components/` o `src/app.css` actualiza sus cards **en el mismo trabajo**: regenerar, revisar y subir (pasos abajo). Un componente o estado nuevo agrega su card en `scripts/ds/groups.mjs`.

## Cómo se generan

Las cards no se dibujan a mano: `scripts/ds/` abre la app real con Playwright, la recorre con datos de ejemplo y guarda el markup real más solo el CSS que ese markup usa.

| Archivo | Qué hace |
|---|---|
| `scripts/ds/groups.mjs` | Un recorrido por grupo. Cada `card({...})` es una card; su campo `source` dice qué `.svelte` refleja (ese es el mapa componente → card) |
| `scripts/ds/seed.mjs` | Datos de ejemplo (programa, 6 semanas de historial, amigos) |
| `scripts/ds/capture.mjs` | Toma el DOM + CSS usado y escribe el HTML de la card |
| `scripts/ds/build.mjs` | Corre los recorridos y escribe en `design-system/` |
| `scripts/ds/preview.mjs` | Renderiza las cards a PNG + una hoja de contacto para revisarlas |

```bash
npm run build && npm run preview -- --port 8080 --strictPort   # en otra terminal
node scripts/ds/build.mjs                 # todo
node scripts/ds/build.mjs hoy plan        # solo esos grupos: hoy, plan, historial, temporizador, amigos, tu, shell, compartidos
node scripts/ds/preview.mjs /tmp/ds vistas/hoy   # PNGs + /tmp/ds/_sheet.png
```

## Cómo se suben

Con la herramienta DesignSync, desde `design-system/` como `localDir`: `list_files` → `finalize_plan` (las rutas que cambiaron + `_ds_manifest.json`) → `write_files`. Antes de subir, correr `node scripts/ds/manifest.mjs`: regenera `_ds_manifest.json`, el índice del que el panel saca su lista de cards. Sin subir ese archivo las cards quedan en el proyecto pero el panel no las muestra (no se recompila solo, y `register_assets` no lo cambia). Las cards hechas a mano en Claude Design se agregan a `handMade` en ese script (hoy no hay ninguna). Normalmente se suben solo las cards del grupo tocado; si una card desaparece, se borra con `delete_files`. Desde la limpieza del 2026-10-22 el proyecto tiene solo lo generado: cualquier ruta remota que no esté en `design-system/` sobra.

## Formato de card

- Un `<ruta>/index.html` autónomo cuya PRIMERA línea es `<!-- @dsCard group="…" viewport="WxH" name="…" subtitle="…" -->`. El panel de Claude Design arma su índice con esa línea.
- Pantallas completas: 390 px de ancho y todo el alto del scroll. Componentes: muestras rotuladas sobre fondo `#060606`.

## Grupos

Todo lo genera el script y refleja la app actual; no hay sufijos ni archivo de versiones viejas.

| Grupo | Carpeta | Contenido |
|---|---|---|
| Hoy, Plan, Historial, Amigos, Tú | `vistas/<vista>/` | Pantallas por estado + componentes propios de la vista |
| Temporizador | `vistas/temporizador/` | `SeriesModeScreen` (descanso, serie registrada, últimos segundos, terminado), `SeriesConfirmSheet` y `RestTimerBanner` |
| Detalle de ejercicio | `vistas/detalle-ejercicio/` | La hoja `ExerciseDetail` y sus pestañas |
| Shell | `shell/` | TabBar, Toast, banners |
| Compartidos | `compartidos/` | Chips, segmented, PageHeader, Card |

Las propuestas de diseño se piden en Claude Design sobre estas cards; al implementarse, se regenera la vista y la propuesta se borra.

## Sin card todavía

`/admin` y sus componentes (solo desarrollo) y `DebugAIToggle` (solo visible con debug IA activo).

## Pendiente

- **Tú v2**: el recorrido `tu` solo cubre Ejercicios (`vistas/tu/`). Falta el walk de `NavGroup`, `ProgramEditor`, `YouHub`, `SettingsScreen`, `BackupScreen`, `ProgramsScreen`, `ProfileData`, `ProfileSheet`, `UnmatchedScreen`.
- **Atomos de Compartidos** `button`, `inputs`, `section-label`, `empty`, `debug`: sus colectores se perdieron con Tú v2 → salen "sin muestras" y no tienen card (se borraron las viejas el 2026-10-22).
- El recorrido de **Amigos** ya no captura la card de "Cambiar usuario": el lápiz "Editar usuario" (`ProfileSheet`) quedó oculto el 2026-10-14, así que ese flujo no es alcanzable (líneas comentadas en `groups.mjs`).
