<script lang="ts">
  import ActionRow from './ActionRow.svelte'

  let {
    accent = '#d4ff3a',
    exercisesExportStatus = '',
    jsonExportStatus = '',
    onexercisesexport = undefined,
    onlogsexport = undefined
  }: {
    accent: string
    exercisesExportStatus: string
    jsonExportStatus: string
    onexercisesexport?: () => void
    onlogsexport?: () => void
  } = $props()
</script>

<ActionRow title="Ejercicios JSON" description="Descarga solo los ejercicios como JSON" status={exercisesExportStatus} {accent}>
  {#snippet button()}
    <button onclick={onexercisesexport} class="btn-accent-sm">Exportar JSON</button>
  {/snippet}
</ActionRow>
<ActionRow title="Logs+ajustes JSON" description="Descarga toda la base de datos como JSON" status={jsonExportStatus} {accent}>
  {#snippet button()}
    <button onclick={onlogsexport} class="btn-accent-sm">Exportar JSON</button>
  {/snippet}
</ActionRow>

<style>
  .btn-accent-sm {
    padding: 7px 14px;
    border-radius: 8px;
    border: 0;
    cursor: pointer;
    background: var(--accent, #d4ff3a);
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
</style>
