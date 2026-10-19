<script lang="ts">
  import Button from './Button.svelte'

  // Full-screen streak at the end of the session. It waits for «Seguir»:
  // nothing closes it on a timer.
  let { count, oncontinue }: {
    count: number
    oncontinue: () => void
  } = $props()
</script>

<div class="cel" id="streak-overlay" data-component="StreakScreen" role="dialog" aria-modal="true" aria-label="Tu racha">
  <div class="cel-c">
    <span class="lbl">Tu racha</span>
    <b class="cel-n">{count}</b>
    <span class="cel-u">{count === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
    <span class="cel-l">¡Sigue así!</span>
  </div>
  <div class="cel-d">
    <Button variant="primary" size="lg" onclick={oncontinue}>Seguir</Button>
  </div>
</div>

<style>
  .cel { position: fixed; inset: 0; z-index: 250; display: flex; flex-direction: column; padding: max(54px, var(--safe-top)) 24px 0; background: var(--bg); }
  .cel-c { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .cel-n { font-family: var(--font-mono); font-size: 150px; font-weight: 500; letter-spacing: -0.08em; line-height: 0.85; margin-top: 8px; }
  .cel-u { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; }
  .cel-l { font-size: 15px; color: var(--text-secondary); margin-top: 14px; }
  .cel-d { padding-bottom: max(44px, env(safe-area-inset-bottom, 0px)); display: flex; flex-direction: column; gap: 4px; }
</style>
