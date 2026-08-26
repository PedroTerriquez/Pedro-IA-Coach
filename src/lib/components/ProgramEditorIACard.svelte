<script lang="ts">
  import Button from './Button.svelte'
  import TextArea from './TextArea.svelte'
  import CoachResponseCard from './CoachResponseCard.svelte'
  import CyberpunkCard from './CyberpunkCard.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'

  let {
    accent = 'var(--accent)',
    coachInput = '',
    coachStatus = '',
    coachResponseVisible = false,
    coachResponseText = '',
    coachProvider = '',
    oninput = () => {},
    onsubmit = () => {}
  }: {
    accent?: string
    coachInput?: string
    coachStatus?: string
    coachResponseVisible?: boolean
    coachResponseText?: string
    coachProvider?: string
    oninput?: (val: string) => void
    onsubmit?: () => void
  } = $props()
</script>

<div class="section-pad-bot" data-component="ProgramEditorIACard">
  <CyberpunkCard label="PROGRAM_COACH v2.1" {accent}>
    <div class="coach-top-row">
      <div class="coach-badge">
        <span class="badge-dot" style="background:{accent}"></span>
        COACH ONLINE
      </div>
      <DebugAIToggle label="Program Editor IA" {accent} />
    </div>
    <div class="card-subtitle">Pregunta o pide cambios en tu rutina.</div>
    <TextArea value={coachInput} placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' {oninput} />
    <div id="prog-coach-status" class="status-text">{coachStatus}</div>
    <div class="submit-wrap">
      <Button variant="primary" {accent} fullWidth onclick={onsubmit}>Enviar al coach</Button>
    </div>
    {#if coachResponseVisible}
      <div class="coach-response-wrap">
        <CoachResponseCard {accent} provider={coachProvider}>
          {coachResponseText}
        </CoachResponseCard>
      </div>
    {/if}
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
    margin-bottom: 8px;
    line-height: 1.4;
  }
  .submit-wrap { margin-top: 10px; }
  .coach-response-wrap { margin-top: 12px; }
</style>
