<script lang="ts">
  import type { Snippet } from 'svelte'

  // The explanatory paragraph of a sheet or screen, in secondary text.
  // `size`: 15 by default; 14 in tight spots, 16–17 when it is the main text.
  let { children, size = 15, style = '' }: {
    children?: Snippet
    size?: 14 | 15 | 16 | 17
    style?: string
  } = $props()
</script>

<p class="lead" style="font-size: {size}px; {style}" data-component="Lead">{#if children}{@render children()}{/if}</p>

<style>
  .lead { line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
