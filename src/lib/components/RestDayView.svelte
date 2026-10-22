<script lang="ts">
  import { RECOVERY_TIPS } from '$lib/data/recovery'
  import PageHeader from './PageHeader.svelte'
  import Card from './Card.svelte'
  import InfoCard from './InfoCard.svelte'
  import SectionLabel from './SectionLabel.svelte'

  let {
    weekObj = null,
    weekIdx = 0,
  }: {
    weekObj?: any
    weekIdx?: number
  } = $props()
</script>

<div class="rest-day" data-component="RestDayView">
  <PageHeader eyebrow="Hoy" title="Descanso." />
  <Card label="Descanso" title="La recuperación es donde creces.">
    <p>Sin pesas hoy. Tómalo con calma{weekObj ? ' y prepara tu cuerpo para la ' + (weekIdx >= 2 ? 'Semana A' : 'próxima sesión') : ''}.</p>
  </Card>
  <section class="tips">
    <SectionLabel>Lista de recuperación</SectionLabel>
    {#each RECOVERY_TIPS as tip}
      <InfoCard><b>{tip.title}</b> · {tip.body}</InfoCard>
    {/each}
  </section>
</div>

<style>
  .rest-day { display: flex; flex-direction: column; gap: 28px; }
  .tips { display: flex; flex-direction: column; gap: 8px; }
  .tips :global([data-component="SectionLabel"]) { margin-bottom: 2px; }
</style>
