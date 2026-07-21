<script lang="ts">
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
  <div class="search-results">
    {#if searching}
      <div class="sr-empty">Buscando...</div>
    {:else if results.length === 0}
      <div class="sr-empty">No se encontraron usuarios</div>
    {:else}
      {#each results as r (r.username)}
        <div class="sr-item">
          <div class="sr-info">
            <span class="sr-name">{r.username}</span>
            <span class="sr-streak">{r.streak} {r.streak === 1 ? 'día' : 'días'}</span>
          </div>
          <button
            class="sr-add"
            onclick={() => onadd?.(r.username)}
            disabled={addingFriend === r.username}
          >
            {addingFriend === r.username ? '...' : 'Agregar'}
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
  .sr-empty {
    text-align: center;
    padding: 20px;
    font-size: 13px;
    color: var(--text-muted);
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
  .sr-add {
    padding: 6px 14px;
    border-radius: 8px;
    border: 0;
    background: var(--accent, #d4ff3a);
    color: #0a0a0a;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
  .sr-add:disabled { opacity: 0.5; cursor: default; }
</style>
