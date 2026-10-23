<script lang="ts">
  import DayRow from './DayRow.svelte'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'
  import type { DayRowView } from '$lib/plan-week'

  // Mover (Plan · Nuevo · 02): hold the 44 px grip at the right and drop the day
  // on another one to swap them. Done days have no grip and can't be dropped on.
  let { rows, fixed, onswap }: {
    rows: DayRowView[]
    fixed: boolean[]
    onswap: (from: number, to: number) => void
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
    if (dragging || fixed[calIdx]) return
    const el = e.currentTarget as HTMLElement
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
    j = Math.max(0, Math.min(rows.length - 1, j))
    if (j !== hoverIdx) hoverIdx = j
  }

  function droppedInside(e: PointerEvent): boolean {
    const b = containerEl?.getBoundingClientRect()
    if (!b) return false
    return e.clientX >= b.left && e.clientX <= b.right && e.clientY >= b.top - 40 && e.clientY <= b.bottom + 40
  }

  function endDrag(e: PointerEvent) {
    if (!dragging) return
    if (droppedInside(e) && hoverIdx !== dragIdx && !fixed[hoverIdx]) onswap(dragIdx, hoverIdx)
    resetDrag()
  }

  function cancelDrag() {
    if (dragging) resetDrag()
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

<div id="plan-days-grid" class="reorder-list" bind:this={containerEl} data-component="PlanReorder">
  {#each rows as row, calIdx (calIdx)}
    {@const isDragging = dragging && calIdx === dragIdx}
    {@const isTarget = dragging && calIdx !== dragIdx && calIdx === hoverIdx && !fixed[calIdx]}
    <div
      class="drag-slot"
      data-testid={TID.dragSlot}
      class:target={isTarget}
      style:transform={isDragging ? `translate(${dragX}px, ${dragY}px) scale(1.02)` : ''}
      style:z-index={isDragging ? 50 : 1}
      bind:this={slotEls[calIdx]}
    >
      <DayRow {...row} lifted={isDragging}>
        {#snippet trailing()}
          {#if fixed[calIdx]}
            <span class="ok"><Icon name="check" size={14} /></span>
          {:else}
            <button
              type="button"
              class="drag-handle"
              data-testid={TID.dragHandle}
              aria-label="Mover {row.title}"
              onpointerdown={(e) => startDrag(e, calIdx)}
              onpointermove={moveDrag}
              onpointerup={endDrag}
              onpointercancel={cancelDrag}
            ><Icon name="grip" size={20} /></button>
          {/if}
        {/snippet}
      </DayRow>
    </div>
  {/each}
</div>

<style>
  .reorder-list { display: flex; flex-direction: column; gap: 8px; }
  .drag-slot { position: relative; border-radius: var(--radius-xl); }
  .drag-slot.target { outline: 1px solid rgba(255, 255, 255, 0.35); outline-offset: -1px; }
  .drag-handle {
    width: 44px;
    height: 44px;
    margin-right: -10px;
    display: grid;
    place-items: center;
    border: 0;
    background: none;
    color: var(--text-tertiary);
    cursor: grab;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
</style>
