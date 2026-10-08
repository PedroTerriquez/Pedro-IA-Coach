<script lang="ts">
  import Avatar from './Avatar.svelte'
  import { streakLabel, type LeagueEntry } from '$lib/league'

  let { entry, onselect = () => {} }: {
    entry: LeagueEntry
    onselect?: (username: string) => void
  } = $props()
</script>

<button
  type="button"
  class="league-row"
  class:me={entry.isMe}
  class:quiet={entry.minutes === 0}
  data-component="LeagueRow"
  data-user={entry.username}
  onclick={() => onselect(entry.username)}
>
  <span class="pos">{entry.position}</span>
  <Avatar username={entry.username} today={entry.today} />
  <span class="who">
    <span class="name"><span>{entry.username}</span>{#if entry.isMe}<small>Tú</small>{/if}</span>
    <span class="sub">{streakLabel(entry.streak)}</span>
  </span>
  <span class="min">{entry.minutes} <small>min</small></span>
</button>

<style>
  .league-row {
    display: grid;
    grid-template-columns: 20px 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 68px;
    padding: 0 14px 0 10px;
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
  /* My row is told apart by surface and "Tú", never by accent. */
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
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }
  .name span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .name small {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-tertiary);
  }
  .sub {
    display: block;
    margin-top: 3px;
    font-size: 13px;
    color: var(--text-tertiary);
  }
  .min {
    text-align: right;
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 500;
    letter-spacing: -0.04em;
  }
  .min small {
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: 0;
  }
  .quiet .name,
  .quiet .min { color: var(--text-secondary); }
</style>
