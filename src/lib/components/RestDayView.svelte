<script lang="ts">
  import { RECOVERY_TIPS } from '$lib/data/recovery'
  import PageHeader from './PageHeader.svelte'
  import ActivityRow from './ActivityRow.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import type { Activity } from '$lib/types'

  // Hoy on a rest day (Nuevo · Hoy actividades 08–09): what's next, the day's
  // activities and the recovery list. «Registrar actividad» is the main action
  // until something is logged; then the day counts as trained.
  let { eyebrow = 'Hoy', sub = '', activities = [], accent = 'var(--accent)', onadd, onedit }: {
    eyebrow?: string
    /** «Mañana: Tirón» or «Empuje pasó a mañana» */
    sub?: string
    activities?: Activity[]
    accent?: string
    onadd: () => void
    onedit: (a: Activity) => void
  } = $props()
</script>

<div class="rest-day" data-component="RestDayView">
  <PageHeader {eyebrow} title="Descanso." {sub} />
  {#if activities.length}
    <section class="grp" data-component="LoggedActivities">
      <span class="k">Registrado hoy</span>
      {#each activities as a (a.id)}<ActivityRow activity={a} onedit={() => onedit(a)} />{/each}
    </section>
  {/if}
  <section class="rcv">
    <span class="k">Recuperación</span>
    {#each RECOVERY_TIPS as tip}
      <div class="rec" data-tip={tip.title}><i></i><span><b>{tip.title}</b> · {tip.body}</span></div>
    {/each}
  </section>
</div>

<NextStepDock caption={activities.length ? 'Hoy cuenta como día entrenado' : 'Correr, nadar, bici, pádel… suma a tu semana'}>
  <Button variant={activities.length ? 'secondary' : 'primary'} size="lg" {accent} onclick={onadd}>
    <Icon name="plus" size={18} />{activities.length ? 'Registrar otra actividad' : 'Registrar actividad'}
  </Button>
</NextStepDock>

<style>
  .rest-day { display: flex; flex-direction: column; gap: 24px; }
  .grp { display: flex; flex-direction: column; gap: 10px; }
  .k { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .rcv { display: flex; flex-direction: column; gap: 14px; padding: 20px; border-radius: 24px; background: var(--surface); }
  .rec { display: grid; grid-template-columns: 18px 1fr; gap: 10px; font-size: 15px; line-height: 1.4; color: var(--text-secondary); }
  .rec b { font-weight: 600; color: var(--text); }
  .rec i { width: 6px; height: 6px; margin: 8px 0 0 4px; border-radius: 50%; background: rgba(255, 255, 255, 0.4); }
  @media (max-width: 340px) { .rcv { padding: 16px; gap: 12px; } }
</style>
