<script lang="ts">
  import type { Snippet } from 'svelte'

  let { caption = '', children }: {
    caption?: string
    children?: Snippet
  } = $props()
</script>

<!-- The spacer keeps the end of the page reachable above the fixed dock -->
<div class="dock-space" aria-hidden="true"></div>
<div class="dock" data-component="NextStepDock">
  {#if caption}<p class="cap">{caption}</p>{/if}
  {@render children?.()}
</div>

<style>
  .dock-space { height: 96px; flex-shrink: 0; }
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
  .cap { font-size: 13px; color: var(--text-tertiary); text-align: center; text-wrap: pretty; }
</style>
