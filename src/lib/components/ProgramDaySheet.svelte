<script lang="ts">
  import type { DraftDay } from '$lib/program-editor'
  import { dayDurationMin, plural, WEEKDAY_LETTERS, WEEKDAY_NAMES } from '$lib/program-utils'
  import EditSheet from './EditSheet.svelte'
  import TextInput from './TextInput.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'
  import Field from './Field.svelte'
  import StatusRow from './StatusRow.svelte'

  let { open = $bindable(false), day, weekName, onsave, onremove }: {
    open: boolean
    day: DraftDay | null
    weekName: string
    onsave: (patch: { name: string; weekday?: number }) => void
    onremove: () => void
  } = $props()

  let name = $state('')
  let weekday = $state<number | undefined>(undefined)

  $effect(() => {
    if (open && day) { name = day.name; weekday = day.weekday }
  })

  function toggleWeekday(n: number) {
    weekday = weekday === n ? undefined : n
  }

  let danger = $derived(day ? {
    label: 'Quitar día',
    title: `¿Quitar ${day.name}?`,
    text: `Se quitan también sus ${plural(day.exercises.length, 'ejercicio', 'ejercicios')} de ${weekName}.`,
    confirmLabel: 'Quitar día',
    onconfirm: onremove,
  } : undefined)
</script>

<EditSheet bind:open id="program-day-sheet" title="Editar día" cancel={false} {danger} onsave={() => onsave({ name: name.trim() || day?.name || 'Día', weekday })}>
  <TextInput variant="field" label="Nombre del día" bind:value={name} />
  <Field label="Día de la semana">
    <ChipRow layout="days">
      {#each WEEKDAY_LETTERS as letter, i}
        <FilterChip variant="choice" active={weekday === i + 1} title={WEEKDAY_NAMES[i]} onclick={() => toggleWeekday(i + 1)}>{letter}</FilterChip>
      {/each}
    </ChipRow>
  </Field>
  <StatusRow label="Duración" sub="Se calcula sola: 30 s por serie más su descanso" value="≈ {dayDurationMin(day?.exercises)} min" />
</EditSheet>
