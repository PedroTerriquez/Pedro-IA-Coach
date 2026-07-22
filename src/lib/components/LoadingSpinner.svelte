<script lang="ts">
  let {
    text = 'Cargando...',
    accent = 'var(--accent)',
    style = ''
  }: {
    text?: string
    accent?: string
    style?: string
  } = $props()
</script>

<div class="loading-spinner" {style}>
  <div class="spinner-wrap">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
      <line x1="12" y1="2" x2="12" y2="6"/>
      <line x1="12" y1="18" x2="12" y2="22"/>
      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
      <line x1="2" y1="12" x2="6" y2="12"/>
      <line x1="18" y1="12" x2="22" y2="12"/>
      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
    </svg>
  </div>
  <span class="spinner-text">{text}</span>
</div>

<style>
  .loading-spinner {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px;
  }
  .spinner-wrap {
    width: 20px;
    text-align: center;
  }
  .spinner {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spinner-text {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
  }
</style>
