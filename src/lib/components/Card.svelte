<script lang="ts">
  import type { Snippet } from 'svelte'

  // Surface, radius 24, no border; replaces GlowCard (Compartidos · Nuevo · 10)
  let {
    state = 'rest',
    label = '',
    title = '',
    class: className = '',
    children
  }: {
    /** rest · current = one tone lighter + white ring 35 % · done = accent ring 1.5 */
    state?: 'rest' | 'current' | 'done'
    /** Mono label above the title */
    label?: string
    title?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<div class="card {state} {className}" data-component="Card">
  {#if label}<span class="lbl">{label}</span>{/if}
  {#if title}<h3>{title}</h3>{/if}
  {@render children?.()}
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    border-radius: var(--radius-2xl);
    background: var(--surface);
  }
  .current { background: var(--surface-hover); box-shadow: inset 0 0 0 1.5px var(--cv-ring-current); }
  .done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .lbl {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
    white-space: nowrap;
  }
  .current .lbl { color: var(--text); }
  h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.2;
    text-wrap: balance;
  }
  .card :global(p) {
    margin: 0;
    font-size: 15px;
    line-height: 1.5;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
</style>
