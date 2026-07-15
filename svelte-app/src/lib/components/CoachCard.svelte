<script lang="ts">
  let { message, accent = '#d4ff3a' }: {
    message: string
    accent?: string
  } = $props()
</script>

<div class="coach-card" style="border-color: {accent}33">
  <div class="coach-header" style="color: {accent}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    Coach IA
  </div>
  <p>{message}</p>
</div>

<style>
  .coach-card {
    background: rgba(20,20,20,0.9);
    border-radius: 16px;
    border: 0.5px solid;
    padding: 16px;
    margin-bottom: 12px;
  }
  .coach-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  p {
    font-size: 13.5px;
    line-height: 1.55;
    color: rgba(255,255,255,0.85);
    font-family: 'Space Grotesk', sans-serif;
  }
</style>
