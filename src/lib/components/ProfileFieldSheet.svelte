<script lang="ts">
  import type { ProfileField } from '$lib/profile'
  import { fieldUnit } from '$lib/profile'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import ProfileFieldControl from './ProfileFieldControl.svelte'
  import Caption from './Caption.svelte'
  import Lead from './Lead.svelte'

  let { open = $bindable(false), field, saved, units = 'kg', onsave }: {
    open: boolean
    field: ProfileField | null
    /** Value currently saved ('' = missing) */
    saved: string
    units?: string
    onsave: (value: string) => void
  } = $props()

  let value = $state('')

  $effect(() => {
    if (open) value = saved
  })

  function stepCaption(f: ProfileField): string {
    if (f.kind !== 'number') return ''
    const step = f.step === 1 ? 'De 1 en 1' : `Cambia de ${f.step} en ${f.step}`
    if (!saved) return step
    const unit = f.key === 'age' ? '' : ` ${fieldUnit(f, units)}`
    return `${step} · antes ${saved}${unit}`
  }

  function save() {
    onsave(value.trim())
    open = false
  }

  function pickAndClose(v: string) {
    onsave(v)
    open = false
  }
</script>

<Sheet bind:open title={field?.label || ''} id="profile-field-sheet">
  {#if field}
    {#if field.kind === 'text'}<Lead style="margin-top:-6px">{field.lead}</Lead>{/if}
    <ProfileFieldControl {field} bind:value {units} onpick={field.kind === 'option' ? pickAndClose : undefined} />
    {#if field.kind === 'number'}<Caption>{stepCaption(field)}</Caption>{/if}
    {#if field.kind === 'option'}
      <Caption style="margin-bottom:-8px">Se guarda al tocar</Caption>
    {:else}
      <Button size="lg" variant="primary" onclick={save}>Guardar</Button>
    {/if}
  {/if}
</Sheet>

<style>
</style>
