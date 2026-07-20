<script lang="ts">
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
    <button onclick={oncreate} class="btn-accent">+ Nuevo</button>
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

  .btn-accent {
    flex-shrink: 0;
    padding: 10px 18px;
    border-radius: 10px;
    border: 0;
    cursor: pointer;
    background: var(--accent, #d4ff3a);
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 700;
  }
</style>
