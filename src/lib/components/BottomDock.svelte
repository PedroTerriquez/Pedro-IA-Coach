<script lang="ts">
  import type { Snippet } from 'svelte'
  import Caption from './Caption.svelte'

  // The fixed band over the TabBar: optional caption + whatever goes in it.
  // `space` fixes the spacer's height; without it the spacer follows the dock.
  let { caption = '', space, name = 'BottomDock', children }: {
    caption?: string
    space?: number
    /** data-component of the dock */
    name?: string
    children?: Snippet
  } = $props()

  let height = $state(0)
</script>

<!-- The spacer keeps the end of the page reachable above the fixed dock -->
<div class="dock-space" style="height:{space ?? Math.max(0, height - 28)}px" aria-hidden="true"></div>
<div class="dock" bind:offsetHeight={height} data-component={name}>
  {#if caption}<Caption>{caption}</Caption>{/if}
  {@render children?.()}
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
