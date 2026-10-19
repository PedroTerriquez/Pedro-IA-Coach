<script lang="ts">
  import '$lib/../app.css'
  import { settings } from '$lib/stores/settings'
  import { toast, restMinimized, detailSheetsOpen } from '$lib/stores/ui'
  import TabBar from '$lib/components/TabBar.svelte'
  import Toast from '$lib/components/Toast.svelte'
  import RestTimerBanner from '$lib/components/RestTimerBanner.svelte'
  import SeriesModeScreen from '$lib/components/SeriesModeScreen.svelte'
  import OnboardingBanner from '$lib/components/OnboardingBanner.svelte'
  import OfflineBanner from '$lib/components/OfflineBanner.svelte'
  import { restBannerState, cancelRestTimer, adjustRestTimer, restartRestTimer, startNextSet } from '$lib/rest-timer'
  import { onMount } from 'svelte'
  import { page } from '$app/stores'
  import { ROUTES } from '$lib/routes'

  let { children } = $props()

  onMount(() => {
    settings.load()
  })

  $effect(() => {
    const s = $settings
    if (s.accentColor) {
      document.documentElement.style.setProperty('--accent', s.accentColor)
    }
    document.querySelector<HTMLElement>('.app-shell')?.style.setProperty('--ui-zoom', String(s.fontScale || 1))
  })

  let toastState = $derived($toast)
  let accent = $derived($settings.accentColor || '#d4ff3a')
  let currentPath = $derived($page.url.pathname)
  let onboarded = $derived($settings.onboarded ?? false)
  let onboardingStep = $derived($settings.onboardingStep ?? 0)

  let dismissed = $state(false)

  $effect(() => {
    currentPath
    dismissed = false
  })

  function advanceOnboarding() {
    const next = onboardingStep + 1
    if (next >= 4) {
      settings.update({ onboarded: true, onboardingStep: -1 })
    } else {
      settings.update({ onboardingStep: next })
    }
  }

  function skipOnboarding() {
    dismissed = true
  }

  // Steps 0–1 (your data, your program) are Tú's own first-time screen now;
  // the banner only carries steps 2–3 on Today.
  function getBannerStep(): number {
    if (onboarded || dismissed) return -1
    if (onboardingStep === 2 || onboardingStep === 3) return currentPath === ROUTES.today ? onboardingStep : -1
    return -1
  }

  let bannerStep = $derived(getBannerStep())

  // The rest timer opens full screen; "minimizar" collapses it to the floating
  // banner. Every new rest (new tag) opens full screen again, and so does the
  // end of a rest: that's where the set is registered and the next one starts.
  let restTag = $derived($restBannerState.tag)
  let restPhase = $derived($restBannerState.phase)

  $effect(() => {
    restTag
    restPhase
    restMinimized.set(false)
  })
</script>

<svelte:head>
  <title>Coach Pedro AI</title>
</svelte:head>

<div class="app-shell">
  {@render children()}
</div>

<TabBar />

<SeriesModeScreen
  visible={$restBannerState.visible && !$restMinimized}
  timer={$restBannerState}
  {accent}
  onskip={() => cancelRestTimer($restBannerState.tag)}
  onclose={() => cancelRestTimer($restBannerState.tag)}
  onminimize={() => restMinimized.set(true)}
  onadjust={(delta) => adjustRestTimer(delta)}
  onrestart={() => restartRestTimer()}
  onnext={() => startNextSet()}
/>

<RestTimerBanner
  visible={$restBannerState.visible && $restMinimized}
  endTime={$restBannerState.endTime}
  restSec={$restBannerState.restSec}
  name={$restBannerState.name}
  sets={$restBannerState.sets}
  reps={$restBannerState.reps}
  setIndex={$restBannerState.setIndex}
  inSheet={$detailSheetsOpen > 0}
  onskip={() => cancelRestTimer($restBannerState.tag)}
  onexpand={() => restMinimized.set(false)}
/>

{#if bannerStep >= 0}
  <OnboardingBanner
    step={bannerStep}
    {accent}
    onNext={advanceOnboarding}
    onSkip={skipOnboarding}
  />
{/if}

<Toast visible={toastState.visible} message={toastState.message} isError={toastState.isError} />

<!-- Inside a detail sheet the notice takes the sheet's position line instead -->
{#if $detailSheetsOpen === 0}<OfflineBanner />{/if}

<style>
  .app-shell {
    padding-bottom: 96px;
    min-height: 100dvh;
    zoom: var(--ui-zoom, 1);
  }
</style>
