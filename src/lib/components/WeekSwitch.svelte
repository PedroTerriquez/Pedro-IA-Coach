<script lang="ts">
  // Program weeks as a 52 px segmented selector: «Semana 1» over its subtitle,
  // the current one adds «· esta semana». Tags (BUILD/STRENGTH) are not shown.
  let { weeks, selected = 0, current = 0, onselect }: {
    weeks: { name?: string; subtitle?: string }[]
    selected?: number
    current?: number
    onselect: (idx: number) => void
  } = $props()

  // «Volumen»: the subtitle, or what the name says beyond «Semana 1 ·»
  function detail(w: { name?: string; subtitle?: string }): string {
    return w.subtitle || (w.name || '').replace(/^semana\s*\d+\s*[·:–-]?\s*/i, '')
  }
</script>

<div id="plan-week-tabs" class="wsw" role="tablist" aria-label="Semanas del programa" data-component="WeekSwitch" style="--cols:{weeks.length}">
  {#each weeks as w, i (i)}
    <button type="button" role="tab" aria-selected={i === selected} class:on={i === selected} onclick={() => onselect(i)}>
      <b>Semana {i + 1}</b>
      <small>{[detail(w), i === current ? 'esta semana' : ''].filter(Boolean).join(' · ')}</small>
    </button>
  {/each}
</div>

<style>
  .wsw {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: var(--radius-lg);
    background: var(--surface);
    overflow-x: auto;
  }
  .wsw:has(button:nth-child(4)) { grid-template-columns: repeat(var(--cols), minmax(120px, 1fr)); }
  button {
    min-height: 52px;
    padding: 0 14px;
    border: 0;
    border-radius: var(--radius-md);
    background: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    color: var(--text-tertiary);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  b { font-size: 15px; font-weight: 600; letter-spacing: -0.2px; color: inherit; }
  small { font-size: 12px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .on { background: var(--surface-hover); color: var(--text); }
  .on small { color: var(--text-tertiary); }
</style>
