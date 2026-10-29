<script module lang="ts">
  import type { Alternative } from '$lib/types'

  export interface ExerciseEdits {
    name: string
    muscle: string
    imgUrl: string
    tips: string[]
    alternatives: Alternative[]
  }
</script>

<script lang="ts">
  import type { Exercise } from '$lib/types'
  import Sheet from './Sheet.svelte'
  import TextInput from './TextInput.svelte'
  import Button from './Button.svelte'
  import DangerZone from './DangerZone.svelte'
  import MusclePicker from './MusclePicker.svelte'
  import ImageField from './ImageField.svelte'
  import TipsEditor from './TipsEditor.svelte'
  import AlternativesEditor from './AlternativesEditor.svelte'
  import ConfirmSheet from './ConfirmSheet.svelte'

  // The one exercise editor, everywhere an exercise is edited: name, muscle,
  // image, tips, alternatives and (with `ondelete`) delete. Nothing is saved
  // until Guardar; ✕ closes without saving.
  // Also used in create mode (exercise null / mode create) with same fields.
  let { open = $bindable(false), exercise = null, exercises = [], muscles = [], logCount = 0, onsave, ondelete = undefined, onclose = () => {}, mode = 'edit', initialName = '' }: {
    open: boolean
    exercise?: Exercise | null
    /** The user's exercises, for alternative search and photos */
    exercises?: Exercise[]
    /** The user's muscles (display labels), shown before the basics */
    muscles?: string[]
    /** History logs deleted with the exercise, said in the confirmation */
    logCount?: number
    onsave: (edits: ExerciseEdits) => void
    ondelete?: () => void
    onclose?: () => void
    mode?: 'create' | 'edit'
    initialName?: string
  } = $props()

  let isCreate = $derived(mode === 'create' || exercise === null)
  let title = $derived(isCreate ? 'Nuevo ejercicio' : 'Editar ejercicio')

  let name = $state('')
  let muscle = $state('')
  let imgUrl = $state('')
  let tips = $state<string[]>([])
  let alternatives = $state<Alternative[]>([])
  let touched = $state(false)
  let confirming = $state(false)

  $effect(() => {
    if (open) {
      touched = false
      confirming = false
      if (!isCreate && exercise) {
        load(exercise)
      } else {
        name = initialName || ''
        muscle = ''
        imgUrl = ''
        tips = []
        alternatives = []
      }
    }
  })

  function load(ex: Exercise) {
    name = ex.name
    muscle = ex.muscle || ''
    imgUrl = ex.imgUrl || ''
    tips = [...(ex.tips || [])]
    alternatives = (ex.alternatives || []).map(a => ({ name: a.name }))
    touched = false
    confirming = false
  }

  let empty = $derived(!name.trim())

  function save() {
    if (empty) return
    onsave({
      name: name.trim(),
      muscle: muscle.trim(),
      imgUrl: imgUrl.trim(),
      tips: tips.map(t => t.trim()).filter(Boolean),
      alternatives: alternatives.map(a => ({ name: a.name })),
    })
  }

  function deleteText(n: number): string {
    if (n === 0) return 'No se puede deshacer.'
    return `Se borran también ${n === 1 ? 'su registro' : `sus ${n} registros`} del historial. No se puede deshacer.`
  }
</script>

<Sheet bind:open title={title} full {onclose} id="edit-exercise-sheet">
  <div class="fset">
    <TextInput variant="field" label="Nombre" bind:value={name} oninput={() => touched = true} error={touched && empty ? 'Ponle un nombre.' : ''} />
    <MusclePicker bind:value={muscle} {muscles} />
    <ImageField bind:value={imgUrl} exercise={isCreate ? null : exercise} />
    <TipsEditor bind:tips />
    {#if !isCreate && exercise}<AlternativesEditor bind:alternatives {exercise} {exercises} />{/if}
    {#if !isCreate && ondelete}
      <DangerZone filled label="Eliminar ejercicio" onclick={() => confirming = true} />
    {/if}
  </div>
  {#snippet footer()}
    <Button size="lg" variant="primary" disabled={empty} onclick={save}>Guardar</Button>
  {/snippet}
</Sheet>

{#if !isCreate && ondelete && exercise}
  <ConfirmSheet bind:open={confirming} elevated title="¿Eliminar «{exercise.name}»?" text={deleteText(logCount)} confirmLabel="Eliminar" onconfirm={ondelete} id="delete-exercise-sheet" />
{/if}

<style>
  .fset { display: flex; flex-direction: column; gap: 24px; }
</style>
