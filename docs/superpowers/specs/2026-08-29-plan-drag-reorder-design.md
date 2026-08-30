# Plan — Reordenar días con arrastre (drag & drop móvil)

Date: 2026-08-29
Status: Approved

## Problem

La vista Plan tiene un modo "Reprogramar" con dos formas de reordenar los 7 días de la semana: tocar-dos-días-para-intercambiar y el card "Desplazar". La interacción de tocar-para-intercambiar no es descubrible: visualmente nada sugiere que sea posible. El usuario quiere **una única** forma de reordenar, visible y móvil-nativa: **drag & drop** con un botón explícito que lo active.

## Goals

- Una sola forma de reordenar los días dentro del modo Reprogramar: arrastre.
- Visualmente evidente (asa ⠿ visible en cada día, botón "Mover", hint, animaciones).
- Mismo modelo de persistencia actual: reorganización temporal vía `rescheduleWeekOrder`.
- Comportamiento al soltar: día sobre otro día → se intercambian posiciones; día sobre hueco libre → el día se reubica ahí y el hueco toma su posición anterior.
- "Restablecer" vuelve a la programación original de la semana; "Listo" persiste la reorganización temporal.

## Behavior

- Se elimina el tocar-dos-para-intercambiar: `planSelectedSwapIdx`, `handleSwap()` y el `onclick` de `DayCard` en modo edición desaparecen.
- Nuevo card-botón **"Mover"** (mismo estilo y prominencia que "Desplazar"): icono de asa ⠿, título "Mueve un día", subtítulo "Arrastra el asa para reordenar la semana como quieras.", chip CTA "Arrastrar". Al pulsarlo activa `planDragMode`.
- En modo arrastre:
  - Cada día real (incluidos días "Rest" con `day.name === 'Rest'/'Descanso'`) muestra un asa ⠿ en accent en su borde derecho.
  - Los huecos libres (índice ≥ `week.days.length`) se muestran como destino de suelta pero no se arrastran.
  - Arrastrar reordena en vivo `planEditingOrder`.
  - El hint-row cambia a "Arrastra el asa ⠿ para mover un día"; el subtítulo del banner de edición indica el modo.
- "Desplazar", "Restablecer" y "Listo" funcionan igual en ambos estados. Al salir de edición (Listo) se abandona el modo arrastre y se resetea `planDragMode`.
- Guardado idéntico al actual: `saveRescheduleOrder(planEditingOrder)` → `settings.rescheduleWeekOrder[`${programId}-week-${weekIdx}`]`. Sin cambios en `storage.ts` ni `types.ts`.
- "Restablecer" ya restaura `naturalOrder` (layout intrínseco weekday/sequential) — no cambia.

## Drag mechanics

- Nuevo componente `src/lib/components/PlanReorder.svelte`:
  - Recibe los 7 slots (orden + datos de día) y emite `onorder(nuevoOrder)` al soltar sobre la lista.
  - Usa **Pointer Events** sobre el asa ⠿ únicamente; el asa tiene `touch-action: none` para no pelear con el scroll vertical de la lista ni con el gesto táctil.
  - `pointerdown` → captura el puntero y la tarjeta se "levanta": `position: fixed` siguiendo el dedo, `scale: 1.03`, sombra, `z-index` alto.
  - El resto de tarjetas se apartan animado (transición CSS) calculando la posición de inserción con la Y del puntero vs. el punto medio de cada hueco; reorden en vivo.
  - `pointerup` sobre la lista → confirma en `planEditingOrder`. Fuera de la lista → revierte al orden previo al arrastre (cancel).
- La permutación completa de 7 slots soporta: día sobre día (swap) y día sobre hueco libre (reubicación + hueco a la posición anterior).
- `order`/`DayCard` existentes recogen el cambio; chips "desde X" e `isMoved` ya se reflejan.

## Visual affordance

- Card "Mover" idéntico en prominencia a "Desplazar": box con icono, título, subtítulo y chip CTA.
- Asa ⠿ accent en cada tarjeta en modo arrastre.
- Durante el arrastre: tarjeta elevada (escala + sombra) y barra/separación de inserción en accent entre huecos.

## Files touched

- `src/routes/plan/+page.svelte` — estado `planDragMode`, card "Mover", eliminación del swap por tap, wiring de `PlanReorder`.
- `src/lib/components/PlanReorder.svelte` (nuevo) — lista reordenable con Pointer Events.
- `tests/big.spec.cjs` — actualizar `describe('Plan — Reprogramar mode')` y añadir cobertura del modo arrastre. Sin archivo de test nuevo.

## Tests

- `describe('Plan — Reprogramar mode')` (`tests/big.spec.cjs`, línea ~1149):
  - El paso de intercambio por click se sustituye por arrastre simulado con `page.mouse` (down sobre asa ⠿ → move al hueco destino → up), manteniendo aserciones `.moved-chip` ("desde Lun"/"desde Mié").
  - Se conservan reset → shift → guardar → recarga (persistencia real en settings).
- Nuevos pasos para el modo arrastre:
  - El card "Mover" existe y entra en modo arrastre.
  - Soltar fuera de la lista cancela (no cambia `planEditingOrder`).
  - Día sobre hueco libre reubica (chip "desde" correcta y hueco en la posición previa).
- El regression de weekday mapping (Reprogramar + Listo sin cambios → no persiste override) queda intacto.
- Verificación: `npm run check`, `npx playwright test`, `npm run build`, bump de versión (`scripts/bump-version.sh`) antes del commit.