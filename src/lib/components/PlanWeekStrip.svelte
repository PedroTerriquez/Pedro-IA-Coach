<script lang="ts">
  import Avatar from './Avatar.svelte'
  import Icon from './Icon.svelte'
  import type { DayState } from '$lib/league'
  import type { StripSocial } from '$lib/plan-week'
  import { WEEKDAY_LETTERS } from '$lib/program-utils'

  // «Esta semana» in Plan: your own progress (same day marks as the Amigos
  // WeekCard) and one line that opens Amigos with who trained today.
  let { done = 0, total = 0, days = [], firstWeek = false, social, onopen }: {
    done: number
    total: number
    days: DayState[]
    firstWeek?: boolean
    social: StripSocial
    onopen: () => void
  } = $props()
</script>

<section id="plan-week-strip" class="ws" data-component="PlanWeekStrip">
  <div>
    <span class="lbl">Esta semana</span>
    {#if firstWeek}
      <div class="first">Tu primera semana</div>
    {:else}
      <div class="k"><span class="n">{done}</span><span class="u">de {total} entrenos</span></div>
    {/if}
  </div>
  <div class="days">
    {#each days as state, i}
      <span class="day" class:on={state === 'done'} class:now={state === 'today'} data-day={state}>{WEEKDAY_LETTERS[i]}</span>
    {/each}
  </div>
  <button type="button" class="foot" onclick={onopen}>
    {#if social.invite}
      <span class="slots" aria-hidden="true"><i></i><i></i></span>
    {:else}
      <span class="stack">{#each social.avatars as name (name)}<Avatar username={name} size={28} />{/each}</span>
    {/if}
    <span class="t">{#each social.parts as part}{#if part.bold}<b>{part.text}</b>{:else}{part.text}{/if}{/each}</span>
    <span class="chev"><Icon name="chev" size={16} /></span>
  </button>
</section>

<style>
  .ws {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px 16px 0;
    border-radius: var(--radius-2xl);
    background: var(--surface);
    --ring: var(--surface);
  }
  .lbl { white-space: nowrap; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .k { display: flex; align-items: baseline; gap: 8px; margin-top: 6px; }
  .n { font-family: var(--font-mono); font-size: 30px; font-weight: 500; letter-spacing: -0.05em; line-height: 1; }
  .u { font-size: 15px; color: var(--text-secondary); }
  .first { margin-top: 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.1; }
  .days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
  .day {
    height: 32px;
    aspect-ratio: 1;
    justify-self: center;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
    background: var(--cv-fill-1);
  }
  .day.on { background: var(--accent); color: var(--bg); }
  .day.now { background: transparent; box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.5); color: var(--text); }
  .foot {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 56px;
    padding: 0;
    border: 0;
    border-top: 0.5px solid var(--border-medium);
    background: none;
    color: var(--text-secondary);
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 1.35;
    text-align: left;
    cursor: pointer;
  }
  .t { flex: 1; min-width: 0; text-wrap: pretty; }
  .t b { font-weight: 600; color: var(--text); }
  .chev { display: grid; flex-shrink: 0; color: var(--text-muted); }
  .stack { display: flex; flex-shrink: 0; }
  .stack :global([data-component="Avatar"]) { box-shadow: 0 0 0 2px var(--surface); }
  .stack :global([data-component="Avatar"] + [data-component="Avatar"]) { margin-left: -8px; }
  .slots { display: flex; flex-shrink: 0; padding-left: 8px; }
  .slots i { width: 28px; height: 28px; margin-left: -8px; border-radius: 50%; border: 1px dashed rgba(255, 255, 255, 0.22); background: var(--surface); }
</style>
