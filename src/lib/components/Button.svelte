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
    style = '',
    id = undefined,
    type = 'button',
    ariaLabel = undefined
  }: {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'text' | 'dashed' | 'danger-text'
    accent?: string
    disabled?: boolean
    fullWidth?: boolean
    /** md / sm = old buttons (debt) · lg = 56 · pill = 44 (Compartidos · Nuevo) */
    size?: 'md' | 'sm' | 'lg' | 'pill'
    onclick?: (e: MouseEvent) => void
    children?: Snippet
    style?: string
    id?: string
    type?: 'button' | 'submit'
    ariaLabel?: string
  } = $props()

  let v2 = $derived(size === 'lg' || size === 'pill')
</script>

<button
  class="btn-base"
  data-component="Button"
  class:v2
  class:lg={size === 'lg'}
  class:pill={size === 'pill'}
  class:btn-primary={variant === 'primary'}
  class:btn-secondary={variant === 'secondary'}
  class:btn-danger={variant === 'danger'}
  class:btn-ghost={variant === 'ghost'}
  class:btn-text={variant === 'text' || variant === 'danger-text'}
  class:btn-danger-text={variant === 'danger-text'}
  class:btn-dashed={variant === 'dashed'}
  class:full-width={fullWidth}
  class:btn-sm={size === 'sm'}
  {type}
  {disabled}
  {onclick}
  {id}
  aria-label={ariaLabel}
  style="{variant === 'primary' ? `background:${accent};color:var(--bg)` : ''};{style}"
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
    color: var(--bg);
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
    color: var(--text-tertiary);
    font-weight: 500;
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 6px;
    border: 0.5px solid var(--border-medium);
  }
  .btn-text {
    background: transparent;
    color: var(--text-tertiary);
    font-weight: 500;
    font-size: 10.5px;
    padding: 4px 6px;
    border-radius: 4px;
  }
  .btn-dashed {
    background: transparent;
    border: 0.5px dashed rgba(255,255,255,0.18);
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    font-size: 12px;
    padding: 10px 14px;
    border-radius: 10px;
    width: 100%;
  }
  .full-width {
    width: 100%;
  }
  .btn-sm {
    padding: 7px 14px;
    font-size: 12px;
    border-radius: 8px;
  }

  /* ── Compartidos · Nuevo: lg 56 / pill 44 ── */
  .v2 {
    gap: 8px;
    height: 56px;
    padding: 0 20px;
    border-radius: var(--radius-lg);
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.2px;
    transition: transform 0.15s var(--ease-smooth), opacity 0.15s;
  }
  .v2.lg { width: 100%; }
  .v2:active:not(:disabled) { transform: scale(0.98); opacity: 0.85; }
  .v2.pill {
    height: 44px;
    width: auto;
    padding: 0 18px;
    border-radius: var(--radius-full);
    font-size: 15px;
  }
  .v2.btn-secondary { background: var(--cv-fill-2); color: var(--text); }
  .v2.btn-danger { background: var(--cv-danger-bg); color: var(--cv-danger-text); }
  .v2.btn-ghost {
    background: transparent;
    border: 0;
    box-shadow: inset 0 0 0 1px var(--cv-line-strong);
    color: var(--text);
    font-size: inherit;
  }
  .v2.btn-dashed {
    background: transparent;
    border: 1px dashed var(--cv-line-strong);
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 500;
    border-radius: var(--radius-lg);
  }
  .v2.btn-text {
    height: 48px;
    width: auto;
    padding: 0 16px;
    background: none;
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 500;
  }
  .v2.btn-danger-text { color: var(--cv-danger-text); }
  .v2.full-width { width: 100%; }
</style>
