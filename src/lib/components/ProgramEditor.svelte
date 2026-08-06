<script lang="ts">
  import type { Program, ProgramWeek, ProgramDay, ProgramExercise } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { generateId } from '$lib/db'
  import { toast } from '$lib/stores/ui'
  import { settings } from '$lib/stores/settings'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'

  let {
    open = $bindable(false),
    program = null,
    accent = 'var(--accent)',
    onsave = () => {}
  }: {
    open: boolean
    program: Program | null
    accent?: string
    onsave?: () => void
  } = $props()

  const isNew = $derived(!program)

  let progName = $state('')
  let weeks = $state<{ name: string; tag: string; days: { name: string; duration: number; exercises: { name: string; sets: number; reps: string; rest: number }[] }[] }[]>([])
  let allExerciseNames = $state<string[]>([])

  $effect(() => {
    if (open) initEditor()
  })

  async function initEditor() {
    const exs = await Storage.getExercises()
    allExerciseNames = exs.map(e => e.name)
    const idToName: Record<string, string> = {}
    for (const e of exs) idToName[e.id] = e.name

    if (program) {
      progName = program.name
      weeks = program.weeks.map(w => ({
        name: w.name,
        tag: w.tag || '',
        days: w.days.map(d => ({
          name: d.name,
          duration: d.duration || 60,
          exercises: d.exercises.map(ex => ({
            name: idToName[ex.exerciseId] || '',
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest
          }))
        }))
      }))
    } else {
      progName = ''
      weeks = [{ name: 'Semana 1', tag: '', days: [{ name: 'Día', duration: 60, exercises: [] }] }]
    }
  }

  function addWeek() {
    weeks = [...weeks, { name: `Semana ${weeks.length + 1}`, tag: '', days: [] }]
  }

  function removeWeek(i: number) {
    weeks = weeks.filter((_, idx) => idx !== i)
  }

  function addDay(weekIdx: number) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: [...w.days, { name: `Día ${w.days.length + 1}`, duration: 60, exercises: [] }] }
      : w
    )
  }

  function removeDay(weekIdx: number, dayIdx: number) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: w.days.filter((_, di) => di !== dayIdx) }
      : w
    )
  }

  function addExercise(weekIdx: number, dayIdx: number) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: w.days.map((d, di) => di === dayIdx
        ? { ...d, exercises: [...d.exercises, { name: '', sets: 3, reps: '10', rest: 60 }] }
        : d
      ) }
      : w
    )
  }

  function removeExercise(weekIdx: number, dayIdx: number, exIdx: number) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: w.days.map((d, di) => di === dayIdx
        ? { ...d, exercises: d.exercises.filter((_, ei) => ei !== exIdx) }
        : d
      ) }
      : w
    )
  }

  function updateWeek(weekIdx: number, patch: Partial<{ name: string; tag: string }>) {
    weeks = weeks.map((w, wi) => wi === weekIdx ? { ...w, ...patch } : w)
  }

  function updateDay(weekIdx: number, dayIdx: number, patch: Partial<{ name: string; duration: number }>) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: w.days.map((d, di) => di === dayIdx ? { ...d, ...patch } : d) }
      : w
    )
  }

  function updateExercise(weekIdx: number, dayIdx: number, exIdx: number, patch: Partial<{ name: string; sets: number; reps: string; rest: number }>) {
    weeks = weeks.map((w, wi) => wi === weekIdx
      ? { ...w, days: w.days.map((d, di) => di === dayIdx
        ? { ...d, exercises: d.exercises.map((ex, ei) => ei === exIdx ? { ...ex, ...patch } : ex) }
        : d
      ) }
      : w
    )
  }

  async function save() {
    const name = progName.trim() || 'Programa sin nombre'
    const exs = await Storage.getExercises()
    const nameToId: Record<string, string> = {}
    for (const e of exs) nameToId[e.name.toLowerCase()] = e.id

    const resolvedWeeks: ProgramWeek[] = []
    for (const w of weeks) {
      const days: ProgramDay[] = []
      for (const d of w.days) {
        const exercises: ProgramExercise[] = []
        for (const ex of d.exercises) {
          const exName = ex.name.trim()
          if (!exName) continue
          let exId = nameToId[exName.toLowerCase()]
          if (!exId) {
            const created = await Storage.findOrCreateExerciseByName(exName, '')
            exId = created.id
            nameToId[exName.toLowerCase()] = exId
          }
          exercises.push({ exerciseId: exId, sets: ex.sets, reps: ex.reps, rest: ex.rest })
        }
        days.push({ name: d.name, subtitle: '', duration: d.duration, exercises })
      }
      resolvedWeeks.push({ name: w.name, subtitle: '', tag: w.tag, days })
    }

    const prog: Program = {
      id: program?.id || await generateId(),
      name,
      weeks: resolvedWeeks
    }
    await Storage.saveProgram(prog)

    const currentSettings = await Storage.getSettings()
    if (!currentSettings.onboarded && (currentSettings.onboardingStep ?? 0) <= 1) {
      await settings.update({ onboardingStep: 2 })
    }

    open = false
    toast.show(isNew ? 'Programa creado' : 'Programa guardado')
    onsave()
  }
</script>

<Sheet bind:open onclose={() => open = false}>
  {#snippet header()}
    <span>{isNew ? 'Nuevo programa' : 'Editar programa'}</span>
  {/snippet}

  <div class="editor-body">
    <TextInput bind:value={progName} placeholder="Nombre del programa" />

    {#each weeks as week, wi}
      <div class="week-block">
        <div class="week-header">
          <TextInput bind:value={week.name} placeholder="Nombre semana" compact style="flex:1" />
          <TextInput bind:value={week.tag} placeholder="ETIQUETA" compact style="width:70px;text-transform:uppercase;font-size:10px" />
          <button class="icon-del" onclick={() => removeWeek(wi)} aria-label="Eliminar semana">✕</button>
        </div>

        {#each week.days as day, di}
          <div class="day-block">
            <div class="day-header">
              <TextInput bind:value={day.name} placeholder="Día" compact style="flex:1" />
              <input class="ex-num-input" type="number" value={day.duration} placeholder="min" style="width:50px"
                oninput={(e) => updateDay(wi, di, { duration: parseInt((e.target as HTMLInputElement).value) || 60 })} />
              <button class="icon-del sm" onclick={() => removeDay(wi, di)} aria-label="Eliminar día">✕</button>
            </div>

            {#each day.exercises as ex, ei}
              <div class="ex-row">
                <input
                  class="ex-name-input"
                  list="prog-ex-names"
                  value={ex.name}
                  placeholder="Nombre ej."
                  oninput={(e) => updateExercise(wi, di, ei, { name: (e.target as HTMLInputElement).value })}
                />
                <input class="ex-num-input" type="number" value={ex.sets} placeholder="S"
                  oninput={(e) => updateExercise(wi, di, ei, { sets: parseInt((e.target as HTMLInputElement).value) || 3 })} />
                <input class="ex-num-input" value={ex.reps} placeholder="R"
                  oninput={(e) => updateExercise(wi, di, ei, { reps: (e.target as HTMLInputElement).value })} />
                <input class="ex-num-input" type="number" value={ex.rest} placeholder="Desc"
                  oninput={(e) => updateExercise(wi, di, ei, { rest: parseInt((e.target as HTMLInputElement).value) || 60 })} />
                <button class="icon-del sm" onclick={() => removeExercise(wi, di, ei)} aria-label="Eliminar ejercicio">✕</button>
              </div>
            {/each}

            <button class="add-btn" onclick={() => addExercise(wi, di)}>+ Añadir ejercicio</button>
          </div>
        {/each}

        <button class="add-btn" onclick={() => addDay(wi)}>+ Añadir día</button>
      </div>
    {/each}

    <button class="add-btn week-add" onclick={addWeek}>+ Añadir semana</button>

    <datalist id="prog-ex-names">
      {#each allExerciseNames as name}
        <option value={name}></option>
      {/each}
    </datalist>

    <div class="editor-actions">
      <Button variant="primary" {accent} fullWidth onclick={save}>{isNew ? 'Crear' : 'Guardar'}</Button>
      <Button variant="secondary" fullWidth onclick={() => open = false}>Cancelar</Button>
    </div>
  </div>
</Sheet>

<style>
  .editor-body {
    padding: 4px 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .week-block {
    background: rgba(255,255,255,0.03);
    border-radius: 14px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .week-header {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .day-block {
    background: rgba(255,255,255,0.02);
    border-radius: 10px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .day-header {
    display: flex;
    gap: 6px;
    align-items: center;
  }

  .ex-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 5px 0;
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
  }

  .ex-name-input {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
    border-radius: 6px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: var(--text);
    font-size: 11px;
    font-family: var(--font-sans);
    outline: none;
    box-sizing: border-box;
  }

  .ex-num-input {
    width: 44px;
    padding: 8px 4px;
    border-radius: 8px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: var(--text);
    font-size: 13px;
    font-family: var(--font-mono);
    text-align: center;
    outline: none;
    box-sizing: border-box;
  }

  .add-btn {
    margin-top: 4px;
    width: 100%;
    padding: 8px;
    border-radius: 8px;
    border: 0.5px dashed rgba(255,255,255,0.12);
    cursor: pointer;
    background: transparent;
    color: rgba(255,255,255,0.4);
    font-size: 12px;
    font-family: var(--font-sans);
    touch-action: manipulation;
  }

  .week-add {
    border-color: rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }

  .icon-del {
    background: none;
    border: 0;
    color: #ff6b6b;
    cursor: pointer;
    font-size: 14px;
    padding: 4px;
    flex-shrink: 0;
    line-height: 1;
  }

  .icon-del.sm {
    font-size: 12px;
    padding: 2px 4px;
  }

  .editor-actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
</style>
