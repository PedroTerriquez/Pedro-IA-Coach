<script lang="ts">
  import type { Snippet } from 'svelte'
  import GlowCard from './GlowCard.svelte'
  import StatBlock from './StatBlock.svelte'

  let {
    analysis,
    accent = '#d4ff3a',
    loading = false,
    exerciseCount = 0,
    onclick,
  }: {
    analysis: any
    accent?: string
    loading?: boolean
    exerciseCount?: number
    onclick?: () => void
  } = $props()
</script>

<div class="coach-scroll">
  <div class="stats-grid">
    <StatBlock value={exerciseCount} label="Ejercicios" {accent} />
    <StatBlock value="—" label="Volumen" {accent} />
    <StatBlock value={0} label="PRs" {accent} />
  </div>
  {#if loading}
    <GlowCard blobColor={accent} borderColor="{accent}2e" padding="18px">
      <div class="loading-row">
        <div class="loading-spinner-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="{accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>
        </div>
        <span class="loading-text">Analizando tu entrenamiento…</span>
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
  .coach-scroll { flex: 1; min-height: 0; overflow-y: auto; margin-top: 16px; }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .loading-row { display: flex; align-items: center; gap: 10px; }
  .loading-spinner-wrap { width: 20px; text-align: center; }
  .spinner { animation: spin 1s linear infinite; }
  .loading-text { font-size: 13px; color: var(--text-secondary); }
  .coach-header { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; font-weight: 600; }
  .coach-header-icon { width: 22px; height: 22px; border-radius: 7px; display: inline-flex; align-items: center; justify-content: center; }
  .analysis-text { margin-top: 12px; font-size: 14.5px; line-height: 1.55; color: rgba(255,255,255,0.9); font-family: var(--font-sans); letter-spacing: -0.1px; }
  .objective-box { margin-top: 14px; padding: 12px 14px; border-radius: 14px; border: 0.5px solid; }
  .objective-label { font-family: var(--font-mono); font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
  .objective-text { font-size: 16px; line-height: 1.5; font-family: var(--font-sans); font-weight: 600; letter-spacing: -0.4px; }
  .rec-chips { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
  .rec-chip { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9999px; border: 0.5px solid; font-family: var(--font-sans); font-size: 11.5px; font-weight: 600; }
  .rec-dot { width: 4px; height: 4px; border-radius: 50%; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
