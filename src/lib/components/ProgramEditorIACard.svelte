<script lang="ts">
  import Button from './Button.svelte'
  import CyberpunkCard from './CyberpunkCard.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'

  let {
    accent = 'var(--accent)',
    onopen = () => {}
  }: {
    accent?: string
    onopen?: () => void
  } = $props()
</script>

<div class="section-pad-bot" data-component="ProgramEditorIACard">
  <CyberpunkCard label="PROGRAM_COACH v3.0" {accent}>
    <div class="coach-top-row">
      <div class="coach-badge">
        <span class="badge-dot" style="background:{accent}"></span>
        COACH ONLINE
      </div>
      <DebugAIToggle label="Program Editor IA" {accent} />
    </div>
    <div class="card-subtitle">Platica con el coach sobre tu programa actual: qué está bien, qué cambiar. Cuando estén de acuerdo, aplica los cambios.</div>
    <Button variant="primary" {accent} fullWidth onclick={onopen}>Mejorar programa actual</Button>
  </CyberpunkCard>
</div>

<style>
  .section-pad-bot { padding: 0 0 12px; }
  .coach-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  .coach-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.7);
  }
  .badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    animation: dot-blink 1s step-end infinite;
  }
  @keyframes dot-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }
  .card-subtitle {
    font-size: 10px;
    color: var(--text-secondary);
    margin-bottom: 10px;
    line-height: 1.4;
  }
</style>
