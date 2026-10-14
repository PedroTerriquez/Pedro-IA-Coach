<script lang="ts">
  import Button from './Button.svelte'

  let { title, text = '', confirmLabel, cancelLabel = 'Cancelar', flat = false, onconfirm, oncancel }: {
    title: string
    text?: string
    confirmLabel: string
    cancelLabel?: string
    /** Inside a grouped list: no own radius */
    flat?: boolean
    onconfirm: () => void
    oncancel: () => void
  } = $props()
</script>

<div class="confirm" class:flat role="alertdialog" aria-label={title} data-component="InlineConfirm">
  <span class="confirm-t">{title}</span>
  {#if text}<p>{text}</p>{/if}
  <div class="pair">
    <Button variant="secondary" size="lg" onclick={oncancel}>{cancelLabel}</Button>
    <Button variant="danger" size="lg" onclick={onconfirm}>{confirmLabel}</Button>
  </div>
</div>

<style>
  .confirm { display: flex; flex-direction: column; gap: 12px; padding: 18px; border-radius: var(--radius-lg); background: var(--cv-fill-1); }
  .confirm.flat { border-radius: 0; background: rgba(255,255,255,0.03); }
  .confirm-t { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  p { font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; }
  .pair :global(.btn-base) { height: 52px; border-radius: var(--cv-radius-field); }
</style>
