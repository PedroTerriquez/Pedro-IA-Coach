<script lang="ts" module>
  export interface ShapeDay {
    weekday: string
    date: number
    title: string
    rest: boolean
    today: boolean
    done: boolean
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte'

  // The week at a glance on top of Plan: a button per workout day (today in
  // lime, done with a check) and a dot per rest day. Tapping a day jumps to it.
  let { days, onjump }: { days: ShapeDay[]; onjump: (idx: number) => void } = $props()

  let cols = $derived(days.map(d => (d.rest ? '14px' : 'minmax(0, 1fr)')).join(' '))
</script>

<div class="shp" data-component="WeekShape" style="grid-template-columns:{cols}">
  {#each days as d, i}
    {#if d.rest}
      <span class="shp-r" class:today={d.today} aria-label="{d.weekday} {d.date}, descanso"></span>
    {:else}
      <button type="button" class="shp-d" class:today={d.today} class:done={d.done} aria-label="{d.weekday} {d.date}, {d.title}" onclick={() => onjump(i)}>
        <span>{d.weekday}</span><b>{d.date}</b>
        {#if d.done}<i><Icon name="check" size={10} /></i>{/if}
      </button>
    {/if}
  {/each}
</div>

<style>
  .shp { display: grid; gap: 4px; }
  .shp-d { position: relative; min-width: 0; min-height: 56px; border: 0; border-radius: var(--radius-md); background: var(--cv-fill-1); color: var(--text); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; font-family: var(--font-mono); cursor: pointer; padding: 0; }
  .shp-d span { font-size: 10px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .shp-d b { font-size: 18px; font-weight: 500; letter-spacing: -0.04em; line-height: 1; }
  .shp-d.done { background: none; box-shadow: inset 0 0 0 1px var(--border-medium); }
  .shp-d.done b { color: var(--text-secondary); }
  .shp-d i { position: absolute; top: 5px; right: 5px; width: 16px; height: 16px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .shp-d.today { background: var(--accent); color: var(--bg); box-shadow: none; }
  .shp-d.today span { color: #0a0a0aa6; }
  .shp-d.today b { color: var(--bg); }
  .shp-d.today i { background: var(--bg); color: var(--accent); }
  .shp-r { min-height: 56px; display: grid; place-items: center; }
  .shp-r::before { content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--text-muted); }
  .shp-r.today::before { width: 8px; height: 8px; background: var(--accent); }
  @media (max-width: 360px) {
    .shp-d, .shp-r { min-height: 52px; }
  }
</style>
