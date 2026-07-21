<script lang="ts">
  import ActionRow from './ActionRow.svelte'

  let {
    accent = '#d4ff3a',
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
    <button onclick={(e) => ((e.target as HTMLElement).previousElementSibling as HTMLInputElement)?.click()} class="btn-accent-sm">Importar</button>
  {/snippet}
</ActionRow>
<ActionRow title="Logs+ajustes JSON" description="Restaura toda la base de datos desde un JSON" status={jsonImportStatus} {accent}>
  {#snippet button()}
    <input type="file" accept=".json" style="display:none" onchange={onlogsimport} />
    <button onclick={(e) => ((e.target as HTMLElement).previousElementSibling as HTMLInputElement)?.click()} class="btn-accent-sm">Importar JSON</button>
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
