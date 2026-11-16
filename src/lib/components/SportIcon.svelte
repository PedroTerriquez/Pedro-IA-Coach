<script lang="ts">
  import { sportOf } from '$lib/activities'
  import type { SportKey } from '$lib/types'

  // A sport's line icon on its tinted tile (Nuevo · Hoy actividades)
  let { sport, size = 24, tile = 48 }: { sport: SportKey; size?: number; tile?: number } = $props()
  let s = $derived(sportOf(sport))
</script>

<span class="sp-ic" style="--h:{s.hue};width:{tile}px;height:{tile}px;border-radius:{Math.round(tile * 0.31)}px" aria-hidden="true">
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">{@html s.icon}</svg>
</span>

<style>
  .sp-ic { display: grid; place-items: center; flex-shrink: 0; background: oklch(0.86 0.15 var(--h)); color: oklch(0.22 0.06 var(--h)); }
</style>
