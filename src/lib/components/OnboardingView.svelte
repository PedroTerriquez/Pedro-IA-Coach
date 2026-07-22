<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import GlowCard from './GlowCard.svelte'
  import Button from './Button.svelte'

  let {
    accent = 'var(--accent)',
  }: {
    accent?: string
  } = $props()
</script>

<div class="no-program-wrapper">
  <div class="eyebrow">Bienvenido</div>
  <div class="hero-title">Entrenemos.</div>
  <GlowCard blobColor={accent} padding="24px">
    <div class="onboard-icon" style="background:{accent}1a;border-color:{accent}33">🔒</div>
    <div class="onboard-heading">Tus datos, solo en tu teléfono</div>
    <div class="onboard-desc">Esta app no almacena nada en servidores. Todo lo que registras — ejercicios, pesos, programas — vive únicamente en este celular.</div>
    <div class="onboard-backup-card">
      <div class="onboard-backup-title">
        <span>📋</span>
        <span>No pierdas tu progreso</span>
      </div>
      <div class="onboard-backup-desc">Haz un respaldo cada 2 semanas desde <strong style="color:{accent}">Perfil → Datos → Exportar</strong>. Así siempre podrás recuperar tu historial si algo le pasa al teléfono.</div>
    </div>
    <div class="cta-wrap">
      <Button variant="primary" fullWidth {accent} style="padding:15px;border-radius:14px;font-size:15px;gap:8px" onclick={() => goto(ROUTES.you)}>
        Comenzar
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
      </Button>
    </div>
  </GlowCard>
  <div class="bottom-spacer">
    <div class="hint-text">Toca Comenzar para configurar tu rutina</div>
  </div>
</div>

<style>
  .no-program-wrapper { flex: 1; display: flex; flex-direction: column; padding: 58px 20px 0; }
  .eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.8px; text-transform: uppercase; font-weight: 600; }
  .hero-title { font-family: var(--font-sans); font-size: 42px; font-weight: 700; color: var(--text); letter-spacing: -1.8px; line-height: 1; margin-top: 6px; }
  .onboard-icon { width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 14px; border: 0.5px solid; }
  .onboard-heading { font-family: var(--font-sans); font-size: 20px; font-weight: 700; color: var(--text); letter-spacing: -0.6px; line-height: 1.15; }
  .onboard-desc { margin-top: 10px; font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.55; }
  .onboard-backup-card { margin-top: 18px; padding: 14px; border-radius: 14px; background: rgba(255,255,255,0.03); border: 0.5px solid var(--border); }
  .onboard-backup-title { display: flex; align-items: center; gap: 8px; font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
  .onboard-backup-desc { margin-top: 6px; font-size: 12.5px; color: rgba(255,255,255,0.5); line-height: 1.5; }
  .cta-wrap { margin-top: 20px; }
  .bottom-spacer { margin-top: auto; text-align: center; padding: 24px 0 30px; }
  .hint-text { font-size: 12px; color: rgba(255,255,255,0.3); font-family: var(--font-mono); letter-spacing: 1px; }
</style>
