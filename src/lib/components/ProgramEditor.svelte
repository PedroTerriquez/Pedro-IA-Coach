<script lang="ts">
  import type { Exercise, Program } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { generateId } from '$lib/db'
  import { toast } from '$lib/stores/ui'
  import { settings } from '$lib/stores/settings'
  import { markFirstProgramCreated } from '$lib/profile'
  import { emptyDraft, toDraft, dayMeta, exerciseSummary, resolveDraft, NEW_EXERCISE, type DraftExercise, type DraftWeek } from '$lib/program-editor'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'
  import Icon from './Icon.svelte'
  import IconButton from './IconButton.svelte'
  import NavRow from './NavRow.svelte'
  import Tag from './Tag.svelte'
  import EmptyState from './EmptyState.svelte'
  import InlineConfirm from './InlineConfirm.svelte'
  import ProgramWeekSheet from './ProgramWeekSheet.svelte'
  import ProgramDaySheet from './ProgramDaySheet.svelte'
  import ProgramExerciseSheet from './ProgramExerciseSheet.svelte'

  let {
    open = $bindable(false),
    program = null,
    onsave = () => {}
  }: {
    open: boolean
    program: Program | null
    accent?: string
    onsave?: (program: Program) => void
  } = $props()

  const isNew = $derived(!program)

  let progName = $state('')
  let nameError = $state('')
  let weeks = $state<DraftWeek[]>([])
  let library = $state<Exercise[]>([])

  // Which sub-sheet is open and on what
  let weekEdit = $state<{ wi: number } | null>(null)
  let dayEdit = $state<{ wi: number; di: number } | null>(null)
  let exEdit = $state<{ wi: number; di: number; ei: number | null } | null>(null)
  let removing = $state<{ wi: number; di: number; ei: number } | null>(null)
  let weekSheetOpen = $state(false)
  let daySheetOpen = $state(false)
  let exSheetOpen = $state(false)

  $effect(() => {
    if (open) initEditor()
  })

  // The name is set right away so typing never races the async exercise load
  async function initEditor() {
    const source = program
    progName = source?.name || ''
    nameError = ''
    removing = null
    if (!source) weeks = emptyDraft()
    library = (await Storage.getExercises()).sort((a, b) => a.name.localeCompare(b.name, 'es'))
    if (!source) return
    const idToName: Record<string, string> = {}
    for (const e of library) idToName[e.id] = e.name
    weeks = toDraft(source, idToName)
  }

  function openWeek(wi: number) {
    weekEdit = { wi }
    weekSheetOpen = true
  }

  function openDay(wi: number, di: number) {
    dayEdit = { wi, di }
    daySheetOpen = true
  }

  function openExercise(wi: number, di: number, ei: number | null) {
    exEdit = { wi, di, ei }
    exSheetOpen = true
  }

  function addWeek() {
    weeks.push({ name: `Semana ${weeks.length + 1}`, tag: '', days: [] })
  }

  function addDay(wi: number) {
    const days = weeks[wi].days
    days.push({ name: `Día ${days.length + 1}`, exercises: [] })
    openDay(wi, days.length - 1)
  }

  function saveWeek(patch: { name: string; tag: string }) {
    if (!weekEdit) return
    Object.assign(weeks[weekEdit.wi], patch)
    weekSheetOpen = false
  }

  function removeWeek() {
    if (!weekEdit) return
    weeks.splice(weekEdit.wi, 1)
    weekSheetOpen = false
  }

  function saveDay(patch: { name: string; weekday?: number }) {
    if (!dayEdit) return
    const day = weeks[dayEdit.wi].days[dayEdit.di]
    day.name = patch.name
    day.weekday = patch.weekday
    daySheetOpen = false
  }

  function removeDay() {
    if (!dayEdit) return
    weeks[dayEdit.wi].days.splice(dayEdit.di, 1)
    daySheetOpen = false
  }

  function saveExercise(ex: DraftExercise) {
    if (!exEdit) return
    const list = weeks[exEdit.wi].days[exEdit.di].exercises
    if (exEdit.ei === null) list.push(ex)
    else list[exEdit.ei] = ex
    exSheetOpen = false
  }

  function confirmRemoveExercise() {
    if (!removing) return
    weeks[removing.wi].days[removing.di].exercises.splice(removing.ei, 1)
    removing = null
  }

  function isRemoving(wi: number, di: number, ei: number): boolean {
    return removing?.wi === wi && removing?.di === di && removing?.ei === ei
  }

  async function activateIfNone(id: string) {
    const s = await Storage.getSettings()
    if (!s.activeProgramId) await settings.update({ activeProgramId: id, currentWeekIdx: 0 })
  }

  async function save() {
    const name = progName.trim()
    if (!name) { nameError = 'Ponle un nombre para guardarlo.'; return }
    const prog: Program = {
      id: program?.id || await generateId(),
      name,
      weeks: await resolveDraft($state.snapshot(weeks)),
      createdAt: program?.createdAt || new Date().toISOString()
    }
    await Storage.saveProgram(prog)
    if (isNew) await activateIfNone(prog.id)
    await markFirstProgramCreated()
    open = false
    toast.show(isNew ? 'Programa creado' : 'Programa guardado')
    onsave(prog)
  }

  let currentWeek = $derived(weekEdit ? weeks[weekEdit.wi] ?? null : null)
  let currentDay = $derived(dayEdit ? weeks[dayEdit.wi]?.days[dayEdit.di] ?? null : null)
  let currentEx = $derived(exEdit ? (exEdit.ei === null ? NEW_EXERCISE : weeks[exEdit.wi]?.days[exEdit.di]?.exercises[exEdit.ei] ?? null) : null)
</script>

<Sheet bind:open full title={isNew ? 'Nuevo programa' : 'Editar programa'} id="program-editor">
  <TextInput
    variant="field"
    label="Nombre del programa"
    placeholder="Ej: Torso / Pierna"
    bind:value={progName}
    error={nameError}
    oninput={() => nameError = ''}
  />

  {#each weeks as week, wi}
    <section class="wk" data-week={wi}>
      <button type="button" class="wkh" onclick={() => openWeek(wi)}>
        <span class="wkh-n">{week.name}</span>
        {#if week.tag}<Tag>{week.tag}</Tag>{/if}
        <span class="chev"><Icon name="chev" size={16} /></span>
      </button>

      {#if week.days.length === 0}
        <EmptyState title="Aún no hay días" text="Agrega un día y luego sus ejercicios. La duración se calcula sola.">
          {#snippet actions()}
            <Button size="lg" variant="secondary" onclick={() => addDay(wi)}><Icon name="plus" size={18} />Añadir día</Button>
          {/snippet}
        </EmptyState>
      {:else}
        {#each week.days as day, di}
          <div class="dg" data-component="ProgramEditorDay">
            <NavRow label={day.name} sub={dayMeta(day)} strong onclick={() => openDay(wi, di)} />
            {#each day.exercises as ex, ei}
              {#if isRemoving(wi, di, ei)}
                <InlineConfirm
                  flat
                  title="¿Quitar {ex.name} de {day.name}?"
                  text="Se quita de este día. Tus registros no se tocan."
                  confirmLabel="Quitar"
                  oncancel={() => removing = null}
                  onconfirm={confirmRemoveExercise}
                />
              {:else}
                <div class="er">
                  <button type="button" class="er-main" onclick={() => openExercise(wi, di, ei)}>
                    <span class="er-n">{ex.name || 'Sin nombre'}</span>
                    <span class="er-v">{exerciseSummary(ex)}</span>
                  </button>
                  <IconButton icon="x" size="sm" iconSize={16} label="Quitar {ex.name}" onclick={() => removing = { wi, di, ei }} />
                </div>
              {/if}
            {/each}
            <button type="button" class="nr-add" onclick={() => openExercise(wi, di, null)}><Icon name="plus" size={18} />Añadir ejercicio</button>
          </div>
        {/each}
        <Button size="lg" variant="dashed" onclick={() => addDay(wi)}><Icon name="plus" size={18} />Añadir día</Button>
      {/if}
    </section>
  {/each}

  <Button size="lg" variant="secondary" onclick={addWeek}><Icon name="plus" size={18} />Añadir semana</Button>

  {#snippet footer()}
    <Button size="lg" variant="primary" onclick={save}>Guardar</Button>
    <Button size="lg" variant="text" style="align-self:center" onclick={() => open = false}>Cancelar</Button>
  {/snippet}
</Sheet>

<ProgramWeekSheet bind:open={weekSheetOpen} week={currentWeek} onsave={saveWeek} onremove={removeWeek} />
<ProgramDaySheet bind:open={daySheetOpen} day={currentDay} weekName={dayEdit ? weeks[dayEdit.wi]?.name ?? '' : ''} onsave={saveDay} onremove={removeDay} />
<ProgramExerciseSheet bind:open={exSheetOpen} exercise={currentEx} {library} onsave={saveExercise} />

<style>
  .wk { display: flex; flex-direction: column; gap: 10px; }
  .wkh {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 44px;
    padding: 0 4px;
    border: 0;
    background: none;
    color: var(--text);
    cursor: pointer;
  }
  .wkh-n { font-size: 17px; font-weight: 600; letter-spacing: -0.2px; white-space: nowrap; }
  .chev { margin-left: auto; display: grid; color: var(--text-muted); }
  .dg { display: flex; flex-direction: column; border-radius: var(--radius-xl); overflow: hidden; background: var(--cv-fill-1); }
  .dg > :global(* + *) { border-top: 0.5px solid var(--border-medium); }
  .er { display: grid; grid-template-columns: minmax(0, 1fr) 44px; align-items: center; gap: 4px; min-height: 56px; padding: 4px 2px 4px 0; }
  .er-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
    min-height: 48px;
    padding: 0 0 0 16px;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .er-n { font-size: 16px; font-weight: 500; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .er-v { font-family: var(--font-mono); font-size: 14px; color: var(--text-secondary); white-space: nowrap; }
  .nr-add {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 56px;
    padding: 0 16px;
    border: 0;
    background: none;
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
  }
</style>
