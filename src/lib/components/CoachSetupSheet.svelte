<script lang="ts">
  import { DAYS_OPTIONS, EQUIPMENT_OPTIONS, FOCUS_OPTIONS, LIMIT_OPTIONS, emptyChoices, toggleIn, type SetupChoices } from '$lib/program-setup'
  import Sheet from './Sheet.svelte'
  import SectionLabel from './SectionLabel.svelte'
  import ChipRow from './ChipRow.svelte'
  import FilterChip from './FilterChip.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Caption from './Caption.svelte'

  let { open = $bindable(false), online, onstart }: {
    open: boolean
    online: boolean
    onstart: (choices: SetupChoices) => void
  } = $props()

  let choices = $state<SetupChoices>(emptyChoices())

  $effect(() => {
    if (open) choices = emptyChoices()
  })

  function start() {
    open = false
    onstart($state.snapshot(choices))
  }
</script>

<Sheet bind:open full title="Con el coach" eyebrow="Cuéntale qué buscas" titleStyle="center" id="coach-setup-sheet">
  <div class="cg">
    <SectionLabel>Días por semana</SectionLabel>
    <ChipRow layout="eq">
      {#each DAYS_OPTIONS as d}
        <FilterChip variant="choice" active={choices.days === d} onclick={() => choices.days = choices.days === d ? null : d}>{d}</FilterChip>
      {/each}
    </ChipRow>
  </div>
  <div class="cg">
    <SectionLabel>Equipo</SectionLabel>
    <ChipRow layout="wrap">
      {#each EQUIPMENT_OPTIONS as e}
        <FilterChip variant="choice" active={choices.equipment === e.v} onclick={() => choices.equipment = choices.equipment === e.v ? null : e.v}>{e.l}</FilterChip>
      {/each}
    </ChipRow>
  </div>
  <div class="cg">
    <SectionLabel>Enfoque</SectionLabel>
    <ChipRow layout="wrap">
      {#each FOCUS_OPTIONS as f}
        <FilterChip variant="choice" active={choices.focus.includes(f.v)} onclick={() => choices.focus = toggleIn(choices.focus, f.v)}>{f.l}</FilterChip>
      {/each}
    </ChipRow>
  </div>
  <div class="cg">
    <SectionLabel>
      Zonas con molestia
      {#snippet right()}Opcional{/snippet}
    </SectionLabel>
    <ChipRow layout="wrap">
      {#each LIMIT_OPTIONS as part}
        <FilterChip variant="choice" active={choices.limits.includes(part)} onclick={() => choices.limits = toggleIn(choices.limits, part)}>{part}</FilterChip>
      {/each}
    </ChipRow>
  </div>

  {#snippet footer()}
    <Caption>Primero lo platican; se crea cuando estén de acuerdo</Caption>
    <Button size="lg" variant="primary" disabled={!online} onclick={start}>Platicar con el coach<Icon name="arrow" size={18} /></Button>
  {/snippet}
</Sheet>

<style>
  .cg { display: flex; flex-direction: column; gap: 10px; }
</style>
