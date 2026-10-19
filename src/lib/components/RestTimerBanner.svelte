<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import Icon from './Icon.svelte'

  let {
    visible = false,
    endTime = 0,
    restSec = 0,
    name = '',
    sets = 0,
    reps = '',
    setIndex = undefined,
    inSheet = false,
    onskip = undefined,
    onexpand = undefined
  }: {
    visible: boolean
    endTime: number
    restSec: number
    name: string
    sets: number
    reps: string
    /** Sets already done today (the Nth Iniciar); the next one is setIndex + 1 */
    setIndex?: number
    /** A detail sheet is open: sit at its bottom, where its LogDock was */
    inSheet?: boolean
    onskip?: () => void
    onexpand?: () => void
  } = $props()

  let remainingMs = $state(0)
  let tickId: ReturnType<typeof setInterval> | null = null

  let displayName = $derived(getExerciseDisplayName({ name }) || name)
  let meta = $derived(metaLine(setIndex, sets, reps))

  function metaLine(done: number | undefined, total: number, r: string): string {
    if (done !== undefined && total && done < total) return `Sigue la serie ${done + 1} de ${total}`
    return total && r ? `${total} × ${r}` : ''
  }

  function fmtClock(ms: number) {
    const total = Math.max(0, Math.ceil(ms / 1000))
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
  }

  function ringOffset(ms: number) {
    const dur = restSec * 1000
    const pct = dur > 0 ? Math.max(0, Math.min(1, ms / dur)) : 0
    return 100 * (1 - pct)
  }

  $effect(() => {
    if (tickId) { clearInterval(tickId); tickId = null }
    if (!visible || endTime <= 0) return
    remainingMs = Math.max(0, endTime - Date.now())
    tickId = setInterval(() => {
      remainingMs = Math.max(0, endTime - Date.now())
    }, 1000)
    return () => { if (tickId) clearInterval(tickId) }
  })
</script>

{#if visible && remainingMs > 0}
  <div class="rtb" class:in-sheet={inSheet} data-component="RestTimerBanner">
    <button class="rtb-open" type="button" aria-label="Abrir descanso a pantalla completa" onclick={onexpand}>
      <span class="rtb-ring-wrap">
        <svg class="rtb-ring" viewBox="0 0 56 56" aria-hidden="true">
          <circle class="rtb-ring-track" cx="28" cy="28" r="24"></circle>
          <circle class="rtb-ring-prog" cx="28" cy="28" r="24" pathLength="100" style="stroke-dashoffset:{ringOffset(remainingMs)}"></circle>
        </svg>
        <b class="rtb-time">{fmtClock(remainingMs)}</b>
      </span>
      <span class="rtb-info">
        <span class="rtb-label">Descanso</span>
        <span class="rtb-name">{displayName}</span>
        {#if meta}<span class="rtb-meta">{meta}</span>{/if}
      </span>
    </button>
    <button class="rtb-skip" type="button" aria-label="Saltar descanso" onclick={onskip}>
      <Icon name="skip" size={22} />
    </button>
  </div>
{/if}

<style>
  /* Thumb zone: where the dock sits, above the TabBar and over any dock */
  .rtb {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 104px;
    margin: 0 auto;
    max-width: 460px;
    z-index: 150;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 12px 14px;
    border-radius: var(--radius-2xl);
    background: var(--surface-hover);
    border: 0.5px solid var(--border-medium);
    box-shadow: 0 -12px 32px rgba(10, 10, 10, 0.9);
    animation: rtb-in 0.4s var(--ease-smooth);
  }
  .rtb.in-sheet { bottom: max(30px, env(safe-area-inset-bottom, 0px)); }
  .rtb-open {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 14px;
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }
  .rtb-ring-wrap { position: relative; width: 64px; height: 64px; flex-shrink: 0; display: grid; place-items: center; }
  .rtb-ring { position: absolute; inset: 0; width: 64px; height: 64px; transform: rotate(-90deg); }
  .rtb-ring-track { fill: none; stroke: var(--cv-fill-on); stroke-width: 4; }
  .rtb-ring-prog {
    fill: none;
    stroke: var(--text);
    stroke-width: 4;
    stroke-linecap: round;
    stroke-dasharray: 100;
    transition: stroke-dashoffset 1s linear;
  }
  .rtb-time { position: relative; font-family: var(--font-mono); font-size: 17px; font-weight: 600; letter-spacing: -0.04em; font-variant-numeric: tabular-nums; }
  .rtb-info { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .rtb-label { white-space: nowrap; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .rtb-name { font-size: 18px; font-weight: 600; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .rtb-meta { font-size: 13px; color: var(--text-tertiary); }
  .rtb-skip {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-lg);
    border: 0;
    background: var(--cv-fill-2);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .rtb-skip:active { transform: scale(0.95); }
  @keyframes rtb-in {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .rtb { animation: none; }
  }
</style>
