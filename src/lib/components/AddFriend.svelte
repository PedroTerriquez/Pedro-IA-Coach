<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import SearchInput from './SearchInput.svelte'
  import SearchResults from './SearchResults.svelte'
  import { TOUCH_PILL } from './friends-touch'

  let {
    open = $bindable(false),
    username = '',
    query = '',
    searching = false,
    results = [],
    addingFriend = null,
    inLeague = [],
    onquery = () => {},
    onadd = () => {},
    onshare = () => {},
    onclose = () => {}
  }: {
    open: boolean
    username: string
    query: string
    searching: boolean
    results: { username: string; streak?: number }[]
    addingFriend: string | null
    inLeague: string[]
    onquery?: (q: string) => void
    onadd?: (username: string) => void
    onshare?: () => void
    onclose?: () => void
  } = $props()

  const noResults = $derived(query.length > 0 && !searching && results.length === 0)
</script>

{#snippet shareButton()}
  <Button variant="secondary" style={TOUCH_PILL} onclick={onshare}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v7h14v-7"/></svg>
    Compartir mi usuario
  </Button>
{/snippet}

<Sheet bind:open {onclose}>
  {#snippet header()}Agregar amigo{/snippet}
  <!-- The field sits at the top of the sheet so the iOS keyboard never covers it. -->
  <div class="add-friend" data-component="AddFriend">
    <SearchInput id="friend-search-input" value={query} placeholder="Usuario de tu amigo" oninput={onquery} autofocus />
    <p class="hint">Busca por usuario. No necesitan aceptar.</p>

    {#if query.length === 0}
      <div class="mid">
        <h3>¿Tu amigo aún no tiene la app?</h3>
        <p>Mándale tu usuario <b>{username}</b> para que te agregue cuando entre.</p>
        {@render shareButton()}
      </div>
    {:else if noResults}
      <div class="mid">
        <h3>No encontramos a «{query}»</h3>
        <p>Revisa cómo se escribe o pídele su usuario. Si aún no tiene la app, invítale.</p>
        {@render shareButton()}
      </div>
    {:else}
      <SearchResults {query} {searching} {results} {addingFriend} {inLeague} {onadd} />
    {/if}
  </div>
</Sheet>

<style>
  .add-friend {
    display: flex;
    flex-direction: column;
    gap: 10px;
    /* Tall enough that the results stay above the keyboard. */
    min-height: 70vh;
    padding: 14px 0 calc(28px + env(safe-area-inset-bottom, 0px));
  }
  /* Shared SearchInput, at the 52 px touch size of this view. */
  .add-friend :global(.search-input) {
    height: 52px;
    padding-left: 44px;
    border: 0;
    border-radius: 16px;
    background: rgba(255,255,255,0.06);
    font-size: 17px;
  }
  .add-friend :global(.search-input:focus) { box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22); }
  .add-friend :global(.search-icon) { left: 16px; }
  .hint {
    margin: 0;
    padding: 0 4px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-tertiary);
  }
  .mid {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 24px 8px;
    text-align: center;
  }
  .mid h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: var(--text);
    overflow-wrap: anywhere;
  }
  .mid p {
    margin: 0 0 6px;
    max-width: 290px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-tertiary);
    text-wrap: pretty;
  }
  .mid b {
    font-weight: 600;
    color: var(--text);
  }
</style>
