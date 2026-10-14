<script lang="ts">
  import type { NotifState } from '$lib/settings-options'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import StepsList from './StepsList.svelte'

  // Depends on the permission: not asked yet / on (with a test) / blocked (with the steps).
  let { open = $bindable(false), state, onactivate, ontest }: {
    open: boolean
    state: NotifState
    onactivate: () => void
    ontest: () => void
  } = $props()

  const BLOCKED_STEPS = [
    { title: 'Abre Ajustes del iPhone' },
    { title: 'Toca Notificaciones', text: 'Está en el segundo grupo' },
    { title: 'Elige Training with Pedro', text: 'Y enciende «Permitir notificaciones»' },
  ]
</script>

<Sheet bind:open title="Notificaciones" id="notifications-sheet">
  {#if state === 'granted'}
    <div class="ro"><span class="l">Avisos de descanso</span><span class="on-dot"><i></i>Activadas</span></div>
    <Button size="lg" variant="secondary" onclick={ontest}>Enviar una de prueba</Button>
    <p class="note">Para apagarlas: Ajustes del iPhone › Notificaciones › Training with Pedro.</p>
  {:else if state === 'denied'}
    <p class="lead">El iPhone las tiene bloqueadas para esta app. Para activarlas:</p>
    <StepsList steps={BLOCKED_STEPS} />
    <Button size="lg" variant="secondary" onclick={() => open = false}>Entendido</Button>
  {:else if state === 'unsupported'}
    <p class="lead">Este navegador no las permite. Instala la app en tu pantalla de inicio y actívalas desde ahí.</p>
    <Button size="lg" variant="secondary" onclick={() => open = false}>Entendido</Button>
  {:else}
    <p class="lead">Te avisa cuando termina el descanso, aunque estés en otra app.</p>
    <Button size="lg" variant="primary" onclick={onactivate}>Activar</Button>
    <p class="cap">El iPhone te pedirá permiso una sola vez</p>
  {/if}
</Sheet>

<style>
  .lead { margin-top: -6px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
  .note { font-size: 14px; line-height: 1.5; color: var(--text-secondary); }
  .cap { margin: -8px 0 -12px; font-size: 13px; text-align: center; color: var(--text-tertiary); }
  .ro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 56px; padding: 8px 16px; border-radius: var(--cv-radius-field); background: var(--cv-fill-1); }
  .l { font-size: 16px; font-weight: 500; }
  .on-dot { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
  .on-dot i { width: 8px; height: 8px; border-radius: 50%; background: var(--text); }
</style>
