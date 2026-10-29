<script lang="ts">
  import type { Program } from '$lib/types'
  import { plural, programExerciseCount } from '$lib/program-utils'
  import Sheet from './Sheet.svelte'
  import OptionList from './OptionList.svelte'
  import DangerZone from './DangerZone.svelte'
  import InlineConfirm from './InlineConfirm.svelte'

  // ⋯ of a program: Editar, Duplicar, and Eliminar confirmed inside this same sheet.
  let { open = $bindable(false), program, onedit, onduplicate, ondelete }: {
    open: boolean
    program: Program | null
    onedit: () => void
    onduplicate: () => void
    ondelete: () => void
  } = $props()

  let asking = $state(false)

  $effect(() => {
    if (!open) asking = false
  })

  function pick(v: string) {
    open = false
    if (v === 'edit') onedit()
    else onduplicate()
  }
</script>

<Sheet bind:open title={program?.name || ''} id="program-options">
  {#if program}
    <OptionList nav options={[{ value: 'edit', label: 'Editar días y ejercicios' }, { value: 'dup', label: 'Duplicar' }]} onselect={pick} />
    {#if asking}
      <InlineConfirm
        title="¿Eliminar «{program.name}»?"
        text="Se borra el programa con sus {plural(programExerciseCount(program), 'ejercicio planeado', 'ejercicios planeados')}."
        confirmLabel="Eliminar"
        oncancel={() => asking = false}
        onconfirm={() => { open = false; ondelete() }}
      />
    {:else}
      <DangerZone label="Eliminar" onclick={() => asking = true} />
    {/if}
  {/if}
</Sheet>
