<script lang="ts">
  import type { DayState, PhrasePart } from '$lib/league'

  let { streak = 0, done = 0, needed = 0, minutes = 0, days = [], phrase = [] }: {
    streak: number
    done: number
    needed: number
    minutes: number
    days: DayState[]
    phrase: PhrasePart[]
  } = $props()

  const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
</script>

<section class="week-card" data-component="WeekCard">
  <div class="top">
    <div class="streak">
      <div class="label">{streak > 0 ? 'Tu racha' : 'Racha nueva'}</div>
      <!-- A streak of 0 is never shown: the week's progress takes its place. -->
      <div class="big" class:fresh={streak === 0}>
        {#if streak > 0}
          <span class="num">{streak}</span>
          <span class="unit">{streak === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
        {:else}
          <span class="num word">{done} de {needed}</span>
          <span class="unit">entrenos esta semana</span>
        {/if}
      </div>
    </div>
    <div class="minutes">
      <b>{minutes}</b>
      <span>min esta semana</span>
    </div>
  </div>
  <div class="days">
    {#each days as state, i}
      <span class="day" class:on={state === 'done'} class:now={state === 'today'} data-day={state}>{DAY_LETTERS[i]}</span>
    {/each}
  </div>
  <p class="line">
    {#each phrase as part}{#if part.bold}<b>{part.text}</b>{:else}{part.text}{/if}{/each}
  </p>
</section>

<style>
  .week-card {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 20px;
    border-radius: var(--radius-2xl);
    background: var(--surface);
  }
  .top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .streak { min-width: 0; }
  .label {
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .big {
    display: flex;
    align-items: baseline;
    gap: 10px;
    margin-top: 8px;
  }
  .big.fresh {
    flex-direction: column;
    gap: 6px;
  }
  .num {
    font-family: var(--font-mono);
    font-size: 56px;
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 0.85;
    color: var(--text);
  }
  .num.word {
    font-family: var(--font-sans);
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -1px;
    line-height: 1;
  }
  .unit {
    font-size: 15px;
    color: var(--text-secondary);
  }
  .minutes {
    text-align: right;
    flex-shrink: 0;
  }
  .minutes b {
    display: block;
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--text);
  }
  .minutes span {
    font-size: 13px;
    color: var(--text-tertiary);
  }
  .days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .day {
    height: 36px;
    aspect-ratio: 1;
    justify-self: center;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    background: rgba(255,255,255,0.04);
  }
  .day.on {
    background: var(--accent);
    color: var(--bg);
  }
  .day.now {
    background: transparent;
    box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.5);
    color: var(--text);
  }
  .line {
    margin: 0;
    padding-top: 16px;
    border-top: 0.5px solid var(--border-medium);
    font-size: 15px;
    line-height: 1.45;
    color: var(--text-secondary);
    text-wrap: pretty;
  }
  .line b {
    font-weight: 600;
    color: var(--text);
  }
</style>
