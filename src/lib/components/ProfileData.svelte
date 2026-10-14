<script lang="ts">
  import type { Settings } from '$lib/types'
  import { PROFILE_FIELDS, displayValue, missingFields, profileValue, type ProfileField } from '$lib/profile'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import ProfileFieldSheet from './ProfileFieldSheet.svelte'

  let { settings, onsave, onback }: {
    settings: Partial<Settings>
    onsave: (field: ProfileField, value: string) => Promise<void>
    onback: () => void
  } = $props()

  let editing = $state<ProfileField | null>(null)
  let sheetOpen = $state(false)

  let missing = $derived(missingFields(settings))

  function edit(field: ProfileField) {
    editing = field
    sheetOpen = true
  }

  function missingCaption(n: number): string {
    return n === 1 ? 'Te falta 1 dato' : `Te faltan ${n} datos`
  }
</script>

<YouScreen id="you-datos">
  <SubpageHeader title="Mis datos" lead="El coach los usa para armar y ajustar tus programas. Se guardan solos." {onback} />
  <NavGroup>
    {#each PROFILE_FIELDS as field (field.key)}
      <NavRow id="profile-row-{field.key}" label={field.label} value={displayValue(field, settings) || null} onclick={() => edit(field)} />
    {/each}
  </NavGroup>

  {#if missing.length}
    <NextStepDock caption={missingCaption(missing.length)}>
      <Button size="lg" variant="primary" onclick={() => edit(missing[0])}>Agregar {missing[0].label.toLowerCase()}</Button>
    </NextStepDock>
  {/if}
</YouScreen>

<ProfileFieldSheet
  bind:open={sheetOpen}
  field={editing}
  saved={editing ? profileValue(settings, editing.key) : ''}
  units={settings.units || 'kg'}
  onsave={(v) => editing && onsave(editing, v)}
/>
