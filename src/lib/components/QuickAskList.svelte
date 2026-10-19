<script lang="ts">
  import Icon from './Icon.svelte'
  import Button from './Button.svelte'

  // Ready-made questions of the exercise coach: a list of 52 rows, or a grid
  // of 56 buttons (`grid`, the body parts) with «Cancelar» under it.
  let { label, items, layout = 'list', disabled = false, onpick, oncancel = undefined }: {
    label: string
    items: string[]
    layout?: 'list' | 'grid'
    disabled?: boolean
    onpick: (item: string) => void
    oncancel?: () => void
  } = $props()
</script>

<div class="qa" data-component="QuickAskList">
  <span class="lbl">{label}</span>
  <div class={layout}>
    {#each items as item}
      <button type="button" class="qk" {disabled} onclick={() => onpick(item)}>
        <span>{item}</span>
        {#if layout === 'list'}<Icon name="chev" size={16} color="var(--text-muted)" />{/if}
      </button>
    {/each}
  </div>
  {#if oncancel}<Button variant="text" size="lg" onclick={oncancel}>Cancelar</Button>{/if}
</div>

<style>
  .qa { display: flex; flex-direction: column; gap: 8px; }
  .lbl { padding: 0 4px 4px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .qk {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 0 14px 0 16px;
    border: 0;
    border-radius: var(--cv-radius-field);
    background: var(--cv-fill-5);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
  }
  .qk:disabled { opacity: 0.5; cursor: default; }
  .grid .qk { min-height: 56px; justify-content: center; padding: 0 12px; text-align: center; }
</style>
