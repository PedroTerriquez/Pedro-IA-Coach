<script lang="ts">
  import type { Exercise } from '$lib/types'
  import { searchAlternatives } from '$lib/alternative-search'
  import Sheet from './Sheet.svelte'
  import SearchInput from './SearchInput.svelte'
  import Icon from './Icon.svelte'
  import ExerciseMiniCard from './ExerciseMiniCard.svelte'

  // «Añadir alternativa»: pick from the dictionary and the user's exercises
  // first; typing a name by hand is the last option.
  let { open = $bindable(false), exercise, alternatives, exercises, onpick }: {
    open: boolean
    /** The exercise being edited (excluded from the results) */
    exercise: Exercise
    /** Its alternatives so far, shown as «Ya está» */
    alternatives: { name: string }[]
    exercises: Exercise[]
    onpick: (name: string) => void
  } = $props()

  let query = $state('')
  let typed = $derived(query.trim())
  let results = $derived(open ? searchAlternatives(query, { ...exercise, alternatives }, exercises) : [])

  $effect(() => {
    if (open) query = ''
  })
</script>

<Sheet bind:open title="Añadir alternativa" elevated id="alt-search-sheet">
  <SearchInput value={query} placeholder="Buscar ejercicio" count={typed ? results.length : undefined} oninput={(v) => query = v} autofocus id="alt-search" />
  <div class="list">
    {#each results as r (r.name)}
      <ExerciseMiniCard name={r.name} imgUrl={r.imgUrl} dimmed={r.had} onclick={() => onpick(r.name)}>
        {#snippet trailing()}
          {#if r.had}<span class="had">Ya está</span>{:else}<span class="plus"><Icon name="plus" size={18} /></span>{/if}
        {/snippet}
      </ExerciseMiniCard>
    {/each}
  </div>
  {#if typed}
    <button type="button" class="manual" onclick={() => onpick(typed)}><Icon name="pen" size={17} />Escribir «{typed}» a mano</button>
  {/if}
</Sheet>

<style>
  .list { display: flex; flex-direction: column; gap: 6px; }
  .had { padding: 0 10px; }
  .plus { display: grid; place-items: center; width: 44px; height: 44px; }
  .manual {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 52px;
    padding: 0 4px;
    border: 0;
    background: none;
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
    text-align: left;
    cursor: pointer;
  }
</style>
