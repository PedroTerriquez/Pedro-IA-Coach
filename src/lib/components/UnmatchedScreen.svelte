<script lang="ts">
  import type { Exercise } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { toast } from '$lib/stores/ui'
  import { plural } from '$lib/program-utils'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import Stack from './Stack.svelte'
  import ExerciseListItem from './ExerciseListItem.svelte'
  import EditExerciseSheet, { type ExerciseEdits } from './EditExerciseSheet.svelte'

  // Exercises the dictionary didn't find; each one opens «Editar ejercicio».
  let { names, exercises, onchanged, onback }: {
    names: string[]
    exercises: Exercise[]
    onchanged: () => void
    onback: () => void
  } = $props()

  let list = $derived(exercises.filter(e => names.includes(e.name)))
  let selected = $state<Exercise | null>(null)
  let open = $state(false)

  function edit(ex: Exercise) {
    selected = ex
    open = true
  }

  async function save(edits: ExerciseEdits) {
    if (!selected) return
    await Storage.saveExercise({ ...$state.snapshot(selected), ...edits })
    open = false
    toast.show('Ejercicio actualizado')
    onchanged()
  }
</script>

<YouScreen id="you-sin-coincidencia">
  <SubpageHeader
    title="Sin coincidencia"
    back="Copia de seguridad"
    lead="El diccionario no tiene {list.length === 1 ? 'este' : `estos ${list.length}`}. Se quedaron como estaban; toca uno para editarlo a mano."
    {onback}
  />
  <Stack gap={8} ariaLabel={plural(list.length, 'ejercicio', 'ejercicios')}>
    {#each list as ex (ex.id)}
      <ExerciseListItem exercise={ex} nav ontoggle={() => edit(ex)} />
    {/each}
  </Stack>
</YouScreen>

<EditExerciseSheet bind:open exercise={selected} onsave={save} />
