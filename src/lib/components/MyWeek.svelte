<script lang="ts">
  import Avatar from './Avatar.svelte'
  import { moveLabel, type DayState, type Goal } from '$lib/league'

  let { minutes = 0, delta = null, position = null, move = 0, since = '', bars = [], days = [], rest = [], streak = 0, best = 0, done = 0, needed = 0, goal = null }: {
    minutes: number
    delta?: number | null
    position?: number | null
    move?: number
    since?: string
    bars: number[]
    days: DayState[]
    rest?: boolean[]
    streak: number
    best: number
    done: number
    needed: number
    goal?: Goal | null
  } = $props()

  const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const deltaText = $derived(delta === null ? '' : delta === 0 ? 'Igual que la semana pasada' : `${delta > 0 ? '+' : '−'}${Math.abs(delta)} vs semana pasada`)
</script>

<section class="me-card" data-component="MyWeek">
  <div class="me-top">
    <div class="me-row">
      <div>
        <div class="me-big">{minutes}<small>min</small></div>
        {#if deltaText}<div class="me-delta" class:down={(delta ?? 0) <= 0}>{deltaText}</div>{/if}
      </div>
      {#if position}
        <div class="me-pos">
          <b>#{position}</b>
          {#if move}<span class:down={move < 0}>{moveLabel(move)} {since}</span>{/if}
        </div>
      {/if}
    </div>
    <div class="wk">
      {#each days as state, i}
        <span class="d" class:now={state === 'today'} class:rest={rest[i] && !bars[i]} data-day={state}>
          <span class="bar">{#if bars[i]}<i style="height:{bars[i]}%"></i>{/if}</span>
          <em>{DAY_LETTERS[i]}</em>
        </span>
      {/each}
    </div>
    <!-- A streak of 0 is never shown: the week's progress takes its place. -->
    <div class="me-streak">
      {#if streak > 0}
        <span><b>{streak} {streak === 1 ? 'semana' : 'semanas'}</b> {streak === 1 ? 'seguida' : 'seguidas'}</span>
      {:else}
        <span><b>{done} de {needed}</b> entrenos esta semana</span>
      {/if}
      {#if best > streak}<span class="record">récord {best}</span>{/if}
    </div>
  </div>
  {#if goal}
    <div class="goal" data-goal={goal.kind}>
      <Avatar username={goal.username} size={28} />
      <div>
        <div class="goal-t">
          {#if goal.kind === 'chase'}
            <b>{goal.minutes} min</b> para pasar a {goal.username}
          {:else if goal.minutes > 0}
            Vas primero, <b>{goal.minutes} min</b> por delante de {goal.username}
          {:else}
            Vas primero, empatado con {goal.username}
          {/if}
        </div>
        <div class="goal-bar"><i style="width:{goal.pct}%"></i></div>
      </div>
    </div>
  {/if}
</section>

<style>
  .me-card {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border);
    background: var(--surface);
  }
  .me-top {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 18px 18px 16px;
  }
  .me-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .me-big {
    font-family: var(--font-mono);
    font-size: 48px;
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 1;
  }
  .me-big small {
    margin-left: 4px;
    font-size: 15px;
    letter-spacing: 0;
    color: var(--text-muted);
  }
  .me-delta {
    margin-top: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: -0.02em;
    color: var(--accent);
  }
  .me-pos { text-align: right; }
  .me-pos b {
    display: block;
    font-family: var(--font-mono);
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.04em;
    line-height: 1;
  }
  .me-pos span {
    display: block;
    margin-top: 6px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--accent);
  }
  .me-delta.down,
  .me-pos span.down { color: var(--text-muted); }
  .wk {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .d {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .bar {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    width: 100%;
    height: 56px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
  }
  .bar i {
    display: block;
    border-radius: 8px;
    background: var(--accent);
  }
  .d.rest .bar {
    background: transparent;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.12);
  }
  .d.now .bar { box-shadow: inset 0 0 0 1.5px rgba(255,255,255,0.35); }
  .d em {
    font-style: normal;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
  }
  .d.now em { color: var(--text); }
  .me-streak {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-tertiary);
  }
  .me-streak b {
    font-weight: 600;
    color: var(--text);
  }
  .record {
    font-family: var(--font-mono);
    font-size: 12px;
  }
  .goal {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr);
    align-items: center;
    gap: 12px;
    padding: 14px 18px;
    border-top: 0.5px solid var(--border-medium);
    background: color-mix(in srgb, var(--accent) 2%, transparent);
  }
  .goal-t {
    font-size: 14px;
    letter-spacing: -0.1px;
  }
  .goal-t b {
    font-family: var(--font-mono);
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--accent);
  }
  .goal-bar {
    overflow: hidden;
    height: 4px;
    margin-top: 8px;
    border-radius: 2px;
    background: rgba(255,255,255,0.08);
  }
  .goal-bar i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
  }
</style>
