<script lang="ts">
  import Button from './Button.svelte'
  import ActionRow from './ActionRow.svelte'
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
  <ActionRow
    title="Normalizar ejercicios con diccionario"
    description="Renombra al canónico en español, rellena imágenes y músculo desde el diccionario"
  >
    {#snippet statusContent()}
      <span id="dict-migrate-status">{migrateStatus}
        {#if skippedNames.length > 0}
          <button id="ver-mas-link" class="ver-mas" style="color:{accent}" onclick={onshowskipped}>ver más</button>
        {/if}
      </span>
    {/snippet}
    {#snippet button()}
      <div class="maint-actions">
        <Button size="sm" {accent} onclick={onmigrate}>Aplicar</Button>
        <Button variant="secondary" size="sm" onclick={onforce}>Forzar</Button>
      </div>
    {/snippet}
  </ActionRow>
</div>

<style>
  .maint-actions { display: flex; flex-direction: column; gap: 6px; flex-shrink: 0; }
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: var(--font-mono); text-decoration: underline; padding: 0; margin-left: 4px; }
</style>
