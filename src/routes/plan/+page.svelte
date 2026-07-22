<script lang="ts">
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import type { Program, Exercise, ProgramExercise, ProgramDay } from '$lib/types'
  import * as Storage from '$lib/storage'
  import ExerciseRow from '$lib/components/ExerciseRow.svelte'
  import DayCard from '$lib/components/DayCard.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import { startRestFromExercise } from '$lib/rest-timer'

  const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const DEFAULT_ORDER = [0, 1, 2, 3, 4, 5, 6]

  let programs = $state<Program[]>([])
  let exercises = $state<Exercise[]>([])
  let planWeekIdx = $state(0)
  let planExpandedDayIdx = $state<number | null>(null)
  let planAutoExpanded = $state(false)
  let planEditing = $state(false)
  let planSelectedSwapIdx = $state<number | null>(null)
  let planEditingOrder = $state<number[] | null>(null)
  let exerciseWeights = $state<Record<string, number>>({})

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)

  let todayIdx = $derived((new Date().getDay() + 6) % 7)
  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')
  let program = $derived(programs.find(p => p.id === $settings.activeProgramId) || null)
  let weeks = $derived(program?.weeks || [])
  let week = $derived(weeks[planWeekIdx] || weeks[0])
  let rescheduleKey = $derived(program ? `${program.id}-week-${planWeekIdx}` : '')
  let rescheduleOrders = $derived(($settings.rescheduleWeekOrder || {}) as Record<string, number[]>)
  let rawRescheduleOrder = $derived(rescheduleOrders[rescheduleKey])
  let committedOrder = $derived(
    rawRescheduleOrder && rawRescheduleOrder.length === 7 ? rawRescheduleOrder : DEFAULT_ORDER
  )
  let order = $derived(planEditing ? (planEditingOrder || committedOrder) : committedOrder)
  let changes = $derived(committedOrder.reduce((n, v, i) => n + (v !== i ? 1 : 0), 0))
  let editingChanges = $derived(
    planEditingOrder ? planEditingOrder.reduce((n, v, i) => n + (v !== i ? 1 : 0), 0) : 0
  )
  let exercisesById = $derived(Object.fromEntries(exercises.map(e => [e.id, e])))
  let noProgram = $derived(!program)

  onMount(async () => {
    const [progs, exs] = await Promise.all([
      Storage.getPrograms(),
      Storage.getExercises()
    ])
    programs = progs
    exercises = exs
    const s = await Storage.getSettings()
    planWeekIdx = typeof s.currentWeekIdx === 'number' ? s.currentWeekIdx : 0
    if (planWeekIdx >= (progs.find(p => p.id === s.activeProgramId)?.weeks?.length || 0)) {
      planWeekIdx = 0
    }
    if (planExpandedDayIdx === null && !planAutoExpanded) {
      planExpandedDayIdx = todayIdx >= 0 ? todayIdx : 0
      planAutoExpanded = true
    }
  })

  $effect(() => {
    if (planEditing) return
    // Auto-expand today's day when it becomes null (e.g., after week switch)
    if (planExpandedDayIdx === null && !planAutoExpanded) {
      const today = (new Date().getDay() + 6) % 7
      planExpandedDayIdx = today >= 0 ? today : 0
      planAutoExpanded = true
    }
    const idx = planExpandedDayIdx
    if (idx === null || !week || !order) return
    const originalIdx = order[idx]
    if (originalIdx < week.days.length) {
      const day = week.days[originalIdx]
      if (day && day.name !== 'Rest' && day.name !== 'Descanso' && day.exercises?.length > 0) {
        void loadWeights(day.exercises)
      }
    }
  })

  async function loadWeights(dayExercises: ProgramExercise[]) {
    // Guard against empty lists: with no exercises, the loop below never reaches an
    // `await`, so this whole function would otherwise run synchronously to completion
    // inside the calling $effect's reactive tracking window. That makes the final
    // `exerciseWeights = { ...exerciseWeights, ... }` line both read AND write the same
    // $state from within the effect that's still on the call stack, which Svelte reports
    // as `effect_update_depth_exceeded` (an effect re-triggering itself forever). Bailing
    // out early avoids touching `exerciseWeights` at all when there's nothing to load —
    // when there ARE exercises, the `await Storage.getLogsForExercise(...)` below always
    // yields to a later microtask first, so the effect has already finished by the time
    // `exerciseWeights` is written, and this loop never occurs.
    if (!dayExercises || dayExercises.length === 0) return
    const weights: Record<string, number> = {}
    for (const ex of dayExercises) {
      const exId = ex.exerciseId || (ex as any).id
      if (!exId) continue
      try {
        const logs = await Storage.getLogsForExercise(exId)
        if (logs.length > 0) {
          const last = logs[logs.length - 1]
          weights[exId] = last.weight
        }
      } catch (e) {
        // ignore
      }
    }
    exerciseWeights = { ...exerciseWeights, ...weights }
  }

  async function handleWeekClick(idx: number) {
    planWeekIdx = idx
    planExpandedDayIdx = todayIdx
    planAutoExpanded = true
    await settings.update({ currentWeekIdx: idx })
  }

  function handleDayToggle(calIdx: number, hasWorkout: boolean, isRest: boolean) {
    if (!hasWorkout || isRest) return
    planExpandedDayIdx = planExpandedDayIdx === calIdx ? null : calIdx
  }

  function toggleEditing() {
    if (planEditing) {
      if (planEditingOrder) {
        saveRescheduleOrder(planEditingOrder)
      }
      planEditing = false
      planSelectedSwapIdx = null
      planEditingOrder = null
    } else {
      planEditing = true
      planEditingOrder = [...committedOrder]
      planSelectedSwapIdx = null
    }
  }

  async function saveRescheduleOrder(newOrder: number[]) {
    if (!program) return
    const key = `${program.id}-week-${planWeekIdx}`
    const stored = await Storage.getSettings()
    const rs = (stored.rescheduleWeekOrder || {}) as Record<string, number[]>
    // newOrder is a Svelte $state array — IndexedDB's structured clone can't
    // serialize the reactive proxy, so persist a plain-array copy.
    rs[key] = [...newOrder]
    await settings.update({ rescheduleWeekOrder: rs as any })
  }

  function handleSwap(calIdx: number) {
    if (planSelectedSwapIdx === null) {
      planSelectedSwapIdx = calIdx
    } else if (planSelectedSwapIdx === calIdx) {
      planSelectedSwapIdx = null
    } else {
      const newOrder = [...(planEditingOrder || committedOrder)]
      const tmp = newOrder[planSelectedSwapIdx]
      newOrder[planSelectedSwapIdx] = newOrder[calIdx]
      newOrder[calIdx] = tmp
      planEditingOrder = newOrder
      planSelectedSwapIdx = null
    }
  }

  function handleReset() {
    if (editingChanges === 0) return
    planEditingOrder = [...DEFAULT_ORDER]
    planSelectedSwapIdx = null
  }

  function handleShift() {
    const editOrder = planEditingOrder || committedOrder
    planEditingOrder = editOrder.map((_, i) => editOrder[(i - 1 + 7) % 7])
    planSelectedSwapIdx = null
  }

  function handleBannerEdit() {
    planEditing = true
    planEditingOrder = [...committedOrder]
    planSelectedSwapIdx = null
  }

  async function openExerciseDetailAt(dayExercises: ProgramExercise[], idx: number) {
    const resolvedList = await Promise.all(dayExercises.map(async (ex) => {
      const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any
      const logs = await Storage.getLogsForExercise(ex.exerciseId)
      return { ...resolved, exerciseId: ex.exerciseId, logs }
    }))
    detailExercises = resolvedList
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
    const logs = await Storage.getLogsForExercise(exId)
    const last = logs[logs.length - 1]
    if (last) exerciseWeights = { ...exerciseWeights, [exId]: last.weight }
    detailExercises = detailExercises.map((e, i) => i === detailIdx ? { ...e, logs } : e)
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) {
      detailIdx++
    } else if (dir === 'prev' && detailIdx > 0) {
      detailIdx--
    }
  }
</script>

{#if noProgram}
  <div class="page">
    <div class="no-program-msg">
      Ningún programa seleccionado. Ve a Tú para crear uno.
    </div>
  </div>
{:else}
  <div class="page">
    <div class="page-header">
      <div class="min-0">
        <div class="page-header-eyebrow">
          {planEditing ? 'Reprogramar' : 'Tu programa'}
        </div>
        <div class="page-header-title">
          {planEditing ? 'Mover.' : 'Plan.'}
        </div>
      </div>
      <button id="plan-reprogram-btn" class="btn-reprogram" style="border:{planEditing ? '0' : `0.5px solid ${accent}55`};background:{planEditing ? accent : 'transparent'};color:{planEditing ? '#0a0a0a' : accent}"
        onclick={toggleEditing}>
        {#if planEditing}
          Listo
        {:else}
          <Icon name="swap" size={15} color={accent} />
          Reprogramar
        {/if}
      </button>
    </div>

    {#if planEditing}
      <div class="section-pad-sm">
        <div class="edit-banner" style="background:{accent}0d;border-color:{accent}33">
          <div class="icon-box" style="background:{accent}1c;color:{accent}">
            <Icon name="swap" size={17} color={accent} />
          </div>
          <div class="flex-1">
            <div class="banner-title">Reprogramando esta semana</div>
            <div class="banner-subtitle">Los 7 días de la semana. Intercambia con espacios libres.</div>
          </div>
          <button id="plan-reset-btn" class="btn-reset-sm" style="cursor:{editingChanges === 0 ? 'default' : 'pointer'};background:{editingChanges === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'};color:{editingChanges === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)'}"
            onclick={handleReset}>Restablecer</button>
        </div>
      </div>

      <div class="section-pad-md">
        <button id="plan-shift-btn" class="shift-btn" onclick={handleShift}>
          <div class="shift-icon" style="color:{accent}">→</div>
          <div class="flex-1">
            <div class="shift-title">Me salté un día</div>
            <div class="shift-desc">Corre cada entrenamiento un día hacia adelante (Lun→Mar, Mar→Mié…).</div>
          </div>
          <div class="shift-cta" style="background:{accent};color:#0a0a0a">Desplazar</div>
        </button>
      </div>

      <div class="hint-row">
        <span class="hint-dot" style="background:{accent}"></span>
        <span>Toca dos días para intercambiarlos (incluye espacios libres)</span>
      </div>

      <div class="day-list">
        {#each order as originalIdx, calIdx (calIdx)}
          {@const day = originalIdx < week.days.length ? week.days[originalIdx] : null}
          {@const hasWorkout = day !== null}
          {@const isTodayCal = calIdx === todayIdx && planWeekIdx === $settings.currentWeekIdx}
          {@const isMoved = hasWorkout && originalIdx !== calIdx}
          {@const isSelected = planSelectedSwapIdx === calIdx}
          <DayCard
            dayName={DAY_NAMES_SHORT[calIdx]}
            dayNumber={calIdx + 1}
            title={day?.name || ''}
            subtitle={isTodayCal ? (day?.subtitle ? `Hoy · ${day.subtitle}` : 'Hoy') : (day?.subtitle || '')}
            isToday={isTodayCal}
            {isMoved}
            movedFrom={DAY_NAMES_SHORT[originalIdx]}
            exerciseCount={(day?.exercises || []).length}
            duration={day?.duration ? String(day.duration) : undefined}
            isRest={!hasWorkout}
            accent={isSelected ? accent : undefined}
            onclick={() => handleSwap(calIdx)}
          />
        {/each}
      </div>
    {:else}
      {#if changes > 0}
        <div class="section-pad-xs">
          <button id="plan-changes-banner" class="changes-banner" style="background:{accent}0d;border-color:{accent}33" onclick={handleBannerEdit}>
            <div class="active-dot" style="background:{accent};box-shadow:0 0 7px {accent}"></div>
            <div class="flex-1">
              <div class="changes-title">Semana reprogramada · {changes} {changes === 1 ? 'cambio' : 'cambios'}</div>
              <div class="changes-subtitle">Temporal · 7 días</div>
            </div>
            <span class="changes-edit" style="color:{accent}">Editar</span>
          </button>
        </div>
      {/if}

      {#if weeks.length > 0}
        <div id="plan-week-tabs" class="week-tabs">
          {#each weeks as w, i (i)}
            <button class="week-tab" style="background:{planWeekIdx === i ? '#1f1f1f' : 'transparent'};border:{planWeekIdx === i ? `0.5px solid ${(w as any).accent || accent}66` : '0.5px solid rgba(255,255,255,0.06)'};color:{planWeekIdx === i ? '#fafafa' : 'rgba(255,255,255,0.5)'}"
              onclick={() => handleWeekClick(i)}>
              <div class="week-tag" style="color:{planWeekIdx === i ? ((w as any).accent || accent) : 'rgba(255,255,255,0.4)'}">{w.tag || ''}</div>
              <div class="week-name">{w.name}</div>
              <div class="week-subtitle">{w.subtitle || ''}</div>
            </button>
          {/each}
        </div>

        <div id="plan-days-grid" class="day-grid">
          {#each order as originalIdx, calIdx (calIdx)}
            {@const day = originalIdx < week.days.length ? week.days[originalIdx] : null}
            {@const hasWorkout = day !== null}
            {@const isTodayDay = calIdx === todayIdx && planWeekIdx === $settings.currentWeekIdx}
            {@const isMoved = hasWorkout && originalIdx !== calIdx}
            {@const isRest = !hasWorkout || day?.name === 'Rest' || day?.name === 'Descanso'}
            {@const isExpanded = planExpandedDayIdx === calIdx}
            {@const isWorkoutDay = hasWorkout && !isRest}
            <DayCard
              dayName={DAY_NAMES_SHORT[calIdx]}
              dayNumber={calIdx + 1}
              title={day?.name || ''}
              subtitle={day?.subtitle || ''}
              isToday={isTodayDay}
              {isMoved}
              movedFrom={DAY_NAMES_SHORT[originalIdx]}
              exerciseCount={day?.exercises?.length || 0}
              {isRest}
              {isExpanded}
              {accent}
              onclick={isWorkoutDay ? () => handleDayToggle(calIdx, hasWorkout, isRest) : undefined}
            >
              {#if isExpanded && isWorkoutDay}
                {#each (day?.exercises || []) as ex, exIdx (ex.exerciseId)}
                  {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                  {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                  {@const exId = ex.exerciseId}
                  <ExerciseRow
                    name={getExerciseDisplayName(resolved) || 'Desconocido'}
                    muscle={resolved.muscle || ''}
                    {imgUrl}
                    sets={ex.sets}
                    reps={ex.reps}
                    weight={exerciseWeights[exId]}
                    {units}
                    {accent}
                    onclick={() => openExerciseDetailAt(day?.exercises || [], exIdx)}
                  />
                {/each}
              {/if}
            </DayCard>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}

{#if showDetail && detailExercises.length > 0}
  <ExerciseDetail
    exercise={detailExercises[detailIdx]}
    open={showDetail}
    {accent}
    {units}
    hasPrev={detailIdx > 0}
    hasNext={detailIdx < detailExercises.length - 1}
    onNavigate={onDetailNavigate}
    onClose={onDetailClose}
    onLog={onDetailLog}
    onStartRest={startRestFromExercise}
  />
{/if}

<style>
  .no-program-msg { padding: 56px 20px; text-align: center; color: rgba(255,255,255,0.4); font-size: 14px; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
  .min-0 { min-width: 0; }
  .btn-reprogram { flex-shrink: 0; padding: 9px 15px; border-radius: 9999px; cursor: pointer; font-family: var(--font-sans); font-size: 13px; font-weight: 700; letter-spacing: -0.1px; display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
  .section-pad-sm { padding: 0 20px; margin-bottom: 14px; }
  .section-pad-md { padding: 0 20px; margin-bottom: 16px; }
  .section-pad-xs { padding: 0 20px; margin-bottom: 10px; }
  .edit-banner { border: 0.5px solid; border-radius: 16px; padding: 13px 14px; display: flex; align-items: center; gap: 12px; }
  .icon-box { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .flex-1 { flex: 1; min-width: 0; }
  .banner-title { font-family: var(--font-sans); font-size: 13.5px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
  .banner-subtitle { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; line-height: 1.35; }
  .btn-reset-sm { flex-shrink: 0; padding: 7px 11px; border-radius: 9999px; border: 0; font-family: var(--font-sans); font-size: 12px; font-weight: 600; }
  .shift-btn { width: 100%; text-align: left; cursor: pointer; background: var(--surface); border: 0.5px solid var(--border-medium); border-radius: 16px; padding: 13px 14px; display: flex; align-items: center; gap: 13px; color: inherit; }
  .shift-icon { width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; background: rgba(255,255,255,0.05); border: 0.5px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: center; font-family: var(--font-mono); font-size: 18px; }
  .shift-title { font-family: var(--font-sans); font-size: 14.5px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
  .shift-desc { font-size: 11.5px; color: rgba(255,255,255,0.5); margin-top: 2px; line-height: 1.35; }
  .shift-cta { flex-shrink: 0; padding: 8px 12px; border-radius: 10px; font-family: var(--font-sans); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .hint-row { padding: 0 20px; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: rgba(255,255,255,0.42); font-weight: 600; }
  .hint-dot { width: 4px; height: 4px; border-radius: 50%; flex-shrink: 0; }
  .day-list { padding: 0 20px; display: flex; flex-direction: column; gap: 10px; }
  .changes-banner { width: 100%; text-align: left; cursor: pointer; border: 0.5px solid; border-radius: 14px; padding: 11px 14px; display: flex; align-items: center; gap: 10px; color: inherit; }
  .active-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .changes-title { font-family: var(--font-sans); font-size: 13px; font-weight: 600; color: var(--text); letter-spacing: -0.2px; }
  .changes-subtitle { font-size: 10.5px; color: rgba(255,255,255,0.5); margin-top: 1px; }
  .changes-edit { font-family: var(--font-sans); font-size: 12px; font-weight: 700; flex-shrink: 0; }
  .week-tabs { padding: 0 20px; display: flex; gap: 8px; margin-bottom: 18px; }
  .week-tab { flex: 1; padding: 12px 8px; border: 0; cursor: pointer; border-radius: 14px; text-align: left; position: relative; }
  .week-tag { font-family: var(--font-mono); font-size: 9px; letter-spacing: 1.4px; text-transform: uppercase; }
  .week-name { font-family: var(--font-sans); font-size: 15px; font-weight: 700; margin-top: 2px; letter-spacing: -0.3px; }
  .week-subtitle { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 1px; }
  .day-grid { padding: 0 20px; display: flex; flex-direction: column; gap: 10px; }
</style>
