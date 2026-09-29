<script lang="ts">
  import { online } from '$lib/stores/network'
  import { fly } from 'svelte/transition'

  const RECONNECTED_MS = 2500

  // `idle` on first load while online: nothing to announce. It only turns
  // into `back` after having been offline.
  let status = $state<'idle' | 'offline' | 'back'>('idle')
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  function clearHideTimer() {
    if (hideTimer) clearTimeout(hideTimer)
    hideTimer = null
  }

  function showBack() {
    status = 'back'
    clearHideTimer()
    hideTimer = setTimeout(() => (status = 'idle'), RECONNECTED_MS)
  }

  $effect(() => {
    const isOnline = $online
    if (!isOnline) {
      clearHideTimer()
      status = 'offline'
    } else if (status === 'offline') {
      showBack()
    }
  })

  $effect(() => clearHideTimer)
</script>

{#if status !== 'idle'}
  <div
    id="offline-banner"
    class="offline-banner"
    class:back={status === 'back'}
    role="status"
    data-component="OfflineBanner"
    transition:fly={{ y: -20, duration: 200 }}
  >
    <span class="dot"></span>
    {status === 'offline' ? 'Sin conexión' : 'Conectado de nuevo'}
  </div>
{/if}

<style>
  .offline-banner {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 8px);
    left: 0;
    right: 0;
    width: fit-content;
    margin: 0 auto;
    z-index: 9999;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 9999px;
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    background: #2a0f0f;
    color: #ff6b6b;
    border: 0.5px solid rgba(255, 107, 107, 0.25);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }
  .offline-banner.back {
    background: #141414;
    color: var(--accent);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }
</style>
