<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  // A notice you read, not tap: fill 4 %, grey icon 18, text 14 (Compartidos · Nuevo · 10)
  let { icon = '', children }: {
    icon?: string
    children?: Snippet
  } = $props()
</script>

<div class="info" class:bare={!icon} data-component="InfoCard">
  {#if icon}<Icon name={icon} size={18} />{/if}
  <span>{@render children?.()}</span>
</div>

<style>
  .info {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 12px;
    padding: 16px;
    border-radius: var(--radius-lg);
    background: var(--cv-fill-1);
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
  }
  .info.bare { grid-template-columns: minmax(0, 1fr); }
  .info :global(svg) { margin-top: 2px; color: var(--text-tertiary); }
  .info :global(b) { color: var(--text); font-weight: 600; }
</style>
