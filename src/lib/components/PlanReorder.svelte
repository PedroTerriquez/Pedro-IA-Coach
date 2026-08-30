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
    onorder: (order: number[]) => void
  } = $props()

  let containerEl: HTMLElement | undefined
  let slotEls: HTMLDivElement[] = []

  let dragging = $state(false)
  let dragIdx = $state(0)
  let dragValue = $state(0)
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
    dragValue = order[calIdx]
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
    cardStep = rects.length > 1 ? rects[1].top - rects[0].top : r.height
  }

  function moveDrag(e: PointerEvent) {
    if (!dragging) return
    dragX = e.clientX - grabX - rects[dragIdx].left
    dragY = e.clientY - grabY - rects[dragIdx].top
    const topY = e.clientY - grabY
    let p = Math.round((topY - rects[0].top) / cardStep)
    p = Math.max(0, Math.min(6, p))
    if (p !== hoverIdx) hoverIdx = p
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return
    const r = containerEl?.getBoundingClientRect()
    const inside = r
      ? e.clientX >= r.left - 20 &&
        e.clientX <= r.right + 20 &&
        e.clientY >= r.top - 40 &&
        e.clientY <= r.bottom + 40
      : false
    if (inside) commit(hoverIdx)
    resetDrag()
  }

  function cancelDrag() {
    if (dragging) resetDrag()
  }

  function commit(p: number) {
    const arr = order.filter((_, i) => i !== dragIdx)
    const ins = p > dragIdx ? p - 1 : p
    arr.splice(ins, 0, dragValue)
    const same = order.length === arr.length && order.every((v, i) => v === arr[i])
    if (!same) onorder(arr)
  }

  function resetDrag() {
    dragging = false
    dragIdx = 0
    dragValue = 0
    hoverIdx = 0
    rects = []
    grabX = 0
    grabY = 0
    dragX = 0
    dragY = 0
    cardStep = 0
  }

  function shiftFor(i: number): number {
    if (!dragging || i === dragIdx) return 0
    if (hoverIdx > dragIdx && i > dragIdx && i <= hoverIdx) return -cardStep
    if (hoverIdx < dragIdx && i >= hoverIdx && i < dragIdx) return cardStep
    return 0
  }
</script>

<div class="reorder-list" bind:this={containerEl}>
  {#each order as originalIdx, calIdx (calIdx)}
    {@const day = originalIdx < days.length ? days[originalIdx] : null}
    {@const hasWorkout = day !== null}
    {@const isRest = !hasWorkout || day?.name === 'Rest' || day?.name === 'Descanso'}
    {@const isTodayCal = calIdx === todayCalIdx && weekIdx === currentWeekIdx}
    {@const isMoved = hasWorkout && originalIdx !== calIdx}
    {@const showHandle = dragMode && hasWorkout}
    {@const isDraggingSlot = dragging && calIdx === dragIdx}
    {@const isTargetSlot = dragging && calIdx !== dragIdx && calIdx === hoverIdx}
    {@const transform = isDraggingSlot
      ? `translate(${dragX}px, ${dragY}px) scale(1.03)`
      : dragging
        ? `translateY(${shiftFor(calIdx)}px)`
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
        {isMoved}
        movedFrom={dayNames[originalIdx]}
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
  .drag-slot { position: relative; transition: transform 0.18s ease; }
  .drag-slot.dragging-slot { transition: none; border-radius: 18px; }
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
    font-size: 15px;
    line-height: 1;
  }
  .drag-handle.active {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border-color: var(--accent);
    cursor: grabbing;
  }
</style>