<script lang="ts">
  import type { NotifState } from '$lib/settings-options'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import StepsList from './StepsList.svelte'
  import Caption from './Caption.svelte'
  import Lead from './Lead.svelte'

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
    <Lead size={14}>Para apagarlas: Ajustes del iPhone › Notificaciones › Training with Pedro.</Lead>
  {:else if state === 'denied'}
    <Lead style="margin-top:-6px">El iPhone las tiene bloqueadas para esta app. Para activarlas:</Lead>
    <StepsList steps={BLOCKED_STEPS} />
    <Button size="lg" variant="secondary" onclick={() => open = false}>Entendido</Button>
  {:else if state === 'unsupported'}
    <Lead style="margin-top:-6px">Este navegador no las permite. Instala la app en tu pantalla de inicio y actívalas desde ahí.</Lead>
    <Button size="lg" variant="secondary" onclick={() => open = false}>Entendido</Button>
  {:else}
    <Lead style="margin-top:-6px">Te avisa cuando termina el descanso, aunque estés en otra app.</Lead>
    <Button size="lg" variant="primary" onclick={onactivate}>Activar</Button>
    <Caption style="margin:-8px 0 -12px">El iPhone te pedirá permiso una sola vez</Caption>
  {/if}
</Sheet>

<style>
  .ro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 56px; padding: 8px 16px; border-radius: var(--cv-radius-field); background: var(--cv-fill-1); }
  .l { font-size: 16px; font-weight: 500; }
  .on-dot { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
  .on-dot i { width: 8px; height: 8px; border-radius: 50%; background: var(--text); }
</style>
