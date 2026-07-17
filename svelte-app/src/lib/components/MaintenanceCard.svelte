<script lang="ts">
  let {
    accent = '#d4ff3a',
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

<div class="card">
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
      <button id="dict-migrate-btn" class="btn-maint" style="border-color:{accent}55;color:{accent}" onclick={onmigrate}>Aplicar</button>
      <button id="dict-force-btn" class="btn-maint btn-maint-alt" onclick={onforce}>Forzar</button>
    </div>
  </div>
</div>

<style>
  .maint-row { padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .maint-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .btn-maint { padding: 7px 14px; border-radius: 8px; border: 0.5px solid; cursor: pointer; background: transparent; font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .btn-maint-alt { border-color: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5); }
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: 'JetBrains Mono', monospace; text-decoration: underline; padding: 0; margin-left: 4px; }
</style>
