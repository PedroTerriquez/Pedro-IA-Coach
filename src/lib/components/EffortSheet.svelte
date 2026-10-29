<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import Lead from './Lead.svelte'
  import ChoiceCard from './ChoiceCard.svelte'

  // How the session felt, with intensity bars instead of emojis. «Ahora no»
  // closes it; the summary can open it again.
  let { open = $bindable(false), onselect, onskip }: {
    open: boolean
    onselect: (effort: string) => void
    onskip: () => void
  } = $props()

  const EFFORTS = [
    { label: 'Fácil', desc: 'Podía más, para subir peso', level: 1 },
    { label: 'Justo', desc: 'Peso correcto, lo planeado', level: 2 },
    { label: 'Pesado', desc: 'Me costó trabajo', level: 3 },
    { label: 'Al fallo', desc: 'Llegué al fallo muscular, no daba más', level: 4 },
  ]
  const BAR_HEIGHTS = [8, 12, 16, 20]
</script>

<Sheet id="effort-overlay" bind:open title="¿Cómo sentiste la sesión?" onclose={onskip}>
  <Lead style="margin-top:-12px">Así Pedro te da mejor feedback.</Lead>
  <div class="opts" data-component="EffortSheet">
    {#each EFFORTS as e}
      <ChoiceCard title={e.label} desc={e.desc} chevron={false} data-effort={e.label} onclick={() => onselect(e.label)}>
        {#snippet lead()}
          <span class="lvl" aria-hidden="true">
            {#each BAR_HEIGHTS as h, i}<i class:on={i < e.level} style="height:{h}px"></i>{/each}
          </span>
        {/snippet}
      </ChoiceCard>
    {/each}
  </div>
  <Button variant="text" size="lg" fullWidth onclick={onskip}>Ahora no</Button>
</Sheet>

<style>
  .opts { display: flex; flex-direction: column; gap: 8px; }
  .lvl { display: flex; align-items: flex-end; gap: 3px; height: 20px; }
  .lvl i { width: 4px; border-radius: 1.5px; background: var(--cv-line-strong); }
  .lvl i.on { background: var(--text); }
</style>
