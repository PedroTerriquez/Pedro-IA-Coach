<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import InlineConfirm from './InlineConfirm.svelte'

  // Tapping the session clock: pause/resume or reset it. Pausing and resetting
  // ask first, so a stray tap never changes the time.
  let { open = $bindable(false), paused, clock, onpause, onresume, onreset }: {
    open: boolean
    paused: boolean
    clock: string
    onpause: () => void
    onresume: () => void
    onreset: () => void
  } = $props()

  let confirm = $state<'pause' | 'reset' | null>(null)

  $effect(() => {
    if (!open) confirm = null
  })

  function done(action: () => void) {
    confirm = null
    open = false
    action()
  }
</script>

<Sheet bind:open title="Reloj de sesión" id="session-clock-sheet">
  <div class="body" data-component="SessionClockSheet">
    <b class="time">{clock}</b>
    {#if confirm === 'pause'}
      <InlineConfirm
        title="¿Pausar el reloj?"
        text="El tiempo deja de contar hasta que lo reanudes o registres una serie."
        confirmLabel="Pausar"
        onconfirm={() => done(onpause)}
        oncancel={() => (confirm = null)}
      />
    {:else if confirm === 'reset'}
      <InlineConfirm
        title="¿Reiniciar el reloj?"
        text="Vuelve a 00:00 y el tiempo de hoy empieza de nuevo. Tus series no se borran."
        confirmLabel="Reiniciar"
        onconfirm={() => done(onreset)}
        oncancel={() => (confirm = null)}
      />
    {:else}
      <div class="actions">
        {#if paused}
          <Button size="lg" variant="primary" fullWidth onclick={() => done(onresume)}>Reanudar</Button>
        {:else}
          <Button size="lg" variant="secondary" fullWidth onclick={() => (confirm = 'pause')}>Pausar</Button>
        {/if}
        <Button size="lg" variant="secondary" fullWidth onclick={() => (confirm = 'reset')}>Reiniciar</Button>
      </div>
    {/if}
  </div>
</Sheet>

<style>
  .body { display: flex; flex-direction: column; gap: 16px; padding-bottom: 8px; }
  .time { font-family: var(--font-mono); font-size: 40px; font-weight: 500; letter-spacing: -0.04em; text-align: center; }
  .actions { display: flex; flex-direction: column; gap: 8px; }
</style>
