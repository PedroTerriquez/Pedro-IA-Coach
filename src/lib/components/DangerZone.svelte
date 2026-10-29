<script lang="ts">
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  // The destructive action at the bottom of a sheet, under a hairline.
  // Text by default; `filled` = full red button with the trash icon.
  let { label, onclick, filled = false }: {
    label: string
    onclick: () => void
    filled?: boolean
  } = $props()
</script>

<div class="far" class:filled data-component="DangerZone">
  {#if filled}
    <Button size="lg" variant="danger" {onclick}><Icon name="trash" size={18} />{label}</Button>
  {:else}
    <Button size="lg" variant="danger-text" style="align-self:center" {onclick}>{label}</Button>
  {/if}
</div>

<style>
  .far { display: flex; flex-direction: column; padding-top: 6px; margin-bottom: -14px; border-top: 0.5px solid var(--border-medium); }
  .far.filled { padding-top: 20px; margin-bottom: 0; }
</style>
