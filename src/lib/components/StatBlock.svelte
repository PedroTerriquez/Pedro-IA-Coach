<script lang="ts">
  let { value, label, unit, accent = '#fafafa', size = 'lg', variant = 'default' }: {
    value: string | number
    label: string
    unit?: string
    accent?: string
    size?: 'sm' | 'md' | 'lg'
    /** default = centered figure (debt) · tile = left-aligned tile; '—' when empty */
    variant?: 'default' | 'tile'
  } = $props()

  let numSize = $derived(size === 'sm' ? 17 : size === 'md' ? 22 : 30)
  let unitSize = $derived(size === 'sm' ? 9 : size === 'md' ? 11 : 14)
  let isEmpty = $derived(value === '' || value === null || value === undefined || value === '—')
</script>

{#if variant === 'tile'}
  <div class="tile" class:lg={size === 'lg'} data-component="StatBlock">
    <b class:empty={isEmpty}>{isEmpty ? '—' : value}{#if unit && !isEmpty}<small>{unit}</small>{/if}</b>
    <span>{label}</span>
  </div>
{:else}
  <div class="stat-block size-{size}" data-component="StatBlock">
    <div class="stat-value" style="color:{accent};font-size:{numSize}px">
      {value}
      {#if unit}
        <span class="stat-unit" style="font-size:{unitSize}px">{unit}</span>
      {/if}
    </div>
    <div class="stat-label">{label}</div>
  </div>
{/if}

<style>
  .stat-block {
    text-align: center;
    min-width: 0;
  }
  .stat-value {
    font-family: var(--font-mono);
    font-weight: 500;
    line-height: 1;
    letter-spacing: -1px;
    white-space: nowrap;
  }
  .stat-unit {
    color: rgba(255,255,255,0.4);
    margin-left: 4px;
  }
  .size-sm .stat-value {
    letter-spacing: -0.5px;
  }
  .size-sm .stat-label {
    margin-top: 4px;
    font-size: 9px;
    letter-spacing: 1.1px;
  }
  .stat-label {
    margin-top: 6px;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-family: var(--font-mono);
  }

  /* ── Compartidos · Nuevo: tile ── */
  .tile {
    min-width: 0;
    padding: 14px;
    border-radius: var(--cv-radius-field);
    background: var(--cv-fill-1);
  }
  .tile b {
    display: block;
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: -0.05em;
    line-height: 1;
    white-space: nowrap;
    color: var(--text);
  }
  .tile b.empty { color: var(--text-muted); }
  .tile b small { font-size: 12px; color: var(--text-tertiary); margin-left: 2px; letter-spacing: 0; font-weight: 400; }
  .tile span {
    display: block;
    margin-top: 8px;
    font-size: 12px;
    color: var(--text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tile.lg { padding: 16px; border-radius: var(--radius-lg); }
  .tile.lg b { font-size: 28px; }
  .tile.lg span { font-size: 13px; }
</style>
