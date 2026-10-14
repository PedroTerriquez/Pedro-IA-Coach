<script lang="ts">
  import * as Storage from '$lib/storage'
  import { fileKindLabel, readJsonFile, takeFile, type ResultInfo } from '$lib/you-data'
  import ResultSheet from './ResultSheet.svelte'

  // «Importar ejercicios»: hidden file input + result sheet. Never overwrites:
  // an exercise you already have (same id or name) stays as it was.
  let { onchanged }: { onchanged: () => void } = $props()

  let inputEl: HTMLInputElement | null = $state(null)
  let open = $state(false)
  let result = $state<ResultInfo | null>(null)

  export function pick() {
    inputEl?.click()
  }

  function failure(file: File): ResultInfo {
    return {
      ok: false,
      heading: 'No se pudo importar',
      text: 'El archivo no tiene ejercicios. Usa el que sale de «Exportar ejercicios».',
      file: { name: file.name, meta: fileKindLabel(file) },
    }
  }

  async function importFile(file: File): Promise<ResultInfo> {
    try {
      const { data } = await readJsonFile(file)
      const { added, skipped } = await Storage.importExercisesKeepingExisting(data)
      onchanged()
      return {
        ok: true,
        heading: `${added + skipped} ${added + skipped === 1 ? 'ejercicio' : 'ejercicios'} en el archivo`,
        rows: [{ label: 'Nuevos', value: added }, { label: 'Ya los tenías', value: skipped, sub: 'Se quedaron como estaban' }],
      }
    } catch {
      return failure(file)
    }
  }

  async function onchange(e: Event) {
    const file = takeFile(e)
    if (!file) return
    result = await importFile(file)
    open = true
  }
</script>

<input bind:this={inputEl} id="import-exercises-input" type="file" accept=".json,application/json" hidden {onchange} />
<ResultSheet bind:open title="Importar ejercicios" {result} retryLabel="Elegir otro archivo" onretry={() => { open = false; pick() }} />
