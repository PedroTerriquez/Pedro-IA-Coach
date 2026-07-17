<script lang="ts">
  import { installPWA } from '$lib/pwa'
  import CardRow from './CardRow.svelte'
  import AccentToggle from './AccentToggle.svelte'

  let {
    units = 'kg',
    accent = '#d4ff3a',
    hasWatch = false,
    notifPermission = 'default',
    language = 'es',
    ontoggleunits = () => {},
    onaccentchange = () => {},
    ontogglewatch = () => {},
    onnotifclick = () => {},
    togglelang = () => {}
  }: {
    units: string
    accent: string
    hasWatch: boolean
    notifPermission: string
    language: string
    ontoggleunits: () => void
    onaccentchange: (val: string) => void
    ontogglewatch: () => void
    onnotifclick: () => void
    togglelang: () => void
  } = $props()

  function permLabel(): string {
    if (typeof Notification === 'undefined') return 'No disponible'
    return notifPermission === 'granted' ? 'Activadas'
      : notifPermission === 'denied' ? 'Denegadas' : 'Preguntar'
  }

  function permActive(): boolean {
    return notifPermission === 'granted'
  }
</script>

<div class="card">
  <CardRow label="Unidades">
    <button class="btn-toggle" onclick={ontoggleunits}>{units === 'kg' ? 'Kilogramos (kg)' : 'Libras (lb)'}</button>
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
    <button class="btn-toggle" onclick={togglelang}>{language === 'en' ? 'English' : 'Español'}</button>
  </CardRow>
  <CardRow label="Instalar app" last={true}>
    <button class="btn-toggle" onclick={() => installPWA()}>Añadir</button>
  </CardRow>
</div>

<style>
  .btn-toggle { padding: 6px 12px; border-radius: 8px; border: 0.5px solid rgba(255,255,255,0.1); cursor: pointer; background: transparent; color: rgba(255,255,255,0.55); font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; }
  .accent-picker { width: 40px; height: 28px; border: 0.5px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0; background: transparent; cursor: pointer; }
</style>
