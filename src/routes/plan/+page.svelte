<script lang="ts">
  import PageHeader from '$lib/components/PageHeader.svelte'
  import WeekSwitch from '$lib/components/WeekSwitch.svelte'
  import WeekShape from '$lib/components/WeekShape.svelte'
  import DayPanel from '$lib/components/DayPanel.svelte'
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
  import PlanReorder from '$lib/components/PlanReorder.svelte'
  import PlanEmpty from '$lib/components/PlanEmpty.svelte'
  import ReprogramSheet from '$lib/components/ReprogramSheet.svelte'
  import ActionToast from '$lib/components/ActionToast.svelte'
  import NextStepDock from '$lib/components/NextStepDock.svelte'
  import IconButton from '$lib/components/IconButton.svelte'
  import Button from '$lib/components/Button.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { onMount, tick } from 'svelte'
  import { goto } from '$app/navigation'
  import { ROUTES } from '$lib/routes'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import { online } from '$lib/stores/network'
  import type { Program, Exercise, ExerciseLog, ProgramExercise, ProgramDay } from '$lib/types'
  import * as Storage from '$lib/storage'
  import { startRestFromExercise } from '$lib/rest-timer'
  import { detailPosition, nextInList, dayMuscles } from '$lib/session-steps'
  import { resolveWeekOrder } from '$lib/week-order'
  import { dayDurationMin } from '$lib/program-utils'
  import { muscleLabel } from '$lib/exercise-utils'
  import { isTrained, trainingDaysPerWeek } from '$lib/streak'
  import { toLocalDateStr } from '$lib/calendar-utils'
  import { weekDays, weekRange, type DayState } from '$lib/league'
  import {
    weekDates, slotDay, isRestDay, fixedSlots, shiftPending, movedFrom,
    nextWorkout, dayRowView, planDock, shiftEffectLabel
  } from '$lib/plan-week'

  const SHIFT_TOAST_MS = 6000

  let loaded = $state(false)
  let programs = $state<Program[]>([])
  let exercises = $state<Exercise[]>([])
  let logs = $state<ExerciseLog[]>([])
  let todaySeconds = $state(0)
  let planWeekIdx = $state(0)
  let moving = $state(false)
  let editingOrder = $state<number[] | null>(null)
  let sheetOpen = $state(false)
  let shiftToast = $state(false)
  let shiftToastTimer: ReturnType<typeof setTimeout> | null = null

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)
  let detailDayName = $state('')

  const today = toLocalDateStr(new Date())
  const todayIdx = (new Date().getDay() + 6) % 7
  const dates = weekDates(today)

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')
  let program = $derived(programs.find(p => p.id === $settings.activeProgramId) || null)
  let weeks = $derived(program?.weeks || [])
  let week = $derived(weeks[planWeekIdx] || weeks[0])
  let currentWeekIdx = $derived($settings.currentWeekIdx || 0)
  let isCurrentWeek = $derived(planWeekIdx === currentWeekIdx)
  let rescheduleKey = $derived(program ? `${program.id}-week-${planWeekIdx}` : '')
  let rawRescheduleOrder = $derived((($settings.rescheduleWeekOrder || {}) as Record<string, number[]>)[rescheduleKey])
  // Intrinsic layout of the week (weekday fields or sequential fallback) — what
  // the program means to show before any manual Reprogramar override.
  let naturalOrder = $derived(resolveWeekOrder(week, null))
  let committedOrder = $derived(resolveWeekOrder(week, rawRescheduleOrder))
  let order = $derived(moving ? (editingOrder || committedOrder) : committedOrder)
  let hasChanges = $derived(differs(committedOrder, naturalOrder))
  let editingChanges = $derived(!!editingOrder && differs(editingOrder, naturalOrder))
  let exercisesById = $derived(Object.fromEntries(exercises.map(e => [e.id, e])))
  let bestWeights = $derived(maxWeights(logs))

  let dayStates = $derived<DayState[]>(isCurrentWeek ? weekDays(logs, today) : Array(7).fill('off'))
  let firstWeek = $derived(!logs.some(isTrained))
  let total = $derived(trainingDaysPerWeek(program, planWeekIdx))
  let done = $derived(dayStates.filter(d => d === 'done').length)
  let fixed = $derived(fixedSlots(week, order, dayStates))
  let shiftFrom = $derived(isCurrentWeek ? todayIdx : 0)
  let todayDay = $derived(isCurrentWeek ? slotDay(week, order, todayIdx) : null)
  let todayDone = $derived(dayStates[todayIdx] === 'done')
  let next = $derived(nextWorkout(week, order, todayIdx))
  let rows = $derived(order.map((_, calIdx) => rowFor(calIdx)))
  let dock = $derived(planDock({
    todayDay,
    todayDone,
    firstWeek,
    offline: !$online,
    done,
    total,
    todayIdx,
    next,
    nextMinutes: next ? dayDurationMin(next.day.exercises) : 0,
    nextWeekNumber: planWeekIdx + 1 < weeks.length ? planWeekIdx + 2 : null,
  }))
  let shiftEffect = $derived(shiftEffectLabel(week, committedOrder, shiftPending(committedOrder, shiftFrom, fixed), isCurrentWeek ? todayIdx : -1))

  onMount(async () => {
    const [progs, exs, allLogs, sessions, s] = await Promise.all([
      Storage.getPrograms(),
      Storage.getExercises(),
      Storage.getAllLogs(),
      Storage.getAllGymSessions(),
      Storage.getSettings(),
    ])
    programs = progs
    exercises = exs
    logs = allLogs
    todaySeconds = sessions.find(g => g.date === today)?.seconds || 0
    const weekCount = progs.find(p => p.id === s.activeProgramId)?.weeks?.length || 0
    planWeekIdx = typeof s.currentWeekIdx === 'number' && s.currentWeekIdx < weekCount ? s.currentWeekIdx : 0
    loaded = true
  })

  function differs(a: number[], b: number[]): boolean {
    return a.some((v, i) => v !== b[i])
  }

  function maxWeights(all: ExerciseLog[]): Record<string, number> {
    const best: Record<string, number> = {}
    for (const l of all) if (l.weight > 0 && l.weight > (best[l.exerciseId] || 0)) best[l.exerciseId] = l.weight
    return best
  }

  function resolved(ex: ProgramExercise): any {
    return { ...ex, ...(exercisesById[ex.exerciseId] || {}) }
  }

  function musclesOf(day: ProgramDay | null): string {
    return day ? dayMuscles(day.exercises.map(resolved)) : ''
  }

  function rowFor(calIdx: number) {
    const day = slotDay(week, order, calIdx)
    return dayRowView({
      calIdx,
      day,
      date: dates[calIdx],
      state: dayStates[calIdx],
      from: rawRescheduleOrder || moving ? movedFrom(week, order, naturalOrder, calIdx) : -1,
      past: isCurrentWeek && calIdx < todayIdx,
      firstWeek,
      muscles: musclesOf(day),
    })
  }

  function exerciseSub(ex: ProgramExercise): string {
    const muscle = muscleLabel(resolved(ex).muscle)
    const best = bestWeights[ex.exerciseId]
    return [muscle, best ? `${best} ${units}` : ''].filter(Boolean).join(' · ')
  }

  function setsLabel(ex: ProgramExercise): string {
    return `${ex.sets} × ${String(ex.reps || '').replace('-', '–')}`
  }

  // Today done: how long it took, then its size
  function doneMeta(day: ProgramDay): string {
    const took = todaySeconds > 0 ? `Hecho en ${Math.round(todaySeconds / 60)} min` : 'Hecho'
    return `${took} · ${day.exercises.length} ej`
  }

  // The note under a day: where it moved from, or the first week's «Ya pasó»
  function dayTag(row: { state: string; sub: string }, day: ProgramDay | null): string {
    if (row.state === 'moved') return row.sub
    return row.state !== 'done' && row.sub !== musclesOf(day) ? row.sub : ''
  }

  // ── Week strip, jumps and the sticky day bar ──
  let daysEl = $state<HTMLElement | null>(null)
  let stickyIdx = $state<number | null>(null)
  let shapeDays = $derived(rows.map((row, calIdx) => ({
    weekday: row.weekday,
    date: row.date,
    title: row.title,
    rest: isRestDay(slotDay(week, order, calIdx)),
    today: isCurrentWeek && calIdx === todayIdx,
    done: row.state === 'done',
  })))

  function dayEl(calIdx: number): HTMLElement | null {
    return daysEl?.querySelector(`[data-weekday="${rows[calIdx]?.weekday}"]`) ?? null
  }

  function jumpToDay(calIdx: number) {
    dayEl(calIdx)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  // The day whose head has scrolled above the top while its exercises still show
  function updateSticky() {
    const panels = daysEl ? [...daysEl.querySelectorAll<HTMLElement>('section[data-component="DayPanel"]')] : []
    const top = 60
    const hit = panels.find(p => {
      const box = p.getBoundingClientRect()
      const head = p.firstElementChild?.getBoundingClientRect()
      // Any of the day still below the bar counts (a one-exercise day is short)
      return !!head && head.bottom < top && box.bottom > top
    })
    const idx = hit ? rows.findIndex(r => r.weekday === hit.dataset.weekday) : -1
    stickyIdx = idx >= 0 ? idx : null
  }

  // Opening Plan on this week lands on today
  let landed = false
  $effect(() => {
    if (landed || !loaded || !daysEl || !isCurrentWeek || moving) return
    landed = true
    tick().then(() => dayEl(todayIdx)?.scrollIntoView({ block: 'start' }))
  })

  async function handleWeekClick(idx: number) {
    planWeekIdx = idx
    await settings.update({ currentWeekIdx: idx })
  }

  async function saveOrder(newOrder: number[]) {
    if (!program) return
    const stored = await Storage.getSettings()
    const rs = { ...((stored.rescheduleWeekOrder || {}) as Record<string, number[]>) }
    // The week's own layout drops the override, so the program's weekday
    // fields keep controlling placement (a stored identity used to mask them).
    // newOrder may be a $state proxy: IndexedDB needs a plain copy.
    if (differs(newOrder, naturalOrder)) rs[rescheduleKey] = [...newOrder]
    else if (rescheduleKey in rs) delete rs[rescheduleKey]
    else return
    await settings.update({ rescheduleWeekOrder: rs as any })
  }

  function showShiftToast() {
    if (shiftToastTimer) clearTimeout(shiftToastTimer)
    shiftToast = true
    shiftToastTimer = setTimeout(() => { shiftToast = false }, SHIFT_TOAST_MS)
  }

  async function handleShift() {
    sheetOpen = false
    const shifted = shiftPending(committedOrder, shiftFrom, fixed)
    if (!differs(shifted, committedOrder)) {
      toast.show('No quedan días por correr esta semana')
      return
    }
    await saveOrder(shifted)
    showShiftToast()
  }

  function startMoving() {
    sheetOpen = false
    editingOrder = [...committedOrder]
    moving = true
  }

  async function resetWeek() {
    sheetOpen = false
    shiftToast = false
    await saveOrder(naturalOrder)
  }

  async function handleSheetReset() {
    await resetWeek()
    toast.show('Volviste a tu semana original')
  }

  function swapDays(from: number, to: number) {
    const arr = [...(editingOrder || committedOrder)]
    ;[arr[from], arr[to]] = [arr[to], arr[from]]
    editingOrder = arr
  }

  async function finishMoving() {
    if (editingOrder) await saveOrder(editingOrder)
    moving = false
    editingOrder = null
  }

  async function openExerciseDetailAt(dayExercises: ProgramExercise[], idx: number, dayName: string) {
    detailDayName = dayName
    detailExercises = await Promise.all(dayExercises.map(async (ex) => {
      const logsOf = await Storage.getLogsForExercise(ex.exerciseId)
      return { ...resolved(ex), exerciseId: ex.exerciseId, logs: logsOf }
    }))
    detailIdx = idx
    showDetail = true
  }

  function onDetailClose() {
    showDetail = false
    detailExercises = []
  }

  async function onDetailLog() {
    if (detailExercises.length === 0) return
    const exId = detailExercises[detailIdx].exerciseId
    const logsOf = await Storage.getLogsForExercise(exId)
    logs = await Storage.getAllLogs()
    detailExercises = detailExercises.map((e, i) => i === detailIdx ? { ...e, logs: logsOf } : e)
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) detailIdx++
    else if (dir === 'prev' && detailIdx > 0) detailIdx--
  }
</script>

<svelte:window onscroll={updateSticky} />

<div class="screen" id="plan">
  {#if !loaded}
    <!-- IndexedDB answers in a few ms: nothing to draw meanwhile -->
  {:else if !program}
    <PageHeader eyebrow="Tu programa" title="Plan." />
    <PlanEmpty />
    <NextStepDock caption="Pégala con IA o créala a mano en Tú">
      <Button variant="primary" size="lg" {accent} onclick={() => goto(ROUTES.you)}>Armar mi rutina<Icon name="arrow" size={18} /></Button>
    </NextStepDock>
  {:else if moving}
    <PageHeader eyebrow="Reprogramar · {weekRange(today)}" title="Mover." />
    <p class="hint">Mantén y arrastra un día. Lo hecho no se mueve.</p>
    <PlanReorder {rows} {fixed} onswap={swapDays} />
    <NextStepDock>
      <div class="pair">
        <Button id="plan-reset-btn" variant="secondary" size="lg" disabled={!editingChanges} onclick={() => { editingOrder = [...naturalOrder] }}>Restablecer</Button>
        <Button id="plan-done-btn" variant="primary" size="lg" {accent} onclick={finishMoving}>Listo</Button>
      </div>
    </NextStepDock>
  {:else}
    <PageHeader eyebrow="Tu programa · {weekRange(today)}" title="Plan." />
    {#if weeks.length > 1}
      <WeekSwitch {weeks} selected={planWeekIdx} current={currentWeekIdx} onselect={handleWeekClick} />
    {/if}

    <WeekShape days={shapeDays} onjump={jumpToDay} />

    <div id="plan-days-grid" class="days" bind:this={daysEl}>
      {#each rows as row, calIdx (calIdx)}
        {@const day = slotDay(week, order, calIdx)}
        {@const isToday = isCurrentWeek && calIdx === todayIdx}
        {#if !isRestDay(day)}
          <!-- Every workout day open, as its own card: Plan is where you see all the exercises -->
          <DayPanel
            weekday={row.weekday}
            date={row.date}
            title={row.title}
            muscles={musclesOf(day)}
            meta={isToday && todayDone ? doneMeta(day as ProgramDay) : row.meta}
            tag={dayTag(row, day)}
            today={isToday}
            done={row.state === 'done'}
            moved={row.state === 'moved'}
          >
            {#each (day?.exercises || []) as ex, exIdx (exIdx)}
              <ExerciseRow
                variant="plan"
                name={getExerciseDisplayName(resolved(ex)) || 'Desconocido'}
                imgUrl={resolveExerciseMedia(resolved(ex)).imgUrl}
                sub={exerciseSub(ex)}
                right={setsLabel(ex)}
                done={row.state === 'done'}
                onclick={() => openExerciseDetailAt(day?.exercises || [], exIdx, day?.name || '')}
              />
            {/each}
          </DayPanel>
        {:else}
          <DayPanel weekday={row.weekday} date={row.date} title="Descanso" muscles={isToday ? 'Recuperar también cuenta' : ''} today={isToday} rest />
        {/if}
      {/each}
    </div>

    <!-- Deep inside a day, a bar on top says which one; tapping it goes back to its head -->
    {#if stickyIdx !== null}
      {@const r = rows[stickyIdx]}
      {@const isTodaySticky = isCurrentWeek && stickyIdx === todayIdx}
      <button type="button" class="stk" class:today={isTodaySticky} data-component="PlanDayBar" onclick={() => jumpToDay(stickyIdx ?? 0)}>
        <span class="stk-d">{isTodaySticky ? 'Hoy · ' : ''}{r.weekday} {r.date}</span>
        <span class="stk-n">{r.title}</span>
        <span class="stk-x">{slotDay(week, order, stickyIdx)?.exercises.length ?? 0} ej{#if r.state === 'done'}<i><Icon name="check" size={11} /></i>{/if}</span>
      </button>
    {/if}

    <!-- The shift notice takes the dock's place while it shows -->
    {#if !shiftToast}
    <NextStepDock caption={dock.caption}>
      {#if dock.train}
        <div class="row">
          <IconButton id="plan-reprogram-btn" icon="move" label="Reprogramar" onclick={() => { sheetOpen = true }} />
          <Button variant="primary" size="lg" fullWidth {accent} onclick={() => goto(ROUTES.today)}>
            <span class="one-line">{dock.train}</span><Icon name="arrow" size={18} />
          </Button>
        </div>
      {:else}
        <Button id="plan-reprogram-btn" variant="secondary" size="lg" fullWidth onclick={() => { sheetOpen = true }}>
          <Icon name="move" size={18} />Reprogramar semana
        </Button>
      {/if}
    </NextStepDock>
    {/if}
  {/if}
</div>

<ReprogramSheet
  bind:open={sheetOpen}
  {shiftEffect}
  canReset={hasChanges}
  onshift={handleShift}
  onmove={startMoving}
  onreset={handleSheetReset}
/>

<ActionToast id="plan-shift-toast" visible={shiftToast} message="Listo. Tu semana se corrió un día." action="Restablecer" onaction={resetWeek} />

{#if showDetail && detailExercises.length > 0}
  <ExerciseDetail
    exercise={detailExercises[detailIdx]}
    open={showDetail}
    {accent}
    {units}
    hasPrev={detailIdx > 0}
    hasNext={detailIdx < detailExercises.length - 1}
    positionLabel={detailPosition(detailDayName, detailIdx, detailExercises.length)}
    nextExercise={nextInList(detailExercises, detailIdx)}
    isToday={false}
    onNavigate={onDetailNavigate}
    onClose={onDetailClose}
    onLog={onDetailLog}
    onStartRest={startRestFromExercise}
  />
{/if}

<style>
  #plan { padding: calc(var(--safe-top) + 56px) 20px 104px; display: flex; flex-direction: column; gap: 20px; }
  .hint { margin: -8px 4px 0; font-size: 13px; color: var(--text-tertiary); }
  /* Air between days so each card reads as its own unit; rest rows sit closer */
  .days { display: flex; flex-direction: column; gap: 24px; margin-top: 8px; }
  .days > :global([data-state="rest"] + [data-state="rest"]) { margin-top: -16px; }
  .stk {
    position: fixed; left: 0; right: 0; top: var(--safe-top); z-index: 30; height: 56px;
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center;
    padding: 0 20px; border: 0; border-bottom: 0.5px solid var(--border-medium);
    background: #0a0a0af0; -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px);
    color: var(--text); font-family: var(--font-sans); text-align: left; cursor: pointer;
  }
  .stk-d { padding: 6px 9px; border-radius: 10px; background: var(--cv-fill-2); font-family: var(--font-mono); font-size: 13px; font-weight: 600; letter-spacing: 0.8px; text-transform: uppercase; white-space: nowrap; }
  .stk.today .stk-d { background: var(--accent); color: var(--bg); }
  .stk-n { font-size: 16px; font-weight: 600; letter-spacing: -0.2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .stk-x { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); white-space: nowrap; }
  .stk-x i { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); color: var(--bg); display: grid; place-items: center; }
  @media (max-width: 360px) {
    .days { gap: 20px; }
    .stk { height: 52px; padding: 0 16px; gap: 10px; }
    .stk-n { font-size: 15px; }
  }
  .row { display: grid; grid-template-columns: 56px minmax(0, 1fr); gap: 8px; }
  .pair { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 8px; }
  .one-line { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
