<script lang="ts">
  import type { Exercise, ExerciseLog } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { generateId } from '$lib/db'
  import { toast } from '$lib/stores/ui'
  import { muscleLabel } from '$lib/exercise-utils'
  import { plural } from '$lib/program-utils'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import Stack from './Stack.svelte'
  import EmptyState from './EmptyState.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import SearchInput from './SearchInput.svelte'
  import IconButton from './IconButton.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import ExerciseListItem from './ExerciseListItem.svelte'
  import ExerciseCard from './ExerciseCard.svelte'
  import EditExerciseSheet, { type ExerciseEdits } from './EditExerciseSheet.svelte'
  import NewExerciseSheet from './NewExerciseSheet.svelte'
  import ExerciseImporter from './ExerciseImporter.svelte'

  let { exercises, logs, onback, onchanged }: {
    exercises: Exercise[]
    logs: ExerciseLog[]
    onback: () => void
    onchanged: () => void
  } = $props()

  let query = $state('')
  let expandedId = $state<string | null>(null)
  let editOpen = $state(false)
  let newOpen = $state(false)
  let newName = $state('')
  let importer: ExerciseImporter | null = $state(null)

  function matches(ex: Exercise, q: string): boolean {
    const text = `${ex.name} ${ex.muscle || ''} ${muscleLabel(ex.muscle)}`.toLowerCase()
    return text.includes(q)
  }

  let q = $derived(query.trim().toLowerCase())
  let filtered = $derived(q ? exercises.filter(ex => matches(ex, q)) : exercises)
  let muscles = $derived([...new Set(exercises.map(e => muscleLabel(e.muscle)).filter(Boolean))])
  let selected = $derived(exercises.find(e => e.id === expandedId) ?? null)
  let logCount = $derived(selected ? logs.filter(l => l.exerciseId === selected!.id).length : 0)

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id
  }

  // The card stays open with the new data
  async function save(edits: ExerciseEdits) {
    if (!selected) return
    await Storage.patchExercise(selected.id, $state.snapshot(edits) as ExerciseEdits)
    editOpen = false
    toast.show('Ejercicio actualizado')
    onchanged()
  }

  async function remove() {
    if (!selected) return
    const name = selected.name
    await Storage.deleteExercise(selected.id)
    editOpen = false
    expandedId = null
    toast.show(`«${name}» eliminado`, false, 3000)
    onchanged()
  }

  async function create(ex: { name: string; muscle: string }) {
    await Storage.saveExercise({ id: await generateId(), name: ex.name, muscle: ex.muscle, imgUrl: '', gifUrl: '', tips: [], alternatives: [] })
    newOpen = false
    query = ''
    toast.show('Ejercicio creado')
    onchanged()
  }

  function openNew(name = '') {
    newName = name
    newOpen = true
  }
</script>

<YouScreen id="you-ejercicios">
  <SubpageHeader title="Ejercicios" {onback}>
    {#snippet leadSnippet()}
      {#if exercises.length}<span id="ex-count">{plural(exercises.length, 'ejercicio', 'ejercicios')}</span>. Toca uno para ver consejos y alternativas.{/if}
    {/snippet}
  </SubpageHeader>

  {#if exercises.length === 0}
    <EmptyState title="Aún no hay ejercicios" text="El coach los crea al armar tu programa. También puedes crear uno a mano.">
      {#snippet actions()}
        <Button size="lg" variant="text" style="padding:0" onclick={() => importer?.pick()}>Importar desde un archivo</Button>
      {/snippet}
    </EmptyState>
  {:else if filtered.length === 0}
    <EmptyState variant="center" title="No tienes «{query.trim()}»" text="Créalo y queda listo para usarlo en tus programas.">
      {#snippet actions()}
        <Button size="pill" variant="primary" onclick={() => create({ name: capitalize(query.trim()), muscle: '' })}><Icon name="plus" size={18} />Crear «{capitalize(query.trim())}»</Button>
      {/snippet}
    </EmptyState>
  {:else}
    <Stack gap={8}>
      {#each filtered as ex (ex.id)}
        {#if expandedId === ex.id}
          <ExerciseCard
            exercise={ex}
            {exercises}
            onclose={() => expandedId = null}
            onedit={() => editOpen = true}
          />
        {:else}
          <ExerciseListItem exercise={ex} dimmed={expandedId !== null} ontoggle={toggle} />
        {/if}
      {/each}
    </Stack>
  {/if}

  <NextStepDock>
    {#if exercises.length === 0}
      <Button size="lg" variant="primary" onclick={() => openNew()}><Icon name="plus" size={20} />Crear ejercicio</Button>
    {:else}
      <div class="sd">
        <SearchInput size="lg" value={query} placeholder="Buscar ejercicio" count={query ? filtered.length : undefined} oninput={(v) => query = v} id="exercise-search" />
        <IconButton icon="plus" variant="primary" label="Nuevo ejercicio" onclick={() => openNew(query.trim() ? capitalize(query.trim()) : '')} />
      </div>
    {/if}
  </NextStepDock>
</YouScreen>

<EditExerciseSheet bind:open={editOpen} exercise={selected} {exercises} {muscles} {logCount} onsave={save} ondelete={remove} />
<NewExerciseSheet bind:open={newOpen} initialName={newName} muscles={muscles.slice(0, 8)} onsave={create} />
<ExerciseImporter bind:this={importer} {onchanged} />

<style>
  .sd { display: grid; grid-template-columns: minmax(0, 1fr) 56px; gap: 8px; }
</style>
