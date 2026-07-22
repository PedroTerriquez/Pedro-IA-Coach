<script lang="ts">
  let {
    accent = 'var(--accent)',
    onselect = () => {}
  }: {
    accent?: string
    onselect?: (effort: string) => void
  } = $props()

  const efforts = [
    ['easy', '💪', 'Fácil', 'Podía más, para subir peso'],
    ['good', '👍', 'Justo', 'Peso correcto, lo planeado'],
    ['heavy', '😮‍💨', 'Pesado', 'Me costó trabajo'],
    ['failure', '🛑', 'Al fallo', 'Llegué al fallo muscular, no daba más']
  ] as const
</script>

<div class="effort-selector" data-component="EffortSelector">
  <div class="dialog-center">
    <div class="dialog-emoji">🧑‍🏫</div>
    <div class="dialog-title">¿Cómo sentiste la sesión?</div>
    <div class="dialog-desc">Esto ayuda a Pedro a darte mejor feedback</div>
  </div>
  <div class="stack">
    {#each efforts as [eff, emoji, label, desc]}
      <button class="effort-btn" data-effort={eff} onclick={() => onselect(eff)}>
        <div class="effort-emoji" style="background:{accent}1a;border-color:{accent}33">{emoji}</div>
        <div>
          <div class="effort-label">{label}</div>
          <div class="effort-desc">{desc}</div>
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .effort-selector {
    display: flex;
    flex-direction: column;
  }

  .dialog-center {
    text-align: center;
    margin-bottom: 20px;
  }

  .dialog-emoji {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .dialog-title {
    font-family: var(--font-sans);
    font-size: 20px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
  }

  .dialog-desc {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 6px;
  }

  .stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .effort-btn {
    padding: 14px;
    border-radius: 14px;
    border: 0.5px solid var(--border);
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    transition: all 0.15s;
    width: 100%;
  }

  .effort-emoji {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    border: 0.5px solid;
    flex-shrink: 0;
  }

  .effort-label {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }

  .effort-desc {
    font-family: var(--font-sans);
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    margin-top: 2px;
  }
</style>
