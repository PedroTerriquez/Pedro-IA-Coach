<script lang="ts">
  import type { NotifState } from '$lib/settings-options'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import StepsList from './StepsList.svelte'
  import Caption from './Caption.svelte'
  import Lead from './Lead.svelte'
  import StatusRow from './StatusRow.svelte'

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
    <StatusRow label="Avisos de descanso" on="Activadas" />
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
