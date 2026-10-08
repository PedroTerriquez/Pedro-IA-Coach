<script lang="ts">
  import EmptyState from './EmptyState.svelte'
  import Avatar from './Avatar.svelte'
  import Button from './Button.svelte'
  import { TOUCH_PILL } from './friends-touch'
  import { streakLabel } from '$lib/league'

  let {
    query = '',
    searching = false,
    results = [],
    addingFriend = null,
    inLeague = [],
    onadd = undefined
  }: {
    query: string
    searching: boolean
    results: { username: string; streak?: number }[]
    addingFriend: string | null
    inLeague?: string[]
    onadd?: (username: string) => void
  } = $props()

  // Length of the part of the name that matches what was typed, from its start.
  function matchLength(name: string): number {
    return name.toLowerCase().startsWith(query.toLowerCase()) ? query.length : 0
  }
</script>

{#if searching}
  <EmptyState message="Buscando…" style="padding:28px 20px" />
{:else if results.length > 0}
  <div class="search-results" data-component="SearchResults">
    {#each results as r (r.username)}
      {@const cut = matchLength(r.username)}
      <div class="sr-item">
        <Avatar username={r.username} />
        <div class="sr-info">
          <div class="sr-name"><mark>{r.username.slice(0, cut)}</mark>{r.username.slice(cut)}</div>
          <div class="sr-streak">{streakLabel(r.streak || 0)}</div>
        </div>
        {#if inLeague.includes(r.username)}
          <span class="sr-in">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>
            En tu liga
          </span>
        {:else}
          <Button variant="secondary" style={TOUCH_PILL} disabled={addingFriend === r.username} onclick={() => onadd?.(r.username)}>Agregar</Button>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .search-results {
    display: flex;
    flex-direction: column;
    --ring: var(--surface);
  }
  .sr-item {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 68px;
  }
  .sr-item + .sr-item { box-shadow: 0 -0.5px 0 var(--border); }
  .sr-info { min-width: 0; }
  .sr-name {
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sr-name mark {
    background: none;
    color: var(--text);
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,0.35);
    text-underline-offset: 4px;
  }
  .sr-streak {
    margin-top: 3px;
    font-size: 13px;
    color: var(--text-tertiary);
  }
  .sr-in {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 44px;
    padding: 0 4px;
    font-size: 14px;
    color: var(--text-tertiary);
  }
</style>
