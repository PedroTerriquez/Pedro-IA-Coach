<script lang="ts">
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'

  // Tapping the session clock: pause/resume or reset it. Pausing and resetting
  // ask first in the same sheet, and the confirm button ignores taps for
  // ARM_MS so a double tap never changes the time.
  const ARM_MS = 400

  let { open = $bindable(false), paused, clock, since, pausedSince, accent, onpause, onresume, onreset }: {
    open: boolean
    paused: boolean
    /** «23:41» */
    clock: string
    /** «18:02»: when the clock counts from */
    since: string
    /** «18:26»: when it was paused */
    pausedSince: string
    accent: string
    onpause: () => void
    onresume: () => void
    onreset: () => void
  } = $props()

  let confirm = $state<'pause' | 'reset' | null>(null)
  let armed = $state(false)
  let armTimer: ReturnType<typeof setTimeout> | null = null

  $effect(() => {
    if (!open) confirm = null
  })

  function ask(kind: 'pause' | 'reset') {
    confirm = kind
    armed = false
    if (armTimer) clearTimeout(armTimer)
    armTimer = setTimeout(() => (armed = true), ARM_MS)
  }

  function done(action: () => void) {
    if (!armed && confirm) return
    confirm = null
    open = false
    action()
  }
</script>

<Sheet bind:open title="Reloj de sesión" id="session-clock-sheet">
  <div class="body" data-component="SessionClockSheet">
    <b class="big" class:off={paused}>{clock}</b>
    {#if paused}
      <span class="st"><span class="tag"><span class="pz" aria-hidden="true"><i></i><i></i></span>En pausa</span>desde <b>{pausedSince}</b></span>
    {:else}
      <span class="st"><i class="dot" style="background:{accent}"></i>Cuenta desde las <b>{since}</b></span>
    {/if}
  </div>
  {#snippet footer()}
    <div class="ft" data-component="SessionClockActions">
      {#if confirm === 'pause'}
        <div class="cf" role="group" aria-label="¿Pausar el reloj?">
          <span class="cf-t">¿Pausar el reloj?</span>
          <p>Se queda en <b>{clock}</b>. Sigue solo cuando registres una serie, y el tiempo en pausa no cuenta para tu sesión ni para la liga.</p>
          <div class="duo" class:arming={!armed}>
            <Button size="lg" variant="secondary" onclick={() => (confirm = null)}>Cancelar</Button>
            <Button size="lg" variant="secondary" style="background:var(--text);color:var(--bg)" onclick={() => done(onpause)}>Pausar</Button>
          </div>
        </div>
      {:else if confirm === 'reset'}
        <div class="cf" role="group" aria-label="¿Reiniciar el reloj?">
          <span class="cf-t">¿Reiniciar el reloj?</span>
          <p>Vuelve a <b>00:00</b> y el tiempo de hoy empieza de nuevo. Tus series registradas se quedan.{paused ? ' Sigue en pausa hasta tu próxima serie.' : ''}</p>
          <div class="duo" class:arming={!armed}>
            <Button size="lg" variant="secondary" onclick={() => (confirm = null)}>Cancelar</Button>
            <Button size="lg" variant="danger" onclick={() => done(onreset)}>Reiniciar</Button>
          </div>
        </div>
      {:else}
        {#if paused}
          <Button size="lg" variant="primary" fullWidth {accent} onclick={() => done(onresume)}><Icon name="play" size={18} />Reanudar</Button>
        {:else}
          <Button size="lg" variant="secondary" fullWidth style="background:var(--text);color:var(--bg)" onclick={() => ask('pause')}>
            <span class="pz" aria-hidden="true"><i></i><i></i></span>Pausar
          </Button>
        {/if}
        <Button size="lg" variant="danger-text" fullWidth onclick={() => ask('reset')}><Icon name="restart" size={18} />Reiniciar</Button>
      {/if}
    </div>
  {/snippet}
</Sheet>

<style>
  .body { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 4px 0 12px; text-align: center; }
  .big { font-family: var(--font-mono); font-size: 76px; font-weight: 500; letter-spacing: -0.06em; line-height: 1; font-variant-numeric: tabular-nums; }
  .big.off { color: var(--text-secondary); }
  .st { font-size: 15px; color: var(--text-secondary); display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; }
  .st b { font-family: var(--font-mono); font-weight: 500; color: var(--text); letter-spacing: -0.03em; }
  .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  .tag { display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px; border-radius: 9999px; background: var(--text); color: var(--bg); font-size: 13px; font-weight: 600; }
  .pz { display: flex; gap: 3px; }
  .pz i { width: 3px; height: 12px; border-radius: 1px; background: currentColor; }
  .tag .pz i { width: 2.5px; height: 10px; }
  .ft { display: flex; flex-direction: column; gap: 12px; }
  .ft :global(.btn-base) { gap: 8px; }
  .cf { display: flex; flex-direction: column; gap: 10px; padding: 18px; border-radius: 18px; background: var(--cv-fill-1); }
  .cf-t { font-size: 19px; font-weight: 600; letter-spacing: -0.3px; }
  .cf p { font-size: 15px; line-height: 1.45; color: var(--text-secondary); text-wrap: pretty; }
  .cf p b { font-family: var(--font-mono); font-weight: 500; color: var(--text); letter-spacing: -0.03em; }
  .duo { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 6px; }
  .duo.arming :global(.btn-base:last-child) { opacity: 0.55; }
  @media (max-width: 340px) {
    .big { font-size: 60px; }
    .st, .cf p { font-size: 14px; }
    .cf { padding: 14px; gap: 8px; }
    .cf-t { font-size: 17px; }
  }
</style>
