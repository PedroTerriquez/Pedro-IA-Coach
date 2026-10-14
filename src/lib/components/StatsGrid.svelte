<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    columns = 3,
    variant = 'default',
    children
  }: {
    columns?: 2 | 3 | 4
    /** default / card = old grid (debt) · tiles = one tile per figure (Compartidos · Nuevo) */
    variant?: 'default' | 'card' | 'tiles'
    children?: Snippet
  } = $props()
</script>

<div class="stats-grid cols-{columns} {variant}" style="--n:{columns}" data-component="StatsGrid">
  {@render children?.()}
</div>

<style>
  .stats-grid {
    display: grid;
    gap: 8px;
    padding: 12px 0;
  }
  .stats-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
  .stats-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
  .stats-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .stats-grid.card {
    background: var(--surface);
    border-radius: 18px;
    padding: 16px 0;
    border: 0.5px solid var(--border);
  }
  .stats-grid.tiles {
    grid-template-columns: repeat(var(--n), minmax(0, 1fr));
    padding: 0;
  }
</style>
