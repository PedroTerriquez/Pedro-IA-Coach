<script lang="ts">
  import Button from './Button.svelte'
  import IconButton from './IconButton.svelte'

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
      title: '¡Bienvenido a Coach Pedro!',
      desc: 'Primero, configuremos tu perfil y tu primer programa de entrenamiento',
      btn: 'Comenzar'
    },
    {
      title: 'Diseña tu rutina',
      desc: 'Crea tu programa de entrenamiento desde Tú → Programas. Pega tu rutina con IA o créala manualmente',
      btn: 'Crear programa'
    },
    {
      title: 'Tu primer registro',
      desc: 'Completa el calentamiento y registra tu primer peso levantado en un ejercicio',
      btn: 'Registrar peso'
    },
    {
      title: '¡Todo listo!',
      desc: 'Tu programa está activo. Vuelve cada día para entrenar y seguir tu progreso',
      btn: 'Listo'
    }
  ]

  const current = $derived(steps[step])
</script>

<!-- Card (Compartidos · Nuevo · 10) floating over the dock: steps as segments, one button -->
{#if step >= 0 && step < steps.length}
  <div class="onboarding-banner" data-component="OnboardingBanner">
    <div class="ob-top">
      <div class="ob-segs" aria-label="Paso {step + 1} de {steps.length}">
        {#each steps as _, i}<i class:on={i <= step}></i>{/each}
      </div>
      <IconButton size="sm" icon="x" label="Cerrar" onclick={onSkip} />
    </div>
    <div class="ob-content" aria-live="polite">
      <h3>{current.title}</h3>
      <p>{current.desc}</p>
    </div>
    <Button variant="primary" size="lg" {accent} onclick={onNext}>{current.btn}</Button>
  </div>
{/if}

<style>
  .onboarding-banner {
    position: fixed;
    bottom: 82px;
    left: 12px;
    right: 12px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 20px 20px;
    border-radius: var(--radius-2xl);
    background: var(--surface);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
    animation: slideUp 0.35s ease-out;
  }
  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .onboarding-banner { animation: none; }
  }
  .ob-top { display: flex; align-items: center; gap: 12px; margin-right: -12px; }
  .ob-segs { flex: 1; display: flex; gap: 4px; }
  .ob-segs i { flex: 1; height: 4px; border-radius: 2px; background: var(--cv-fill-on); }
  .ob-segs i.on { background: var(--text); }
  .ob-content { display: flex; flex-direction: column; gap: 8px; }
  h3 { margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; text-wrap: balance; }
  p { margin: 0; font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
</style>
