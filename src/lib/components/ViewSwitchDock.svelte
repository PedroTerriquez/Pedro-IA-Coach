<script lang="ts">
  import type { Snippet } from 'svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import Caption from './Caption.svelte'

  // Historial's dock (Historial · Nuevo): the Días / Ejercicios switch in the
  // thumb zone, with an optional caption and main button over it — the same
  // fixed band as NextStepDock.
  let { value = $bindable(), options, label, caption = '', onchange, children }: {
    value: string
    options: { label: string; value: string }[]
    label: string
    caption?: string
    onchange?: (value: string) => void
    children?: Snippet
  } = $props()

  let height = $state(0)
</script>

<!-- The spacer keeps the end of the page reachable above the fixed dock; it
     follows the dock's height, which grows with the caption and the button -->
<div class="dock-space" style="height:{Math.max(0, height - 28)}px" aria-hidden="true"></div>
<div class="dock" bind:offsetHeight={height} data-component="ViewSwitchDock">
  {#if caption}<Caption>{caption}</Caption>{/if}
  {@render children?.()}
  <SegmentedControl size="tabs" {label} {options} bind:value {onchange} />
</div>

<style>
  .dock-space { flex-shrink: 0; }
  .dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 102px;
    z-index: 25;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 28px 20px 10px;
    background: linear-gradient(to bottom, transparent, var(--bg) 26px);
  }
</style>
