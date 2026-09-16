<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open = false,
    children,
    onclose = () => {},
    id = undefined,
    title = '',
    header,
    showClose = false,
    closeId = undefined
  }: {
    open?: boolean
    children?: Snippet
    onclose?: () => void
    id?: string
    title?: string
    header?: Snippet
    showClose?: boolean
    closeId?: string
  } = $props()

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose()
  }
</script>

{#if open}
  <div {id} class="dialog-backdrop" data-component="CenterDialog" role="button" tabindex="0" onclick={handleBackdrop} onkeydown={(e) => { if (e.key === 'Escape') onclose() }}>
    <div class="dialog-panel">
      {#if title || header || showClose}
        <div class="dialog-header">
          <div class="dialog-title">{#if header}{@render header()}{:else}{title}{/if}</div>
          {#if showClose}
            <button id={closeId} class="dialog-close" onclick={onclose} aria-label="Cerrar">✕</button>
          {/if}
        </div>
      {/if}
      {#if children}{@render children()}{/if}
    </div>
  </div>
{/if}

<style>
  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }
  .dialog-panel {
    background: #141414;
    border-radius: 24px;
    padding: 28px 24px;
    max-width: 340px;
    width: 100%;
    border: 0.5px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: fadeUp 0.25s ease-out;
  }
  .dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
  }
  .dialog-title {
    font-family: var(--font-sans);
    font-weight: 700;
    color: var(--text);
    min-width: 0;
  }
  .dialog-close {
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
    flex-shrink: 0;
  }
</style>
