<script lang="ts">
  import ActionRow from './ActionRow.svelte'
  import Button from './Button.svelte'
  let {
    accent = 'var(--accent)',
    migrateStatus = '',
    skippedNames = [],
    onforce = () => {},
    onshowskipped = () => {}
  }: {
    accent?: string
    migrateStatus?: string
    skippedNames?: string[]
    onforce?: () => void
    onshowskipped?: () => void
  } = $props()
</script>

<ActionRow
  title="Limpia y ordena tus ejercicios"
  description="Sobrescribe nombre, músculo, imagen, tips y alternativas con los del diccionario. Lo personalizado se reemplaza."
  {accent}
>
  {#snippet statusContent()}
    <span id="dict-migrate-status">{migrateStatus}
      {#if skippedNames.length > 0}
        <button id="ver-mas-link" class="ver-mas" style="color:{accent}" onclick={onshowskipped}>ver más</button>
      {/if}
    </span>
  {/snippet}
  {#snippet button()}
    <Button variant="secondary" size="sm" {accent} onclick={onforce}>Sobrescribir</Button>
  {/snippet}
</ActionRow>

<style>
  .ver-mas { background: none; border: none; cursor: pointer; font-size: 10px; font-family: var(--font-mono); text-decoration: underline; padding: 0; margin-left: 4px; }
</style>
