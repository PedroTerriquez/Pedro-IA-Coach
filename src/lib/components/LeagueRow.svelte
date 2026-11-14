<script lang="ts">
  import Avatar from './Avatar.svelte'
  import { moveLabel, type LeagueEntry } from '$lib/league'

  let { entry, bar = 0, move = 0, onselect = () => {} }: {
    entry: LeagueEntry
    bar?: number
    move?: number
    onselect?: (username: string) => void
  } = $props()
</script>

<button
  type="button"
  class="league-row"
  class:me={entry.isMe}
  class:lead={entry.position === 1}
  class:quiet={entry.minutes === 0}
  data-component="LeagueRow"
  data-user={entry.username}
  data-pos={entry.position}
  onclick={() => onselect(entry.username)}
>
  <span class="pos">{entry.position}</span>
  <Avatar username={entry.username} size={36} today={entry.today} />
  <span class="who">
    <span class="name">
      <span>{entry.username}</span>
      {#if entry.isMe}<small>Tú</small>{/if}
      {#if move}<span class="mv" class:up={move > 0} data-move={move}>{moveLabel(move)}</span>{/if}
    </span>
    <span class="rb"><i style="width:{bar}%"></i></span>
  </span>
  <span class="min">{entry.minutes} <small>min</small></span>
</button>

<style>
  .league-row {
    display: grid;
    grid-template-columns: 20px 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 14px 12px 10px;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
    touch-action: manipulation;
  }
  .league-row + :global(.league-row) { box-shadow: 0 -0.5px 0 var(--border); }
  /* My row is told apart by surface, "Tú" and its accent bar. */
  .league-row.me {
    background: var(--surface);
    --ring: var(--surface);
  }
  .league-row.me,
  .league-row.me + :global(.league-row) { box-shadow: none; }
  .pos {
    font-family: var(--font-mono);
    font-size: 14px;
    color: var(--text-muted);
    text-align: center;
  }
  .me .pos { color: var(--text); }
  .who { min-width: 0; }
  .name {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .name > span:first-child {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name small {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-tertiary);
  }
  .mv {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-muted);
  }
  .mv.up { color: var(--accent); }
  .rb {
    display: block;
    overflow: hidden;
    height: 4px;
    margin-top: 8px;
    border-radius: 2px;
    background: rgba(255,255,255,0.06);
  }
  .rb i {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: rgba(255,255,255,0.14);
  }
  .lead .rb i { background: var(--text-secondary); }
  .me .rb i { background: var(--accent); }
  .min {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .min small {
    font-size: 11px;
    color: var(--text-muted);
    letter-spacing: 0;
  }
  .quiet .name > span:first-child,
  .quiet .min { color: var(--text-secondary); }
</style>
