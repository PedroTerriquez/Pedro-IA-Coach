<script lang="ts">
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'
  import { detailSheetsOpen, restMinimized } from '$lib/stores/ui'
  import { restBannerState } from '$lib/rest-timer'
  import DetailSheetHead from './DetailSheetHead.svelte'

  // The frame shared by the exercise detail and the warmup / stretch sheet
  // (Detalle v2): full-height sheet, head with the position, scrolling body
  // and a dock pinned to the bottom.
  let {
    name = 'DetailSheet',
    onclose,
    position,
    dock,
    overlay,
    children,
    ontouchstart = undefined,
    ontouchend = undefined,
  }: {
    /** data-component of the body, so each sheet keeps its own name */
    name?: string
    onclose: () => void
    position?: Snippet
    dock?: Snippet
    /** Full-screen layers that live with the sheet (coach chat, big media) */
    overlay?: Snippet
    children: Snippet
    ontouchstart?: (e: TouchEvent) => void
    ontouchend?: (e: TouchEvent) => void
  } = $props()

  // The minimized rest banner takes the dock's place while it runs.
  let restShown = $derived($restBannerState.visible && $restMinimized)

  // Drag-to-close state
  let dragOffset = $state(0)
  let isDragging = $state(false)
  const CLOSE_THRESHOLD = 100 // px
  const VELOCITY_THRESHOLD = 0.5 // px/ms

  onMount(() => {
    detailSheetsOpen.update(n => n + 1)
    return () => detailSheetsOpen.update(n => Math.max(0, n - 1))
  })

  function handleDragStart(y: number) {
    isDragging = true
    dragOffset = 0
  }

  function handleDragMove(y: number, dy: number) {
    // Apply resistance curve: slower as you drag further
    const resistance = Math.min(1, dy / 300)
    dragOffset = dy * (1 - resistance * 0.5)
  }

  function handleDragEnd(y: number, dy: number, velocity: number) {
    isDragging = false
    // Close if dragged past threshold OR flicked down with enough velocity
    const shouldClose = dy > CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD
    if (shouldClose) {
      // Animate out
      dragOffset = 300 // off-screen
      // Call onclose after animation starts
      setTimeout(onclose, 150)
    } else {
      // Spring back
      dragOffset = 0
    }
  }
</script>

<div class="ds-overlay" role="dialog" aria-modal="true" data-component="DetailSheet">
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="ds-scrim" role="presentation" onclick={onclose} style="opacity: {1 - Math.min(dragOffset / 300, 1)};"></div>
  <div class="ds-panel" style="transform: translateY({dragOffset}px); transition: {isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'};">
    <DetailSheetHead {onclose} {position} onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd} />
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="ds-body detail-scroll" data-component={name} {ontouchstart} {ontouchend}>
      {@render children()}
    </div>
    {#if dock && !restShown}{@render dock()}{/if}
  </div>
  {#if overlay}{@render overlay()}{/if}
</div>

<style>
  .ds-overlay { position: fixed; inset: 0; z-index: 100; }
  .ds-scrim { position: absolute; inset: 0; background: var(--cv-scrim); }
  .ds-panel {
    position: absolute;
    left: 0;
    right: 0;
    top: max(54px, var(--safe-top));
    bottom: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--surface);
    border-radius: var(--cv-radius-sheet) var(--cv-radius-sheet) 0 0;
  }
  /* Room at the end so the last block clears the dock */
  .ds-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 4px 20px 180px;
  }
  .ds-body > :global(*) { flex-shrink: 0; }
</style>
