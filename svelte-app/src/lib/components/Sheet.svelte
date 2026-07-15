<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  let { open, children }: {
    open: boolean
    children?: import('svelte').Snippet
  } = $props()

  let dispatch = createEventDispatcher()
  let visible = $derived(open)

  function close() {
    dispatch('close')
  }
</script>

{#if visible}
  <div class="sheet-overlay" role="dialog" aria-modal="true">
    <div class="sheet-backdrop" onclick={close}></div>
    <button class="sheet-close-btn" onclick={close} aria-label="Cerrar">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
    </button>
    <div class="sheet-content">
      <div class="sheet-handle"></div>
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
    background: rgba(0,0,0,0.45);
    transition: background 0.25s;
  }
  .sheet-content {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    background: #0e0e0e;
    border-radius: 16px 16px 0 0;
    max-height: 92%;
    overflow: hidden;
    box-shadow: 0 -20px 40px rgba(0,0,0,0.5);
    border: 0.5px solid rgba(255,255,255,0.08);
    display: flex;
    flex-direction: column;
  }
  .sheet-handle {
    width: 36px;
    height: 5px;
    border-radius: 3px;
    background: rgba(255,255,255,0.18);
    margin: 10px auto 0;
    flex-shrink: 0;
  }
  .sheet-close-btn {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 110;
    padding: 0;
    color: rgba(255,255,255,0.75);
  }
  .sheet-body {
    overflow: auto;
    flex: 1;
  }
</style>
