<script lang="ts">
  import Sheet from './Sheet.svelte'
  import ChoiceCard from './ChoiceCard.svelte'
  import Button from './Button.svelte'

  // Reprogramar asks first what happened, then how (Plan · Nuevo · 02). Each
  // option tells its effect with the real day («Hoy Empuje pasa al jueves»).
  let { open = $bindable(false), shiftEffect = '', canReset = false, onshift, onmove, onreset }: {
    open: boolean
    shiftEffect?: string
    canReset?: boolean
    onshift: () => void
    onmove: () => void
    onreset: () => void
  } = $props()
</script>

<Sheet id="plan-reprogram-sheet" bind:open title="¿Qué cambió esta semana?">
  <div class="opts" data-component="ReprogramSheet">
    <ChoiceCard
      id="plan-shift-btn"
      icon="shift"
      title="Me salté un día"
      desc={`Cada entreno pendiente se corre un día.${shiftEffect ? ` ${shiftEffect}` : ''}`}
      onclick={onshift}
    />
    <ChoiceCard id="plan-move-btn" icon="reorder" title="Quiero mover días" desc="Arrastra los días al orden que te acomode." onclick={onmove} />
  </div>
  <Button id="plan-reset-btn" variant="text" size="lg" fullWidth disabled={!canReset} onclick={onreset}>Restablecer semana original</Button>
</Sheet>

<style>
  .opts { display: flex; flex-direction: column; gap: 8px; }
</style>
