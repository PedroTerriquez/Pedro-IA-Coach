<script lang="ts">
  let { children, accent = 'var(--accent)' }: {
    children?: import('svelte').Snippet
    accent?: string
  } = $props()
</script>

<div class="section-label">
  <span class="dot" style="background:{accent}"></span>
  {#if children}{@render children()}{/if}
</div>

<style>
  .section-label {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }
  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    display: inline-block;
  }
</style>
