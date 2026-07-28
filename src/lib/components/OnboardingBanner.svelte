<script lang="ts">
  let {
    step = $bindable(0),
    accent = 'var(--accent)',
    onNext = () => {},
    onSkip = () => {}
  }: {
    step: number
    accent?: string
    onNext?: () => void
    onSkip?: () => void
  } = $props()

  const steps = [
    {
      icon: '🏋️',
      title: '¡Bienvenido a Coach Pedro!',
      desc: 'Primero, configuremos tu perfil y tu primer programa de entrenamiento',
      btn: 'Comenzar'
    },
    {
      icon: '📋',
      title: 'Diseña tu rutina',
      desc: 'Crea tu programa de entrenamiento desde Tú → Programas. Pega tu rutina con IA o créala manualmente',
      btn: 'Crear programa'
    },
    {
      icon: '🔥',
      title: 'Tu primer registro',
      desc: 'Completa el calentamiento y registra tu primer peso levantado en un ejercicio',
      btn: 'Registrar peso'
    },
    {
      icon: '✅',
      title: '¡Todo listo!',
      desc: 'Tu programa está activo. Vuelve cada día para entrenar y seguir tu progreso',
      btn: 'Listo'
    }
  ]

  const current = $derived(steps[step])
</script>

{#if step >= 0 && step < steps.length}
  <div class="onboarding-banner" style="--cb-accent: {accent}" data-component="OnboardingBanner">
    <button type="button" class="close-btn" onclick={onSkip} aria-label="Cerrar">✕</button>
    <div class="ob-content" aria-live="polite">
      <div class="ob-icon">{current.icon}</div>
      <div class="ob-title">{current.title}</div>
      <div class="ob-desc">{current.desc}</div>
      <button type="button" class="ob-btn" onclick={onNext}>{current.btn}</button>
      <div class="ob-dots">
        {#each steps as _, i}
          <span class="dot" class:active={i === step} style:background={i === step ? accent : ''}></span>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .onboarding-banner {
    position: fixed;
    bottom: 82px;
    left: 12px;
    right: 12px;
    z-index: 1000;
    background: var(--surface, #141414);
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 20px 18px 16px;
    text-align: center;
    animation: slideUp 0.35s ease-out;
  }
  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .onboarding-banner { animation: none; }
  }
  .close-btn {
    position: absolute;
    top: 8px;
    right: 12px;
    background: none;
    border: none;
    color: rgba(255,255,255,0.35);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
  }
  .ob-icon { font-size: 32px; margin-bottom: 6px; }
  .ob-title { font-family: var(--font-sans); font-size: 18px; font-weight: 700; color: var(--text); letter-spacing: -0.4px; }
  .ob-desc { margin-top: 6px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.45; }
  .ob-btn {
    margin-top: 14px;
    background: var(--cb-accent);
    color: #0a0a0a;
    border: none;
    border-radius: 999px;
    padding: 10px 32px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
  }
  .ob-dots {
    display: flex;
    gap: 6px;
    justify-content: center;
    margin-top: 12px;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
  }
  .dot.active { background: var(--cb-accent); }
</style>
