<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    variant = 'primary',
    accent = 'var(--accent)',
    disabled = false,
    fullWidth = false,
    size = 'md',
    onclick = undefined,
    children,
    style = ''
  }: {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    accent?: string
    disabled?: boolean
    fullWidth?: boolean
    size?: 'md' | 'sm'
    onclick?: (e: MouseEvent) => void
    children?: Snippet
    style?: string
  } = $props()
</script>

<button
  class="btn-base"
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-danger={variant === 'danger'}
  class:btn-ghost={variant === 'ghost'}
  class:full-width={fullWidth}
  class:btn-sm={size === 'sm'}
  {disabled}
  {onclick}
  style="{variant === 'primary' ? `background:${accent};color:#0a0a0a` : ''};{style}"
>
  {#if children}{@render children()}{/if}
</button>

<style>
  .btn-base {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    border: 0;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: manipulation;
    transition: opacity 0.15s;
  }
  .btn-base:active {
    opacity: 0.8;
  }
  .btn-base:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-primary {
    background: var(--accent);
    color: #0a0a0a;
  }
  .btn-secondary {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.6);
    font-weight: 600;
  }
  .btn-danger {
    background: rgba(255,107,107,0.12);
    color: #ff6b6b;
    font-weight: 600;
  }
  .btn-ghost {
    background: transparent;
    color: rgba(255,255,255,0.4);
    font-weight: 500;
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 6px;
    border: 0.5px solid rgba(255,255,255,0.08);
  }
  .full-width {
    width: 100%;
  }
  .btn-sm {
    padding: 7px 14px;
    font-size: 12px;
    border-radius: 8px;
  }
</style>
