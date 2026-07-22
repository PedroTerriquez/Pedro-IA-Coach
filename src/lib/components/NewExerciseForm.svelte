<script lang="ts">
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'

  let {
    name = $bindable(''),
    muscle = $bindable(''),
    onsave = () => {},
    oncancel = () => {}
  }: {
    name?: string
    muscle?: string
    onsave?: () => void
    oncancel?: () => void
  } = $props()
</script>

<div class="card new-ex-card" data-component="NewExerciseForm">
  <div class="card-title">Nuevo ejercicio</div>
  <div class="stack">
    <TextInput bind:value={name} placeholder="Nombre del ejercicio" />
    <TextInput bind:value={muscle} placeholder="Músculo (ej: Pecho, Espalda)" />
    <div class="row">
      <Button variant="primary" fullWidth onclick={onsave}>Guardar</Button>
      <Button variant="secondary" fullWidth onclick={oncancel}>Cancelar</Button>
    </div>
  </div>
</div>

<style>
  .new-ex-card {
    margin: 0 20px 12px;
    padding: 14px 16px;
  }

  .card-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 10px;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
  }
</style>
