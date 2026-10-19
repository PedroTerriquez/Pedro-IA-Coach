# Migración al diseño nuevo

Estado de los componentes compartidos mientras cada sección pasa a su diseño «· Nuevo» (ver `docs/design-system.md`). La fuente de cada componente es su card en **Compartidos · Nuevo** (`components/compartidos-v2/`).

- **pendiente**: sigue con el diseño viejo. La sección que lo necesite lo actualiza sin romper las vistas que no han migrado.
- **actualizado**: ya tiene el diseño nuevo. No se toca; si otra sección pide algo distinto es un conflicto de diseño y se le pregunta a Pedro.

Tokens nuevos de Compartidos (`--cv-*`: rellenos 4/5/6/8/10 %, línea 14 %, foco 22 %, rojo `#ff7a6e` sobre 14 %, fondo 60 %, radios 16 y 28, tintes de acento con `color-mix`) en `src/app.css`. Hoy v2 sumó `--media-bg` (fondo claro de las fotos) y `--cv-fill-5`.

## Componentes compartidos

Componentes de `src/lib/components/` usados por más de una vista (contando el uso a través de otros componentes). Vistas: Hoy, Plan, Historial, Amigos, Tú, Detalle (la hoja `ExerciseDetail`), Shell (`+layout`) y Admin.

| Componente | Estado | Sección que lo actualizó | Qué cambió (props, variantes, tamaños) | Vistas que lo usan |
|---|---|---|---|---|
| Button | actualizado (variante) | Tú | `size: 'lg'` (56, radio 18, 17 px, ancho completo) y `'pill'` (44, 15 px) con colores nuevos: secundario blanco sobre 6 %, danger `#ff7a6e` sobre rojo 14 %, `text` 48/15, `dashed` 1 px, nuevo `variant: 'danger-text'`; presionado scale .98. `md`/`sm` quedan como deuda | Hoy, Plan, Historial, Amigos, Tú, Detalle, Admin |
| CenterDialog | pendiente | — | — (Hoy y Tú ya no lo usan) | Admin |
| Chip | pendiente | — | — | Hoy (RestDayView), Admin |
| ChipRow | actualizado (variante) | Tú | `layout: 'wrap' \| 'scroll' \| 'eq' \| 'days'` (gap 8, 4 iguales, 7 días). Sin `layout` = el viejo (deuda) | Historial, Tú, Admin |
| ChatDock | actualizado (variante) | Tú · Detalle | Snippet `top` sobre el campo (las preguntas rápidas del coach del ejercicio) | Tú, Detalle |
| CoachChat | actualizado | Tú · Detalle | Un solo look (el «nuevo» de Tú): cabecera ‹ + título + eyebrow, `ChatMessage`, `ChatDock`. El snippet `chips` va al `top` del dock. Se quitó `look: 'classic'` y `.coach-close-btn` | Tú, Detalle |
| DebugAIToggle | pendiente | — | — | Hoy, Tú (dentro del chat), Detalle |
| EmptyState | actualizado (variante) | Tú | `title` + `text` + snippet `actions`, `variant: 'card'` (punteada, título 22) o `'center'` (sin resultados, 18). Solo `message` = el viejo (deuda) | Hoy, Historial, Amigos, Tú, Detalle, Admin |
| ExerciseDetail | actualizado | Hoy · Detalle v2 | Hoja de Detalle v2: `DetailSheet` + media 112, TitleNav, objetivo, coach IA, tabs, WeightPanel / bloques, ProgressHero, alternativas con buscador en el dock. Props nuevas opcionales `positionLabel`, `nextExercise` | Hoy, Plan, Historial |
| ExerciseRow | actualizado (variante) | Hoy · Detalle v2 | `variant="session"`: fila 76 con nombre a 2 renglones, `sub`, `right`, `state` (`done` / `now` con `pips` / `next`), `chevron`. El default (Plan, Historial) no cambia | Hoy, Plan, Historial, Detalle |
| FilterChip | actualizado (variante) | Tú | `variant: 'choice'` (44, blanco al seleccionar) y `'outline'` (respuestas del chat), `disabled`. `mono`/`sans` = deuda | Plan, Historial, Tú, Admin |
| Icon | actualizado | Tú · Hoy v2 | Reemplazo: trazo 2 (ajustado por ícono), juego de Compartidos · 13 (check, x, arrow, back, skip, chev, down, up, swap, watch, lock, plus, minus, search, more, grip, trash) + `spark`, `send`, `save`; Hoy v2 suma `timer`, `play`, `expand`, `book`; se conservan `pencil`, `restart`, `coach`. `swap` cambió de trazo | Hoy, Plan, Historial, Tú, Detalle |
| NextStepDock | actualizado | Tú | Dock fijo sobre la TabBar con degradado y caption; deja un espaciador al final de la página | Hoy, Tú |
| NumberStepper | actualizado (variante) | Tú | `variant="sheet"`: círculos de 58, cifra 56 (sm 40), unidad 17, sin teclado. El del timer = deuda. El WeightPanel de Detalle no lo usa porque su número se escribe | Shell (rest timer), Tú |
| OfflineBanner | actualizado (variante) | Detalle v2 | `inline`: dentro de la cabecera de una hoja de Detalle, en el lugar de la posición; el fijo se oculta mientras hay una hoja abierta | Shell, Hoy, Detalle |
| PageHeader | actualizado | Tú | Reemplazo: `sub` opcional (15 px), siempre flex con lado derecho | Hoy, Plan, Historial, Amigos, Tú |
| RestTimerBanner | actualizado | Hoy v2 | Abajo, sobre la TabBar (104) y encima de los docks; en una hoja de Detalle, en el lugar de su LogDock. Anillo blanco sin brillo, meta «Sigue la serie {n} de {N}» (`setIndex`) | Shell |
| SearchInput | actualizado | Tú | Reemplazo: campo 52, relleno 6 %, radio 16, lupa y borrar de 44, `count`, `size="lg"` (56, `#1c1c1c`, radio 18) | Amigos, Tú, Detalle, Admin |
| SectionLabel | actualizado | Tú | Reemplazo: sin barra de acento, gris 45 %, tracking 1.4, snippet `right`. `accent` se acepta y se ignora | Hoy, Tú |
| SegmentedControl | actualizado (variante) | Tú · Detalle v2 | `size="compact"` (38, dentro de NavRow, activo blanco 14 %), `size="tabs"` (44 iguales, activo blanco 10 %, Detalle v2), `onchange`, `label`, `aria-pressed`. `md` = deuda | Historial, Tú, Detalle |
| Sheet | actualizado (reemplazo + variante) | Tú | Reemplazo: radio 28 y fondo 60 % para todas. Variante: `title` (20/600 con cerrar 44 en la cabecera), `titleStyle: 'label' \| 'center'` (‹ + título centrado + `eyebrow`), `full`, snippet `footer` (pie fijo), `elevated` (encima del chat). Sin `title` = cabecera vieja con cerrar flotante (deuda) | Hoy, Amigos, Tú |
| StatBlock | actualizado (variante) | Tú | `variant="tile"`: baldosa alineada a la izquierda, etiqueta en minúsculas, «—» gris si no hay dato | Hoy, Amigos, Tú, Shell (rest timer) |
| StatsGrid | actualizado (variante) | Tú | `variant="tiles"` con `columns: 2 \| 3 \| 4` | Tú |
| TextInput | actualizado (variante) | Tú | `variant="field"`: campo 52 con `label` (13 px arriba), `unit`, `error` (línea y mensaje rojo claro), foco con línea 22 % y cursor de acento; `type` suma `password`/`url`, `onkeydown`, `inputmode`. El global `.input-field` = deuda | Amigos, Tú |
| Toast | actualizado | Hoy v2 | Arriba, bajo la barra de estado (`--safe-top` + 10). Textos de Detalle sin emoji; los de otras vistas no cambian | Shell |

En el grupo Compartidos del design system pero hoy de una sola vista: `GlowCard` (RestDayView). `ProgressBar`, `StatusBadge`, `CyberpunkCard`, `LoadingSpinner`, `LineChart`, `TextArea` y `DeleteButton` se borraron (quedaron sin importadores).

## Componentes nuevos compartidos

| Componente | Estado | Sección que lo creó | Notas | Vistas que lo usan |
|---|---|---|---|---|
| NavRow | actualizado | Tú | 56: etiqueta, valor mono, chevron; `value: null` → «Agregar»; `sub`, `danger`, `disabled`, `ai` (spark + «Gratis»), snippets `control` (switch, segmentado) y `trailing` | Tú |
| NavGroup | actualizado | Tú | Grupo de filas radio 20 con divisores 0.5; `label`; `tone: 'sheet'` (4 %) | Tú |
| Switch | actualizado | Tú | 51×31, encendido blanco, `role="switch"` | Tú |
| SubpageHeader | actualizado | Tú | «‹ Tú» (o la vista de origen), título 32, `lead` / `leadSnippet` | Tú |
| IconButton | actualizado | Tú | 56 cuadrado radio 18 (`primary` en acento) / 44 redondo sin fondo; siempre con `label` | Tú |
| Tag | actualizado | Tú | Pastilla gris de 28 (antes Chip para etiquetas) | Tú |
| OptionList | actualizado | Tú | Filas de 56 con check blanco al elegir; `nav` = chevron; `style`/`meta` por opción | Tú |
| EditSheet | actualizado | Tú | Base: título, cuerpo, Guardar (+ Cancelar), acción peligrosa al final que confirma en la hoja | Tú |
| EditExerciseSheet | actualizado | Tú | Nombre, Músculo, Imagen · opcional; `deletable` suma «Eliminar ejercicio» con el conteo de registros. Es la hoja de Historial · Nuevo 02 | Tú |
| EditableList | actualizado | Tú | Campo 52 + ✕ 44 + «Añadir …» punteado; una o dos líneas por elemento; quitar no confirma | Tú |
| InlineConfirm | actualizado | Tú | Título, texto, Cancelar / acción en rojo; `flat` dentro de un grupo | Tú |
| ResultSheet | actualizado | Tú | Ícono, frase, archivo, cifras, filas y siguiente acción; error con reintentar + Cerrar | Tú |
| AIEntry | actualizado | Tú | Opción grande con IA (degradado + borde de acento) o sin IA (`ai={false}`); apagada sin conexión | Tú |
| ChatMessage | actualizado | Tú | Coach sin burbuja con «Coach» + spark, usuario en burbuja, rutina pegada, escribiendo | Tú, Detalle |
| DetailSheet | actualizado | Hoy · Detalle v2 | Marco de la hoja de Detalle: alto completo desde 54, cabecera, cuerpo con scroll y dock fijo (se oculta bajo el banner del descanso) | Hoy, Plan, Historial, Detalle |
| DetailSheetHead | actualizado | Hoy · Detalle v2 | Agarradera, cerrar ↓ de 44 y posición («Empuje · **1 de 3**»); sin conexión, OfflineBanner `inline` | Hoy, Detalle |
| ExerciseMedia | actualizado | Hoy · Detalle v2 | 112: foto `cover` + «Ver animación» (ejercicios), GIF `contain` + «Ver en grande» (movimientos), Google / TikTok de 44, sin imagen y sin conexión | Hoy, Detalle |
| TitleNav | actualizado | Hoy · Detalle v2 | Nombre 28 a 2 renglones, músculo (+ snippet `badge`), flechas ← → de 56 («Anterior» / «Siguiente») | Hoy, Detalle |
| TargetPanel | actualizado | Hoy · Detalle v2 | Dos celdas (series × reps, descanso) o `one` con la frase de la dosis | Hoy, Detalle |
| DetailRow | actualizado | Hoy · Detalle v2 | Fila 52: `ai` (coach, único tratamiento de IA, apagada sin conexión) o `plain` desplegable («Cómo se hace · N pasos») | Hoy, Detalle |
| LogDock | actualizado | Hoy · Detalle v2 | Caption a un renglón + 1 o 2 botones de 56 (`timer` 112 + resto, `even`) o el buscador (`search`) | Hoy, Detalle |
| WeightPanel | actualizado | Detalle v2 | Peso de hoy: − / + de 58 y número de 56 que se escribe; registrado con borde de acento, «tu nuevo récord» | Detalle |
| BlocksPanel + BlockRow | actualizado | Detalle v2 | Series por bloque: tres valores de 56 editables, − / + del elegido, agregar y quitar bloque, recap registrado | Detalle |
| ProgressHero | actualizado | Detalle v2 | Historial: récord 64, «Subiste…», gráfica blanca con el último punto en acento, sesiones por semana, «Ver las N sesiones» | Detalle |
| QuickAskList | actualizado | Detalle v2 | Preguntas rápidas en filas de 52 o partes del cuerpo en 2 × 56 + Cancelar | Detalle |
| MovementSheet | actualizado | Hoy v2 | Calentamiento / Estiramiento sobre las piezas de Detalle: Siguiente + Hecho, «Terminar …», panel de listo | Hoy |
| SessionSteps | actualizado | Hoy v2 | Tres fases numeradas: abierta, hecha (68, acento) y «Después»; las plegadas se abren al tocarlas | Hoy |
| StreakScreen | actualizado | Hoy v2 | Racha a pantalla completa, número 150, espera «Seguir» | Hoy |
| EffortSheet | actualizado | Hoy v2 | Hoja con 4 opciones y barras de intensidad, «Ahora no» | Hoy |
| SessionSummary | actualizado | Hoy v2 | Tu coach (Avatar «Pedro»), Para la próxima, tres cifras `tile`, «Pedir análisis al coach», «Reiniciar día» | Hoy |
| FirstRunView | actualizado | Hoy v2 | Sin programa: tres pasos, nota de privacidad y «Armar mi rutina» | Hoy |

## Deuda

Variantes viejas que se conservaron para no romper una vista sin migrar.

- **Button** `size: 'md' | 'sm'` y sus colores viejos (Hoy, Plan, Historial, Amigos, Admin).
- **FilterChip** `variant: 'mono' | 'sans'` con relleno de acento al activarse (Plan, Historial, Admin).
- **ChipRow** sin `layout` (con `gap` y `label` propios) (Historial, Admin).
- **SegmentedControl** `size: 'md'` con texto activo en acento (Historial).
- **StatsGrid** `default` / `card` y **StatBlock** centrado con etiqueta mono (Amigos, rest timer).
- **EmptyState** solo `message` (Hoy, Historial, Amigos, Admin).
- **TextInput** `default` (`.input-field` / `.input-field-mono` globales) (Amigos).
- **NumberStepper** `default` con `StepButton` (rest timer).
- **Sheet** con snippet `header` y cerrar flotante (Amigos).

## Conflictos de diseño

- **Coach del ejercicio (Detalle · Nuevo 04) vs CoachChat actualizado** (2026-10-15): la card dibuja la cabecera ‹ «**Coach** · {ejercicio}» ✕ y el saludo en burbuja; `CoachChat` (actualizado por Tú) solo tiene ‹ y el coach sin burbuja. Se usó `CoachChat` tal cual (‹ cierra, título «Coach · {ejercicio}» sin negrita parcial, sin ✕). Pregunta para Pedro: ¿se suma ✕ y la burbuja a CoachChat o se queda así?

## Pendiente: skeletons

Estados de carga que el diseño dibuja como esqueleto y que siguen con «Cargando...».

- **Tú** (Tú · Nuevo 06): resumen, programas y ejercicios. Hoy no muestra nada hasta que cargan los datos.
- **Hoy** (Hoy · Nuevo): sigue con «Cargando...» mientras lee la sesión.
- **Detalle** y la **hoja de movimiento** (Hoy · Nuevo v2 · 09): sin esqueleto; abren con los datos ya cargados.

## Pendiente: cards del design system

- **Tú y Compartidos (2026-10-13)**: por excepción de Pedro, las cards no se regeneraron en esta ronda. «Tú · Nuevo» y «Compartidos · Nuevo» siguen como referencia y «Tú · v1» (`vistas/tu/`) se queda como estaba. En `scripts/ds/groups.mjs` solo se quitaron los pasos que apuntaban a lo borrado: el recorrido `tu` (escribirá en `vistas/tu2/`) está por hacer, y `compartidos` ya no visita las pestañas viejas de Tú. Tampoco se cambió `manifest.mjs`.
- **Hoy y Detalle v2 (2026-10-15)**: el recorrido `hoy` escribe «Hoy · Actual» (`vistas/hoy2/`) y «Detalle de ejercicio · Actual» (`vistas/detalle-ejercicio2/`); `shell/` se regeneró. Generadas en local; la subida a Claude Design (con el `_ds_manifest.json` remoto fusionado) queda pendiente. `vistas/hoy/` y `vistas/detalle-ejercicio/` («· v1») no se tocan.

## Otras secciones desalineadas

Vistas sin migrar que se ven distintas tras actualizar un compartido. No se retocan hasta su turno.

- **Hoy · RestDayView**: `SectionLabel` sin barra de acento y en gris.
- **Amigos** (agregar amigo) y **Admin** (filtros, MediaPicker): `SearchInput` nuevo de 52 con lupa y borrar de 44.
- **Hojas viejas** (Amigos): radio 28 y fondo al 60 %.
- **Plan, Historial**: los íconos `swap` y el trazo 2 del juego nuevo.
- **Plan**: la tarjeta del día muestra la duración calculada (`{N}m`), también en la vista de la cuadrícula, donde antes no se mostraba.
- **Historial**: el editor de ejercicio sigue en línea; Historial · Nuevo 02 usará `EditExerciseSheet`.
- **Shell**: el banner de onboarding ya no sale en Tú (pasos 1–2); solo los pasos 3–4 en Hoy.
- **Shell (Hoy v2)**: el Toast sale arriba y el banner del descanso minimizado abajo, sobre la TabBar, en todas las vistas (Plan, Historial, Amigos, Tú incluidas).
- **Regla de ejercicio hecho (Hoy v2)**: un registro con `sets` menor que lo planeado (del rest timer) ya no cuenta como hecho; vale para Hoy y para lo que se calcula desde la sesión del día.
- **Plan e Historial**: abren el Detalle nuevo (Plan y la Constancia con posición «{día} · k de N» y «Después: …»; Ejercicios de Historial sin objetivo porque llega con `sets: 0`).
