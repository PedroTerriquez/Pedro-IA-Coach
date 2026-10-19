<script lang="ts">
  import Icon from './Icon.svelte'

  let { name, muscle = '', imgUrl, sets, reps, weight, units = 'kg', accent = 'var(--accent)', weightIsTarget = false, selectable = false, selected = false, done = false, onclick, actions, variant = 'default', sub = '', right = '', state = '', pips = undefined, chevron = false }: {
    /** default = Plan / Historial row · session = 76 row of Hoy v2 and Detalle v2 */
    variant?: 'default' | 'session'
    /** session: second line */
    sub?: string
    /** session: mono text at the right («4 × 8-10») */
    right?: string
    /** session: done = accent border + check · now = in progress · next = up next */
    state?: 'done' | 'now' | 'next' | ''
    /** session: one mark per planned set, `on` already done */
    pips?: { total: number; on: number }
    /** session: chevron at the right (alternatives) */
    chevron?: boolean
    name: string
    muscle?: string
    imgUrl?: string
    sets?: number
    reps?: string
    weight?: number
    units?: string
    accent?: string
    weightIsTarget?: boolean
    selectable?: boolean
    selected?: boolean
    done?: boolean
    onclick?: (e?: MouseEvent) => void
    actions?: import('svelte').Snippet
  } = $props()
</script>

{#if variant === 'session'}
<button class="exercise-row xc {state}" data-component="ExerciseRow" data-done={state === 'done' ? 'true' : 'false'} data-state={state || 'pending'} {onclick} type="button">
  {#if imgUrl}<img class="xc-img" src={imgUrl} alt="" />{:else}<span class="xc-img ph"></span>{/if}
  <span class="xc-text">
    <span class="xc-n">{name}</span>
    {#if sub}<span class="xc-s">{sub}</span>{/if}
    {#if pips}
      <span class="pips" aria-label="{pips.on} de {pips.total} series">
        {#each Array(pips.total) as _, i}<i class:on={i < pips.on}></i>{/each}
      </span>
    {/if}
  </span>
  {#if state === 'done'}
    <span class="xc-ok"><Icon name="check" size={16} /></span>
  {:else if chevron}
    <span class="xc-chev"><Icon name="chev" size={16} /></span>
  {:else if right}
    <span class="xc-r">{right}</span>
  {:else}
    <span></span>
  {/if}
</button>
{:else}
<button class="exercise-row" class:selected class:row-done={done} data-component="ExerciseRow" data-done={done ? 'true' : 'false'} {onclick} type="button">
  <div class="ex-thumb">
    {#if imgUrl}
      <img src={imgUrl} alt="" />
    {:else}
      <div class="ex-placeholder"></div>
    {/if}
    {#if done}
      <div class="ex-done-badge">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
    {/if}
  </div>
  <div class="ex-info">
    <div class="ex-name">{name}</div>
    <div class="ex-muscle">{muscle}</div>
  </div>
  <div class="ex-meta">
    {#if sets != null && reps}
      <div class="ex-sets">{sets}<span class="ex-x">x</span>{reps}</div>
    {/if}
    {#if weight != null && weight > 0}
      <div
        class="weight-pill"
        class:target={weightIsTarget}
        style={weightIsTarget ? `border-color:${accent};color:${accent}` : `background:${accent}26`}
      >
        {#if weightIsTarget}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        {:else}
          {weight}<span class="ex-unit">{units}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <div class="ex-actions">{@render actions()}</div>
  {/if}
</button>
{/if}

<style>
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
  .pips { display: flex; gap: 4px; margin-top: 8px; }
  .pips i { width: 22px; height: 4px; border-radius: 2px; background: var(--cv-line-strong); }
  .pips i.on { background: var(--accent); }

  .exercise-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 0;
    background: transparent;
    border: 0;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .exercise-row.selected {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 8px;
    margin: 0 -8px;
  }

  .ex-thumb {
    position: relative;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--bg);
    overflow: hidden;
    box-sizing: border-box;
  }

  .ex-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ex-placeholder {
    width: 100%;
    height: 100%;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      var(--border-medium) 4px,
      var(--border-medium) 8px
    );
  }

  .ex-info {
    flex: 1;
    min-width: 0;
  }

  .ex-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ex-muscle {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 1px;
  }

  .ex-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .weight-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px 10px;
    border-radius: 9999px;
    border: 1px solid transparent;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }

  .weight-pill.target {
    background: transparent;
    border-style: dashed;
    border-width: 1.5px;
    padding: 4px 8px;
  }

  .ex-unit {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 1px;
  }

  .ex-sets {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .ex-x {
    font-size: 10px;
    margin: 0 1px;
  }

  .ex-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .exercise-row.row-done .ex-thumb {
    border: 2px solid #34c759;
  }

  .exercise-row.row-done .ex-thumb img {
    border: 2px solid #34c759;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .exercise-row.row-done .ex-name {
    opacity: 0.55;
  }

  .ex-done-badge {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #34c759;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
