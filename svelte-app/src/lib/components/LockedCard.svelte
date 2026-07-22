<script lang="ts">
  let { title, subtitle }: { title: string; subtitle: string } = $props()
</script>

<div class="locked-card">
  <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/>
    <path d="M5 7V5a3 3 0 016 0v2" stroke="rgba(255,255,255,0.3)" stroke-width="1.4"/>
  </svg>
  <div class="locked-title">{title}</div>
  <div class="locked-subtitle">{subtitle}</div>
</div>

<style>
  .locked-card {
    flex: 1;
    min-height: 0;
    border-radius: 22px;
    padding: 18px 18px 16px;
    box-sizing: border-box;
    background: rgba(255,255,255,0.02);
    border: 0.5px dashed rgba(255,255,255,0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }
  .locked-title {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.5);
    letter-spacing: -0.2px;
    line-height: 1.3;
  }
  .locked-subtitle {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    line-height: 1.4;
  }
</style>
