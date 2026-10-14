<script lang="ts">
  import type { Exercise } from '$lib/types'
  import EditSheet from './EditSheet.svelte'
  import EditableList from './EditableList.svelte'

  // Consejos and Alternativas of an exercise: same sheet, one or two fields per item.
  let { open = $bindable(false), exercise, kind, onsave }: {
    open: boolean
    exercise: Exercise | null
    kind: 'consejos' | 'alternativas'
    onsave: (patch: Partial<Exercise>) => void
  } = $props()

  let items = $state<string[][]>([])

  $effect(() => {
    if (open && exercise) load(exercise)
  })

  function load(ex: Exercise) {
    items = kind === 'consejos'
      ? (ex.tips || []).map(t => [t])
      : (ex.alternatives || []).map(a => [a.name, a.reason || ''])
  }

  function save() {
    const filled = items.filter(it => it[0].trim())
    if (kind === 'consejos') onsave({ tips: filled.map(it => it[0].trim()) })
    else onsave({ alternatives: filled.map(it => ({ name: it[0].trim(), reason: (it[1] || '').trim() })) })
  }

  let isTips = $derived(kind === 'consejos')
</script>

<EditSheet bind:open title={isTips ? 'Consejos' : 'Alternativas'} onsave={save} id="exercise-{kind}-sheet">
  <p class="lead">
    {#if isTips}
      Frases cortas sobre la técnica de «{exercise?.name}».
    {:else}
      Otro ejercicio y por qué hacerlo en lugar de «{exercise?.name}».
    {/if}
  </p>
  {#if isTips}
    <EditableList bind:items placeholders={['Ej: Baja controlado']} addLabel="Añadir consejo" removeLabel="Quitar consejo" emptyItem={['']} />
  {:else}
    <EditableList bind:items placeholders={['Nombre', 'Motivo · ej. aísla más el bíceps']} addLabel="Añadir alternativa" removeLabel="Quitar alternativa" emptyItem={['', '']} />
  {/if}
</EditSheet>

<style>
  .lead { margin-top: -6px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
