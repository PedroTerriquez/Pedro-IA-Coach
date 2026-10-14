<script lang="ts">
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { settings } from '$lib/stores/settings'
  import { saveBackup, restoreBackup, exportExercises, sortWithDictionary } from '$lib/backup-actions'
  import { takeFile, type ResultInfo } from '$lib/you-data'
  import { plural } from '$lib/program-utils'
  import YouScreen from './YouScreen.svelte'
  import SubpageHeader from './SubpageHeader.svelte'
  import NavGroup from './NavGroup.svelte'
  import NavRow from './NavRow.svelte'
  import NextStepDock from './NextStepDock.svelte'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import Sheet from './Sheet.svelte'
  import ResultSheet from './ResultSheet.svelte'
  import ExerciseImporter from './ExerciseImporter.svelte'
  import DebugSheet from './DebugSheet.svelte'

  let { exerciseCount, onchanged, onunmatched, onback }: {
    exerciseCount: number
    onchanged: () => void
    /** «Sin coincidencia» of the dictionary result */
    onunmatched: (names: string[]) => void
    onback: () => void
  } = $props()

  type Action = 'guardar' | 'restaurar' | 'exportar' | 'diccionario'
  const TITLES: Record<Action, string> = {
    guardar: 'Guardar copia',
    restaurar: 'Restaurar una copia',
    exportar: 'Exportar ejercicios',
    diccionario: 'Ordenar con el diccionario',
  }

  let restoreInput: HTMLInputElement | null = $state(null)
  let importer: ExerciseImporter | null = $state(null)
  let restoreAskOpen = $state(false)
  let dictAskOpen = $state(false)
  let debugOpen = $state(false)
  let resultOpen = $state(false)
  let action = $state<Action>('guardar')
  let result = $state<ResultInfo | null>(null)
  let skippedNames = $state<string[]>([])

  function show(a: Action, r: ResultInfo) {
    action = a
    result = r
    resultOpen = true
  }

  async function runSave() {
    show('guardar', await saveBackup())
  }

  async function saveFirst() {
    restoreAskOpen = false
    dictAskOpen = false
    await runSave()
  }

  function chooseRestoreFile() {
    restoreAskOpen = false
    resultOpen = false
    restoreInput?.click()
  }

  async function onRestoreFile(e: Event) {
    const file = takeFile(e)
    if (!file) return
    const r = await restoreBackup(file)
    if (r.ok) { await settings.load(); onchanged() }
    show('restaurar', r)
  }

  async function runExport() {
    show('exportar', await exportExercises())
  }

  async function runDictionary() {
    dictAskOpen = false
    const { result: r, skippedNames: names } = await sortWithDictionary()
    skippedNames = names
    onchanged()
    show('diccionario', r)
  }

  function retry() {
    if (action === 'restaurar') chooseRestoreFile()
    else if (action === 'exportar') runExport()
    else if (action === 'guardar') runSave()
    else runDictionary()
  }

  function primary() {
    resultOpen = false
    if (action === 'restaurar') goto(ROUTES.today)
  }

  function openUnmatched() {
    resultOpen = false
    onunmatched(skippedNames)
  }
</script>

<YouScreen id="you-copia">
  <SubpageHeader title="Copia de seguridad" lead="Tus datos viven solo en este teléfono. Guarda una copia cada 2 semanas." {onback} />

  <NavGroup>
    <NavRow id="restore-row" label="Restaurar una copia" sub="Agrega lo del archivo a este teléfono" onclick={() => restoreAskOpen = true} />
  </NavGroup>

  <NavGroup label="Solo ejercicios">
    <NavRow id="export-exercises-row" label="Exportar ejercicios" onclick={runExport} />
    <NavRow id="import-exercises-row" label="Importar ejercicios" onclick={() => importer?.pick()} />
  </NavGroup>

  <NavGroup label="Mantenimiento">
    <NavRow id="dictionary-row" label="Sincronizar con el diccionario" sub="Cambia nombre, músculo, imagen, consejos y alternativas por los del diccionario" disabled={!exerciseCount} onclick={() => dictAskOpen = true} />
    <NavRow id="debug-row" label="Modo debug de IA" sub="Para desarrolladores" value={$settings.debugAI ? 'Activado' : undefined} onclick={() => debugOpen = true} />
  </NavGroup>

  <NextStepDock caption="Entrenos, programas, ejercicios y ajustes">
    <Button size="lg" variant="primary" id="save-backup-btn" onclick={runSave}><Icon name="save" size={18} />Guardar copia</Button>
  </NextStepDock>
</YouScreen>

<input bind:this={restoreInput} id="restore-file-input" type="file" accept=".json,application/json" hidden onchange={onRestoreFile} />
<ExerciseImporter bind:this={importer} {onchanged} />

<Sheet bind:open={restoreAskOpen} title="¿Restaurar una copia?" id="restore-sheet">
  <p class="note">Agrega lo del archivo y actualiza lo que ya tienes. Lo que no viene en el archivo se queda.</p>
  <div class="stack">
    <Button size="lg" variant="secondary" onclick={saveFirst}><Icon name="save" size={18} />Guardar copia primero</Button>
    <Button size="lg" variant="danger" onclick={chooseRestoreFile}>Elegir archivo y restaurar</Button>
  </div>
  <Button size="lg" variant="text" style="align-self:center;margin:-10px 0 -14px" onclick={() => restoreAskOpen = false}>Cancelar</Button>
</Sheet>

<Sheet bind:open={dictAskOpen} title="¿Sincronizar con el diccionario?" id="dictionary-sheet">
  <p class="note">Busca tus {plural(exerciseCount, 'ejercicio', 'ejercicios')} en el diccionario y cambia su nombre, músculo, imagen, consejos y alternativas por los de ahí. Lo que personalizaste en ellos se reemplaza. Tus registros no se tocan.</p>
  <div class="stack">
    <Button size="lg" variant="secondary" onclick={saveFirst}><Icon name="save" size={18} />Guardar copia primero</Button>
    <Button size="lg" variant="danger" onclick={runDictionary}>Ordenar {plural(exerciseCount, 'ejercicio', 'ejercicios')}</Button>
  </div>
  <Button size="lg" variant="text" style="align-self:center;margin:-10px 0 -14px" onclick={() => dictAskOpen = false}>Cancelar</Button>
</Sheet>

<ResultSheet
  bind:open={resultOpen}
  title={TITLES[action]}
  {result}
  primaryLabel={action === 'restaurar' ? 'Ir a Hoy' : 'Listo'}
  retryLabel={action === 'restaurar' ? 'Elegir otro archivo' : 'Intentar otra vez'}
  onprimary={primary}
  onretry={retry}
>
  {#if action === 'diccionario' && skippedNames.length}
    <NavGroup tone="sheet">
      <NavRow id="unmatched-row" label="Sin coincidencia" value={skippedNames.length} onclick={openUnmatched} />
    </NavGroup>
  {/if}
</ResultSheet>

<DebugSheet bind:open={debugOpen} />

<style>
  .note { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
</style>
