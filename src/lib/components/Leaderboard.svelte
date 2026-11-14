<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import MyWeek from './MyWeek.svelte'
  import LeagueRow from './LeagueRow.svelte'
  import { raceBar, type LeagueEntry } from '$lib/league'

  // «Esta semana»: my week up top, then the race (only with friends).
  let { league = [], week, closes = '', moves = {}, updated = '', onselect = () => {} }: {
    league: LeagueEntry[]
    week: ComponentProps<typeof MyWeek>
    closes?: string
    moves?: Record<string, number>
    updated?: string
    onselect?: (username: string) => void
  } = $props()
</script>

<div class="leaderboard" data-component="Leaderboard">
  <div class="head">
    <span class="label">Esta semana</span>
    {#if closes}<span class="closes">{closes}</span>{/if}
  </div>
  {#if updated}
    <span class="updated" id="friends-cached">{updated}</span>
  {/if}
  <MyWeek {...week} />
  {#if league.length > 1}
    <div class="race">
      {#each league as entry (entry.username)}
        <LeagueRow {entry} bar={raceBar(entry, league)} move={moves[entry.username] ?? 0} {onselect} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }
  .label {
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
  }
  .closes {
    white-space: nowrap;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: -0.02em;
    color: var(--text-secondary);
  }
  .updated {
    padding: 0 4px;
    font-size: 12px;
    color: var(--text-tertiary);
  }
  .race {
    display: flex;
    flex-direction: column;
  }
</style>
