<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label = '',
    badge = 'IA',
    accent = 'var(--accent)',
    class: className = '',
    children
  }: {
    label?: string
    badge?: string
    accent?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<div class="cyber-card {className}" style="--cyber-accent:{accent}" data-component="CyberpunkCard">
  <div class="cyber-scanline"></div>
  {#if label}
    <div class="cyber-header">{'>'} {label}</div>
  {/if}
  <div class="cyber-content">
    {@render children?.()}
  </div>
</div>

<style>
  .cyber-card {
    position: relative;
    background: color-mix(in srgb, var(--cyber-accent) 3%, var(--surface));
    border: 0.5px solid color-mix(in srgb, var(--cyber-accent) 18%, transparent);
    border-radius: var(--radius-md);
    padding: 14px 16px;
    margin-bottom: 12px;
    overflow: hidden;
  }
  .cyber-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--cyber-accent), transparent);
    opacity: 0.35;
  }
  .cyber-scanline {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--cyber-accent);
    opacity: 0.15;
    animation: cyber-scanline 2.5s linear infinite;
    pointer-events: none;
  }
  @keyframes cyber-scanline {
    0% { top: -2px; }
    100% { top: calc(100% + 2px); }
  }
  .cyber-header {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    color: color-mix(in srgb, var(--cyber-accent) 40%, transparent);
    margin-bottom: 10px;
    text-transform: uppercase;
  }
  .cyber-content {
    position: relative;
    z-index: 1;
  }
</style>
