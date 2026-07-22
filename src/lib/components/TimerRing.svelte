<script lang="ts">
  let {
    sweepPct = 0,
    display = '—',
    accent = 'var(--accent)'
  }: {
    sweepPct?: number
    display?: string
    accent?: string
  } = $props()
</script>

<div class="timer-wrapper">
  <svg width="64" height="64" class="timer-ring">
    <circle cx="32" cy="32" r="27" stroke="rgba(255,255,255,0.08)" stroke-width="5" fill="none"/>
    <circle cx="32" cy="32" r="27" stroke="{accent}cc" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="{sweepPct * 169.65} 169.65" style="transition:stroke-dasharray 0.6s linear"/>
  </svg>
  <div class="timer-inner">
    <div class="timer-value">{display}</div>
    <div class="timer-label">Tiempo</div>
  </div>
</div>

<style>
  .timer-wrapper { width: 64px; height: 64px; position: relative; flex-shrink: 0; background: transparent; border: 0; padding: 0; }
  .timer-ring { position: absolute; inset: 0; transform: rotate(-90deg); }
  .timer-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .timer-value { font-family: var(--font-mono); font-size: 13px; font-weight: 500; color: var(--text); letter-spacing: -0.4px; line-height: 1; font-variant-numeric: tabular-nums; }
  .timer-label { font-family: var(--font-mono); font-size: 8px; letter-spacing: 1.2px; text-transform: uppercase; color: rgba(255,255,255,0.45); margin-top: 3px; }
</style>
