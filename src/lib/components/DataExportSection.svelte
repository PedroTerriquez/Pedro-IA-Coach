<script lang="ts">
  import ActionRow from './ActionRow.svelte'
  import Button from './Button.svelte'

  let {
    accent = 'var(--accent)',
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

<div data-component="DataExportSection">
  <ActionRow title="Ejercicios JSON" description="Descarga solo los ejercicios como JSON" status={exercisesExportStatus} {accent}>
    {#snippet button()}
      <Button size="sm" onclick={onexercisesexport}>Exportar JSON</Button>
    {/snippet}
  </ActionRow>
  <ActionRow title="Logs+ajustes JSON" description="Descarga toda la base de datos como JSON" status={jsonExportStatus} {accent}>
    {#snippet button()}
      <Button size="sm" onclick={onlogsexport}>Exportar JSON</Button>
    {/snippet}
  </ActionRow>
</div>

