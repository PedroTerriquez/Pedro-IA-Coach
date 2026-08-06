<script lang="ts">
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'

  let {
    value = $bindable(''),
    oncreate = () => {}
  }: {
    value?: string
    oncreate?: () => void
  } = $props()
</script>

<div class="card program-create-card" data-component="ProgramCreateForm">
  <div class="row">
    <div class="input-wrap">
      <TextInput
        bind:value
        placeholder="Nombre del nuevo programa"
      />
    </div>
    <Button variant="primary" onclick={oncreate}>+ Nuevo</Button>
  </div>
</div>

<style>
  .program-create-card {
    padding: 14px 16px;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .input-wrap {
    flex: 1;
  }
</style>
