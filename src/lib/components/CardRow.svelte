<script lang="ts">
  import type { Snippet } from 'svelte'

  let { label, last = false, children }: {
    label: string
    last?: boolean
    children?: Snippet
  } = $props()
</script>

<div class="card-row" class:card-row-last={last} data-component="CardRow">
  <div class="card-label">{label}</div>
  {#if children}
    <div class="card-row-right">{@render children()}</div>
  {/if}
</div>

<style>
  .card-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 16px;
    border-bottom: 0.5px solid var(--border-light);
  }
  .card-row:last-child, .card-row-last {
    border-bottom: 0;
  }
  .card-row-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .card-label {
    font-family: var(--font-sans);
    font-size: 13.5px;
    color: var(--text);
    font-weight: 500;
  }
</style>
