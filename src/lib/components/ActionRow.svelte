<script lang="ts">
  import type { Snippet } from 'svelte'
  import Button from './Button.svelte'

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

<div class="action-row" data-component="ActionRow">
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
    <Button variant={variant === 'primary' ? 'primary' : 'ghost'} {accent} {onclick} {disabled}>
      {actionLabel}
    </Button>
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
</style>
