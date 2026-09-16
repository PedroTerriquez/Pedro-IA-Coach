<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    active = false,
    dimmed = false,
    variant = 'mono',
    size = 'md',
    accent = 'var(--accent)',
    onclick = undefined,
    title = undefined,
    id = undefined,
    style = '',
    class: className = '',
    children
  }: {
    active?: boolean
    dimmed?: boolean
    variant?: 'mono' | 'sans'
    size?: 'sm' | 'md' | 'lg'
    accent?: string
    onclick?: () => void
    title?: string
    id?: string
    style?: string
    class?: string
    children?: Snippet
  } = $props()
</script>

<button
  {id}
  {title}
  {onclick}
  type="button"
  class="filter-chip {variant} {size} {className}"
  class:active
  class:dimmed
  data-component="FilterChip"
  aria-pressed={active}
  style="{active ? `background:${accent};border-color:${accent};color:var(--bg)` : ''};{style}"
>
  {@render children?.()}
</button>

<style>
  .filter-chip {
    border-radius: 9999px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.06);
    color: var(--text);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .mono { font-family: var(--font-mono); }
  .sans { font-family: var(--font-sans); font-weight: 500; color: var(--text-secondary); }

  .sm { padding: 5px 9px; font-size: 10px; min-width: 26px; text-align: center; }
  .mono.md { padding: 6px 12px; font-size: 11px; }
  .sans.md { padding: 6px 14px; font-size: 12px; }
  .lg {
    padding: 8px 13px;
    font-size: 12.5px;
    font-weight: 600;
    border-width: 0.5px;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.8);
  }

  .active { font-weight: 600; }
  .dimmed { opacity: 0.3; filter: grayscale(0.9); }
</style>
