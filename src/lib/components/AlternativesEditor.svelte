<script lang="ts">
  import type { Alternative, Exercise } from '$lib/types'
  import { alternativeImage } from '$lib/alternative-search'
  import Icon from './Icon.svelte'
  import IconButton from './IconButton.svelte'
  import ExerciseMiniCard from './ExerciseMiniCard.svelte'
  import AltSearchSheet from './AltSearchSheet.svelte'
  import Field from './Field.svelte'

  // Alternatives as mini cards with ✕; «Añadir alternativa» searches first.
  let { alternatives = $bindable([]), exercise, exercises }: {
    alternatives: Alternative[]
    exercise: Exercise
    exercises: Exercise[]
  } = $props()

  let searchOpen = $state(false)

  function add(name: string) {
    alternatives = [...alternatives, { name }]
    searchOpen = false
  }

  function remove(i: number) {
    alternatives = alternatives.filter((_, idx) => idx !== i)
  }
</script>

<Field label="Alternativas" data-component="AlternativesEditor">
  {#each alternatives as alt, i}
    <ExerciseMiniCard name={alt.name} imgUrl={alternativeImage(alt.name, exercises)}>
      {#snippet trailing()}
        <IconButton icon="x" size="sm" label="Quitar alternativa" onclick={() => remove(i)} />
      {/snippet}
    </ExerciseMiniCard>
  {/each}
  <button type="button" class="add" onclick={() => searchOpen = true}><Icon name="search" size={18} />Añadir alternativa</button>
</Field>

<AltSearchSheet bind:open={searchOpen} {exercise} {alternatives} {exercises} onpick={add} />

<style>
  .add {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 52px;
    border: 1px dashed var(--cv-line-strong);
    border-radius: var(--cv-radius-field);
    background: transparent;
    color: var(--text-secondary);
    font: inherit;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
