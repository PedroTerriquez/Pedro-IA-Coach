# Migración al diseño nuevo

Estado de los componentes compartidos mientras cada sección pasa a su diseño «· Nuevo» (ver `docs/design-system.md`). La fuente de cada componente es su card en **Compartidos · Nuevo** (`components/compartidos-v2/`).

- **pendiente**: sigue con el diseño viejo. La sección que lo necesite lo actualiza sin romper las vistas que no han migrado.
- **actualizado**: ya tiene el diseño nuevo. No se toca; si otra sección pide algo distinto es un conflicto de diseño y se le pregunta a Pedro.

Tokens nuevos de Compartidos (`--cv-*`: rellenos 4/6/8/10 %, línea 14 %, foco 22 %, rojo `#ff7a6e` sobre 14 %, fondo 60 %, radios 16 y 28, tintes de acento con `color-mix`) en `src/app.css`.

## Componentes compartidos

Componentes de `src/lib/components/` usados por más de una vista (contando el uso a través de otros componentes). Vistas: Hoy, Plan, Historial, Amigos, Tú, Detalle (la hoja `ExerciseDetail`), Shell (`+layout`) y Admin.

| Componente | Estado | Sección que lo actualizó | Qué cambió (props, variantes, tamaños) | Vistas que lo usan |
|---|---|---|---|---|
| Button | actualizado (variante) | Tú | `size: 'lg'` (56, radio 18, 17 px, ancho completo) y `'pill'` (44, 15 px) con colores nuevos: secundario blanco sobre 6 %, danger `#ff7a6e` sobre rojo 14 %, `text` 48/15, `dashed` 1 px, nuevo `variant: 'danger-text'`; presionado scale .98. `md`/`sm` quedan como deuda | Hoy, Plan, Historial, Amigos, Tú, Detalle, Admin |
| CenterDialog | pendiente | — | — (Tú ya no lo usa) | Hoy, Admin |
| Chip | pendiente | — | — | Hoy, Admin |
| ChipRow | actualizado (variante) | Tú | `layout: 'wrap' \| 'scroll' \| 'eq' \| 'days'` (gap 8, 4 iguales, 7 días). Sin `layout` = el viejo (deuda) | Historial, Tú, Detalle, Admin |
| CoachChat | actualizado (variante) | Tú | `look="nuevo"`: cabecera ‹ + título + eyebrow, `ChatMessage` (coach sin burbuja, usuario en burbuja, rutina pegada), `ChatDock`, `context` (tags), `quickReplies`, `placeholder`, `kickoffMeta`, `loading` bindable, `onquickreply`; `greeting` puede ir vacío. Detalle conserva el look viejo y su `.coach-close-btn` | Tú, Detalle |
| CyberpunkCard | pendiente | — | — (Tú ya no lo usa) | Hoy |
| DebugAIToggle | pendiente | — | — | Hoy, Tú (dentro del chat), Detalle |
| EmptyState | actualizado (variante) | Tú | `title` + `text` + snippet `actions`, `variant: 'card'` (punteada, título 22) o `'center'` (sin resultados, 18). Solo `message` = el viejo (deuda) | Hoy, Historial, Amigos, Tú, Detalle, Admin |
| ExerciseDetail | pendiente | — | — | Hoy, Plan, Historial |
| ExerciseRow | pendiente | — | — | Hoy, Plan, Historial |
| FilterChip | actualizado (variante) | Tú | `variant: 'choice'` (44, blanco al seleccionar) y `'outline'` (respuestas del chat), `disabled`. `mono`/`sans` = deuda | Plan, Historial, Tú, Detalle, Admin |
| Icon | actualizado | Tú | Reemplazo: trazo 2 (ajustado por ícono), juego de Compartidos · 13 (check, x, arrow, back, skip, chev, down, up, swap, watch, lock, plus, minus, search, more, grip, trash) + `spark`, `send`, `save`; se conservan `pencil`, `restart`, `coach`. `swap` cambió de trazo | Hoy, Plan, Historial, Tú, Detalle |
| NumberStepper | actualizado (variante) | Tú | `variant="sheet"`: círculos de 58, cifra 56 (sm 40), unidad 17, sin teclado. El de Detalle y el timer = deuda | Detalle, Shell (rest timer), Tú |
| PageHeader | actualizado | Tú | Reemplazo: `sub` opcional (15 px), siempre flex con lado derecho | Plan, Historial, Amigos, Tú |
| SearchInput | actualizado | Tú | Reemplazo: campo 52, relleno 6 %, radio 16, lupa y borrar de 44, `count`, `size="lg"` (56, `#1c1c1c`, radio 18) | Amigos, Tú, Admin |
| SectionLabel | actualizado | Tú | Reemplazo: sin barra de acento, gris 45 %, tracking 1.4, snippet `right`. `accent` se acepta y se ignora | Hoy, Tú |
| SegmentedControl | actualizado (variante) | Tú | `size="compact"` (38, dentro de NavRow, activo blanco 14 %), `onchange`, `label`, `aria-pressed`. `md` = deuda | Historial, Tú, Detalle |
| Sheet | actualizado (reemplazo + variante) | Tú | Reemplazo: radio 28 y fondo 60 % para todas. Variante: `title` (20/600 con cerrar 44 en la cabecera), `titleStyle: 'label' \| 'center'` (‹ + título centrado + `eyebrow`), `full`, snippet `footer` (pie fijo), `elevated` (encima del chat). Sin `title` = cabecera vieja con cerrar flotante (deuda) | Hoy, Amigos, Tú, Detalle |
| StatBlock | actualizado (variante) | Tú | `variant="tile"`: baldosa alineada a la izquierda, etiqueta en minúsculas, «—» gris si no hay dato | Hoy, Amigos, Tú, Detalle, Shell (rest timer) |
| StatsGrid | actualizado (variante) | Tú | `variant="tiles"` con `columns: 2 \| 3 \| 4` | Hoy, Tú, Detalle |
| TextInput | actualizado (variante) | Tú | `variant="field"`: campo 52 con `label` (13 px arriba), `unit`, `error` (línea y mensaje rojo claro), foco con línea 22 % y cursor de acento; `type` suma `password`/`url`, `onkeydown`, `inputmode`. El global `.input-field` = deuda | Amigos, Tú |

En el grupo Compartidos del design system pero hoy de una sola vista: `GlowCard`, `ProgressBar`, `StatusBadge` (Hoy). `TextArea` y `DeleteButton` se borraron (quedaron sin importadores).

## Componentes nuevos compartidos

| Componente | Estado | Sección que lo creó | Notas | Vistas que lo usan |
|---|---|---|---|---|
| NavRow | actualizado | Tú | 56: etiqueta, valor mono, chevron; `value: null` → «Agregar»; `sub`, `danger`, `disabled`, `ai` (spark + «Gratis»), snippets `control` (switch, segmentado) y `trailing` | Tú |
| NavGroup | actualizado | Tú | Grupo de filas radio 20 con divisores 0.5; `label`; `tone: 'sheet'` (4 %) | Tú |
| Switch | actualizado | Tú | 51×31, encendido blanco, `role="switch"` | Tú |
| SubpageHeader | actualizado | Tú | «‹ Tú» (o la vista de origen), título 32, `lead` / `leadSnippet` | Tú |
| IconButton | actualizado | Tú | 56 cuadrado radio 18 (`primary` en acento) / 44 redondo sin fondo; siempre con `label` | Tú |
| NextStepDock | actualizado | Tú | Dock fijo sobre la TabBar con degradado y caption; deja un espaciador al final de la página | Tú |
| Tag | actualizado | Tú | Pastilla gris de 28 (antes Chip para etiquetas) | Tú |
| OptionList | actualizado | Tú | Filas de 56 con check blanco al elegir; `nav` = chevron; `style`/`meta` por opción | Tú |
| EditSheet | actualizado | Tú | Base: título, cuerpo, Guardar (+ Cancelar), acción peligrosa al final que confirma en la hoja | Tú |
| EditExerciseSheet | actualizado | Tú | Nombre, Músculo, Imagen · opcional; `deletable` suma «Eliminar ejercicio» con el conteo de registros. Es la hoja de Historial · Nuevo 02 | Tú |
| EditableList | actualizado | Tú | Campo 52 + ✕ 44 + «Añadir …» punteado; una o dos líneas por elemento; quitar no confirma | Tú |
| InlineConfirm | actualizado | Tú | Título, texto, Cancelar / acción en rojo; `flat` dentro de un grupo | Tú |
| ResultSheet | actualizado | Tú | Ícono, frase, archivo, cifras, filas y siguiente acción; error con reintentar + Cerrar | Tú |
| AIEntry | actualizado | Tú | Opción grande con IA (degradado + borde de acento) o sin IA (`ai={false}`); apagada sin conexión | Tú |
| ChatMessage | actualizado | Tú | Coach sin burbuja con «Coach» + spark, usuario en burbuja, rutina pegada, escribiendo | Tú |
| ChatDock | actualizado | Tú | Caption, chips fijos, campo + enviar 52, botón principal (children) | Tú |

## Deuda

Variantes viejas que se conservaron para no romper una vista sin migrar.

- **Button** `size: 'md' | 'sm'` y sus colores viejos (Hoy, Plan, Historial, Amigos, Detalle, Admin).
- **FilterChip** `variant: 'mono' | 'sans'` con relleno de acento al activarse (Plan, Historial, Detalle, Admin).
- **ChipRow** sin `layout` (con `gap` y `label` propios) (Historial, Detalle, Admin).
- **SegmentedControl** `size: 'md'` con texto activo en acento (Historial, Detalle).
- **StatsGrid** `default` / `card` y **StatBlock** centrado con etiqueta mono (Hoy, Amigos, Detalle, rest timer).
- **EmptyState** solo `message` (Hoy, Historial, Amigos, Detalle, Admin).
- **TextInput** `default` (`.input-field` / `.input-field-mono` globales) (Amigos).
- **NumberStepper** `default` con `StepButton` (Detalle, rest timer).
- **Sheet** con snippet `header` y cerrar flotante (Hoy, Amigos, Detalle).
- **CoachChat** `look: 'classic'` con `.coach-close-btn` (Detalle).

## Conflictos de diseño

_Ninguno._

## Pendiente: skeletons

Estados de carga que el diseño dibuja como esqueleto y que siguen con «Cargando...».

- **Tú** (Tú · Nuevo 06): resumen, programas y ejercicios. Hoy no muestra nada hasta que cargan los datos.

## Pendiente: cards del design system

- **Tú y Compartidos (2026-10-13)**: por excepción de Pedro, las cards no se regeneraron en esta ronda. «Tú · Nuevo» y «Compartidos · Nuevo» siguen como referencia y «Tú · v1» (`vistas/tu/`) se queda como estaba. En `scripts/ds/groups.mjs` solo se quitaron los pasos que apuntaban a lo borrado: el recorrido `tu` (escribirá en `vistas/tu2/`) está por hacer, y `compartidos` ya no visita las pestañas viejas de Tú. Tampoco se cambió `manifest.mjs`.

## Otras secciones desalineadas

Vistas sin migrar que se ven distintas tras actualizar un compartido. No se retocan hasta su turno.

- **Hoy · RestDayView**: `SectionLabel` sin barra de acento y en gris.
- **Amigos** (agregar amigo) y **Admin** (filtros, MediaPicker): `SearchInput` nuevo de 52 con lupa y borrar de 44.
- **Hojas viejas** (Amigos, Detalle, Warmup): radio 28 y fondo al 60 %.
- **Hoy, Plan, Historial, Detalle**: los íconos `swap` y el trazo 2 del juego nuevo.
- **Plan**: la tarjeta del día muestra la duración calculada (`{N}m`), también en la vista de la cuadrícula, donde antes no se mostraba.
- **Historial**: el editor de ejercicio sigue en línea; Historial · Nuevo 02 usará `EditExerciseSheet`.
- **Shell**: el banner de onboarding ya no sale en Tú (pasos 1–2); solo los pasos 3–4 en Hoy.
