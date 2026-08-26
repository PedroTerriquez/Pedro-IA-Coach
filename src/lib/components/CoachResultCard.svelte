<script lang="ts">
  import CyberpunkCard from './CyberpunkCard.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'
  import StatsGrid from './StatsGrid.svelte'
  import StatBlock from './StatBlock.svelte'
  import LoadingSpinner from './LoadingSpinner.svelte'
  import Button from './Button.svelte'

  let {
    analysis,
    accent = 'var(--accent)',
    loading = false,
    error = false,
    units = 'kg',
    onclick,
    onretry,
  }: {
    analysis: any
    accent?: string
    loading?: boolean
    error?: boolean
    units?: string
    onclick?: () => void
    onretry?: () => void
  } = $props()

  function formatDuration(sec?: number): string {
    if (sec == null || sec < 0) return '—'
    return `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`
  }
</script>

<div class="coach-scroll" data-component="CoachResultCard">
  <CyberpunkCard label="WORKOUT_ANALYSIS v1.0" {accent}>
    <div class="coach-top-row">
      <div class="coach-badge">
        <span class="badge-dot" style="background:{accent}"></span>
        {loading ? 'PROCESSING' : error ? 'ERROR' : 'ANALYSIS READY'}
      </div>
      <DebugAIToggle label="Today Workout IA" {accent} />
    </div>

    <StatsGrid columns={4} variant="card">
      <StatBlock value={analysis?.streak_weeks ?? '—'} label="Racha" {accent} />
      <StatBlock value={analysis?.total_volume ?? '—'} label="Volumen" unit={analysis ? units : undefined} {accent} />
      <StatBlock value={analysis?.pr_count ?? '—'} label="PRs" {accent} />
      <StatBlock value={formatDuration(analysis?.sessionDurationSec)} label="Duración" {accent} />
    </StatsGrid>

    {#if loading}
      <div class="loading-wrap">
        <LoadingSpinner text="Analizando tu entrenamiento…" {accent} />
      </div>
    {:else if error}
      <div class="error-block">
        <div class="error-text">No pudimos conectar con el coach. Revisa tu conexión e intenta de nuevo.</div>
        <Button variant="secondary" size="sm" onclick={onretry}>Reintentar</Button>
      </div>
    {:else if analysis}
      <div class="analysis-section" {onclick}>
        <div class="analysis-text">{analysis.analysis || ''}</div>
        {#if analysis.proximo_objetivo}
          <div class="objective-box" style="border-color:color-mix(in srgb, {accent} 30%, transparent);background:color-mix(in srgb, {accent} 5%, transparent)">
            <div class="objective-label" style="color:{accent}">Próximo Objetivo</div>
            <div class="objective-text" style="color:{accent}">{analysis.proximo_objetivo}</div>
          </div>
        {/if}
        {#if analysis.recommendations?.length > 0}
          <div class="rec-chips">
            {#each analysis.recommendations.slice(0, 5) as rec}
              <span class="rec-chip" style="background:color-mix(in srgb, {accent} 10%, transparent);border-color:color-mix(in srgb, {accent} 25%, transparent);color:{accent}">
                <span class="rec-dot" style="background:{accent}"></span>{rec}
              </span>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </CyberpunkCard>
</div>

<style>
  .coach-scroll { margin-top: 12px; }
  .coach-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
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
  .loading-wrap {
    padding: 16px 0;
  }
  .error-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    padding: 12px 0;
  }
  .error-text {
    font-size: 13px;
    line-height: 1.5;
    color: rgba(255,255,255,0.7);
    font-family: var(--font-sans);
  }
  .analysis-section { cursor: pointer; }
  .analysis-text {
    margin-top: 4px;
    font-size: 14px;
    line-height: 1.55;
    color: rgba(255,255,255,0.9);
    font-family: var(--font-sans);
    letter-spacing: -0.1px;
  }
  .objective-box {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    border: 0.5px solid;
  }
  .objective-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .objective-text {
    font-size: 15px;
    line-height: 1.5;
    font-family: var(--font-sans);
    font-weight: 600;
    letter-spacing: -0.3px;
  }
  .rec-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 12px;
  }
  .rec-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 9999px;
    border: 0.5px solid;
    font-family: var(--font-sans);
    font-size: 11px;
    font-weight: 600;
  }
  .rec-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    display: inline-block;
  }
</style>
