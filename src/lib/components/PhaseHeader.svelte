<script lang="ts">
  import Chip from './Chip.svelte'
  import TimerRing from './TimerRing.svelte'
  import type { Snippet } from 'svelte'

  let {
    accent = 'var(--accent)',
    dayName = '',
    daySubtitle = '',
    weekName = '',
    weekTag = '',
    showLiveDot = false,
    showTimer = false,
    timerDisplay = '',
    timerSweepPct = 0,
    children
  }: {
    accent: string
    dayName: string
    daySubtitle: string
    weekName: string
    weekTag: string
    showLiveDot?: boolean
    showTimer?: boolean
    timerDisplay?: string
    timerSweepPct?: number
    children?: Snippet
  } = $props()
</script>

<div class="phase-header" data-component="PhaseHeader">
  {#if showLiveDot}
    <div class="eyebrow-row">
      <span class="live-dot" style="background:{accent};box-shadow:0 0 8px {accent}"></span>
    </div>
  {/if}
  <div class="hero-row">
    <div class="hero-title">{dayName}</div>
    <div class="hero-actions">
      {#if weekName}
        <Chip color="{accent}1c" textColor={accent}>{weekName}{weekTag ? ' · ' + weekTag : ''}</Chip>
      {/if}
      {#if showTimer}
        <TimerRing sweepPct={timerSweepPct} display={timerDisplay || '—'} {accent} />
      {/if}
    </div>
  </div>
  {#if daySubtitle}<div class="hero-subtitle">{daySubtitle}</div>{/if}
  {#if children}{@render children()}{/if}
</div>

<style>
  .phase-header { flex-shrink: 0; padding: 0 4px 2px; }
  .hero-title { font-family: var(--font-sans); font-size: 42px; font-weight: 700; color: var(--text); letter-spacing: -1.8px; line-height: 1; margin-top: 6px; }
  .hero-subtitle { margin-top: 5px; font-size: 13px; color: rgba(255,255,255,0.5); }
  .hero-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 7px; }
  .hero-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .eyebrow-row { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .live-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
</style>
