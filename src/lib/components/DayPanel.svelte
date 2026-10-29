<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import DayBadge from './DayBadge.svelte'
  import TID from '$lib/test-ids.json'

  // A day opened with its exercises (Plan · Nuevo · TodayCard). Today gets the
  // lighter fill, the white ring and «Hoy» in mono; done turns the ring accent.
  let { weekday, date, title, sub = '', today = false, done = false, ontoggle, children }: {
    weekday: string
    date: number
    title: string
    sub?: string
    today?: boolean
    done?: boolean
    /** Tapping the head closes the day (any day but today) */
    ontoggle?: () => void
    children?: Snippet
  } = $props()
</script>

<section class="panel" class:today class:done data-component="DayPanel" data-weekday={weekday} data-state={done ? 'done' : today ? 'today' : 'open'}>
  <svelte:element this={ontoggle ? 'button' : 'div'} type={ontoggle ? 'button' : undefined} class="head" role={ontoggle ? undefined : 'group'} onclick={ontoggle}>
    <DayBadge {weekday} {date} fill={2} />
    <span class="min0">
      {#if today}<span class="now">Hoy</span>{/if}
      <span class="day-title" data-testid={TID.dayTitle}>{title}</span>
      {#if sub}<span class="sub">{sub}</span>{/if}
    </span>
    {#if done}<span class="ok"><Icon name="check" size={14} /></span>{:else}<span></span>{/if}
  </svelte:element>
  {#if children}<div class="list">{@render children()}</div>{/if}
</section>

<style>
  .panel { display: flex; flex-direction: column; border-radius: var(--radius-2xl); background: var(--surface); }
  .panel.today { background: var(--surface-hover); box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.35); }
  .panel.done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .head {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 76px;
    padding: 10px 16px 10px 12px;
    border: 0;
    background: none;
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
  }
  button.head { cursor: pointer; }
  .min0 { min-width: 0; }
  .now { display: block; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text); margin-bottom: 3px; }
  .day-title { display: block; font-size: 20px; font-weight: 600; letter-spacing: -0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .list { display: flex; flex-direction: column; padding: 0 8px 8px; }
  .list > :global(* + *) { box-shadow: 0 -0.5px 0 var(--border-medium); }
</style>
