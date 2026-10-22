<script lang="ts">
  import type { ProfileField } from '$lib/profile'
  import { fieldUnit, stepNumber } from '$lib/profile'
  import NumberStepper from './NumberStepper.svelte'
  import OptionList from './OptionList.svelte'
  import TextInput from './TextInput.svelte'

  // The input of one Mis datos field: stepper for numbers (no keyboard),
  // option list, or a text field. Shared by the field sheet and the guide.
  let { field, value = $bindable(''), units = 'kg', onpick = undefined }: {
    field: ProfileField
    value?: string
    units?: string
    /** Options only: called on tap (the field sheet saves right away) */
    onpick?: (value: string) => void
  } = $props()

  function current(): number {
    if (field.kind !== 'number') return 0
    const n = parseFloat(value)
    return isNaN(n) ? field.start : n
  }

  function step(dir: 1 | -1) {
    if (field.kind !== 'number') return
    value = String(stepNumber(current(), field.step, dir, field.min))
  }

  function pick(v: string) {
    value = v
    onpick?.(v)
  }

  $effect(() => {
    // A number field always shows a figure: start from the default when empty
    if (field.kind === 'number' && !value) value = String(field.start)
  })
</script>

{#if field.kind === 'number'}
  <NumberStepper name={field.label.toLowerCase()} display={value} unit={fieldUnit(field, units)} decDisabled={current() <= field.min} onstep={step} />
{:else if field.kind === 'option'}
  <OptionList label={field.label} options={field.options} {value} onselect={pick} />
{:else}
  <TextInput variant="field" bind:value placeholder={field.label} autocomplete="organization-title" />
{/if}
