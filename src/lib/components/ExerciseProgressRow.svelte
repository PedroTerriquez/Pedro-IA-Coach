<script lang="ts">
  import IconButton from './IconButton.svelte'

  // A row of Historial › Ejercicios (Historial · Nuevo 01): the trend in gray
  // with the last point white, the last weight and how much it went up. While
  // editing, a 44 pencil takes the place of the chart and the figures.
  let { name, sub, points = [], last, units, delta = '', editing = false, onopen, onedit }: {
    name: string
    /** «Pecho · hoy» */
    sub: string
    /** Weights in date order; fewer than two draws no chart */
    points?: number[]
    last: string
    units: string
    /** «+25 kg» / «−5 kg» / '' */
    delta?: string
    editing?: boolean
    onopen?: () => void
    onedit?: () => void
  } = $props()

  const W = 64
  const H = 28
  const PAD = 3

  let chart = $derived.by(() => {
    if (points.length < 2) return null
    const min = Math.min(...points)
    const range = Math.max(...points) - min || 1
    const xy = points.map((v, i) => [
      PAD + (i / (points.length - 1)) * (W - PAD * 2),
      PAD + (H - PAD * 2) * (1 - (v - min) / range),
    ])
    return { path: xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '), end: xy[xy.length - 1] }
  })
</script>

<svelte:element
  this={editing ? 'div' : 'button'}
  type={editing ? undefined : 'button'}
  class="row"
  class:editing
  data-component="ExerciseProgressRow"
  role={editing ? 'group' : undefined}
  onclick={editing ? undefined : onopen}
>
  <span class="min0">
    <span class="n">{name}</span>
    <span class="s">{sub}</span>
  </span>
  {#if editing}
    <IconButton icon="pencil" size="sm" variant="filled" label="Editar {name}" onclick={onedit} />
  {:else}
    <span class="chart">
      {#if chart}
        <svg width={W} height={H} viewBox="0 0 {W} {H}" aria-hidden="true">
          <path d={chart.path} fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <circle cx={chart.end[0]} cy={chart.end[1]} r="3" fill="var(--text)" />
        </svg>
      {/if}
    </span>
    <span class="fig">
      <span class="w">{last} <small>{units}</small></span>
      {#if delta}<span class="d">{delta}</span>{/if}
    </span>
  {/if}
</svelte:element>

<style>
  .row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px 76px;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 68px;
    padding: 10px 16px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
  }
  button.row { cursor: pointer; }
  .row.editing { grid-template-columns: minmax(0, 1fr) 44px; padding-right: 12px; }
  .min0 { min-width: 0; }
  .n { display: block; font-size: 16px; font-weight: 600; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .s { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .chart { display: block; width: 64px; height: 28px; }
  .chart svg { display: block; }
  .fig { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
  .w { font-family: var(--font-mono); font-size: 19px; font-weight: 500; letter-spacing: -0.03em; white-space: nowrap; }
  .w small { font-size: 12px; color: var(--text-tertiary); }
  .d { font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
</style>
