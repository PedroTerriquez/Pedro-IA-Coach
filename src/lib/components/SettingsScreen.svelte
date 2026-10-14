<script lang="ts">
  import type { Settings } from '$lib/types'
  import { FONT_SCALES, LANGUAGES, fontScaleLabel, languageLabel, notificationRow, type NotifState } from '$lib/settings-options'
  import { isStandalone } from '$lib/pwa'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import Switch from './Switch.svelte'
  import Sheet from './Sheet.svelte'
  import OptionList from './OptionList.svelte'
  import AccentSheet from './AccentSheet.svelte'
  import NotificationsSheet from './NotificationsSheet.svelte'
  import InstallGuide from './InstallGuide.svelte'

  // Every setting applies on tap; nothing to save.
  let { settings, notifState, onupdate, onaccent, onactivatenotifs, ontestnotif, onback }: {
    settings: Settings
    notifState: NotifState
    onupdate: (patch: Partial<Settings>) => void
    onaccent: (color: string) => void
    onactivatenotifs: () => void
    ontestnotif: () => void
    onback: () => void
  } = $props()

  let fontOpen = $state(false)
  let langOpen = $state(false)
  let accentOpen = $state(false)
  let notifOpen = $state(false)
  let installOpen = $state(false)

  let units = $state('kg')
  $effect(() => { units = settings.units || 'kg' })

  let notif = $derived(notificationRow(notifState))
  let standalone = isStandalone()

  function pickLanguage(v: string) {
    onupdate({ language: v })
    langOpen = false
  }
</script>

<YouScreen id="you-ajustes">
  <SubpageHeader title="Ajustes" lead="Los cambios se aplican al momento." {onback} />

  <NavGroup>
    <NavRow label="Unidades">
      {#snippet control()}
        <SegmentedControl
          size="compact"
          label="Unidades"
          options={[{ label: 'kg', value: 'kg', id: 'units-kg' }, { label: 'lb', value: 'lb', id: 'units-lb' }]}
          bind:value={units}
          onchange={(v) => onupdate({ units: v })}
        />
      {/snippet}
    </NavRow>
    <NavRow id="font-size-toggle-btn" label="Tamaño de texto" value={fontScaleLabel(settings.fontScale)} onclick={() => fontOpen = true} />
    <NavRow id="lang-toggle-btn" label="Idioma" value={languageLabel(settings.language)} onclick={() => langOpen = true} />
    <NavRow id="accent-row" label="Color de la app" onclick={() => accentOpen = true}>
      {#snippet trailing()}<span class="swc"></span>{/snippet}
    </NavRow>
  </NavGroup>

  <NavGroup>
    <NavRow label="Smart Watch">
      {#snippet control()}<Switch id="watch-switch" label="Smart Watch" checked={!!settings.hasWatch} onchange={(v) => onupdate({ hasWatch: v })} />{/snippet}
    </NavRow>
    <NavRow id="notif-row" label="Notificaciones" value={notif.value} sub={notif.sub} onclick={() => notifOpen = true} />
  </NavGroup>

  <NavGroup>
    <NavRow id="install-row" label="Instalar app" value={standalone ? 'Instalada' : 'Ver cómo'} disabled={standalone} onclick={() => installOpen = true} />
  </NavGroup>
</YouScreen>

<Sheet bind:open={fontOpen} title="Tamaño de texto" id="font-size-sheet">
  <OptionList
    label="Tamaño de texto"
    options={FONT_SCALES.map(f => ({ value: String(f.value), label: f.label, style: f.style }))}
    value={String(settings.fontScale || 1)}
    onselect={(v) => onupdate({ fontScale: Number(v) })}
  />
  <div class="prev">
    <span class="lbl">Vista previa</span>
    <b>Press Banca</b>
    <span class="mono">4 × 8-10 · 120 s</span>
  </div>
  <p class="cap">Se aplica al tocar, en toda la app</p>
</Sheet>

<Sheet bind:open={langOpen} title="Idioma" id="language-sheet">
  <OptionList label="Idioma" options={LANGUAGES} value={settings.language || 'es'} onselect={pickLanguage} />
  <p class="cap">Se aplica al tocar. Tus ejercicios y programas conservan sus nombres.</p>
</Sheet>

<AccentSheet bind:open={accentOpen} value={settings.accentColor || '#d4ff3a'} onpick={onaccent} />
<NotificationsSheet bind:open={notifOpen} state={notifState} onactivate={onactivatenotifs} ontest={ontestnotif} />
<InstallGuide bind:open={installOpen} />

<style>
  .swc { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); }
  .prev { display: flex; flex-direction: column; gap: 8px; padding: 16px; border-radius: var(--radius-lg); background: var(--cv-fill-1); }
  .prev b { font-size: 19px; }
  .lbl { font-family: var(--font-mono); font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--text-tertiary); }
  .mono { font-family: var(--font-mono); font-size: 16px; color: var(--text-secondary); }
  .cap { margin-bottom: -8px; font-size: 13px; line-height: 1.45; text-align: center; color: var(--text-tertiary); }
</style>
