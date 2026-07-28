<script lang="ts">
  import '$lib/../app.css'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import TabBar from '$lib/components/TabBar.svelte'
  import Toast from '$lib/components/Toast.svelte'
  import RestTimerBanner from '$lib/components/RestTimerBanner.svelte'
  import OnboardingBanner from '$lib/components/OnboardingBanner.svelte'
  import { restBannerState, cancelRestTimer } from '$lib/rest-timer'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'

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
  let currentPath = $derived($page.url.pathname)
  let onboarded = $derived($settings.onboarded ?? false)
  let onboardingStep = $derived($settings.onboardingStep ?? 0)

  function advanceOnboarding() {
    const next = onboardingStep + 1
    if (next >= 4) {
      settings.update({ onboarded: true, onboardingStep: -1 })
    } else {
      settings.update({ onboardingStep: next })
    }
  }

  function skipOnboarding() {
    // dismiss — step stays, reappears next visit
  }

  function getBannerStep(): number {
    if (onboarded) return -1
    if (onboardingStep === 0 || onboardingStep === 1) return currentPath === '/you' ? onboardingStep : -1
    if (onboardingStep === 2 || onboardingStep === 3) return currentPath === '/today' ? onboardingStep : -1
    return -1
  }

  let bannerStep = $derived(getBannerStep())
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

{#if bannerStep >= 0}
  <OnboardingBanner
    bind:step={bannerStep}
    {accent}
    onNext={advanceOnboarding}
    onSkip={skipOnboarding}
  />
{/if}

<Toast visible={toastState.visible} message={toastState.message} isError={toastState.isError} />

<style>
  .app-shell {
    padding-bottom: 96px;
    min-height: 100dvh;
    zoom: var(--ui-zoom, 1);
  }
</style>
