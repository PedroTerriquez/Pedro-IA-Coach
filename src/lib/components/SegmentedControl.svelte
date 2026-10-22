<script lang="ts">
  let { options, value = $bindable(), size = 'tabs', label = undefined, onchange = undefined }: {
    options: { label: string; value: string; id?: string }[]
    value: string
    /** compact = 38 high, inside a NavRow (kg/lb) · tabs = 44 equal tabs (Detalle v2, Historial) */
    size?: 'compact' | 'tabs'
    label?: string
    onchange?: (value: string) => void
  } = $props()

  function pick(v: string) {
    if (v === value) return
    value = v
    onchange?.(v)
  }
</script>

<div class="seg-control" class:compact={size === 'compact'} class:tabs={size === 'tabs'} data-component="SegmentedControl" role="group" aria-label={label}>
  {#each options as opt}
    <button
      id={opt.id}
      class="seg-btn"
      class:seg-active={value === opt.value}
      aria-pressed={value === opt.value}
      onclick={() => pick(opt.value)}
      type="button"
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .seg-control {
    display: flex;
    background: rgba(255, 255, 255, 0.04);
    border-radius: var(--radius-full);
    padding: 3px;
    gap: 2px;
  }

  .seg-btn {
    flex: 1;
    padding: 8px 16px;
    border: 0;
    border-radius: var(--radius-full);
    background: transparent;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    position: relative;
  }

  .seg-btn.seg-active {
    background: rgba(255, 255, 255, 0.08);
    font-weight: 600;
  }

  /* ── Compartidos · Nuevo: compact ── */
  .compact {
    display: inline-flex;
    background: var(--cv-fill-2);
  }
  .compact .seg-btn {
    flex: none;
    min-width: 56px;
    height: 38px;
    padding: 0 12px;
    font-size: 14px;
  }
  .compact .seg-btn.seg-active {
    background: var(--cv-line-strong);
    color: var(--text);
  }

  /* ── Detalle v2: tabs ── */
  .tabs { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 0; padding: 2px; background: var(--cv-fill-5); }
  .tabs .seg-btn { height: 44px; padding: 0 8px; font-size: 15px; color: var(--text-tertiary); }
  .tabs .seg-btn.seg-active { background: var(--cv-fill-on); color: var(--text); }
</style>
