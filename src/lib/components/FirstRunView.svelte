<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import PageHeader from './PageHeader.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  // Hoy without a program (Hoy · Nuevo 06): what the app does in three steps,
  // where the data lives, and one way forward.
  const STEPS = [
    { title: 'Arma tu rutina', text: 'Pégala con IA o créala a mano' },
    { title: 'Entrena desde Hoy', text: 'Calentamiento, ejercicios y estiramiento' },
    { title: 'Suma con tus amigos', text: 'Rachas y liga semanal' },
  ]
</script>

<div class="first" data-component="FirstRunView">
  <PageHeader eyebrow="Bienvenido" title="Entrenemos." sub="Arma tu rutina una vez. Después, cada día verás aquí qué te toca." />
  <ol class="steps">
    {#each STEPS as s, i}
      <li class="step" class:cur={i === 0}>
        <span class="num">{i + 1}</span>
        <span class="min0"><b>{s.title}</b><span>{s.text}</span></span>
      </li>
    {/each}
  </ol>
  <p class="privacy">
    <Icon name="lock" size={18} />
    <span>Tus datos viven solo en este teléfono. Respáldalos cada 2 semanas en <b>Tú → Copia de seguridad</b>.</span>
  </p>
  <NextStepDock>
    <Button variant="primary" size="lg" onclick={() => goto(ROUTES.you)}>Armar mi rutina<Icon name="arrow" size={18} /></Button>
  </NextStepDock>
</div>

<style>
  .first { display: flex; flex-direction: column; gap: 28px; }
  .steps { display: flex; flex-direction: column; gap: 8px; list-style: none; }
  .step { display: grid; grid-template-columns: 32px minmax(0, 1fr); align-items: center; gap: 14px; min-height: 68px; padding: 10px 16px 10px 14px; border-radius: var(--radius-xl); background: var(--surface); }
  .num { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-mono); font-size: 13px; color: var(--text-muted); box-shadow: inset 0 0 0 1.5px var(--cv-line-strong); }
  .cur .num { color: var(--text); box-shadow: inset 0 0 0 1.5px rgba(255, 255, 255, 0.6); }
  .min0 { min-width: 0; }
  .step b { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .step span span { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; }
  .privacy { display: grid; grid-template-columns: 20px minmax(0, 1fr); gap: 12px; padding: 16px; border-radius: var(--radius-lg); background: var(--cv-fill-1); font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
  .privacy :global(svg) { margin-top: 2px; color: var(--text-tertiary); }
  .privacy b { color: var(--text); font-weight: 600; }
</style>
