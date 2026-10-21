# Plan v2 — diseño

Implementa el grupo «Plan · Nuevo» de Claude Design (cards 01–04, `components/plan-v2/`). La card 05 «Alternativa · Día en grande» queda fuera.

## Qué cambia

- **Hoy abierto** (`DayPanel`) en su lugar de la semana, con «Hoy» en mono, aro blanco y sus ejercicios. Hecho → aro de acento y «Hecho en N min» (de `gymSessions`).
- **Franja «Esta semana»** (`PlanWeekStrip`): «X de N entrenos» (N = `trainingDaysPerWeek`), los 7 días con `league.weekDays` (igual que la WeekCard de Amigos) y un pie que lleva a Amigos con quién entrenó hoy. Lee la caché `friends-cache` que guarda Amigos; Plan no llama al Worker.
- **Días** (`DayRow`): pendiente / hecho (acento + check) / descanso (sin relleno, borde fino) / movido («Se movió del miércoles»). Cada entreno dice «N ej · M min». Los días pasados sin entrenar se ven como pendientes. Tocar un día lo abre como `DayPanel`; tocar su cabecera lo cierra.
- **Selector de semanas** (`WeekSwitch`): «Semana N» + subtítulo (o el resto del nombre); la actual dice «esta semana». Sin tag. Tocar una semana sigue guardando `currentWeekIdx`.
- **Dock** (`NextStepDock`): botón cuadrado Reprogramar + «Entrenar <día>» → Hoy. Hoy hecho o descanso: «Reprogramar semana» y qué sigue («Mañana: Empuje · 21 min», «Miércoles: …», «No quedan entrenos esta semana»); semana cumplida: «X de X hechos. El lunes empieza la semana N».
- **Reprogramar** (`ReprogramSheet` + `ChoiceCard`): «¿Qué cambió esta semana?» → «Me salté un día» (con su efecto real: «Hoy Empuje pasa al jueves»), «Quiero mover días», «Restablecer semana original» (desactivado sin cambios).
- **Me salté un día**: corre solo los días pendientes desde hoy (los anteriores y los hechos no se mueven); el último pendiente da la vuelta a hoy. Muestra `ActionToast` «Listo. Tu semana se corrió un día. [Restablecer]» en lugar del dock. El domingo no hay nada que correr: lo dice un toast.
- **Mover** (`PlanReorder` con `DayRow`): título «Mover.», asa de 44 px a la derecha, días hechos con check y sin asa (no se puede soltar sobre ellos). Restablecer y Listo en el dock.
- **Primera semana** (ningún registro): «Tu primera semana», días pasados «Ya pasó · empieza cuando quieras», botón «Empezar mi primer entreno».
- **Sin programa** (`PlanEmpty`): explicación, 3 filas fantasma y «Armar mi rutina» → Tú.
- **Sin conexión**: el pie dice «Liga actualizada a las HH:MM. Se refresca al volver la señal»; si hoy toca entrenar, el dock dice «Tu plan vive en tu teléfono: funciona sin internet».

Sin esqueleto de carga: IndexedDB responde en milisegundos y la app no usa esqueletos en ningún lado.

## Componentes

| Componente | Estado | Props |
|---|---|---|
| `DayRow` | nuevo (reemplaza `DayCard`, borrado) | weekday, date, title, sub, meta, state, lifted, trailing, onclick |
| `DayPanel` | nuevo | weekday, date, title, sub, today, done, ontoggle, children |
| `WeekSwitch` | nuevo (reemplaza las tabs) | weeks, selected, current, onselect |
| `PlanWeekStrip` | nuevo | done, total, days, firstWeek, social, onopen |
| `ReprogramSheet` | nuevo, sobre `Sheet` | open, shiftEffect, canReset, onshift, onmove, onreset |
| `ChoiceCard` | nuevo | icon, title, desc, id, onclick |
| `ActionToast` | nuevo | visible, message, action, id, onaction |
| `PlanEmpty` | nuevo | — |
| `PlanReorder` | reescrito con `DayRow` | rows, fixed, onswap |
| `ExerciseRow` | extendido: `variant="plan"` | sub, right, done |
| `Icon` | extendido: `move`, `shift`, `reorder` | — |
| `NextStepDock`, `IconButton`, `Button`, `Sheet`, `Avatar`, `PageHeader` | reusados | — |

Reglas puras en `src/lib/plan-week.ts`; `friends-cache.ts` sale de la página de Amigos; `league.ts` suma `weekRange` y `formatHour`.

## Fuera de alcance

- Card 05 y la «Fase 2» de las notas.
- «Viendo la semana 2» con el botón de hoy: como tocar una semana guarda `currentWeekIdx` (lo exige el test), la semana vista siempre es la actual.

## Escenarios E2E (`tests/big.spec.cjs`)

- **Step 0b · Sin programa**: PlanEmpty, pie del dock, «Armar mi rutina» lleva a Tú.
- **Step 4b · Primera semana**: «Tu primera semana», hoy marcado, nada hecho, invitación a un amigo, «Empezar mi primer entreno» lleva a Hoy.
- **Step 6 · Semana**: cada día en su día de la semana, descansos, hoy abierto con «Hoy», «N ej · M min», «Pecho» y «4 × 8–10», abrir y cerrar otro día, «esta semana» en el selector, cambiar de semana.
- **Step 6c · Reprogramar**: hoja con el efecto real y Restablecer desactivado; Mover con 7 asas, intercambio con «Se movió del …», cancelar soltando fuera, Restablecer + Listo sin guardar nada; «Me salté un día» con aviso y Restablecer (o el toast del domingo); mover hoy a mañana, Listo, sobrevive al reload, Hoy queda en descanso; Restablecer en la hoja borra el cambio.
- **Step 9d · Hoy hecho**: hoy con estado hecho, «1 de 2 entrenos», sin «Entrenar», «Reprogramar semana» y qué sigue.
- **Step 12b · Sin conexión**: la línea de la liga dice su hora.
