<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    columns = 3,
    variant = 'default',
    children
  }: {
    columns?: 3 | 4
    variant?: 'default' | 'card'
    children?: Snippet
  } = $props()
</script>

<div class="stats-grid cols-{columns} {variant}" data-component="StatsGrid">
  {@render children?.()}
</div>

<style>
  .stats-grid {
    display: grid;
    gap: 8px;
    padding: 12px 0;
  }
  .stats-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
  .stats-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
  .stats-grid.card {
    background: var(--surface);
    border-radius: 18px;
    padding: 16px 0;
    border: 0.5px solid var(--border);
  }
</style>
