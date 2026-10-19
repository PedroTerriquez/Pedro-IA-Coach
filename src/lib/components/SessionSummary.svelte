<script lang="ts">
  import Avatar from './Avatar.svelte'
  import StatBlock from './StatBlock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import DebugAIToggle from './DebugAIToggle.svelte'

  // The end of Hoy: what the coach said, what to aim for next time and three
  // plain figures. Without an analysis it offers to ask for one.
  let { analysis = null, loading = false, error = false, minutes = null, units = 'kg', onask, onreset }: {
    analysis?: any
    loading?: boolean
    error?: boolean
    minutes?: number | null
    units?: string
    onask: () => void
    onreset: () => void
  } = $props()

  let hasAnalysis = $derived(!!analysis?.analysis)
  let recs = $derived<string[]>((analysis?.recommendations || []).slice(0, 5))
</script>

<div class="sum" data-component="SessionSummary">
  {#if loading}
    <div class="say-by"><Avatar username="Pedro" size={28} />Tu coach</div>
    <p class="say muted">Pedro está revisando tu sesión…</p>
  {:else if hasAnalysis}
    <section>
      <div class="say-by"><Avatar username="Pedro" size={28} />Tu coach</div>
      <p class="say">{analysis.analysis}</p>
    </section>
    {#if analysis.proximo_objetivo || recs.length}
      <section class="nextup">
        <span class="lbl">Para la próxima</span>
        {#if analysis.proximo_objetivo}<p class="nextup-t">{analysis.proximo_objetivo}</p>{/if}
        {#if recs.length}
          <div class="recs">
            {#each recs as rec}<div class="rec"><i></i><span>{rec}</span></div>{/each}
          </div>
        {/if}
      </section>
    {/if}
    <div class="trio">
      <StatBlock variant="tile" value={analysis.total_volume ?? ''} unit={units} label="volumen" />
      <StatBlock variant="tile" value={analysis.pr_count ?? ''} label="récords" />
      <StatBlock variant="tile" value={minutes ?? ''} unit="min" label="duración" />
    </div>
  {:else}
    {#if error}<p class="err">No pude conectar con el coach. Revisa tu conexión e intenta de nuevo.</p>{/if}
    <div class="trio one"><StatBlock variant="tile" value={minutes ?? ''} unit="min" label="duración" /></div>
    <Button variant="secondary" size="lg" onclick={onask}>Pedir análisis al coach</Button>
  {/if}
  <DebugAIToggle label="Today Workout IA" />
  <Button variant="text" size="lg" fullWidth onclick={onreset}><Icon name="restart" size={16} />Reiniciar día</Button>
</div>

<style>
  .sum { display: flex; flex-direction: column; gap: 20px; }
  .say-by { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--text-tertiary); margin-bottom: 12px; }
  .say { font-size: 20px; line-height: 1.4; letter-spacing: -0.3px; text-wrap: pretty; }
  .say.muted { color: var(--text-secondary); }
  .nextup { padding: 20px; border-radius: var(--radius-2xl); background: var(--surface); display: flex; flex-direction: column; gap: 12px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .nextup-t { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; }
  .recs { display: flex; flex-direction: column; gap: 10px; padding-top: 14px; border-top: 0.5px solid var(--border-medium); }
  .rec { display: grid; grid-template-columns: 18px 1fr; gap: 10px; font-size: 15px; line-height: 1.4; color: var(--text-secondary); }
  .rec i { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, 0.4); margin: 8px 0 0 4px; }
  .trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .trio.one { grid-template-columns: minmax(0, 1fr); }
  .err { font-size: 15px; line-height: 1.5; color: var(--text-secondary); }
</style>
