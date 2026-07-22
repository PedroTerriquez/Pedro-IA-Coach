<script lang="ts">
  import Button from './Button.svelte'
  let {
    accent = 'var(--accent)',
    migrateStatus = '',
    skippedNames = [],
    onmigrate = () => {},
    onforce = () => {},
    onshowskipped = () => {}
  }: {
    accent?: string
    migrateStatus?: string
    skippedNames?: string[]
    onmigrate?: () => void
    onforce?: () => void
    onshowskipped?: () => void
  } = $props()
</script>

<div class="card" data-component="MaintenanceCard">
  <div class="maint-row">
    <div class="flex-1">
      <div class="card-title">Normalizar ejercicios con diccionario</div>
      <div class="card-subtitle">Renombra al canónico en español, rellena imágenes y músculo desde el diccionario</div>
      <div id="dict-migrate-status" class="status-text">{migrateStatus}
        {#if skippedNames.length > 0}
          <button id="ver-mas-link" class="ver-mas" style="color:{accent}" onclick={onshowskipped}>ver más</button>
        {/if}
      </div>
    </div>
    <div class="maint-actions">
      <Button size="sm" style="border-color:{accent}55;color:{accent}" onclick={onmigrate}>Aplicar</Button>
      <Button variant="secondary" size="sm" onclick={onforce}>Forzar</Button>
    </div>
  </div>
</div>

<style>
  .maint-row { padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .maint-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: var(--font-mono); text-decoration: underline; padding: 0; margin-left: 4px; }
</style>
