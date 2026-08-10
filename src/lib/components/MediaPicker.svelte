<script lang="ts">
  import SearchInput from './SearchInput.svelte'
  import Button from './Button.svelte'
  import { fetchCatalog, isStale, searchCatalog, rankCatalog, type CatalogEntry, type CatalogKind } from '$lib/admin/catalogs'

  let {
    kind,
    current = '',
    accent = 'var(--accent)',
    related = [],
    exerciseName = '',
    onpick = () => {}
  }: {
    kind: CatalogKind
    current?: string
    accent?: string
    related?: string[]
    exerciseName?: string
    onpick?: (url: string) => void
  } = $props()

  let query = $state('')
  let entries = $state<CatalogEntry[]>([])
  let loading = $state(false)
  let refreshing = $state(false)
  let error = $state('')
  let manualUrl = $state('')
  let timer: ReturnType<typeof setTimeout> | undefined

  function runSearch() {
    if (isStale(kind)) {
      loading = true
      error = ''
      fetchCatalog(kind)
        .then(() => {
          entries = query.trim() ? searchCatalog(kind, query) : rankCatalog(kind, related)
          loading = false
        })
        .catch(() => {
          entries = query.trim() ? searchCatalog(kind, query) : rankCatalog(kind, related)
          loading = false
          error = 'No se pudo cargar el catálogo (usa el campo manual)'
        })
    } else {
      entries = query.trim() ? searchCatalog(kind, query) : rankCatalog(kind, related)
    }
  }

  function onInput() {
    clearTimeout(timer)
    timer = setTimeout(runSearch, 300)
  }

  function forceRefresh() {
    refreshing = true
    error = ''
    fetchCatalog(kind)
      .then(() => {
        entries = searchCatalog(kind, query)
        refreshing = false
      })
      .catch(() => {
        refreshing = false
        error = 'No se pudo actualizar el catálogo'
      })
  }

  function pick(url: string) {
    if (url && url.trim()) onpick(url.trim())
  }

  $effect(() => {
    entries = query.trim() ? searchCatalog(kind, query) : rankCatalog(kind, related)
    if (isStale(kind)) runSearch()
  })
</script>

<div class="picker" data-component="MediaPicker">
  <div class="manual">
    <input bind:value={manualUrl} type="url" placeholder="Pegar URL manual… https://…/ejercicio.jpg" />
    <Button size="sm" {accent} onclick={() => pick(manualUrl)}>Usar esta URL</Button>
  </div>
  {#if !query.trim() && related.length}
    <div class="related-hint">
      Sugerencias relacionadas con <span class="related-name">{exerciseName || related.join(' ')}</span> — busca más abajo o escribe para filtrar.
    </div>
  {/if}
  <div class="picker-actions">
    <SearchInput value={query} oninput={(v) => { query = v; onInput() }} placeholder="Buscar ejercicio…" />
    <Button size="sm" variant="secondary" onclick={forceRefresh} disabled={refreshing}>
      {refreshing ? 'Actualizando…' : 'Actualizar catálogos'}
    </Button>
  </div>
  {#if error}<div class="picker-error">{error}</div>{/if}
  {#if loading}<div class="picker-status">Cargando catálogo…</div>{/if}
  <div class="picker-grid">
    {#each entries as e}
      <button class="cand" type="button" onclick={() => pick(e.url)}>
        <img src={e.url} alt={e.name} loading="lazy" onerror={(ev) => ((ev.currentTarget as HTMLElement).style.display = 'none')} />
        <span>{e.name}</span>
      </button>
    {/each}
  </div>
  {#if !entries.length && !loading && !error}
    <div class="picker-empty">Sin resultados</div>
  {/if}
  {#if current}
    <div class="picker-current">Actual: <span class="mono">{current}</span></div>
  {/if}
</div>

<style>
  .picker { display: flex; flex-direction: column; gap: 12px; min-width: 300px; max-width: 560px; }
  .picker-actions { display: flex; gap: 8px; align-items: center; }
  .picker-actions :global(.search-input) { flex: 1; }
  .picker-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(90px, 1fr)); gap: 8px; max-height: 320px; overflow-y: auto; }
  .cand { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 6px; cursor: pointer; display: flex; flex-direction: column; gap: 6px; align-items: center; }
  .cand img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; background: rgba(255,255,255,0.04); }
  .cand span { font-size: 10px; color: var(--text); text-align: center; font-family: var(--font-sans); }
  .picker-error, .picker-status, .picker-empty { font-size: 12px; color: var(--text); opacity: 0.7; }
  .related-hint { font-size: 11px; color: var(--text); opacity: 0.6; line-height: 1.4; }
  .related-name { font-weight: 600; color: var(--accent); opacity: 1; }
  .picker-current { font-size: 11px; opacity: 0.6; word-break: break-all; }
  .manual { display: flex; gap: 8px; }
  .manual input { flex: 1; padding: 10px 12px; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text); font-family: var(--font-mono); font-size: 12px; outline: none; }
  .manual input:focus { border-color: var(--accent); }
  .mono { font-family: var(--font-mono); }
</style>
