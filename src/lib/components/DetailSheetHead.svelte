<script lang="ts">
  import type { Snippet } from 'svelte'
  import { online } from '$lib/stores/network'
  import Icon from './Icon.svelte'
  import OfflineBanner from './OfflineBanner.svelte'

  // Grab handle, close ↓ and the position («Empuje · 1 de 3»). Offline, the
  // position gives its place to the offline notice.
  let {
    onclose,
    position,
    onDragStart,
    onDragMove,
    onDragEnd,
  }: {
    onclose: () => void
    position?: Snippet
    onDragStart?: (y: number) => void
    onDragMove?: (y: number, dy: number) => void
    onDragEnd?: (y: number, dy: number, velocity: number) => void
  } = $props()

  let touchStartY = 0
  let touchStartTime = 0
  let isDragging = $state(false)

  function handleTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return
    touchStartY = e.touches[0].clientY
    touchStartTime = Date.now()
    isDragging = true
    onDragStart?.(touchStartY)
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isDragging || e.touches.length !== 1) return
    const y = e.touches[0].clientY
    const dy = y - touchStartY
    // Only handle downward drag (positive dy)
    if (dy > 0) {
      e.preventDefault()
      onDragMove?.(y, dy)
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isDragging) return
    isDragging = false
    const y = e.changedTouches[0].clientY
    const dy = y - touchStartY
    const dt = Date.now() - touchStartTime
    const velocity = dt > 0 ? dy / dt : 0
    onDragEnd?.(y, dy, velocity)
  }
</script>

<div class="grab" aria-hidden="true" ontouchstart={handleTouchStart} ontouchmove={handleTouchMove} ontouchend={handleTouchEnd} style="touch-action: none;"></div>
<div class="dsh" data-component="DetailSheetHead">
  <button type="button" class="dsh-x" aria-label="Cerrar" onclick={onclose}><Icon name="down" size={20} /></button>
  <div class="dsh-pos">
    {#if !$online}<OfflineBanner inline />{:else if position}<span class="pos-t">{@render position()}</span>{/if}
  </div>
  <span></span>
</div>

<style>
  .grab { width: 36px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.18); margin: 8px auto 0; flex-shrink: 0; }
  .dsh { display: grid; grid-template-columns: 88px minmax(0, 1fr) 88px; align-items: center; min-height: 52px; padding: 2px 10px 0; flex-shrink: 0; }
  .dsh-x { width: 44px; height: 44px; border: 0; border-radius: 50%; background: none; color: var(--text-tertiary); display: grid; place-items: center; cursor: pointer; padding: 0; }
  .dsh-pos { display: flex; justify-content: center; min-width: 0; text-align: center; font-size: 14px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pos-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .dsh-pos :global(b) { color: var(--text); font-weight: 600; }
</style>
