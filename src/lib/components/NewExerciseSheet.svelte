<script lang="ts">
  import Sheet from './Sheet.svelte'
  import TextInput from './TextInput.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'
  import Button from './Button.svelte'

  let { open = $bindable(false), initialName = '', muscles, onsave }: {
    open: boolean
    initialName?: string
    /** Muscle suggestions «De tu lista» (already translated for display) */
    muscles: string[]
    onsave: (ex: { name: string; muscle: string }) => void
  } = $props()

  let name = $state('')
  let muscle = $state('')
  let error = $state('')

  $effect(() => {
    if (open) { name = initialName; muscle = ''; error = '' }
  })

  function save() {
    if (!name.trim()) { error = 'Ponle un nombre.'; return }
    onsave({ name: name.trim(), muscle: muscle.trim() })
  }
</script>

<Sheet bind:open title="Nuevo ejercicio" id="new-exercise-sheet">
  <TextInput variant="field" label="Nombre" bind:value={name} {error} placeholder="Ej: Sentadilla" />
  <TextInput variant="field" label="Músculo" bind:value={muscle} placeholder="Ej: Pierna" />
  {#if muscles.length}
    <div class="cg">
      <small>De tu lista</small>
      <ChipRow layout="wrap">
        {#each muscles as m}
          <FilterChip variant="choice" active={muscle === m} onclick={() => muscle = m}>{m}</FilterChip>
        {/each}
      </ChipRow>
    </div>
  {/if}
  <Button size="lg" variant="primary" onclick={save}>Guardar</Button>
</Sheet>

<style>
  .cg { display: flex; flex-direction: column; gap: 10px; margin-top: -6px; }
  small { font-size: 12px; color: var(--text-muted); }
</style>
