<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  // One day of the week (Plan · Nuevo): weekday badge, title, one grey line and
  // the duration — or a check when it's done, or whatever `trailing` brings (the
  // grip in Mover). Done = accent border; rest = no fill, thin border.
  let { weekday, date, title, sub = '', meta = '', state = 'pending', lifted = false, trailing, onclick }: {
    /** «Lun» */
    weekday: string
    /** Day of the month */
    date: number
    title: string
    sub?: string
    /** Mono text at the right («3 ej · 65 min») */
    meta?: string
    state?: 'pending' | 'done' | 'rest' | 'moved'
    /** Mover: the row being dragged */
    lifted?: boolean
    trailing?: Snippet
    onclick?: () => void
  } = $props()
</script>

<svelte:element
  this={onclick ? 'button' : 'div'}
  type={onclick ? 'button' : undefined}
  class="dr {state}"
  class:lifted
  data-component="DayRow"
  data-weekday={weekday}
  data-state={state}
  role={onclick ? undefined : 'group'}
  {onclick}
>
  <span class="badge"><span>{weekday}</span><b>{date}</b></span>
  <span class="min0">
    <span class="day-title">{title}</span>
    {#if sub}<span class="sub">{sub}</span>{/if}
  </span>
  {#if trailing}
    {@render trailing()}
  {:else if state === 'done'}
    <span class="ok"><Icon name="check" size={14} /></span>
  {:else if meta}
    <span class="meta">{meta}</span>
  {:else}
    <span></span>
  {/if}
</svelte:element>

<style>
  .dr {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 68px;
    padding: 10px 16px 10px 12px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--surface);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
  }
  button.dr { cursor: pointer; }
  .badge {
    width: 44px;
    height: 44px;
    border-radius: var(--radius-md);
    background: var(--cv-fill-1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-family: var(--font-mono);
  }
  .badge span { font-size: 9px; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-tertiary); }
  .badge b { font-size: 15px; font-weight: 500; line-height: 1; }
  .min0 { min-width: 0; }
  .day-title { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .meta { font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  .rest { background: transparent; box-shadow: inset 0 0 0 0.5px var(--border-medium); min-height: 60px; }
  .rest .day-title { font-size: 16px; font-weight: 500; color: var(--text-secondary); }
  .rest .badge { background: transparent; }
  .moved .sub { color: var(--text-secondary); }
  .lifted {
    position: relative;
    z-index: 2;
    background: #242424;
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.6), inset 0 0 0 1px rgba(255, 255, 255, 0.18);
  }
</style>
