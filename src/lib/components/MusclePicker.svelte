<script module lang="ts">
  export const BASIC_MUSCLES = ['Pecho', 'Espalda', 'Hombro', 'Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Glúteo', 'Pantorrilla', 'Abdomen']
</script>

<script lang="ts">
  import { muscleLabel } from '$lib/exercise-utils'
  import { normalizeExerciseName } from '$lib/data/exercise-dictionary'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'
  import Icon from './Icon.svelte'
  import SearchInput from './SearchInput.svelte'

  // One muscle, compact: a search on top and a few chips (the chosen one
  // first). Typing filters the user's muscles + the 10 basics; when nothing
  // matches, «Añadir» takes the typed name. `value` keeps the stored text (often
  // English) until something is picked.
  let { value = $bindable(''), muscles = [] }: {
    value: string
    /** The user's muscles, already translated for display */
    muscles?: string[]
  } = $props()

  const IDLE_CHIPS = 6

  let query = $state('')
  let typed = $derived(query.trim())
  let current = $derived(muscleLabel(value))
  let all = $derived([...new Set([current, ...muscles, ...BASIC_MUSCLES].filter(Boolean))])
  let shown = $derived(typed ? all.filter(m => matches(m, typed)) : all.slice(0, IDLE_CHIPS))

  function matches(muscle: string, q: string): boolean {
    return normalizeExerciseName(muscle).includes(normalizeExerciseName(q))
  }

  function pick(muscle: string) {
    value = muscle
    query = ''
  }

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
</script>

<div class="fw" data-component="MusclePicker">
  <span class="fl">Músculo</span>
  <SearchInput value={query} placeholder="Buscar o añadir músculo" oninput={(v) => query = v} id="muscle-search" />
  <ChipRow layout="wrap">
    {#each shown as m}
      <FilterChip variant="choice" active={current === m} onclick={() => pick(m)}>{m}</FilterChip>
    {/each}
    {#if typed && !shown.length}
      <FilterChip variant="outline" onclick={() => pick(capitalize(typed))}><Icon name="plus" size={16} />Añadir «{capitalize(typed)}»</FilterChip>
    {/if}
  </ChipRow>
</div>

<style>
  .fw { display: flex; flex-direction: column; gap: 8px; }
  .fl { font-size: 13px; color: var(--text-tertiary); padding-left: 4px; }
</style>
