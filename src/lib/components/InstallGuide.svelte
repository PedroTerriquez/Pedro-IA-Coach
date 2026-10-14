<script lang="ts">
  import { installPWA, useNativePrompt } from '$lib/pwa'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import StepsList from './StepsList.svelte'

  // «Instalar app»: Safari's three steps, or the native prompt where the browser offers one.
  let { open = $bindable(false) }: { open: boolean } = $props()

  const IOS_STEPS = [
    { title: 'Toca Compartir', text: 'El cuadro con flecha, abajo en Safari' },
    { title: 'Elige «Agregar a inicio»', text: 'Desliza la lista si no lo ves' },
    { title: 'Toca «Agregar»', text: 'Arriba a la derecha' },
  ]

  async function install() {
    await installPWA()
    open = false
  }
</script>

<Sheet bind:open title="Instalar app" id="install-guide">
  <p class="lead">Queda en tu pantalla de inicio y abre sin la barra de Safari.</p>
  {#if useNativePrompt()}
    <Button size="lg" variant="primary" onclick={install}>Instalar</Button>
  {:else}
    <StepsList steps={IOS_STEPS} />
    <Button size="lg" variant="secondary" onclick={() => open = false}>Entendido</Button>
  {/if}
</Sheet>

<style>
  .lead { margin-top: -6px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
</style>
