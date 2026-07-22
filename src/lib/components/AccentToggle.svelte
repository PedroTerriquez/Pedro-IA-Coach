<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    active = false,
    accent = 'var(--accent)',
    onclick = () => {},
    children
  }: {
    active?: boolean
    accent?: string
    onclick?: () => void
    children?: Snippet
  } = $props()
</script>

<button
  class="accent-toggle"
  class:accent-toggle-active={active}
  style="--toggle-accent:{accent}"
  {onclick}
  type="button"
>
  {#if children}{@render children()}{/if}
</button>

<style>
  .accent-toggle {
    padding: 6px 12px;
    border-radius: 8px;
    border: 0.5px solid var(--border-medium);
    cursor: pointer;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    transition: background 0.15s, color 0.15s;
  }
  .accent-toggle-active {
    background: color-mix(in srgb, var(--toggle-accent) 13%, transparent);
    color: var(--toggle-accent);
  }
</style>
