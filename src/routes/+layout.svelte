<script lang="ts">
  import '$lib/../app.css'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import TabBar from '$lib/components/TabBar.svelte'
  import Toast from '$lib/components/Toast.svelte'
  import RestTimerBanner from '$lib/components/RestTimerBanner.svelte'
  import { restBannerState, cancelRestTimer } from '$lib/rest-timer'
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
    document.querySelector('.app-shell')?.style.setProperty('--ui-zoom', String(s.fontScale || 1))
  })

  let toastState = $derived($toast)
  let accent = $derived($settings.accentColor || '#d4ff3a')
</script>

<svelte:head>
  <title>Coach Pedro AI</title>
</svelte:head>

<div class="app-shell">
  {@render children()}
</div>

<TabBar />

<RestTimerBanner
  visible={$restBannerState.visible}
  endTime={$restBannerState.endTime}
  restSec={$restBannerState.restSec}
  name={$restBannerState.name}
  sets={$restBannerState.sets}
  reps={$restBannerState.reps}
  {accent}
  onskip={() => cancelRestTimer($restBannerState.tag)}
/>

<Toast visible={toastState.visible} message={toastState.message} isError={toastState.isError} />

<style>
  .app-shell {
    padding-bottom: 96px;
    min-height: 100dvh;
    zoom: var(--ui-zoom, 1);
  }
</style>
