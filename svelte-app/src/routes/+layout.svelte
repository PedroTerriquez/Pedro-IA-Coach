<script lang="ts">
  import '$lib/../app.css'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import TabBar from '$lib/components/TabBar.svelte'
  import { onMount } from 'svelte'

  let { children } = $props()

  onMount(() => {
    settings.load()
  })

  $effect(() => {
    const s = $settings
    if (s.accentColor) {
      document.documentElement.style.setProperty('--accent', s.accentColor)
    }
  })

  let toastState = $derived($toast)
</script>

<svelte:head>
  <title>Coach Pedro AI</title>
</svelte:head>

<div class="app-shell">
  {@render children()}
</div>

<TabBar />

{#if toastState.visible}
  <div id="backup-toast" class="toast" class:toast-error={toastState.isError}>
    {toastState.message}
  </div>
{/if}

<style>
  .app-shell {
    padding-bottom: 96px;
    min-height: 100dvh;
  }
  .toast {
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 18px;
    border-radius: 12px;
    z-index: 9999;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 500;
    background: #1a1a1a;
    color: #fafafa;
    border: 0.5px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    max-width: 80%;
    text-align: center;
    transition: opacity 0.3s;
  }
  .toast.toast-error {
    background: #2a0f0f;
    color: #ff6b6b;
    border-color: rgba(255,107,107,0.25);
  }
</style>
