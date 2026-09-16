<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    gap = 6,
    scroll = false,
    label = '',
    style = '',
    class: className = '',
    children
  }: {
    gap?: number
    scroll?: boolean
    label?: string
    style?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

{#if label}
  <div class="chip-row-label">{label}</div>
{/if}
<div class="chip-row {className}" class:scroll data-component="ChipRow" style="gap:{gap}px;{style}">
  {@render children?.()}
</div>

<style>
  .chip-row {
    display: flex;
    flex-wrap: wrap;
  }
  .chip-row.scroll {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .chip-row.scroll::-webkit-scrollbar {
    display: none;
  }
  .chip-row-label {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 8px;
    font-weight: 500;
  }
</style>
