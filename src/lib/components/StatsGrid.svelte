<script lang="ts">
  import type { Snippet } from 'svelte'

  // One tile per figure (Compartidos · Nuevo)
  let {
    columns = 3,
    children
  }: {
    columns?: 2 | 3 | 4
    children?: Snippet
  } = $props()
</script>

<div class="stats-grid" style="--n:{columns}" data-component="StatsGrid">
  {@render children?.()}
</div>

<style>
  .stats-grid {
    display: grid;
    gap: 8px;
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  }
</style>
