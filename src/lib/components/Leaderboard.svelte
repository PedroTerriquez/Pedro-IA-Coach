<script lang="ts">
  import Avatar from './Avatar.svelte'
  import LeagueRow from './LeagueRow.svelte'
  import type { LeagueEntry } from '$lib/league'

  let { league = [], updated = '', onselect = () => {} }: {
    league: LeagueEntry[]
    updated?: string
    onselect?: (username: string) => void
  } = $props()

  const PODIUM_SIZE = 3
  const BLOCK_HEIGHT: Record<number, number> = { 1: 84, 2: 60, 3: 44 }

  const hasPodium = $derived(league.length >= PODIUM_SIZE)
  // Shown 2-1-3 so the leader stands in the middle.
  const podium = $derived(hasPodium ? [league[1], league[0], league[2]] : [])
  const rows = $derived(hasPodium ? league.slice(PODIUM_SIZE) : league)
  const someoneTrainedToday = $derived(league.some((e) => e.today))
</script>

<div class="leaderboard" data-component="Leaderboard">
  <div class="head">
    <span class="label">Esta semana</span>
    {#if someoneTrainedToday}
      <span class="legend"><i></i>Entrenó hoy</span>
    {/if}
  </div>
  {#if updated}
    <span class="updated" id="friends-cached">{updated}</span>
  {/if}
  {#if hasPodium}
    <div class="podium">
      {#each podium as entry (entry.username)}
        <button
          type="button"
          class="col"
          class:first={entry.position === 1}
          class:me={entry.isMe}
          data-pos={entry.position}
          data-user={entry.username}
          onclick={() => onselect(entry.username)}
        >
          <span class="who">
            <Avatar username={entry.username} size={entry.position === 1 ? 60 : 48} today={entry.today} />
            <span class="name">{entry.isMe ? 'Tú' : entry.username}</span>
            <span class="min">{entry.minutes} <small>min</small></span>
          </span>
          <span class="block" style="height:{BLOCK_HEIGHT[entry.position]}px">{entry.position}</span>
        </button>
      {/each}
    </div>
  {/if}
  <div class="rows" class:after-podium={hasPodium}>
    {#each rows as entry (entry.username)}
      <LeagueRow {entry} {onselect} />
    {/each}
  </div>
</div>

<style>
  .leaderboard {
    display: flex;
    flex-direction: column;
    gap: 10px;
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
  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 12px;
    color: var(--text-tertiary);
  }
  .legend i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent);
  }
  .updated {
    padding: 0 4px;
    font-size: 12px;
    color: var(--text-tertiary);
  }
  .podium {
    display: grid;
    grid-template-columns: 1fr 1.1fr 1fr;
    gap: 8px;
    align-items: end;
    padding-top: 8px;
  }
  .col {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    font-family: var(--font-sans);
    text-align: center;
    cursor: pointer;
    touch-action: manipulation;
  }
  .who {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }
  .who :global(.avatar) { margin-bottom: 6px; }
  .name {
    max-width: 100%;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .first .name { font-size: 16px; }
  .min {
    font-family: var(--font-mono);
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.04em;
    color: var(--text-secondary);
  }
  .min small {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0;
  }
  /* Sober podium: grey blocks, the leader only a shade lighter. */
  .block {
    display: flex;
    justify-content: center;
    padding-top: 10px;
    border-radius: 14px 14px 4px 4px;
    background: var(--surface);
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 500;
    color: var(--text-muted);
  }
  .first .block {
    background: var(--surface-2);
    color: var(--text);
    font-size: 26px;
  }
  .me .block { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18); }
  .rows {
    display: flex;
    flex-direction: column;
  }
  .rows.after-podium { margin-top: 8px; }
</style>
