<script lang="ts">
  import DayCard from './DayCard.svelte'
  import type { ProgramDay } from '$lib/types'

  let {
    order,
    days,
    dayNames,
    accent,
    dragMode,
    todayCalIdx,
    weekIdx,
    currentWeekIdx,
    naturalOrder,
    onorder
  }: {
    order: number[]
    days: ProgramDay[]
    dayNames: string[]
    accent: string
    dragMode: boolean
    todayCalIdx: number
    weekIdx: number
    currentWeekIdx: number
    naturalOrder: number[]
    onorder: (order: number[]) => void
  } = $props()

  let containerEl: HTMLElement | undefined
  let slotEls: HTMLDivElement[] = []

  let dragging = $state(false)
  let dragIdx = $state(0)
  let hoverIdx = $state(0)
  let rects = $state<{ top: number; left: number; width: number }[]>([])
  let grabX = $state(0)
  let grabY = $state(0)
  let dragX = $state(0)
  let dragY = $state(0)
  let cardStep = $state(0)

  function startDrag(e: PointerEvent, calIdx: number) {
    if (!dragMode || dragging) return
    const el = e.currentTarget as HTMLButtonElement
    el.setPointerCapture(e.pointerId)
    dragging = true
    dragIdx = calIdx
    hoverIdx = calIdx
    const r = slotEls[calIdx].getBoundingClientRect()
    grabX = e.clientX - r.left
    grabY = e.clientY - r.top
    dragX = 0
    dragY = 0
    rects = slotEls.map(s => {
      const b = s.getBoundingClientRect()
      return { top: b.top, left: b.left, width: b.width }
    })
    cardStep = rects.length > 1 ? Math.max(rects[1].top - rects[0].top, 1) : Math.max(r.height, 1)
  }

  function moveDrag(e: PointerEvent) {
    if (!dragging) return
    dragX = e.clientX - grabX - rects[dragIdx].left
    dragY = e.clientY - grabY - rects[dragIdx].top
    let j = Math.floor((e.clientY - rects[0].top) / cardStep)
    j = Math.max(0, Math.min(order.length - 1, j))
    if (j !== hoverIdx) hoverIdx = j
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return
    const bounds = containerEl?.getBoundingClientRect()
    const inside = bounds
      ? e.clientX >= bounds.left - 20 &&
        e.clientX <= bounds.right + 20 &&
        e.clientY >= bounds.top - 40 &&
        e.clientY <= bounds.bottom + 40
      : false
    if (inside && hoverIdx !== dragIdx) commit(hoverIdx)
    resetDrag()
  }

  function cancelDrag() {
    if (dragging) resetDrag()
  }

  function commit(j: number) {
    const arr = [...order]
    const tmp = arr[dragIdx]
    arr[dragIdx] = arr[j]
    arr[j] = tmp
    onorder(arr)
  }

  function resetDrag() {
    dragging = false
    dragIdx = 0
    hoverIdx = 0
    rects = []
    grabX = 0
    grabY = 0
    dragX = 0
    dragY = 0
    cardStep = 0
  }
</script>

<div class="reorder-list" bind:this={containerEl}>
  {#each order as originalIdx, calIdx (calIdx)}
    {@const day = originalIdx < days.length ? days[originalIdx] : null}
    {@const hasWorkout = day !== null}
    {@const isRest = !hasWorkout || day?.name === 'Rest' || day?.name === 'Descanso'}
    {@const isTodayCal = calIdx === todayCalIdx && weekIdx === currentWeekIdx}
    {@const naturalSlot = hasWorkout ? naturalOrder.indexOf(originalIdx) : -1}
    {@const isMoved = hasWorkout && naturalSlot !== -1 && naturalSlot !== calIdx}
    {@const showHandle = dragMode && hasWorkout}
    {@const isDraggingSlot = dragging && calIdx === dragIdx}
    {@const isTargetSlot = dragging && calIdx !== dragIdx && calIdx === hoverIdx}
    {@const transform = isDraggingSlot
      ? `translate(${dragX}px, ${dragY}px) scale(1.03)`
      : ''}
    <div
      class="drag-slot"
      class:dragging-slot={isDraggingSlot}
      class:target-slot={isTargetSlot}
      style:transform={transform}
      style:z-index={isDraggingSlot ? 50 : 1}
      style:box-shadow={isDraggingSlot
        ? '0 18px 40px rgba(0,0,0,0.5)'
        : isTargetSlot
          ? `inset 0 0 0 1.5px ${accent}`
          : ''}
      style:cursor={isDraggingSlot ? 'grabbing' : ''}
      bind:this={slotEls[calIdx]}
    >
      <DayCard
        dayName={dayNames[calIdx]}
        dayNumber={calIdx + 1}
        title={day?.name || ''}
        subtitle={isTodayCal ? (day?.subtitle ? `Hoy · ${day.subtitle}` : 'Hoy') : (day?.subtitle || '')}
        isToday={isTodayCal}
        isMoved={hasWorkout && naturalSlot !== -1 && naturalSlot !== calIdx}
        movedFrom={dayNames[naturalSlot]}
        exerciseCount={(day?.exercises || []).length}
        duration={day?.duration ? String(day.duration) : undefined}
        {isRest}
        {accent}
      >
        {#snippet dragHandle()}
          {#if showHandle}
            <button
              class="drag-handle"
              class:active={isDraggingSlot}
              style="color:{accent}"
              aria-label="Mover día"
              onpointerdown={(e) => startDrag(e, calIdx)}
              onpointermove={(e) => moveDrag(e)}
              onpointerup={(e) => endDrag(e)}
              onpointercancel={cancelDrag}
            >⠿</button>
          {/if}
        {/snippet}
      </DayCard>
    </div>
  {/each}
</div>

<style>
  .reorder-list { display: flex; flex-direction: column; gap: 10px; padding: 0 20px; }
  .drag-slot { position: relative; }
  .drag-slot.dragging-slot,
  .drag-slot.target-slot { border-radius: 18px; }
  .drag-handle {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255,255,255,0.05);
    border: 0.5px solid rgba(255,255,255,0.08);
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    font-size: 15px;
    line-height: 1;
  }
  .drag-handle.active {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: var(--accent);
    cursor: grabbing;
  }
</style>