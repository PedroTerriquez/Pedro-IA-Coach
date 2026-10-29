<script lang="ts">
  import Icon from './Icon.svelte'
  import IconButton from './IconButton.svelte'
  import TextInput from './TextInput.svelte'
  import Field from './Field.svelte'

  // Short technique phrases: edit in place, ✕ to remove, add at the end.
  // Empty ones are dropped by whoever saves.
  let { tips = $bindable([]) }: { tips: string[] } = $props()

  let added = $state(-1)

  function add() {
    tips = [...tips, '']
    added = tips.length - 1
  }

  function remove(i: number) {
    tips = tips.filter((_, idx) => idx !== i)
    added = -1
  }
</script>

<Field label="Consejos" data-component="TipsEditor">
  {#each tips as _, i}
    <div class="row">
      <TextInput variant="field" bind:value={tips[i]} placeholder="Ej: baja en 3 segundos" autofocus={i === added} />
      <IconButton icon="x" size="sm" label="Quitar consejo" onclick={() => remove(i)} />
    </div>
  {/each}
  <button type="button" class="add" onclick={add}><Icon name="plus" size={18} />Añadir consejo</button>
</Field>

<style>
  .row { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: 4px; align-items: center; margin-right: -10px; }
  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 52px;
    border: 1px dashed var(--cv-line-strong);
    border-radius: var(--cv-radius-field);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
