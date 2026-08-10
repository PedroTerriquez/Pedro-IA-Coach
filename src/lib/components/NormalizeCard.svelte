<script lang="ts">
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
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

<div class="card normalize-card" data-component="NormalizeCard">
  <div class="nz-head">
    <div class="nz-icon" style="background:{accent}1a;color:{accent}">
      <Icon name="swap" size={15} />
    </div>
    <div class="nz-copy">
      <div class="nz-title">Limpia y ordena tus ejercicios</div>
      <div class="nz-desc">Completa los datos que faltan (músculo, imagen, nombre) desde el diccionario, sin tocar lo personalizado.</div>
    </div>
  </div>

  <div class="nz-status">
    <span id="dict-migrate-status">{migrateStatus}
      {#if skippedNames.length > 0}
        <button id="ver-mas-link" class="ver-mas" style="color:{accent}" onclick={onshowskipped}>ver más</button>
      {/if}
    </span>
  </div>

  <div class="nz-actions">
    <Button size="sm" {accent} onclick={onmigrate}>Completar</Button>
    <Button variant="secondary" size="sm" onclick={onforce}>Sobrescribir</Button>
  </div>
</div>

<style>
  .normalize-card { padding: 14px 16px; }
  .nz-head { display: flex; align-items: flex-start; gap: 10px; }
  .nz-icon { flex-shrink: 0; width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .nz-copy { flex: 1; min-width: 0; }
  .nz-title { font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: #fafafa; letter-spacing: -0.2px; }
  .nz-desc { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 3px; line-height: 1.45; }
  .nz-status { margin-top: 10px; font-size: 10px; font-family: var(--font-mono); color: rgba(255,255,255,0.35); letter-spacing: 0.2px; min-height: 14px; }
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: var(--font-mono); text-decoration: underline; padding: 0; margin-left: 4px; }
  .nz-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px; }
</style>
