<script lang="ts">
  import Button from './Button.svelte'

  let {
    value = '',
    oninput = () => {},
    oncreate = () => {}
  }: {
    value?: string
    oninput?: (val: string) => void
    oncreate?: () => void
  } = $props()
</script>

<div class="card program-create-card">
  <div class="row">
    <input
      {value}
      oninput={(e) => oninput((e.target as HTMLInputElement).value)}
      placeholder="Nombre del nuevo programa"
      class="text-input"
      style="flex:1"
    >
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

  .text-input {
    padding: 10px 12px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
    outline: none;
    box-sizing: border-box;
    font-family: var(--font-sans);
  }


</style>
