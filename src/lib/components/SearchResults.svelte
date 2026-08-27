<script lang="ts">
  import EmptyState from './EmptyState.svelte'

  let {
    query = '',
    searching = false,
    results = [],
    addingFriend = null,
    onadd = undefined
  }: {
    query: string
    searching: boolean
    results: { username: string; streak: number }[]
    addingFriend: string | null
    onadd?: (username: string) => void
  } = $props()

  let show = $derived(query.length >= 1 || searching || results.length > 0)
</script>

{#if show}
  <div class="search-results" data-component="SearchResults">
    {#if searching}
      <EmptyState message="Buscando..." style="padding:20px" />
    {:else if results.length === 0}
      <EmptyState message="No se encontraron usuarios" style="padding:20px" />
    {:else}
      {#each results as r (r.username)}
        <div class="sr-item">
          <div class="sr-avatar">{r.username.charAt(0).toUpperCase()}</div>
          <div class="sr-info">
            <span class="sr-name">{r.username}</span>
            <span class="sr-streak">{r.streak} {r.streak === 1 ? 'día' : 'días'}</span>
          </div>
          <button
            class="sr-add"
            onclick={() => onadd?.(r.username)}
            disabled={addingFriend === r.username}
            aria-label="Agregar {r.username}"
          >
            {addingFriend === r.username ? '…' : '+'}
          </button>
        </div>
      {/each}
    {/if}
  </div>
{/if}

<style>
  .search-results {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .sr-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
  }
  .sr-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text);
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .sr-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .sr-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .sr-streak {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-muted);
  }
  .sr-add {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: var(--accent);
    color: #000;
    font-size: 18px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    line-height: 1;
  }
  .sr-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
