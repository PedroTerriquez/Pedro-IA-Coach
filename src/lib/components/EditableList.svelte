<script lang="ts">
  import Icon from './Icon.svelte'
  import IconButton from './IconButton.svelte'
  import TextInput from './TextInput.svelte'

  // Each item is one field (a tip) or two stacked fields (alternative: name + reason).
  // Removing doesn't ask: nothing is deleted until the sheet's Guardar.
  let { items = $bindable([]), placeholders, addLabel, removeLabel, emptyItem }: {
    items: string[][]
    placeholders: string[]
    addLabel: string
    removeLabel: string
    emptyItem: string[]
  } = $props()

  function add() {
    items = [...items, [...emptyItem]]
  }

  function remove(i: number) {
    items = items.filter((_, idx) => idx !== i)
  }
</script>

<div class="list" class:pairs={placeholders.length > 1} data-component="EditableList">
  {#each items as item, i}
    <div class="row">
      <div class="fields">
        {#each item as _, f}
          <TextInput variant="field" bind:value={items[i][f]} placeholder={placeholders[f]} />
        {/each}
      </div>
      <IconButton icon="x" size="sm" label={removeLabel} onclick={() => remove(i)} />
    </div>
  {/each}
</div>
<button type="button" class="add" onclick={add}><Icon name="plus" size={18} />{addLabel}</button>

<style>
  .list { display: flex; flex-direction: column; gap: 8px; }
  .list.pairs { gap: 16px; }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: 4px; align-items: center; margin-right: -10px; }
  .pairs .row { align-items: start; }
  .pairs .row :global([data-component="IconButton"]) { margin-top: 4px; }
  .fields { display: flex; flex-direction: column; gap: 8px; }
  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 56px;
    border-radius: var(--radius-lg);
    border: 1px dashed var(--cv-line-strong);
    background: transparent;
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
