<script lang="ts">
  import CoachIcon from './CoachIcon.svelte'
  import CoachResponseCard from './CoachResponseCard.svelte'

  let {
    accent = '#d4ff3a',
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
          <CoachIcon size={14} color={accent} />
        </span>
        <div>
          <div class="card-title">Coach IA de programas</div>
          <div class="card-subtitle">Pregunta o pide cambios en tu rutina.</div>
        </div>
      </div>
      <textarea id="prog-coach-input" value={coachInput} oninput={(e) => oninput((e.target as HTMLTextAreaElement).value)} rows="4" placeholder='Ej: "Cambia press banca por press inclinado", "¿Está balanceada mi rutina?"' class="textarea-field"></textarea>
      <div id="prog-coach-status" class="status-text">{coachStatus}</div>
    </div>
    <button id="prog-coach-btn" class="btn-accent-full" onclick={onsubmit}>Enviar al coach</button>
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
  .textarea-field { width: 100%; margin-top: 10px; padding: 10px 12px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: #0a0a0a; color: #fafafa; font-size: 13px; font-family: 'Space Grotesk', sans-serif; outline: none; resize: vertical; box-sizing: border-box; line-height: 1.5; }
  .btn-accent-full { margin: 0 16px 14px; width: calc(100% - 32px); padding: 10px; border-radius: 10px; border: 0; cursor: pointer; background: var(--accent, #d4ff3a); color: #0a0a0a; font-family: 'Space Grotesk', sans-serif; font-size: 13px; font-weight: 700; }
  .coach-response-wrap { padding: 0 16px 14px; }
  .row { display: flex; gap: 10px; align-items: center; }
</style>
