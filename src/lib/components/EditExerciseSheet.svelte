<script module lang="ts">
  export interface ExerciseEdits {
    name: string
    muscle: string
    imgUrl: string
  }
</script>

<script lang="ts">
  import type { Exercise } from '$lib/types'
  import EditSheet from './EditSheet.svelte'
  import TextInput from './TextInput.svelte'

  // Same sheet as Historial · Nuevo 02; Tú adds «Eliminar ejercicio» (`deletable`).
  let { open = $bindable(false), exercise, deletable = false, logCount = 0, onsave, ondelete = () => {}, onclose = () => {} }: {
    open: boolean
    exercise: Exercise | null
    deletable?: boolean
    /** Logs that go away with the exercise, said in the confirmation */
    logCount?: number
    onsave: (edits: ExerciseEdits) => void
    ondelete?: () => void
    onclose?: () => void
  } = $props()

  let name = $state('')
  let muscle = $state('')
  let imgUrl = $state('')
  let error = $state('')

  $effect(() => {
    if (open && exercise) load(exercise)
  })

  function load(ex: Exercise) {
    name = ex.name
    muscle = ex.muscle || ''
    imgUrl = ex.imgUrl || ''
    error = ''
  }

  function save() {
    if (!name.trim()) { error = 'Ponle un nombre.'; return }
    onsave({ name: name.trim(), muscle: muscle.trim(), imgUrl: imgUrl.trim() })
  }

  function deleteText(n: number): string {
    if (n === 0) return 'No tiene registros en tu historial. No se puede deshacer.'
    return `Se borran también sus ${n} ${n === 1 ? 'registro' : 'registros'} del historial. No se puede deshacer.`
  }

  let danger = $derived(deletable && exercise ? {
    label: 'Eliminar ejercicio',
    title: `¿Eliminar «${exercise.name}»?`,
    text: deleteText(logCount),
    confirmLabel: 'Eliminar',
    onconfirm: ondelete,
  } : undefined)
</script>

<EditSheet bind:open title="Editar ejercicio" {danger} onsave={save} {onclose} id="edit-exercise-sheet">
  <TextInput variant="field" label="Nombre" bind:value={name} {error} />
  <TextInput variant="field" label="Músculo" bind:value={muscle} />
  <TextInput variant="field" label="Imagen · opcional" type="url" mono bind:value={imgUrl} placeholder="Pega una URL" />
</EditSheet>
