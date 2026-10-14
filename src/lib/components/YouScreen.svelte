<script lang="ts">
  import type { Snippet } from 'svelte'

  // Page frame of Tú and its subscreens: 20 px sides, blocks stacked with the design's gaps.
  let { gap = 22, id = undefined, children }: {
    /** 28 on the summary, 22 on subscreens */
    gap?: number
    id?: string
    children?: Snippet
  } = $props()
</script>

<div {id} class="you-screen" style="gap:{gap}px">
  {@render children?.()}
</div>

<style>
  .you-screen {
    display: flex;
    flex-direction: column;
    padding: 40px 20px 16px;
  }
  .you-screen :global(.page-header) { padding: 8px 0 0; }
</style>
