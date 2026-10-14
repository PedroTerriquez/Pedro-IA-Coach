<script lang="ts">
  import type { ProfileField } from '$lib/profile'
  import { fieldUnit } from '$lib/profile'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import ProfileFieldControl from './ProfileFieldControl.svelte'

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
    {#if field.kind === 'text'}<p class="lead">{field.lead}</p>{/if}
    <ProfileFieldControl {field} bind:value {units} onpick={field.kind === 'option' ? pickAndClose : undefined} />
    {#if field.kind === 'number'}<p class="cap">{stepCaption(field)}</p>{/if}
    {#if field.kind === 'option'}
      <p class="cap last">Se guarda al tocar</p>
    {:else}
      <Button size="lg" variant="primary" onclick={save}>Guardar</Button>
    {/if}
  {/if}
</Sheet>

<style>
  .lead { margin-top: -6px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
  .cap { font-size: 13px; line-height: 1.45; text-align: center; color: var(--text-tertiary); }
  .cap.last { margin-bottom: -8px; }
</style>
