<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  // One day of Plan as its own card (Plan por días): a big date block, the
  // day's name, muscles and «4 ej · 48 min», and its exercises inside. Today:
  // lime ring and date; done: thin border and grey, read as past. A rest day
  // is a compact row, or a card with «Hoy» when it's today.
  let { weekday, date, title, muscles = '', meta = '', tag = '', moved = false, today = false, done = false, rest = false, children }: {
    /** «Lun» */
    weekday: string
    date: number
    title: string
    muscles?: string
    /** Mono line: «4 ej · 48 min», «Hecho en 44 min · 4 ej» */
    meta?: string
    /** A note under the meta: «Se movió del martes», «Ya pasó · …» */
    tag?: string
    moved?: boolean
    today?: boolean
    done?: boolean
    rest?: boolean
    children?: Snippet
  } = $props()

  let state = $derived(rest ? 'rest' : done ? 'done' : today ? 'today' : moved ? 'moved' : 'open')
</script>

{#if rest && !today}
  <div class="rest" data-component="DayPanel" data-weekday={weekday} data-state="rest" role="group">
    <span class="rd">{weekday} {date}</span>
    <span class="rn" data-testid={TID.dayTitle}>{title}</span>
  </div>
{:else}
  <section class="dp" class:today class:done class:rest data-component="DayPanel" data-weekday={weekday} data-state={state}>
    <div class="dp-h" role="group">
      <span class="dp-dt"><span>{weekday}</span><b>{date}</b></span>
      <span class="dp-tx">
        {#if today}<span class="now">Hoy</span>{/if}
        <span class="dp-n" data-testid={TID.dayTitle}>{title}</span>
        {#if muscles}<span class="dp-m">{muscles}</span>{/if}
        {#if meta}<span class="dp-x">{meta}</span>{/if}
        {#if tag}<span class="dp-tag">{#if moved}<Icon name="move" size={14} />{/if}{tag}</span>{/if}
      </span>
      {#if done}<span class="ok" aria-label="Hecho"><Icon name="check" size={14} /></span>{:else}<span></span>{/if}
    </div>
    {#if children}<div class="list">{@render children()}</div>{/if}
  </section>
{/if}

<style>
  /* scroll-margin: jumping to a day (week strip, sticky bar) leaves it a breath below the top */
  .dp, .rest { scroll-margin-top: calc(var(--safe-top) + 12px); }
  .dp { border-radius: var(--radius-2xl); background: var(--surface); padding: 4px 8px 8px; }
  .dp-h { display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 12px 8px 14px 4px; }
  .dp-dt { width: 56px; height: 64px; border-radius: 16px; background: var(--cv-fill-2); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; font-family: var(--font-mono); }
  .dp-dt span { font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-secondary); }
  .dp-dt b { font-size: 24px; font-weight: 500; letter-spacing: -0.05em; line-height: 1; }
  .dp-tx { min-width: 0; padding-top: 2px; }
  .now { display: block; margin-bottom: 4px; font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent); }
  .dp-n { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.15; text-wrap: pretty; }
  .dp-m { display: block; margin-top: 4px; font-size: 14px; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dp-x { display: block; margin-top: 3px; font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .dp-tag { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 4px 9px 4px 7px; border-radius: 9px; background: var(--cv-fill-2); font-size: 13px; color: var(--text); white-space: nowrap; }
  .dp-tag :global(svg) { color: var(--text-secondary); }
  .ok { width: 28px; height: 28px; margin-top: 2px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .list { display: flex; flex-direction: column; border-top: 0.5px solid var(--border-medium); padding-top: 4px; }
  .list > :global(* + *) { box-shadow: 0 -0.5px 0 var(--border-medium); }

  .dp.today { background: var(--surface-hover); box-shadow: inset 0 0 0 1.5px var(--accent); }
  .dp.today .dp-dt { background: var(--accent); color: var(--bg); }
  .dp.today .dp-dt span { color: #0a0a0aa6; }
  .dp.done:not(.today) { background: none; box-shadow: inset 0 0 0 1px var(--border-medium); }
  .dp.done:not(.today) .dp-n { color: var(--text-secondary); }
  .dp.done:not(.today) .dp-dt { background: var(--cv-fill-1); }
  .dp.done:not(.today) .dp-dt b { color: var(--text-secondary); }
  /* Today as a rest day: the card without exercises */
  .dp.rest .dp-n { font-size: 20px; }

  .rest { min-height: 52px; border-radius: var(--radius-lg); box-shadow: inset 0 0 0 0.5px var(--border-medium); display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 14px; align-items: center; padding: 0 14px 0 12px; }
  .rd { font-family: var(--font-mono); font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); text-align: center; white-space: nowrap; }
  .rn { font-size: 16px; font-weight: 500; color: var(--text-secondary); }

  @media (max-width: 360px) {
    .dp { padding: 2px 6px 6px; border-radius: 22px; }
    .dp-h { grid-template-columns: 48px minmax(0, 1fr) auto; gap: 12px; padding: 10px 4px 12px; }
    .dp-dt { width: 48px; height: 56px; border-radius: 14px; }
    .dp-dt b { font-size: 21px; }
    .dp-dt span { font-size: 10px; }
    .dp-n { font-size: 20px; }
    .dp-m { font-size: 13px; }
    .dp-x { font-size: 12px; }
    .rest { grid-template-columns: 48px minmax(0, 1fr); gap: 12px; min-height: 48px; padding: 0 12px 0 10px; }
    .rd { font-size: 11px; letter-spacing: 0.4px; }
  }
</style>
