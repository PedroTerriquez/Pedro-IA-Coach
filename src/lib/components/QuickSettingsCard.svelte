<script lang="ts">
  import { canInstall, installPWA, useNativePrompt, isStandalone } from '$lib/pwa'
  import CardRow from './CardRow.svelte'
  import AccentToggle from './AccentToggle.svelte'
  import Button from './Button.svelte'
  import InstallGuide from './InstallGuide.svelte'

  let {
    units = 'kg',
    accent = 'var(--accent)',
    hasWatch = false,
    notifPermission = 'default',
    language = 'es',
    fontScale = 1,
    ontoggleunits = () => {},
    onaccentchange = () => {},
    ontogglewatch = () => {},
    onnotifclick = () => {},
    togglelang = () => {},
    onfontscalechange = () => {}
  }: {
    units: string
    accent: string
    hasWatch: boolean
    notifPermission: string
    language: string
    fontScale?: number
    ontoggleunits: () => void
    onaccentchange: (val: string) => void
    ontogglewatch: () => void
    onnotifclick: () => void
    togglelang: () => void
    onfontscalechange?: (val: number) => void
  } = $props()

  let showGuide = $state(false)
  let installStatus = $state<'idle' | 'installed'>('idle')

  function permLabel(): string {
    if (typeof Notification === 'undefined') return 'No disponible'
    return notifPermission === 'granted' ? 'Activadas'
      : notifPermission === 'denied' ? 'Denegadas' : 'Preguntar'
  }

  function permActive(): boolean {
    return notifPermission === 'granted'
  }

  const FONT_SCALES: { value: number; label: string }[] = [
    { value: 1, label: 'Normal' },
    { value: 1.15, label: 'Grande' },
    { value: 1.3, label: 'Extra grande' }
  ]

  function fontScaleLabel(): string {
    const match = FONT_SCALES.find(f => Math.abs(f.value - fontScale) < 0.01)
    return match ? match.label : 'Normal'
  }

  function cycleFontScale() {
    const idx = FONT_SCALES.findIndex(f => Math.abs(f.value - fontScale) < 0.01)
    const next = FONT_SCALES[(idx + 1) % FONT_SCALES.length]
    onfontscalechange(next.value)
  }

  function handleInstall() {
    if (useNativePrompt()) {
      installPWA()
    } else {
      showGuide = true
    }
  }

  let showInstallRow = $derived(canInstall())
</script>

<div class="card" data-component="QuickSettingsCard">
  <CardRow label="Unidades">
    <Button variant="ghost" onclick={ontoggleunits}>{units === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</Button>
  </CardRow>
  <CardRow label="Color de acento">
    <input type="color" value={accent} oninput={(e) => onaccentchange((e.target as HTMLInputElement).value)} class="accent-picker">
  </CardRow>
  <CardRow label="Smartwatch">
    <AccentToggle active={hasWatch} {accent} onclick={ontogglewatch}>
      {hasWatch ? 'Sí' : 'No'}
    </AccentToggle>
  </CardRow>
  <CardRow label="Notificaciones">
    <AccentToggle active={permActive()} {accent} onclick={onnotifclick}>
      {permLabel()}
    </AccentToggle>
  </CardRow>
  <CardRow label="Idioma">
    <Button id="lang-toggle-btn" variant="ghost" onclick={togglelang}>{language === 'en' ? 'English' : 'Español'}</Button>
  </CardRow>
  <CardRow label="Tamaño de texto" last={!showInstallRow}>
    <Button id="font-size-toggle-btn" variant="ghost" onclick={cycleFontScale}>{fontScaleLabel()}</Button>
  </CardRow>
  {#if showInstallRow}
    <CardRow label="Instalar app" last={true}>
      {#if isStandalone() || installStatus === 'installed'}
        <Button variant="ghost" disabled>✓ Instalada</Button>
      {:else if useNativePrompt()}
        <Button variant="ghost" onclick={handleInstall}>Instalar</Button>
      {:else}
        <Button variant="ghost" onclick={handleInstall}>Ver instrucciones</Button>
      {/if}
    </CardRow>
  {/if}
</div>

<InstallGuide open={showGuide} {accent} onclose={() => showGuide = false} />

<style>
  .accent-picker { width: 40px; height: 28px; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0; background: transparent; cursor: pointer; }
</style>
