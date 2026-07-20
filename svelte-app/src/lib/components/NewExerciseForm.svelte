<script lang="ts">
  let {
    name = '',
    muscle = '',
    onnameinput = () => {},
    onmuscleinput = () => {},
    onsave = () => {},
    oncancel = () => {}
  }: {
    name?: string
    muscle?: string
    onnameinput?: (val: string) => void
    onmuscleinput?: (val: string) => void
    onsave?: () => void
    oncancel?: () => void
  } = $props()
</script>

<div class="card new-ex-card">
  <div class="card-title">Nuevo ejercicio</div>
  <div class="stack">
    <input class="input-field" value={name} oninput={(e) => onnameinput((e.target as HTMLInputElement).value)} placeholder="Nombre del ejercicio">
    <input class="input-field" value={muscle} oninput={(e) => onmuscleinput((e.target as HTMLInputElement).value)} placeholder="Músculo (ej: Pecho, Espalda)">
    <div class="row">
      <button onclick={onsave} class="btn-primary-cta">Guardar</button>
      <button onclick={oncancel} class="btn-secondary">Cancelar</button>
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

  .input-field {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-sans);
    outline: none;
    box-sizing: border-box;
  }

  .btn-primary-cta {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 0;
    cursor: pointer;
    background: var(--accent, #d4ff3a);
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 700;
  }

  .btn-secondary {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    border: 0;
    cursor: pointer;
    background: var(--border);
    color: rgba(255,255,255,0.6);
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
  }
</style>
