<script lang="ts">
  import ActionRow from './ActionRow.svelte'
  import Button from './Button.svelte'

  let {
    accent = 'var(--accent)',
    exercisesImportStatus = '',
    jsonImportStatus = '',
    onexercisesimport = undefined,
    onlogsimport = undefined
  }: {
    accent: string
    exercisesImportStatus: string
    jsonImportStatus: string
    onexercisesimport?: (e: Event) => void
    onlogsimport?: (e: Event) => void
  } = $props()
</script>

<ActionRow title="Ejercicios (JSON)" description="Importa solo ejercicios desde un archivo JSON" status={exercisesImportStatus} {accent}>
  {#snippet button()}
    <input type="file" accept=".json" style="display:none" onchange={onexercisesimport} />
    <Button size="sm" onclick={(e) => ((e.target as HTMLElement).previousElementSibling as HTMLInputElement)?.click()}>Importar</Button>
  {/snippet}
</ActionRow>
<ActionRow title="Logs+ajustes JSON" description="Restaura toda la base de datos desde un JSON" status={jsonImportStatus} {accent}>
  {#snippet button()}
    <input type="file" accept=".json" style="display:none" onchange={onlogsimport} />
    <Button size="sm" onclick={(e) => ((e.target as HTMLElement).previousElementSibling as HTMLInputElement)?.click()}>Importar JSON</Button>
  {/snippet}
</ActionRow>

