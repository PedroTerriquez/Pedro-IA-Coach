<script lang="ts">
  import { untrack } from 'svelte'
  import type { Settings } from '$lib/types'
  import { PROFILE_FIELDS, profileValue, type ProfileField } from '$lib/profile'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import ProfileFieldControl from './ProfileFieldControl.svelte'

  // First time: one field per screen, «Mis datos · N de 7», with Saltar.
  // Walks only the fields still missing, in the order of the list.
  let { open = $bindable(false), settings, onsave }: {
    open: boolean
    settings: Partial<Settings>
    onsave: (field: ProfileField, value: string) => Promise<void>
  } = $props()

  let queue = $state<ProfileField[]>([])
  let pos = $state(0)
  let value = $state('')

  // Untracked: saving a field updates `settings`, and that must not restart the walk
  $effect(() => {
    if (open) untrack(start)
  })

  function start() {
    queue = PROFILE_FIELDS.filter(f => !profileValue(settings, f.key))
    pos = 0
    value = ''
    if (!queue.length) open = false
  }

  let field = $derived(queue[pos] ?? null)
  let index = $derived(Math.max(0, PROFILE_FIELDS.findIndex(f => f.key === field?.key)))

  function advance() {
    value = ''
    if (pos + 1 >= queue.length) open = false
    else pos++
  }

  async function next() {
    if (field && value.trim()) await onsave(field, value.trim())
    advance()
  }
</script>

<Sheet bind:open title="Mis datos · {index + 1} de 7" titleStyle="label" id="profile-guide">
  <div class="segs" aria-hidden="true">
    {#each PROFILE_FIELDS as _, i}<i class:on={i <= index}></i>{/each}
  </div>
  {#if field}
    {#key field.key}
      <div class="q">{field.question}</div>
      <ProfileFieldControl {field} bind:value units={settings.units || 'kg'} />
    {/key}
    <div class="duo">
      <Button size="lg" variant="secondary" onclick={advance}>Saltar</Button>
      <Button size="lg" variant="primary" onclick={next}>Siguiente<Icon name="arrow" size={18} /></Button>
    </div>
  {/if}
</Sheet>

<style>
  .segs { display: flex; gap: 4px; margin-top: -14px; }
  .segs i { flex: 1; height: 4px; border-radius: 2px; background: var(--cv-fill-on); }
  .segs i.on { background: var(--text); }
  .q { font-size: 24px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; }
  .duo { display: grid; grid-template-columns: 1fr 1.6fr; gap: 8px; }
</style>
