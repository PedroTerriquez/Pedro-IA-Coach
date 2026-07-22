<script lang="ts">
  let { value, label, unit, accent = '#fafafa', size = 'lg' }: {
    value: string | number
    label: string
    unit?: string
    accent?: string
    size?: 'md' | 'lg'
  } = $props()

  let numSize = $derived(size === 'md' ? 22 : 30)
  let unitSize = $derived(size === 'md' ? 11 : 14)
</script>

<div class="stat-block" data-component="StatBlock">
  <div class="stat-value" style="color:{accent};font-size:{numSize}px">
    {value}
    {#if unit}
      <span class="stat-unit" style="font-size:{unitSize}px">{unit}</span>
    {/if}
  </div>
  <div class="stat-label">{label}</div>
</div>

<style>
  .stat-block {
    text-align: left;
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
  .stat-label {
    margin-top: 6px;
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-family: var(--font-mono);
  }
</style>
