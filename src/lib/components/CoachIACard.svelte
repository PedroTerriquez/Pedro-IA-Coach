<script lang="ts">
  import Icon from './Icon.svelte'
  import Button from './Button.svelte'
  import TextArea from './TextArea.svelte'
  import CoachResponseCard from './CoachResponseCard.svelte'

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

<div class="section-pad-bot">
  <div id="you-prog-coach-card" class="card coach-card">
    <div class="card-content">
      <div class="row">
        <span class="coach-icon" style="background:{accent}1f">
          <Icon name="coach" size={14} color={accent} />
        </span>
        <div>
          <div class="card-title">Coach IA de programas</div>
          <div class="card-subtitle">Pregunta o pide cambios en tu rutina.</div>
        </div>
      </div>
      <TextArea value={coachInput} placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' {oninput} />
      <div id="prog-coach-status" class="status-text">{coachStatus}</div>
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
  .coach-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .coach-response-wrap { padding: 0 16px 14px; }
  .submit-wrap { margin: 0 16px 14px; }
  .row { display: flex; gap: 10px; align-items: center; }
</style>
