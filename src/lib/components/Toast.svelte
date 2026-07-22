<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    visible = false,
    message = '',
    isError = false,
    children
  }: {
    visible?: boolean
    message?: string
    isError?: boolean
    children?: Snippet
  } = $props()
</script>

{#if visible}
  <div id="backup-toast" class="toast" class:toast-error={isError} data-component="Toast">
    {#if children}
      {@render children()}
    {:else}
      {message}
    {/if}
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 18px;
    border-radius: 12px;
    z-index: 9999;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 500;
    background: #1a1a1a;
    color: #fafafa;
    border: 0.5px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    max-width: 80%;
    text-align: center;
    transition: opacity 0.3s;
  }
  .toast.toast-error {
    background: #2a0f0f;
    color: #ff6b6b;
    border-color: rgba(255, 107, 107, 0.25);
  }
</style>
