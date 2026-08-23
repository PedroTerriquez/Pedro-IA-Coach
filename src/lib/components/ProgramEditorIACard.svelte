<script lang="ts">
  import Button from './Button.svelte'
  import TextArea from './TextArea.svelte'
  import CoachResponseCard from './CoachResponseCard.svelte'
  import SectionLabel from './SectionLabel.svelte'
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
  <div id="you-prog-coach-card" class="card coach-card">
    <div class="card-content">
      <div class="coach-title-wrap"><SectionLabel {accent}>Coach IA de programas</SectionLabel></div>
      <div class="card-subtitle">Pregunta o pide cambios en tu rutina.</div>
      <TextArea value={coachInput} placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' {oninput} />
      <div id="prog-coach-status" class="status-text">{coachStatus}</div>
      <DebugAIToggle {accent} />
    </div>
    <div class="submit-wrap">
      <Button variant="primary" fullWidth onclick={onsubmit}>Enviar al coach</Button>
    </div>
    {#if coachResponseVisible}
      <div class="coach-response-wrap">
        <CoachResponseCard {accent} provider={coachProvider}>
          {coachResponseText}
        </CoachResponseCard>
      </div>
    {/if}
  </div>
</div>

<style>
  .coach-card { margin: 0 20px; overflow: hidden; }
  .card-content { padding: 14px 16px; }
  .coach-title-wrap { margin-bottom: 6px; }
  .coach-title-wrap :global(.section-label) { padding: 0; }
  .coach-response-wrap { padding: 0 16px 14px; }
  .submit-wrap { margin: 0 16px 14px; }
</style>
