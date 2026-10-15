<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'

  // A short sheet that asks before something that can't be undone.
  let { open = $bindable(false), title, text = '', confirmLabel, elevated = false, id = undefined, onconfirm }: {
    open: boolean
    title: string
    text?: string
    confirmLabel: string
    /** Over another sheet */
    elevated?: boolean
    id?: string
    onconfirm: () => void
  } = $props()
</script>

<Sheet bind:open {title} {elevated} {id}>
  {#if text}<p>{text}</p>{/if}
  {#snippet footer()}
    <div class="pair">
      <Button size="lg" variant="secondary" onclick={() => open = false}>Cancelar</Button>
      <Button size="lg" variant="danger" onclick={onconfirm}>{confirmLabel}</Button>
    </div>
  {/snippet}
</Sheet>

<style>
  p { margin-top: -4px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
</style>
