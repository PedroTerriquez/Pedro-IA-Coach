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
  import ExerciseListItem, { type ExerciseEditKind } from './ExerciseListItem.svelte'
  import EditExerciseSheet, { type ExerciseEdits } from './EditExerciseSheet.svelte'
  import ExerciseTipsSheet from './ExerciseTipsSheet.svelte'
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
  let selected = $state<Exercise | null>(null)
  let datosOpen = $state(false)
  let listOpen = $state(false)
  let listKind = $state<'consejos' | 'alternativas'>('consejos')
  let newOpen = $state(false)
  let newName = $state('')
  let importer: ExerciseImporter | null = $state(null)

  function matches(ex: Exercise, q: string): boolean {
    const text = `${ex.name} ${ex.muscle || ''} ${muscleLabel(ex.muscle)}`.toLowerCase()
    return text.includes(q)
  }

  let q = $derived(query.trim().toLowerCase())
  let filtered = $derived(q ? exercises.filter(ex => matches(ex, q)) : exercises)
  let muscles = $derived([...new Set(exercises.map(e => muscleLabel(e.muscle)).filter(Boolean))].slice(0, 8))
  let logCount = $derived(selected ? logs.filter(l => l.exerciseId === selected!.id).length : 0)

  function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }

  function toggle(id: string) {
    expandedId = expandedId === id ? null : id
  }

  function edit(ex: Exercise, kind: ExerciseEditKind) {
    selected = ex
    if (kind === 'datos') { datosOpen = true; return }
    listKind = kind
    listOpen = true
  }

  async function update(patch: Partial<Exercise>, message: string) {
    if (!selected) return
    await Storage.saveExercise({ ...$state.snapshot(selected), ...patch })
    toast.show(message)
    onchanged()
  }

  async function saveDatos(edits: ExerciseEdits) {
    await update(edits, 'Ejercicio actualizado')
    datosOpen = false
  }

  async function saveList(patch: Partial<Exercise>) {
    await update(patch, listKind === 'consejos' ? 'Consejos guardados' : 'Alternativas guardadas')
    listOpen = false
  }

  async function remove() {
    if (!selected) return
    await Storage.deleteExercise(selected.id)
    datosOpen = false
    expandedId = null
    toast.show('Ejercicio eliminado')
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
        <ExerciseListItem exercise={ex} expanded={expandedId === ex.id} ontoggle={toggle} onedit={(kind) => edit(ex, kind)} />
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

<EditExerciseSheet bind:open={datosOpen} exercise={selected} deletable {logCount} onsave={saveDatos} ondelete={remove} />
<ExerciseTipsSheet bind:open={listOpen} exercise={selected} kind={listKind} onsave={saveList} />
<NewExerciseSheet bind:open={newOpen} initialName={newName} {muscles} onsave={create} />
<ExerciseImporter bind:this={importer} {onchanged} />

<style>
  .sd { display: grid; grid-template-columns: minmax(0, 1fr) 56px; gap: 8px; }
</style>
