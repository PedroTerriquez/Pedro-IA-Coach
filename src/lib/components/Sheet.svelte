<script lang="ts">
  let { open = $bindable(false), children, header, onclose = () => {} }: {
    open: boolean
    children?: import('svelte').Snippet
    header?: import('svelte').Snippet
    onclose?: () => void
  } = $props()

  function close() {
    open = false
    onclose()
  }
</script>

{#if open}
  <div class="sheet-overlay" data-component="Sheet" role="dialog" aria-modal="true">
    <div class="sheet-backdrop" onclick={close}></div>
    <button class="sheet-close-btn" onclick={close} aria-label="Cerrar">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
    </button>
    <div class="sheet-content">
      <div class="sheet-handle"></div>
      {#if header}
        <div class="sheet-header">{@render header()}</div>
      {/if}
      <div class="sheet-body">
        {#if children}{@render children()}{/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    pointer-events: auto;
  }
  .sheet-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    transition: background 0.25s;
  }
  .sheet-content {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--surface);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    max-height: 88%;
    overflow: hidden;
    box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.5);
    border: 0.5px solid var(--border);
    display: flex;
    flex-direction: column;
  }
  .sheet-handle {
    width: 36px;
    height: 5px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.18);
    margin: 10px auto 0;
    flex-shrink: 0;
  }
  .sheet-header {
    padding: 4px 20px 0;
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .sheet-close-btn {
    position: absolute;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid var(--border-medium);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 110;
    padding: 0;
    color: var(--text-secondary);
    top: max(14px, env(safe-area-inset-top, 14px));
  }
  .sheet-body {
    overflow: auto;
    flex: 1;
    padding: 0 20px;
  }
</style>
