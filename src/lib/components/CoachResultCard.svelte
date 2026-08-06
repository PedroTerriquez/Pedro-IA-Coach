<script lang="ts">
  import type { Snippet } from 'svelte'
  import GlowCard from './GlowCard.svelte'
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
</script>

<div class="coach-scroll" data-component="CoachResultCard">
  <StatsGrid columns={3} variant="card">
    <StatBlock value={analysis?.streak_days ?? '—'} label="Racha" {accent} />
    <StatBlock value={analysis?.total_volume ?? '—'} label="Volumen" unit={analysis ? units : undefined} {accent} />
    <StatBlock value={analysis?.pr_count ?? '—'} label="PRs" {accent} />
  </StatsGrid>
  {#if loading}
    <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px">
      <LoadingSpinner text="Analizando tu entrenamiento…" {accent} />
    </GlowCard>
  {:else if error}
    <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px">
      <div id="coach-card-error" class="error-block">
        <div class="error-text">No pudimos conectar con el coach. Revisa tu conexión e intenta de nuevo.</div>
        <Button variant="secondary" size="sm" onclick={onretry}>Reintentar</Button>
      </div>
    </GlowCard>
  {:else if analysis}
    <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px" {onclick}>
      <div id="coach-card-regen">
        <div class="coach-header" style="color:{accent}">
          <span class="coach-header-icon" style="background:{accent}1f">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><circle cx="12" cy="12" r="10"/></svg>
          </span>
          Resumen del coach
        </div>
        <div class="analysis-text">{analysis.analysis || ''}</div>
        {#if analysis.proximo_objetivo}
          <div class="objective-box" style="border-color:{accent}3a;background:{accent}0d">
            <div class="objective-label" style="color:{accent}">Próximo Objetivo</div>
            <div class="objective-text" style="color:{accent}">{analysis.proximo_objetivo}</div>
          </div>
        {/if}
        {#if analysis.recommendations?.length > 0}
          <div class="rec-chips">
            {#each analysis.recommendations.slice(0, 5) as rec}
              <span class="rec-chip" style="background:{accent}16;border-color:{accent}3a;color:{accent}"><span class="rec-dot" style="background:{accent}"></span>{rec}</span>
            {/each}
          </div>
        {/if}
      </div>
    </GlowCard>
  {/if}
</div>

<style>
  .coach-scroll { margin-top: 16px; }
  .error-block { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 6px 0; }
  .error-text { font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,0.7); font-family: var(--font-sans); }
  .coach-header { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 600; }
  .coach-header-icon { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; }
  .analysis-text { margin-top: 12px; font-size: 14.5px; line-height: 1.55; color: rgba(255,255,255,0.9); font-family: var(--font-sans); letter-spacing: -0.1px; }
  .objective-box { margin-top: 14px; padding: 12px 14px; border-radius: 14px; border: 0.5px solid; }
  .objective-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .objective-text { font-size: 16px; line-height: 1.5; font-family: var(--font-sans); font-weight: 600; letter-spacing: -0.4px; }
  .rec-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
  .rec-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9999px; border: 0.5px solid; font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; }
  .rec-dot { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }
</style>
