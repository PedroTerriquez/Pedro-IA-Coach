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
node scripts/ds/build.mjs hoy plan        # solo esos grupos: hoy, plan, historial, amigos, tu, shell, compartidos
node scripts/ds/preview.mjs /tmp/ds vistas/hoy   # PNGs + /tmp/ds/_sheet.png
```

## Cómo se suben

Con la herramienta DesignSync, desde `design-system/` como `localDir`: `list_files` → `finalize_plan` (las rutas que cambiaron + `_ds_manifest.json`) → `write_files`. Antes de subir, correr `node scripts/ds/manifest.mjs`: regenera `_ds_manifest.json`, el índice del que el panel saca su lista de cards. Sin subir ese archivo las cards quedan en el proyecto pero el panel no las muestra (no se recompila solo, y `register_assets` no lo cambia). Las cards hechas a mano en Claude Design se agregan a `handMade` en ese script. Nunca reemplazo total: se suben las cards del grupo tocado. Si una card desaparece, se borra con `delete_files`.

## Formato de card

- Un `<ruta>/index.html` autónomo cuya PRIMERA línea es `<!-- @dsCard group="…" viewport="WxH" name="…" subtitle="…" -->`. El panel de Claude Design arma su índice con esa línea.
- Pantallas completas: 390 px de ancho y todo el alto del scroll. Componentes: muestras rotuladas sobre fondo `#060606`.

## Grupos

| Grupo | Carpeta | Contenido |
|---|---|---|
| Hoy, Plan, Historial, Amigos, Tú | `vistas/<vista>/` | Pantallas por estado + componentes propios de la vista |
| Detalle de ejercicio | `vistas/detalle-ejercicio/` | La hoja `ExerciseDetail` y sus pestañas |
| Shell | `shell/` | TabBar, Toast, banners |
| Compartidos | `compartidos/` | Button, chips, inputs, etc. |
| Foundations, Rest timer | `foundations/`, `components/rest-timer-*` | Hechas a mano, no las genera el script |
| `<Vista> · Actual` | `vistas/<vista>2/` | Lo que la app muestra hoy, generado por el script (por ahora solo `Tú · Actual`). Junto a `· Nuevo` (propuestas) y `· v1` (archivo) |
| Nuevo · … | `components/<tema>/` | Propuestas todavía no implementadas (ej. `Nuevo · Hoy`). No tienen copia local: se listan en `handMade` de `manifest.mjs`. Al implementarse se conservan como referencia (no se borran) y su vista se regenera en una carpeta nueva; las cards viejas quedan como «· v1» |

## Sin card todavía

`/admin` y sus componentes (solo desarrollo), `LoadingSpinner`, `DebugAIToggle` (solo visible con debug IA activo) y `RestTimerFullscreen`/`RestSetsSummary` (viven a mano en `Rest timer`).

## Pendiente — arreglar en Claude Design a mano (2026-10-14)

- **`manifest.mjs` está desfasado del proyecto**: el `_ds_manifest.json` remoto tiene grupos renombrados a mano (`Hoy · v1`, `Tú · v1`…) y propuestas que `handMade` no lista (`Tú · Nuevo`, `Plan · Nuevo`, `Compartidos · Nuevo`…). Subir el que genera el script las borraría del panel: hasta alinearlo, bajar el remoto (`get_file`) y agregarle solo las cards nuevas.
- **Tú v2**: el recorrido `tu` solo cubre Ejercicios (`vistas/tu2/`, 2026-10-14). Falta el walk de `NavGroup`, `ProgramEditor`, `YouHub`, `SettingsScreen`, `BackupScreen`, `ProgramsScreen`, `ProfileData`, `ProfileSheet`, `UnmatchedScreen`.
- **Atomos de Compartidos** `button`, `inputs`, `section-label`, `empty`, `debug`: sus colectores se perdieron con Tú v2 → salen "sin muestras" y las cards quedan viejas. En particular **`SectionLabel`** cambió (nueva prop `sentence`, sin mayúsculas) y su card (Oct 7) ya no refleja el código.
- El recorrido de **Amigos** ya no captura la card de "Cambiar usuario": el lápiz "Editar usuario" (`ProfileSheet`) quedó oculto el 2026-10-14, así que ese flujo no es alcanzable (líneas comentadas en `groups.mjs`).
