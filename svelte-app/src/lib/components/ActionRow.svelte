<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    description,
    status = '',
    actionLabel = '',
    onclick = () => {},
    accent = 'var(--accent)',
    disabled = false,
    variant = 'primary',
    button
  }: {
    title: string
    description: string
    status?: string
    actionLabel?: string
    onclick?: () => void
    accent?: string
    disabled?: boolean
    variant?: 'primary' | 'accent-outline' | 'muted-outline'
    button?: Snippet
  } = $props()
</script>

<div class="action-row">
  <div class="action-info">
    <div class="action-title">{title}</div>
    <div class="action-desc">{description}</div>
    {#if status}
      <div class="action-status">{status}</div>
    {/if}
  </div>
  {#if button}
    {@render button()}
  {:else}
    <button
      class="action-btn"
      class:btn-primary={variant === 'primary'}
      class:btn-accent-outline={variant === 'accent-outline'}
      class:btn-muted-outline={variant === 'muted-outline'}
      style={variant === 'primary' ? `background:${accent};color:#0a0a0a` : ''}
      {onclick}
      {disabled}
    >
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .action-row {
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .action-info {
    flex: 1;
    min-width: 0;
  }
  .action-title {
    font-size: 12px;
    color: #fafafa;
    font-weight: 600;
    font-family: var(--font-sans);
  }
  .action-desc {
    font-size: 10px;
    color: rgba(255,255,255,0.45);
    margin-top: 2px;
    line-height: 1.4;
  }
  .action-status {
    margin-top: 4px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: rgba(255,255,255,0.35);
    letter-spacing: 0.2px;
  }
  .action-btn {
    padding: 7px 14px;
    border-radius: 8px;
    border: 0;
    cursor: pointer;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
    touch-action: manipulation;
  }
  .action-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-primary {
    background: var(--accent);
    color: #0a0a0a;
  }
  .btn-accent-outline {
    background: transparent;
    border: 0.5px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
  }
  .btn-muted-outline {
    background: transparent;
    border: 0.5px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.5);
  }
</style>
