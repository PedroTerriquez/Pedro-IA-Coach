<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    label,
    status = 'active',
    accent = 'var(--accent)',
    children
  }: {
    label: string
    status?: 'active' | 'completed'
    accent?: string
    children?: Snippet
  } = $props()
</script>

{#if status === 'completed'}
  <span class="badge completed" style="--accent:{accent}">
    <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </span>
{:else}
  <span class="badge active" style="--accent:{accent}">
    <span class="pulse-dot"></span>
    {#if children}
      {@render children()}
    {:else}
      {label}
    {/if}
  </span>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 9999px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .active {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 0.5px solid color-mix(in srgb, var(--accent) 25%, transparent);
    color: var(--accent);
  }
  .completed {
    background: var(--accent);
    font-weight: 700;
    color: #0a0a0a;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 33%, transparent);
  }
  .pulse-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
  }
</style>
