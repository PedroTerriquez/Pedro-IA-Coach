<script lang="ts">
  import { resolveExerciseMedia, getExerciseDisplayName, searchExerciseEntries, normalizeExerciseName } from '$lib/data/exercise-dictionary'
  import Icon from './Icon.svelte'

  type Alt = { name: string; reason: string; muscle?: string }

  let {
    alternatives = [],
    accent = 'var(--accent)',
    language = 'es',
    isSwapped = false,
    originalName = '',
    currentName = '',
    onSelect,
    onRevert
  }: {
    alternatives?: Alt[]
    accent?: string
    language?: string
    isSwapped?: boolean
    originalName?: string
    currentName?: string
    onSelect: (alt: Alt) => void
    onRevert: () => void
  } = $props()

  let query = $state('')
  let searching = $derived(query.trim().length >= 2)
  // Any dictionary exercise can stand in for today, not only the curated ones.
  let results = $derived<Alt[]>(searching
    ? searchExerciseEntries(query)
        .filter(e => normalizeExerciseName(e.es) !== normalizeExerciseName(currentName))
        .map(e => ({ name: e.es, reason: e.muscle, muscle: e.muscle }))
    : [])
  let shown = $derived(searching ? results : alternatives)

  function media(alt: { name: string }) {
    return resolveExerciseMedia({ name: alt.name })
  }

  function displayName(alt: { name: string }) {
    return getExerciseDisplayName({ name: alt.name }, language)
  }
</script>

<div class="tab-content" data-component="AlternativesTab">
  {#if isSwapped}
    <button class="revert-row" onclick={onRevert}>
      <Icon name="restart" size={15} color={accent} />
      <span>Volver a {originalName}</span>
    </button>
  {/if}

  <div class="alt-search" style="--alt-accent:{accent}">
    <svg class="alt-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input
      class="alt-search-input"
      type="text"
      inputmode="search"
      enterkeyhint="search"
      autocomplete="off"
      autocapitalize="off"
      spellcheck="false"
      placeholder="Buscar cualquier ejercicio…"
      aria-label="Buscar ejercicio alternativo"
      bind:value={query}
    />
    {#if query.length > 0}
      <button class="alt-search-clear" type="button" aria-label="Limpiar búsqueda" onclick={() => query = ''}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    {/if}
  </div>

  {#if searching}
    <div class="alt-label">
      <span class="alt-label-dot" style="background:{accent}"></span>
      {results.length} resultado{results.length === 1 ? '' : 's'}
    </div>
  {/if}

  {#if searching && results.length === 0}
    <div class="alt-empty">
      <div class="alt-empty-title">Sin resultados para “{query.trim()}”</div>
      <div class="alt-empty-sub">Prueba con otro nombre o con el equipo: mancuernas, polea, máquina…</div>
    </div>
  {/if}

  <div class="alt-list">
    {#each shown as alt (alt.name)}
      {@const m = media(alt)}
      <button class="alt-card" onclick={() => onSelect(alt)}>
        <div class="alt-thumb">
          {#if m.imgUrl}
            <img src={m.imgUrl} alt="" loading="lazy" />
          {:else}
            <Icon name="swap" size={18} color="rgba(255,255,255,0.4)" />
          {/if}
        </div>
        <div class="alt-info">
          <div class="alt-name">{displayName(alt)}</div>
          {#if alt.reason}<div class="alt-reason">{alt.reason}</div>{/if}
        </div>
        <div class="alt-chevron" style="color:{accent}">
          <Icon name="swap" size={15} color={accent} />
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .tab-content {
    padding: 14px 0 30px;
  }
  .revert-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px;
    margin-bottom: 16px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
  }
  .alt-search {
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    color: rgba(255,255,255,0.35);
  }
  .alt-search:focus-within {
    color: var(--alt-accent);
  }
  .alt-search-icon {
    position: absolute;
    left: 14px;
    pointer-events: none;
    transition: color 0.15s;
  }
  /* 16px keeps iOS Safari from zooming the page when the field takes focus. */
  .alt-search-input {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 40px 12px 40px;
    border-radius: 14px;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.04);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 16px;
    letter-spacing: -0.1px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
  }
  .alt-search-input::placeholder {
    color: rgba(255,255,255,0.35);
  }
  .alt-search-input:focus {
    background: rgba(255,255,255,0.06);
    border-color: color-mix(in srgb, var(--alt-accent) 55%, transparent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--alt-accent) 12%, transparent);
  }
  .alt-search-clear {
    position: absolute;
    right: 10px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: none;
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
  }
  .alt-label-dot {
    display: inline-block;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    margin-right: 6px;
    vertical-align: middle;
  }
  .alt-empty {
    border: 0.5px dashed rgba(255,255,255,0.15);
    border-radius: 14px;
    padding: 18px 16px;
    text-align: center;
  }
  .alt-empty-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .alt-empty-sub {
    margin-top: 4px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: rgba(255,255,255,0.5);
  }
  .alt-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    margin-bottom: 10px;
  }
  .alt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .alt-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: var(--surface);
    border-radius: 14px;
    border: 0.5px solid var(--border);
    padding: 10px 12px;
    cursor: pointer;
  }
  .alt-thumb {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255,255,255,0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .alt-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .alt-info {
    flex: 1;
    min-width: 0;
  }
  .alt-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .alt-reason {
    margin-top: 2px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .alt-chevron {
    flex-shrink: 0;
    opacity: 0.8;
  }
</style>
