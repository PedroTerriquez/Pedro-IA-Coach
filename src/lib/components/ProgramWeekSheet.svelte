<script lang="ts">
  import type { DraftWeek } from '$lib/program-editor'
  import { WEEK_TAGS } from '$lib/program-editor'
  import { plural } from '$lib/program-utils'
  import EditSheet from './EditSheet.svelte'
  import TextInput from './TextInput.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'

  let { open = $bindable(false), week, onsave, onremove }: {
    open: boolean
    week: DraftWeek | null
    onsave: (patch: { name: string; tag: string }) => void
    onremove: () => void
  } = $props()

  let name = $state('')
  let tag = $state('')

  $effect(() => {
    if (open && week) { name = week.name; tag = week.tag }
  })

  let danger = $derived(week ? {
    label: 'Quitar semana',
    title: `¿Quitar ${week.name}?`,
    text: `Se quitan también sus ${plural(week.days.length, 'día', 'días')}.`,
    confirmLabel: 'Quitar semana',
    onconfirm: onremove,
  } : undefined)
</script>

<EditSheet bind:open id="program-week-sheet" title="Editar semana" cancel={false} {danger} onsave={() => onsave({ name: name.trim() || week?.name || 'Semana', tag: tag.trim() })}>
  <TextInput variant="field" label="Nombre" bind:value={name} />
  <TextInput variant="field" label="Etiqueta · opcional" bind:value={tag} />
  <div class="chips">
    <ChipRow layout="wrap">
      {#each WEEK_TAGS as t}
        <FilterChip variant="choice" active={tag === t} onclick={() => tag = tag === t ? '' : t}>{t}</FilterChip>
      {/each}
    </ChipRow>
  </div>
</EditSheet>

<style>
  .chips { margin-top: -8px; }
</style>
