<script lang="ts">
  import Button from './Button.svelte'
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
          <div class="sr-info">
            <span class="sr-name">{r.username}</span>
            <span class="sr-streak">{r.streak} {r.streak === 1 ? 'día' : 'días'}</span>
          </div>
          <Button
            variant="primary"
            size="sm"
            onclick={() => onadd?.(r.username)}
            disabled={addingFriend === r.username}
          >
            {addingFriend === r.username ? '...' : 'Agregar'}
          </Button>
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
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border);
  }
  .sr-info { display: flex; flex-direction: column; gap: 2px; }
  .sr-name { font-size: 14px; font-weight: 600; color: var(--text); }
  .sr-streak { font-size: 12px; color: var(--text-muted); }
</style>
