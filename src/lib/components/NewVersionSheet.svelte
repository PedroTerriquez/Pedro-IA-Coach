<script lang="ts">
  import Sheet from './Sheet.svelte'
  import TextInput from './TextInput.svelte'
  import NavRow from './NavRow.svelte'
  import Switch from './Switch.svelte'
  import Button from './Button.svelte'

  // «Crear versión nueva»: name it and decide whether it becomes the active program.
  let { open = $bindable(false), programName, suggestedName, busy = false, oncreate }: {
    open: boolean
    programName: string
    suggestedName: string
    busy?: boolean
    oncreate: (opts: { name: string; activate: boolean }) => void
  } = $props()

  let name = $state('')
  let activate = $state(true)

  $effect(() => {
    if (open) { name = suggestedName; activate = true }
  })
</script>

<Sheet bind:open elevated title="Versión nueva" id="new-version-sheet">
  <TextInput variant="field" label="Nombre" bind:value={name} />
  <div class="row">
    <NavRow label="Usarla desde hoy">
      {#snippet control()}<Switch label="Usarla desde hoy" checked={activate} onchange={(v) => activate = v} />{/snippet}
    </NavRow>
  </div>
  <p class="note">«{programName}» se queda en Otros programas con todo tu historial.</p>
  <Button size="lg" variant="primary" disabled={busy || !name.trim()} onclick={() => oncreate({ name: name.trim(), activate })}>
    {busy ? 'Creando versión…' : 'Crear versión'}
  </Button>
</Sheet>

<style>
  .row { border-radius: var(--radius-lg); overflow: hidden; background: var(--cv-fill-1); }
  .note { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
