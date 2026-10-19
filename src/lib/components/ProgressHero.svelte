<script lang="ts">
  import EmptyState from './EmptyState.svelte'
  import Button from './Button.svelte'
  import {
    recordOf, gainSentence, groupByWeek, sessionLine, deltaPrev, formatDelta,
    shortDate, dayMonth, formatWeight, sortByDate, type HistoryLog,
  } from '$lib/exercise-history'

  // Historial of Detalle v2 (03): the record, how much it went up, a white
  // chart with the last point in accent, then the sessions week by week.
  let { logs = [], units = 'kg', today, exerciseName }: {
    logs?: HistoryLog[]
    units?: string
    today: string
    exerciseName: string
  } = $props()

  const WEEKS_SHOWN = 3
  const W = 350
  const H = 110
  const PAD = 6

  let showAll = $state(false)
  let sorted = $derived(sortByDate(logs))
  let record = $derived(recordOf(logs))
  let gain = $derived(gainSentence(logs, units))
  let weeks = $derived(groupByWeek(logs, today))
  let shownWeeks = $derived(showAll ? weeks : weeks.slice(0, WEEKS_SHOWN))
  let hiddenSessions = $derived(weeks.slice(WEEKS_SHOWN).reduce((n, w) => n + w.logs.length, 0))
  let points = $derived(chartPoints(sorted.map(l => l.weight)))

  function chartPoints(values: number[]): { x: number; y: number }[] {
    if (!values.length) return []
    const min = Math.min(...values)
    const range = Math.max(...values) - min || 1
    const step = values.length > 1 ? (W - PAD * 2) / (values.length - 1) : 0
    return values.map((v, i) => ({ x: PAD + i * step, y: H - PAD - ((v - min) / range) * (H - PAD * 2) }))
  }

  function recordWhen(l: HistoryLog): string {
    return l.date === today ? 'hoy' : shortDate(l.date)
  }
</script>

{#if sorted.length === 0}
  <EmptyState title="Aquí verás cómo subes" text="Cada vez que registres {exerciseName} sumamos un punto a la gráfica. Hoy puede ser el primero." />
{:else}
  <section class="hs" data-component="ProgressHero">
    <span class="lbl">Tu récord</span>
    {#if record}
      <div class="big"><b>{formatWeight(record.weight)}</b><span>{units} · {recordWhen(record)}</span></div>
    {/if}
    {#if gain}<p class="gain">{gain}</p>{/if}
    {#if points.length > 1}
      <div class="chart">
        <svg viewBox="0 0 {W} {H}" width="100%" aria-hidden="true">
          <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--text)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
          <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="5" fill="var(--accent)" />
        </svg>
        <div class="ch-x"><span>{dayMonth(sorted[0].date)}</span><span>{dayMonth(sorted[sorted.length - 1].date)}</span></div>
      </div>
    {/if}
  </section>

  <section class="hl" data-component="HistoryList">
    {#each shownWeeks as week}
      <span class="lbl wk">{week.label}</span>
      {#each week.logs as log}
        {@const line = sessionLine(log, sorted.length > 1 ? record : null)}
        <div class="hr">
          <span class="min0">
            <span class="hr-d">{shortDate(log.date)}</span>
            {#if line}<span class="hr-s" class:pr={line === 'Récord'}>{line}</span>{/if}
          </span>
          <span class="hr-kg">{formatWeight(log.weight)}<small>{units}</small></span>
          <span class="hr-dl">{formatDelta(deltaPrev(log, logs))}</span>
        </div>
      {/each}
    {/each}
    {#if !showAll && hiddenSessions > 0}
      <Button variant="secondary" size="lg" onclick={() => (showAll = true)}>Ver las {sorted.length} sesiones</Button>
    {/if}
  </section>
{/if}

<style>
  .hs { display: flex; flex-direction: column; gap: 4px; padding-top: 6px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; }
  .big { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; }
  .big b { font-family: var(--font-mono); font-size: 64px; font-weight: 500; letter-spacing: -0.06em; line-height: 0.9; }
  .big span { font-size: 15px; color: var(--text-secondary); }
  .gain { font-size: 15px; color: var(--text-secondary); margin-top: 8px; }
  .chart { margin-top: 16px; }
  .chart svg { display: block; overflow: visible; height: auto; }
  .ch-x { display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 8px; }
  .hl { display: flex; flex-direction: column; }
  .wk { padding: 14px 4px 6px; }
  .hr { display: grid; grid-template-columns: minmax(0, 1fr) auto 52px; align-items: center; gap: 12px; min-height: 58px; padding: 0 4px; }
  .hr + .hr { box-shadow: 0 -0.5px 0 var(--border); }
  .min0 { min-width: 0; }
  .hr-d { display: block; font-size: 16px; font-weight: 500; }
  .hr-s { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 2px; }
  .hr-s.pr { color: var(--accent); font-weight: 600; }
  .hr-kg { font-family: var(--font-mono); font-size: 17px; font-weight: 500; letter-spacing: -0.04em; text-align: right; }
  .hr-kg small { font-size: 12px; color: var(--text-muted); margin-left: 3px; letter-spacing: 0; }
  .hr-dl { font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); text-align: right; }
  .hl > :global([data-component="Button"]) { margin-top: 12px; }
</style>
