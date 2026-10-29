<script lang="ts">
  // Read-only row: label (+ sub) on the left; a mono value or a dot status on the right.
  let { label, sub, value, on }: { label: string; sub?: string; value?: string; on?: string } = $props()
</script>

<div class="ro" data-component="StatusRow">
  <span><span class="l">{label}</span>{#if sub}<span class="s">{sub}</span>{/if}</span>
  {#if on}<span class="on-dot"><i></i>{on}</span>{:else if value}<span class="v">{value}</span>{/if}
</div>

<style>
  .ro { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 56px; padding: 8px 16px; border-radius: var(--cv-radius-field); background: var(--cv-fill-1); }
  .l { display: block; font-size: 16px; font-weight: 500; }
  .s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); line-height: 1.35; }
  .v { font-family: var(--font-mono); font-size: 15px; color: var(--text-secondary); white-space: nowrap; }
  .on-dot { display: inline-flex; align-items: center; gap: 7px; font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
  .on-dot i { width: 8px; height: 8px; border-radius: 50%; background: var(--text); }
</style>
