<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { online } from '$lib/stores/network'
  import * as Storage from '$lib/storage'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { formatWeight } from '$lib/exercise-history'
  import { muscleLabel } from '$lib/exercise-utils'
  import { isTrained } from '$lib/streak'
  import { startRestFromExercise } from '$lib/rest-timer'
  import { detailPosition, nextInList } from '$lib/session-steps'
  import { makeDayStatusFn, toLocalDateStr } from '$lib/calendar-utils'
  import {
    dayEntries, plannedRows, panelKind, dayLabel, rowsSummary, primaryMuscle,
    monthStart, addMonths, monthTitle, monthBounds, initialDay, calendarCells, monthCountLabel,
    whenLabel, deltaLabel, progressRows, listLabel, historyDock,
    type DayRec, type PanelRow, type PanelKind
  } from '$lib/history-view'
  import type { Exercise, ExerciseLog, Program } from '$lib/types'
  import PageHeader from '$lib/components/PageHeader.svelte'
  import IconButton from '$lib/components/IconButton.svelte'
  import MonthCalendar from '$lib/components/MonthCalendar.svelte'
  import HistoryDayPanel from '$lib/components/HistoryDayPanel.svelte'
  import ExerciseProgressRow from '$lib/components/ExerciseProgressRow.svelte'
  import ViewSwitchDock from '$lib/components/ViewSwitchDock.svelte'
  import ChipRow from '$lib/components/ChipRow.svelte'
  import FilterChip from '$lib/components/FilterChip.svelte'
  import Button from '$lib/components/Button.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import EditExerciseSheet, { type ExerciseEdits } from '$lib/components/EditExerciseSheet.svelte'

  const TABS = [{ label: 'Días', value: 'days' }, { label: 'Ejercicios', value: 'exercises' }]
  const GHOST_ROWS = 3
  const today = new Date()

  let loaded = $state(false)
  let exercises = $state<Exercise[]>([])
  let logs = $state<ExerciseLog[]>([])
  let programs = $state<Program[]>([])
  let tab = $state('days')
  let selected = $state(today)
  let viewMonth = $state(monthStart(today))
  let justMarked = $state(false)
  let muscle = $state('')
  let editing = $state(false)
  let editId = $state<string | null>(null)
  let editOpen = $state(false)

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)
  let detailDayName = $state('')

  let units = $derived($settings.units || 'kg')
  let language = $derived($settings.language)
  let program = $derived(programs.find(p => p.id === $settings.activeProgramId && p.weeks?.length) || null)
  let exercisesMap = $derived(Object.fromEntries(exercises.map(e => [e.id, e])) as Record<string, Exercise>)
  let logsByDate = $derived(groupByDate(logs))
  let hasLogs = $derived(logs.some(isTrained))
  let bounds = $derived(monthBounds(logs, today))

  // ── Días ──
  let statusFn = $derived(program
    ? makeDayStatusFn(today, logsByDate, program, program.weeks.length, $settings.currentWeekIdx || 0, exercisesMap, language, ($settings.rescheduleWeekOrder || {}) as Record<string, number[]>)
    : null)
  let grid = $derived.by(() => {
    const fn = statusFn
    return calendarCells(viewMonth, fn ? (d) => fn(d).status : null, selected, today)
  })
  let rec = $derived<DayRec | null>(statusFn ? statusFn(selected) : null)
  let kind = $derived<PanelKind>(rec ? panelKind(rec, today, !hasLogs) : 'none')
  let panel = $derived(rec ? panelView(rec, kind) : null)

  // ── Ejercicios ──
  let rows = $derived(progressRows(exercises, logs))
  let muscles = $derived([...new Set(rows.map(r => primaryMuscle(r.exercise.muscle)).filter(Boolean))])
  let shown = $derived(muscle ? rows.filter(r => primaryMuscle(r.exercise.muscle) === muscle) : rows)
  let editExercise = $derived(exercises.find(e => e.id === editId) ?? null)
  let editLogCount = $derived(editId ? logs.filter(l => l.exerciseId === editId).length : 0)

  let dock = $derived(historyDock({ tab: tab === 'days' ? 'days' : 'exercises', hasProgram: !!program, hasLogs, offline: !$online, kind, justMarked }))

  onMount(async () => {
    await load()
    selected = initialDay(logsByDate, today)
    viewMonth = monthStart(selected)
    loaded = true
  })

  async function load() {
    const [exs, all, progs] = await Promise.all([Storage.getExercises(), Storage.getAllLogs(), Storage.getPrograms()])
    exercises = exs
    logs = all
    programs = progs
  }

  function groupByDate(all: ExerciseLog[]): Map<number, ExerciseLog[]> {
    const map = new Map<number, ExerciseLog[]>()
    for (const l of all) {
      const key = parseInt(l.date.replace(/-/g, ''), 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return map
  }

  // A day trained off the program (a rest day, say) still gets a title
  function dayName(r: DayRec): string {
    return r.day && !r.isRest ? r.day.name : 'Entreno'
  }

  function panelView(r: DayRec, k: PanelKind): { date: string; title: string; sub?: string; text?: string; listLabel?: string; rows: PanelRow[] } {
    const date = dayLabel(r.date)
    switch (k) {
      case 'first':
        return { date: '', title: 'Tu primer entreno aparece aquí', text: 'Cada día que registres se marca en el calendario y al tocarlo ves qué hiciste.', rows: [] }
      case 'done': {
        const done = dayEntries(r, exercisesMap, language)
        return { date, title: dayName(r), sub: rowsSummary(done.map(d => ({ muscle: exercisesMap[d.exerciseId]?.muscle }))), rows: done }
      }
      case 'marked':
        return { date, title: dayName(r), sub: 'Marcado a mano · sin pesos', rows: plannedRows(r, exercisesMap, language).map(p => ({ ...p, right: '' })) }
      case 'today':
        return { date: `Hoy · ${date}`, title: `Hoy toca ${dayName(r)}`, sub: rowsSummary(r.exercises), text: 'Cuando lo registres en Hoy, aparece aquí con tus pesos.', rows: [] }
      case 'missed':
        return { date, title: '¿Lo hiciste y no lo anotaste?', sub: dayName(r), listLabel: 'Lo que tocaba', rows: plannedRows(r, exercisesMap, language) }
      case 'rest':
        return { date, title: 'Descanso', sub: 'Día de recuperación', rows: [] }
      case 'future':
        if (r.isRest) return { date, title: 'Descanso', sub: 'Día de recuperación', rows: [] }
        return { date, title: dayName(r), sub: rowsSummary(r.exercises), listLabel: 'Lo que toca', rows: plannedRows(r, exercisesMap, language) }
      default:
        return { date, title: 'Sin registro', rows: [] }
    }
  }

  function selectDay(date: Date) {
    selected = date
    justMarked = false
  }

  function changeTab() {
    justMarked = false
    editing = false
  }

  async function markAsDone() {
    await Storage.logWeight('__day__', 0, 'kg', undefined, undefined, toLocalDateStr(selected))
    logs = await Storage.getAllLogs()
    justMarked = true
  }

  // ── Detalle ──

  async function openDayDetail(list: PanelRow[], idx: number) {
    detailDayName = rec ? dayName(rec) : ''
    const planned = rec?.exercises || []
    detailExercises = await Promise.all(list.map(async (r) => ({
      ...(exercisesMap[r.exerciseId] || {}),
      exerciseId: r.exerciseId,
      sets: r.sets,
      reps: r.reps,
      rest: (planned.find(e => e.exerciseId === r.exerciseId) as any)?.rest ?? 0,
      logs: await Storage.getLogsForExercise(r.exerciseId),
    })))
    detailIdx = idx
    showDetail = true
  }

  // From the list there is no plan to follow: no target (`sets: 0`)
  function openExerciseDetail(ex: Exercise) {
    detailDayName = ''
    detailExercises = [{ ...ex, exerciseId: ex.id, sets: 0, reps: '', rest: 0, logs: logs.filter(l => l.exerciseId === ex.id) }]
    detailIdx = 0
    showDetail = true
  }

  function onDetailClose() {
    showDetail = false
    detailExercises = []
  }

  async function onDetailLog() {
    if (!detailExercises.length) return
    const exId = detailExercises[detailIdx].exerciseId
    const exLogs = await Storage.getLogsForExercise(exId)
    logs = await Storage.getAllLogs()
    detailExercises = detailExercises.map((e, i) => i === detailIdx ? { ...e, logs: exLogs } : e)
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) detailIdx++
    else if (dir === 'prev' && detailIdx > 0) detailIdx--
  }

  // ── Editar ──

  function startEdit(id: string) {
    editId = id
    editOpen = true
  }

  async function saveEdit(edits: ExerciseEdits) {
    if (!editExercise) return
    await Storage.patchExercise(editExercise.id, $state.snapshot(edits) as ExerciseEdits)
    editOpen = false
    toast.show('Ejercicio actualizado')
    await load()
  }

  async function removeExercise() {
    if (!editExercise) return
    const name = editExercise.name
    await Storage.deleteExercise(editExercise.id)
    editOpen = false
    editId = null
    toast.show(`«${name}» eliminado`, false, 3000)
    await load()
  }

  function dockAction() {
    goto(dock.action === 'you' ? ROUTES.you : ROUTES.today)
  }
</script>

<div class="screen" id="history">
  {#if !loaded}
    <!-- IndexedDB answers in a few ms: nothing to draw meanwhile -->
  {:else if tab === 'days'}
    <PageHeader eyebrow="Historial · {viewMonth.getFullYear()}" title={monthTitle(viewMonth)} sub={program ? monthCountLabel(grid.cells) : 'Sin programa activo'}>
      {#snippet action()}
        {#if program}
          <span class="arrows">
            <IconButton icon="back" size="sm" variant="filled" label="Mes anterior" disabled={viewMonth <= bounds.first} onclick={() => viewMonth = addMonths(viewMonth, -1)} />
            <IconButton icon="chev" size="sm" variant="filled" label="Mes siguiente" disabled={viewMonth >= bounds.last} onclick={() => viewMonth = addMonths(viewMonth, 1)} />
          </span>
        {/if}
      {/snippet}
    </PageHeader>

    <MonthCalendar lead={grid.lead} cells={grid.cells} ghost={!program} onselect={selectDay} />

    {#if !program}
      <HistoryDayPanel kind="noprogram" title="Elige un programa para empezar" />
    {:else if panel}
      <HistoryDayPanel
        {kind}
        date={panel.date}
        title={panel.title}
        sub={panel.sub}
        text={panel.text}
        listLabel={panel.listLabel}
        rows={panel.rows}
        onrow={(i) => openDayDetail(panel!.rows, i)}
        onmark={markAsDone}
        ontoday={() => goto(ROUTES.today)}
      />
    {/if}
  {:else}
    <PageHeader eyebrow="Historial" title="Ejercicios." sub="Tu último peso y cuánto has subido" />

    {#if rows.length === 0}
      <div class="empty">
        <h2>Todavía no hay pesos</h2>
        <p>Cada ejercicio que registres aparece aquí con su último peso y cuánto has subido.</p>
      </div>
      <div class="ghost" aria-hidden="true">
        {#each Array(GHOST_ROWS) as _}<div class="ghost-row"><i style="width:55%"></i><i style="width:30%;height:10px"></i></div>{/each}
      </div>
    {:else}
      <ChipRow layout="scroll">
        <FilterChip variant="choice" active={!muscle} onclick={() => muscle = ''}>Todos</FilterChip>
        {#each muscles as m}
          <FilterChip variant="choice" active={muscle === m} onclick={() => muscle = m}>{m}</FilterChip>
        {/each}
      </ChipRow>

      <div class="list-head">
        <span>{editing ? 'Toca el lápiz para editar' : listLabel(shown.length, muscle)}</span>
        <button type="button" class="link" onclick={() => editing = !editing}>{editing ? 'Listo' : 'Editar'}</button>
      </div>

      <div class="list">
        {#each shown as r (r.exercise.id)}
          <ExerciseProgressRow
            name={getExerciseDisplayName(r.exercise, language) || r.exercise.name}
            sub={[primaryMuscle(r.exercise.muscle), whenLabel(r.progress.lastDate, today)].filter(Boolean).join(' · ')}
            points={r.progress.points}
            last={formatWeight(r.progress.last)}
            {units}
            delta={r.progress.points.length > 1 ? deltaLabel(r.progress.delta, units) : ''}
            {editing}
            onopen={() => openExerciseDetail(r.exercise)}
            onedit={() => startEdit(r.exercise.id)}
          />
        {/each}
      </div>
    {/if}
  {/if}

  {#if loaded}
    <ViewSwitchDock bind:value={tab} options={TABS} label="Vista de Historial" caption={dock.caption} onchange={changeTab}>
      {#if dock.action}
        <Button variant="primary" size="lg" onclick={dockAction}>{dock.label}<Icon name="arrow" size={18} /></Button>
      {/if}
    </ViewSwitchDock>
  {/if}
</div>

<EditExerciseSheet
  bind:open={editOpen}
  exercise={editExercise}
  {exercises}
  muscles={[...new Set(exercises.map(e => muscleLabel(e.muscle)).filter(Boolean))]}
  logCount={editLogCount}
  onsave={saveEdit}
  ondelete={removeExercise}
/>

{#if showDetail && detailExercises.length > 0}
  <ExerciseDetail
    exercise={detailExercises[detailIdx]}
    open={showDetail}
    accent={$settings.accentColor || 'var(--accent)'}
    {units}
    hasPrev={detailIdx > 0}
    hasNext={detailIdx < detailExercises.length - 1}
    positionLabel={detailDayName ? detailPosition(detailDayName, detailIdx, detailExercises.length) : ''}
    nextExercise={nextInList(detailExercises, detailIdx)}
    isToday={false}
    onNavigate={onDetailNavigate}
    onClose={onDetailClose}
    onLog={detailDayName ? onDetailLog : null}
    onStartRest={detailDayName ? startRestFromExercise : null}
  />
{/if}

<style>
  #history { padding: calc(var(--safe-top) + 56px) 20px 104px; display: flex; flex-direction: column; gap: 20px; }
  .arrows { display: flex; gap: 8px; flex-shrink: 0; }
  .list-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: -4px 4px -8px; font-size: 13px; color: var(--text-tertiary); }
  .link { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--text); font-family: var(--font-sans); font-size: 15px; font-weight: 600; cursor: pointer; }
  .list { display: flex; flex-direction: column; gap: 8px; }
  .empty { display: flex; flex-direction: column; gap: 12px; padding: 24px 20px; border-radius: var(--radius-2xl); box-shadow: inset 0 0 0 1px var(--cv-line-dashed); }
  .empty h2 { font-size: 22px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; }
  .empty p { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .ghost { display: flex; flex-direction: column; gap: 8px; opacity: 0.5; }
  .ghost-row { display: flex; flex-direction: column; justify-content: center; gap: 8px; min-height: 68px; padding: 10px 16px; border-radius: var(--radius-xl); box-shadow: inset 0 0 0 1px var(--cv-fill-3); }
  .ghost-row i { display: block; height: 14px; border-radius: 10px; background: var(--cv-fill-2); }
</style>
