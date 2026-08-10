<script lang="ts">
  let {
    count = 0,
    accent = 'var(--accent)'
  }: {
    count?: number
    accent?: string
  } = $props()
</script>

<div class="streak-overlay" id="streak-overlay" data-component="StreakOverlay">
  <div class="stack-center">
    <div class="streak-flame">🔥</div>
    <div class="streak-count">{count}</div>
    <div class="streak-subtitle">Semanas consecutivas</div>
    <div class="streak-encourage" style="color:{accent}">¡Sigue así!</div>
  </div>
</div>

<style>
  .streak-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    animation: fadeIn 0.3s ease;
  }

  .stack-center {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .streak-flame {
    font-size: 80px;
    line-height: 1;
    animation: flameBounce 0.6s ease infinite alternate;
  }

  .streak-count {
    font-family: var(--font-sans);
    font-size: 96px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -4px;
    line-height: 1;
    margin-top: 4px;
  }

  .streak-subtitle {
    font-family: var(--font-mono);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    margin-top: 6px;
  }

  .streak-encourage {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 600;
    margin-top: 14px;
    opacity: 1;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes flameBounce {
    from { transform: translateY(0); }
    to { transform: translateY(-8px); }
  }
</style>
