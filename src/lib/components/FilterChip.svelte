<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    active = false,
    dimmed = false,
    disabled = false,
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
    disabled?: boolean
    /** mono / sans = old chips (debt) · choice = 44, white when selected · outline = chat quick replies */
    variant?: 'mono' | 'sans' | 'choice' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    accent?: string
    onclick?: () => void
    title?: string
    id?: string
    style?: string
    class?: string
    children?: Snippet
  } = $props()

  let v2 = $derived(variant === 'choice' || variant === 'outline')
  let activeStyle = $derived(active && !v2 ? `background:${accent};border-color:${accent};color:var(--bg)` : '')
</script>

<button
  {id}
  {title}
  {onclick}
  {disabled}
  type="button"
  class="filter-chip {variant} {v2 ? '' : size} {className}"
  class:v2
  class:active
  class:dimmed
  data-component="FilterChip"
  aria-pressed={active}
  style="{activeStyle};{style}"
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

  /* ── Compartidos · Nuevo ── */
  .v2 {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    padding: 0 16px;
    border: 0;
    background: var(--cv-fill-2);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 500;
  }
  .v2.active { background: var(--text); color: var(--bg); font-weight: 600; }
  .v2.outline { background: transparent; box-shadow: inset 0 0 0 1px var(--cv-line-strong); }
  .v2:disabled { opacity: 0.4; cursor: default; }
</style>
