<script lang="ts">
  import type { Snippet } from 'svelte'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import InlineConfirm from './InlineConfirm.svelte'

  // Base for every edit sheet: title, body, Guardar (+ Cancelar), and an optional
  // dangerous action at the very end that confirms inside the sheet itself.
  let {
    open = $bindable(false),
    title,
    saveLabel = 'Guardar',
    cancel = true,
    danger = undefined,
    id = undefined,
    onsave,
    onclose = () => {},
    children
  }: {
    open: boolean
    title: string
    saveLabel?: string
    /** Show «Cancelar» under Guardar */
    cancel?: boolean
    danger?: { label: string; title: string; text: string; confirmLabel: string; onconfirm: () => void }
    id?: string
    onsave: () => void
    onclose?: () => void
    children?: Snippet
  } = $props()

  let asking = $state(false)

  $effect(() => {
    if (!open) asking = false
  })

  function close() {
    open = false
    onclose()
  }
</script>

<Sheet bind:open {title} {id} onclose={close}>
  <div class="fset" class:off={asking}>
    {@render children?.()}
  </div>
  {#if asking && danger}
    <InlineConfirm
      title={danger.title}
      text={danger.text}
      confirmLabel={danger.confirmLabel}
      oncancel={() => asking = false}
      onconfirm={danger.onconfirm}
    />
  {:else}
    <div class="acts">
      <Button size="lg" variant="primary" onclick={onsave}>{saveLabel}</Button>
      {#if cancel}<Button size="lg" variant="text" style="align-self:center" onclick={close}>Cancelar</Button>{/if}
    </div>
    {#if danger}
      <div class="far">
        <Button size="lg" variant="danger-text" style="align-self:center" onclick={() => asking = true}>{danger.label}</Button>
      </div>
    {/if}
  {/if}
</Sheet>

<style>
  .fset { display: flex; flex-direction: column; gap: 18px; }
  .fset.off { opacity: 0.35; pointer-events: none; }
  .acts { display: flex; flex-direction: column; gap: 4px; }
  .far { display: flex; flex-direction: column; padding-top: 6px; margin-bottom: -14px; border-top: 0.5px solid var(--border-medium); }
</style>
