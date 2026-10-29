<script lang="ts">
  import type { Exercise } from '$lib/types'
  import type { DraftExercise } from '$lib/program-editor'
  import { REST_STEP, suggestExercises } from '$lib/program-editor'
  import { muscleLabel } from '$lib/exercise-utils'
  import EditSheet from './EditSheet.svelte'
  import TextInput from './TextInput.svelte'
  import NumberStepper from './NumberStepper.svelte'
  import OptionList from './OptionList.svelte'
  import Field from './Field.svelte'

  let { open = $bindable(false), exercise, library, onsave }: {
    open: boolean
    exercise: DraftExercise | null
    /** Your exercises, for the name suggestions */
    library: Exercise[]
    onsave: (ex: DraftExercise) => void
  } = $props()

  let name = $state('')
  let sets = $state(3)
  let reps = $state('10')
  let rest = $state(60)
  let error = $state('')

  $effect(() => {
    if (open && exercise) load(exercise)
  })

  function load(ex: DraftExercise) {
    name = ex.name
    sets = ex.sets
    reps = ex.reps
    rest = ex.rest
    error = ''
  }

  let suggestions = $derived(suggestExercises(name, library))

  function typedRest(e: Event) {
    const n = parseInt((e.currentTarget as HTMLInputElement).value.replace(/\D/g, ''), 10)
    rest = Number.isFinite(n) ? n : 0
  }

  function save() {
    if (!name.trim()) { error = 'Ponle un nombre.'; return }
    onsave({ name: name.trim(), sets, reps: reps.trim() || '10', rest })
  }
</script>

<EditSheet bind:open id="program-exercise-sheet" title="Editar ejercicio del día" cancel={false} onsave={save}>
  <TextInput variant="field" label="Nombre" bind:value={name} {error} placeholder="Ej: Press Banca" />
  {#if suggestions.length}
    <Field label="De tus ejercicios" style="margin-top:-6px">
      <OptionList
        nav
        label="De tus ejercicios"
        options={suggestions.map(e => ({ value: e.name, label: e.name, meta: muscleLabel(e.muscle) }))}
        onselect={(v) => name = v}
      />
    </Field>
  {/if}
  <Field label="Series">
    <NumberStepper size="sm" name="series" display={String(sets)} unit="series" decDisabled={sets <= 1} onstep={(d) => sets = Math.max(1, sets + d)} />
  </Field>
  <TextInput variant="field" label="Repeticiones" mono bind:value={reps} placeholder="8-10" />
  <Field label="Descanso">
    <NumberStepper size="sm" name="descanso" display={String(rest)} unit="s" decDisabled={rest <= 0} onstep={(d) => rest = Math.max(0, rest + d * REST_STEP)} oninput={typedRest} />
  </Field>
</EditSheet>
