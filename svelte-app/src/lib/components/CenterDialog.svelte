<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    open = false,
    children,
    onclose = () => {}
  }: {
    open?: boolean
    children?: Snippet
    onclose?: () => void
  } = $props()

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose()
  }
</script>

{#if open}
  <div class="dialog-backdrop" role="button" tabindex="0" onclick={handleBackdrop} onkeydown={(e) => { if (e.key === 'Escape') onclose() }}>
    <div class="dialog-panel">
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
</style>
