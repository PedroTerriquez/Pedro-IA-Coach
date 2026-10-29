<script lang="ts">
  import { resolveExerciseMedia, getExerciseDisplayName, searchExerciseEntries, normalizeExerciseName } from '$lib/data/exercise-dictionary'
  import { muscleLabel } from '$lib/exercise-utils'
  import ExerciseRow from './ExerciseRow.svelte'
  import EmptyState from './EmptyState.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Caption from './Caption.svelte'

  type Alt = { name: string; muscle?: string }

  // Detalle v2 · 03: the curated alternatives as rows; the search field lives
  // in the sheet's dock and only hands its query down here.
  let {
    alternatives = [],
    query = '',
    language = 'es',
    isSwapped = false,
    originalName = '',
    currentName = '',
    onSelect,
    onRevert,
    onClearQuery,
  }: {
    alternatives?: Alt[]
    query?: string
    language?: string
    isSwapped?: boolean
    originalName?: string
    currentName?: string
    onSelect: (alt: Alt) => void
    onRevert: () => void
    onClearQuery: () => void
  } = $props()

  let searching = $derived(query.trim().length >= 2)
  // Any dictionary exercise can stand in for today, not only the curated ones.
  let results = $derived<Alt[]>(searching
    ? searchExerciseEntries(query)
        .filter(e => normalizeExerciseName(e.es) !== normalizeExerciseName(currentName))
        .map(e => ({ name: e.es, muscle: e.muscle }))
    : [])
  let shown = $derived(searching ? results : alternatives)
  let current = $derived(getExerciseDisplayName({ name: currentName }, language))

  function displayName(alt: Alt) {
    return getExerciseDisplayName({ name: alt.name }, language)
  }
</script>

<div class="alts" data-component="AlternativesTab">
  {#if isSwapped}
    <button type="button" class="revert" onclick={onRevert}>
      <Icon name="restart" size={16} />
      <span>Volver a {originalName}</span>
    </button>
  {/if}

  {#if searching && results.length === 0}
    <EmptyState variant="center" title="No encontramos «{query.trim()}»" text="Prueba con el músculo, como «pecho», o con menos palabras.">
      {#snippet actions()}
        <Button variant="secondary" size="pill" onclick={onClearQuery}>Borrar búsqueda</Button>
      {/snippet}
    </EmptyState>
  {:else if shown.length === 0}
    <EmptyState title="Sin sugerencias para este" text="Busca abajo cualquier ejercicio del diccionario y cámbialo." />
  {:else}
    <div class="lbl">{searching ? `${results.length} resultado${results.length === 1 ? '' : 's'}` : `Sugeridas para ${current}`}</div>
    <div class="list">
      {#each shown as alt (alt.name)}
        <ExerciseRow
          variant="session"
          name={displayName(alt)}
          sub={muscleLabel(alt.muscle)}
          imgUrl={resolveExerciseMedia({ name: alt.name }).imgUrl}
          chevron
          onclick={() => onSelect(alt)}
        />
      {/each}
    </div>
    {#if !searching}<Caption>Toca una para cambiar el ejercicio.</Caption>{/if}
  {/if}
</div>

<style>
  .alts { display: flex; flex-direction: column; gap: 10px; padding-top: 6px; }
  .revert {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 52px;
    padding: 0 16px;
    border: 0;
    border-radius: var(--radius-xl);
    background: var(--cv-fill-1);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  }
  .lbl { padding: 0 4px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list { display: flex; flex-direction: column; gap: 8px; }
</style>
