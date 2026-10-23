<script lang="ts">
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  let { name, imgUrl, done = false, onclick, variant = 'plan', sub = '', right = '', state = '', pips = undefined, chevron = false }: {
    /** session = 76 row of Hoy v2 and Detalle v2 · plan = 64 row inside an open day (Plan v2, Historial v2) */
    variant?: 'session' | 'plan'
    /** Second line */
    sub?: string
    /** Mono text at the right («4 × 8-10», «85 kg») */
    right?: string
    /** session: done = accent border + check · now = in progress · next = up next */
    state?: 'done' | 'now' | 'next' | ''
    /** session: one mark per planned set, `on` already done */
    pips?: { total: number; on: number }
    /** session: chevron at the right (alternatives) */
    chevron?: boolean
    name: string
    imgUrl?: string
    /** plan: the day is done, the row goes gray */
    done?: boolean
    onclick?: (e?: MouseEvent) => void
  } = $props()
</script>

{#if variant === 'session'}
<button class="exercise-row xc {state}" data-component="ExerciseRow" data-done={state === 'done' ? 'true' : 'false'} data-state={state || 'pending'} {onclick} type="button">
  {#if imgUrl}<img class="xc-img" src={imgUrl} alt="" />{:else}<span class="xc-img ph"></span>{/if}
  <span class="xc-text">
    <span class="xc-n" data-testid={TID.exerciseName}>{name}</span>
    {#if sub}<span class="xc-s">{sub}</span>{/if}
    {#if pips}
      <span class="pips" aria-label="{pips.on} de {pips.total} series">
        {#each Array(pips.total) as _, i}<i class:on={i < pips.on}></i>{/each}
      </span>
    {/if}
  </span>
  {#if state === 'done'}
    <span class="xc-ok" data-testid={TID.exerciseDoneMark}><Icon name="check" size={16} /></span>
  {:else if chevron}
    <span class="xc-chev"><Icon name="chev" size={16} /></span>
  {:else if right}
    <span class="xc-r">{right}</span>
  {:else}
    <span></span>
  {/if}
</button>
{:else}
<button class="exercise-row xr" class:row-done={done} data-component="ExerciseRow" data-done={done ? 'true' : 'false'} {onclick} type="button">
  {#if imgUrl}<img class="xr-img" src={imgUrl} alt="" />{:else}<span class="xr-img xc-img ph"></span>{/if}
  <span class="xc-text">
    <span class="xr-n">{name}</span>
    {#if sub}<span class="xc-s">{sub}</span>{/if}
  </span>
  <span class="xc-r">{right}</span>
</button>
{/if}

<style>
  .exercise-row {
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }
  /* ── session (Hoy v2 / Detalle v2) ── */
  .exercise-row.xc {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 76px;
    padding: 12px 16px 12px 12px;
    border-radius: var(--radius-xl);
    background: var(--surface);
  }
  .exercise-row.xc.next { background: var(--surface-hover); }
  .exercise-row.xc.now { background: var(--surface-hover); box-shadow: inset 0 0 0 1.5px var(--cv-ring-current); }
  .exercise-row.xc.done { box-shadow: inset 0 0 0 1.5px var(--accent); }
  /* Inside a sheet the rows sit on the sheet's surface */
  :global(.ds-body) .exercise-row.xc { background: var(--cv-fill-1); }
  .xc-img { width: 52px; height: 52px; border-radius: var(--radius-md); object-fit: cover; display: block; background: var(--media-bg); }
  .xc-img.ph { background: repeating-linear-gradient(135deg, var(--cv-fill-5) 0 6px, var(--cv-placeholder-stripe) 6px 12px); }
  .xc-text { min-width: 0; }
  /* Long names end in «…» after two lines */
  .xc-n {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.25;
    overflow-wrap: anywhere;
  }
  .xc-s { display: block; font-size: 13px; color: var(--text-tertiary); margin-top: 3px; }
  .xc-r { font-family: var(--font-mono); font-size: 15px; letter-spacing: -0.03em; white-space: nowrap; }
  .xc-chev { display: grid; color: var(--text-muted); }
  .xc-ok { width: 28px; height: 28px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  /* ── plan (Plan v2, Historial v2): no fill, 44 thumb, 64 tall ── */
  .exercise-row.xr {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    min-height: 64px;
    padding: 8px 10px 8px 6px;
    border-radius: var(--radius-lg);
  }
  .xr-img { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; display: block; background: var(--media-bg); }
  .xr-n { display: block; font-size: 16px; font-weight: 600; letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .xr.row-done .xr-n, .xr.row-done .xc-r { color: var(--text-tertiary); }
  .xr.row-done .xr-img { opacity: 0.4; }
  .pips { display: flex; gap: 4px; margin-top: 8px; }
  .pips i { width: 22px; height: 4px; border-radius: 2px; background: var(--cv-line-strong); }
  .pips i.on { background: var(--accent); }
</style>
