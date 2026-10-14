<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    gap = 6,
    scroll = false,
    label = '',
    layout = undefined,
    style = '',
    class: className = '',
    children
  }: {
    gap?: number
    scroll?: boolean
    label?: string
    /** New layouts (Compartidos · Nuevo): wrap · scroll with fade · eq (4 equal) · days (7 equal) */
    layout?: 'wrap' | 'scroll' | 'eq' | 'days'
    style?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

{#if label}
  <div class="chip-row-label">{label}</div>
{/if}
{#if layout}
  <div class="c-chiprow l-{layout} {className}" data-component="ChipRow" {style}>
    {@render children?.()}
  </div>
{:else}
  <div class="chip-row {className}" class:scroll data-component="ChipRow" style="gap:{gap}px;{style}">
    {@render children?.()}
  </div>
{/if}

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

  .c-chiprow { display: flex; flex-wrap: wrap; gap: 8px; }
  .l-scroll {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    margin-right: -20px;
    padding-right: 20px;
    -webkit-mask-image: linear-gradient(to right, #000 85%, transparent);
    mask-image: linear-gradient(to right, #000 85%, transparent);
  }
  .l-scroll::-webkit-scrollbar { display: none; }
  .l-eq { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .l-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; }
  .l-days :global(.filter-chip) { padding: 0; font-family: var(--font-mono); font-size: 14px; }
</style>
