<script lang="ts">
  import { RECOVERY_TIPS } from '$lib/data/recovery'
  import GlowCard from './GlowCard.svelte'
  import Chip from './Chip.svelte'
  import SectionLabel from './SectionLabel.svelte'

  let {
    weekObj = null,
    weekIdx = 0,
  }: {
    weekObj?: any
    weekIdx?: number
  } = $props()
</script>

<div data-component="RestDayView">
  <div class="page-top">
    <div class="eyebrow">Hoy</div>
    <div class="hero-title">Descanso.</div>
  </div>
  <div class="rest-card-wrapper">
    <GlowCard blobColor="#9bd1ff" padding="28px">
      <Chip color="rgba(155,209,255,0.15)" textColor="#9bd1ff">DESCANSO</Chip>
      <div class="rest-title">La recuperación es donde creces.</div>
      <div class="rest-desc">Sin pesas hoy. Tómalo con calma{weekObj ? ' y prepara tu cuerpo para la ' + (weekIdx >= 2 ? 'Semana A' : 'próxima sesión') : ''}.</div>
    </GlowCard>
  </div>
  <div class="recovery-header">
    <SectionLabel accent="#9bd1ff">Lista de recuperación</SectionLabel>
  </div>
  <div class="tip-list">
    {#each RECOVERY_TIPS as tip}
      <div class="recovery-card">
        <div class="recovery-icon">{tip.icon}</div>
        <div class="flex-1">
          <div class="recovery-title">{tip.title}</div>
          <div class="recovery-desc">{tip.body}</div>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .page-top { padding: 58px 20px 0; }
  .eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .hero-title { font-family: var(--font-sans); font-size: 42px; font-weight: 700; color: var(--text); letter-spacing: -1.8px; line-height: 1; margin-top: 6px; }
  .rest-card-wrapper { padding: 20px; margin-top: 8px; }
  .rest-title { margin-top: 12px; font-family: var(--font-sans); font-size: 30px; font-weight: 700; color: var(--text); letter-spacing: -1px; line-height: 1.1; }
  .rest-desc { margin-top: 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
  .recovery-header { margin-top: 18px; margin-bottom: 12px; }
  .tip-list { display: flex; flex-direction: column; gap: 10px; padding: 0 20px; }
  .recovery-card { display: flex; gap: 14px; padding: 14px; background: var(--surface); border-radius: 16px; border: 0.5px solid var(--border); align-items: center; }
  .recovery-icon { font-size: 26px; }
  .recovery-title { font-family: var(--font-sans); font-size: 15px; font-weight: 600; color: var(--text); }
  .recovery-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
  .flex-1 { flex: 1; }
</style>
