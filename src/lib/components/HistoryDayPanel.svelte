<script lang="ts">
  import type { PanelKind, PanelRow } from '$lib/history-view'
  import ExerciseRow from './ExerciseRow.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Tag from './Tag.svelte'

  // The day tapped in Historial's calendar (Historial · Nuevo 00–03). `rows`
  // is what was logged (done) or what the program had (the rest), shown dimmed
  // where it wasn't done. Only an unlogged past workout offers «Marcar».
  let { kind, date = '', title, sub = '', text = '', listLabel = '', rows = [], onrow, onmark, ontoday }: {
    kind: PanelKind | 'noprogram'
    /** «Martes 6 oct» (or «Hoy · Jueves 22 oct») */
    date?: string
    title: string
    sub?: string
    text?: string
    /** «Lo que tocaba» / «Lo que toca» over a dimmed list */
    listLabel?: string
    rows?: PanelRow[]
    onrow?: (idx: number) => void
    onmark?: () => void
    ontoday?: () => void
  } = $props()

  let checked = $derived(kind === 'done' || kind === 'marked')
  let dim = $derived(kind === 'missed' || kind === 'future')
  let empty = $derived(kind === 'first' || kind === 'noprogram')
</script>

<section class="panel" class:empty data-component="HistoryDayPanel" data-state={kind}>
  <div class="head">
    <span class="min0">
      {#if date}<span class="date">{date}</span>{/if}
      {#if kind === 'missed'}<Tag>Sin registrar</Tag>{/if}
      <span class="title">{title}</span>
      {#if sub}<span class="sub">{sub}</span>{/if}
    </span>
    {#if checked}<span class="ok"><Icon name="check" size={14} /></span>{/if}
  </div>
  {#if text}<p class="text">{text}</p>{/if}
  {#if kind === 'today' && ontoday}
    <button type="button" class="link" onclick={ontoday}>Ir a Hoy<Icon name="arrow" size={16} /></button>
  {/if}
  {#if kind === 'missed' && onmark}
    <Button variant="secondary" size="lg" onclick={onmark}><Icon name="check" size={18} />Marcar como hecho</Button>
  {/if}
  {#if rows.length}
    {#if listLabel}<span class="label">{listLabel}</span>{/if}
    <div class="list" class:dim>
      {#each rows as r, i (i)}
        <ExerciseRow variant="plan" name={r.name} imgUrl={r.imgUrl} sub={r.sub} right={r.right} onclick={() => onrow?.(i)} />
      {/each}
    </div>
  {/if}
</section>

<style>
  .panel { display: flex; flex-direction: column; gap: 14px; padding: 18px 16px 10px; border-radius: var(--radius-2xl); background: var(--surface); }
  .panel.empty { padding: 24px 20px; background: none; box-shadow: inset 0 0 0 1px var(--cv-line-dashed); }
  .head { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: start; gap: 12px; padding: 0 4px; }
  .min0 { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
  .date { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .title { font-size: 22px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; text-wrap: pretty; }
  .sub { font-size: 14px; color: var(--text-tertiary); }
  .ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  .text { padding: 0 4px; font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .link { display: inline-flex; align-items: center; gap: 6px; width: fit-content; min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--text); font-family: var(--font-sans); font-size: 15px; font-weight: 600; cursor: pointer; }
  .label { padding: 4px 4px 0; font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-muted); }
  .list { display: flex; flex-direction: column; margin: -6px -8px 0; }
  .list > :global(* + *) { box-shadow: 0 -0.5px 0 var(--border-medium); }
  .list.dim { opacity: 0.45; }
  .panel :global([data-component='Button']) { width: 100%; }
</style>
