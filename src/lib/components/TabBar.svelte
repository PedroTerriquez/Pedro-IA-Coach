<script lang="ts">
  import { page } from '$app/stores'
  import { ROUTES } from '$lib/routes'
  import { settings } from '$lib/stores/settings'

  const tabs = [
    { id: 'today', label: 'Hoy', path: ROUTES.today },
    { id: 'plan', label: 'Plan', path: ROUTES.plan },
    { id: 'history', label: 'Historial', path: ROUTES.history },
    { id: 'friends', label: 'Amigos', path: ROUTES.friends },
    { id: 'you', label: 'Tú', path: ROUTES.you },
  ]

  let activePath = $derived($page.url.pathname)
  let accent = $derived($settings.accentColor || '#d4ff3a')
</script>

<div class="tabbar-outer" style="--tab-accent: {accent}">
  <div class="tabbar-inner">
    {#each tabs as tab}
      <a href={tab.path} class="tab-btn" class:active={activePath === tab.path}>
        {#if tab.id === 'today'}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 8.5L10 3l7 5.5V16a1 1 0 01-1 1h-3v-5H7v5H4a1 1 0 01-1-1V8.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
        {:else if tab.id === 'plan'}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.6"/><path d="M3 8h14M7 3v3M13 3v3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        {:else if tab.id === 'history'}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 16h14M5 13V8m4 5V5m4 8v-6m4 6v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        {:else if tab.id === 'friends'}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="2.8" stroke="currentColor" stroke-width="1.6"/><circle cx="14" cy="8" r="2.2" stroke="currentColor" stroke-width="1.5"/><path d="M3 15.5c0-2.5 2.2-4.2 5-4.2s5 1.7 5 4.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M12 14.5c0-1.8 1.6-3 3.5-3s3.5 1.2 3.5 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        {:else if tab.id === 'you'}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="7" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 17c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        {/if}
        <span class="tab-label">{tab.label}</span>
      </a>
    {/each}
  </div>
</div>

<style>
  .tabbar-outer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 30;
    padding: 8px 12px 28px;
    pointer-events: none;
  }
  .tabbar-inner {
    display: flex;
    justify-content: space-around;
    align-items: center;
    background: rgba(20,20,20,0.85);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 9999px;
    padding: 8px 12px;
    box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    pointer-events: auto;
  }
  .tab-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 8px 4px;
    background: none;
    border: 0;
    cursor: pointer;
    color: rgba(255,255,255,0.45);
    transition: color 0.2s;
    text-decoration: none;
    font-family: var(--font-sans);
  }
  .tab-btn.active {
    color: var(--tab-accent, #d4ff3a);
  }
  .tab-label {
    font-size: 9.5px;
    letter-spacing: 0.6px;
    font-weight: 600;
    font-family: var(--font-sans);
    text-transform: uppercase;
  }
</style>
