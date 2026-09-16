<script lang="ts">
  import type { Program, ProgramWeek, ProgramDay, ProgramExercise } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { generateId } from '$lib/db'
  import { toast } from '$lib/stores/ui'
  import { settings } from '$lib/stores/settings'
  import Sheet from './Sheet.svelte'
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'
  import DeleteButton from './DeleteButton.svelte'

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
  let weeks = $state<{ name: string; tag: string; days: { name: string; duration: number; weekday?: number; exercises: { name: string; sets: number; reps: string; rest: number }[] }[] }[]>([])
  let allExerciseNames = $state<string[]>([])

  const WEEKDAY_OPTS = [
    { v: 1, l: 'Lun' }, { v: 2, l: 'Mar' }, { v: 3, l: 'Mié' }, { v: 4, l: 'Jue' },
    { v: 5, l: 'Vie' }, { v: 6, l: 'Sáb' }, { v: 7, l: 'Dom' },
  ]

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
          ...(typeof (d as any).weekday === 'number' ? { weekday: (d as any).weekday } : {}),
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

  function updateDay(weekIdx: number, dayIdx: number, patch: Partial<{ name: string; duration: number; weekday: number | undefined }>) {
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
        days.push({
          name: d.name,
          subtitle: '',
          duration: d.duration,
          exercises,
          ...(typeof d.weekday === 'number' && d.weekday >= 1 && d.weekday <= 7 ? { weekday: d.weekday } : {}),
        })
      }
      resolvedWeeks.push({ name: w.name, subtitle: '', tag: w.tag, days })
    }

    const prog: Program = {
      id: program?.id || await generateId(),
      name,
      weeks: resolvedWeeks,
      createdAt: program?.createdAt || new Date().toISOString()
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
          <DeleteButton label="Eliminar semana" onclick={() => removeWeek(wi)} />
        </div>

        {#each week.days as day, di}
          <div class="day-block">
            <div class="day-header">
              <TextInput bind:value={day.name} placeholder="Día" compact style="flex:1" />
              <select class="weekday-select" value={day.weekday ?? ''} title="Día de la semana"
                onchange={(e) => updateDay(wi, di, { weekday: e.currentTarget.value === '' ? undefined : Number(e.currentTarget.value) })}>
                <option value="">Auto</option>
                {#each WEEKDAY_OPTS as o}<option value={o.v}>{o.l}</option>{/each}
              </select>
              <TextInput type="number" mono compact value={String(day.duration)} placeholder="min" style="width:50px;text-align:center"
                oninput={(v) => updateDay(wi, di, { duration: parseInt(v) || 60 })} />
              <DeleteButton size="sm" label="Eliminar día" onclick={() => removeDay(wi, di)} />
            </div>

            {#each day.exercises as ex, ei}
              <div class="ex-row">
                <TextInput
                  compact
                  list="prog-ex-names"
                  value={ex.name}
                  placeholder="Nombre ej."
                  style="flex:1;min-width:0;font-size:11px"
                  oninput={(v) => updateExercise(wi, di, ei, { name: v })}
                />
                <TextInput type="number" mono compact value={String(ex.sets)} placeholder="S" style="width:44px;text-align:center"
                  oninput={(v) => updateExercise(wi, di, ei, { sets: parseInt(v) || 3 })} />
                <TextInput mono compact value={ex.reps} placeholder="R" style="width:44px;text-align:center"
                  oninput={(v) => updateExercise(wi, di, ei, { reps: v })} />
                <TextInput type="number" mono compact value={String(ex.rest)} placeholder="Desc" style="width:44px;text-align:center"
                  oninput={(v) => updateExercise(wi, di, ei, { rest: parseInt(v) || 60 })} />
                <DeleteButton size="sm" label="Eliminar ejercicio" onclick={() => removeExercise(wi, di, ei)} />
              </div>
            {/each}

            <Button variant="dashed" style="margin-top:4px" onclick={() => addExercise(wi, di)}>+ Añadir ejercicio</Button>
          </div>
        {/each}

        <Button variant="dashed" style="margin-top:4px" onclick={() => addDay(wi)}>+ Añadir día</Button>
      </div>
    {/each}

    <Button variant="dashed" style="margin-top:12px" onclick={addWeek}>+ Añadir semana</Button>

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

  .weekday-select {
    width: 52px;
    padding: 8px 2px;
    border-radius: 8px;
    border: 0.5px solid rgba(255,255,255,0.08);
    background: var(--bg);
    color: var(--text);
    font-size: 11px;
    font-family: var(--font-mono);
    text-align: center;
    outline: none;
    box-sizing: border-box;
    -webkit-appearance: none;
    appearance: none;
  }

  .ex-row {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 5px 0;
    border-bottom: 0.5px solid rgba(255,255,255,0.04);
  }







  .editor-actions {
    display: flex;
    gap: 10px;
    margin-top: 4px;
  }
</style>
