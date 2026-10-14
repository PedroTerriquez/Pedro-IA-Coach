<script lang="ts">
  import type { Program } from '$lib/types'
  import { programMeta } from '$lib/program-utils'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import ProgramCard from './ProgramCard.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import EmptyState from './EmptyState.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import ProgramOptionsSheet from './ProgramOptionsSheet.svelte'

  let { programs, activeId, online, onback, oncreate, onimprove, onactivate, onedit, onduplicate, ondelete }: {
    programs: Program[]
    activeId: string | null
    online: boolean
    onback: () => void
    oncreate: () => void
    onimprove: () => void
    onactivate: (p: Program) => void
    onedit: (p: Program) => void
    onduplicate: (p: Program) => void
    ondelete: (p: Program) => void
  } = $props()

  let active = $derived(programs.find(p => p.id === activeId) || null)
  let others = $derived(programs.filter(p => p.id !== activeId))
  let optionsFor = $state<Program | null>(null)
  let optionsOpen = $state(false)

  function openOptions(p: Program) {
    optionsFor = p
    optionsOpen = true
  }
</script>

<YouScreen id="you-programas">
  <SubpageHeader title="Programas" {onback} />

  {#if programs.length === 0}
    <EmptyState title="Aún no tienes programa" text="Un programa son tus días y ejercicios de cada semana. Con él, Hoy te dice qué te toca." />
  {/if}

  {#if active}
    <ProgramCard program={active} meta={programMeta(active)} isActive onmore={() => openOptions(active)}>
      <NavRow label="Editar días y ejercicios" onclick={() => onedit(active)} />
      <NavRow
        ai
        id="improve-program-row"
        label="Mejorar con el coach"
        sub={online ? 'Lo platican y aplicas los cambios' : 'Necesita internet'}
        disabled={!online}
        onclick={onimprove}
      />
    </ProgramCard>
  {/if}

  {#if others.length}
    <NavGroup label="Otros programas">
      {#each others as p (p.id)}
        <ProgramCard program={p} meta={programMeta(p)} onactivate={() => onactivate(p)} onmore={() => openOptions(p)} />
      {/each}
    </NavGroup>
  {/if}

  <NextStepDock caption={programs.length ? '' : 'Con el coach, pegando tu rutina o desde cero'}>
    <Button size="lg" variant="primary" id="create-program-btn" onclick={oncreate}><Icon name="plus" size={20} />Crear programa</Button>
  </NextStepDock>
</YouScreen>

<ProgramOptionsSheet
  bind:open={optionsOpen}
  program={optionsFor}
  onedit={() => optionsFor && onedit(optionsFor)}
  onduplicate={() => optionsFor && onduplicate(optionsFor)}
  ondelete={() => optionsFor && ondelete(optionsFor)}
/>
