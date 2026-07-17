<script lang="ts">
  let {
    label,
    status = 'active',
    accent = 'var(--accent)'
  }: {
    label: string
    status?: 'active' | 'completed'
    accent?: string
  } = $props()
</script>

{#if status === 'completed'}
  <span class="badge completed" style="background:{accent};color:#0a0a0a;box-shadow:0 4px 12px {accent}55">
    <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    {label}
  </span>
{:else}
  <span class="badge active" style="background:{accent}1a;border:0.5px solid {accent}40;color:{accent}">
    <span class="pulse-dot" style="background:{accent};box-shadow:0 0 6px {accent}"></span>
    {label}
  </span>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 9999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .completed {
    font-weight: 700;
  }
  .pulse-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;
  }
</style>
