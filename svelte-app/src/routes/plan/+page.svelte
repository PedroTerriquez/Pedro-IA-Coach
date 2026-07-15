<script lang="ts">
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import { toast } from '$lib/stores/ui'
  import type { Program, Exercise, ProgramExercise, ProgramDay } from '$lib/types'
  import * as Storage from '$lib/storage'

  declare function getExerciseDisplayName(exerciseOrName: any, lang?: string): string
  declare function resolveExerciseMedia(exercise: any): { imgUrl: string; gifUrl: string | null }

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
  let exerciseWeights = $state<Record<string, string>>({})

  let todayIdx = $derived((new Date().getDay() + 6) % 7)
  let accent = $derived($settings.accentColor || '#d4ff3a')
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
      if (day && day.name !== 'Rest' && day.name !== 'Descanso') {
        void loadWeights(day.exercises)
      }
    }
  })

  async function loadWeights(dayExercises: ProgramExercise[]) {
    const weights: Record<string, string> = {}
    for (const ex of dayExercises) {
      const exId = ex.exerciseId || (ex as any).id
      if (!exId) continue
      try {
        const logs = await Storage.getLogsForExercise(exId)
        if (logs.length > 0) {
          const last = logs[logs.length - 1]
          weights[exId] = last.weight + (last.units || '')
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
    rs[key] = newOrder
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

  function handleOpenExercise(ex: ProgramExercise) {
    const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any
    toast.show(getExerciseDisplayName(resolved) || resolved.name || 'Ejercicio', false, 2000)
  }
</script>

{#if noProgram}
  <div class="page">
    <div style="padding:56px 20px;text-align:center;color:rgba(255,255,255,0.4);font-size:14px">
      Ningún programa seleccionado. Ve a Tú para crear uno.
    </div>
  </div>
{:else}
  <div class="page">
    <div style="padding:56px 20px 16px;display:flex;align-items:flex-end;justify-content:space-between;gap:12px">
      <div style="min-width:0">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:1.6px;color:rgba(255,255,255,0.45);text-transform:uppercase">
          {planEditing ? 'Reprogramar' : 'Tu programa'}
        </div>
        <div style="font-family:'Space Grotesk',sans-serif;font-size:38px;font-weight:700;color:#fafafa;letter-spacing:-1.5px;line-height:1;margin-top:4px">
          {planEditing ? 'Mover.' : 'Plan.'}
        </div>
      </div>
      <button id="plan-reprogram-btn" onclick={toggleEditing}
        style="flex-shrink:0;padding:9px 15px;border-radius:9999px;cursor:pointer;border:{planEditing ? '0' : `0.5px solid ${accent}55`};background:{planEditing ? accent : 'transparent'};color:{planEditing ? '#0a0a0a' : accent};font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:700;letter-spacing:-0.1px;display:flex;align-items:center;gap:6px;margin-bottom:2px">
        {#if planEditing}
          Listo
        {:else}
          <svg width="15" height="15" viewBox="0 0 17 17" fill="none"><path d="M11.5 2.5l3 3-3 3M14 5.5H5.5a3 3 0 00-3 3M5.5 14.5l-3-3 3-3M3 11.5h8.5a3 3 0 003-3" stroke={accent} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Reprogramar
        {/if}
      </button>
    </div>

    {#if planEditing}
      <div style="padding:0 20px;margin-bottom:14px">
        <div style="background:{accent}0d;border:0.5px solid {accent}33;border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:12px">
          <div style="width:34px;height:34px;border-radius:10px;flex-shrink:0;background:{accent}1c;color:{accent};display:flex;align-items:center;justify-content:center">
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M11.5 2.5l3 3-3 3M14 5.5H5.5a3 3 0 00-3 3M5.5 14.5l-3-3 3-3M3 11.5h8.5a3 3 0 003-3" stroke={accent} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:13.5px;font-weight:600;color:#fafafa;letter-spacing:-0.2px">Reprogramando esta semana</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;line-height:1.35">Los 7 días de la semana. Intercambia con espacios libres.</div>
          </div>
          <button id="plan-reset-btn" onclick={handleReset}
            style="flex-shrink:0;padding:7px 11px;border-radius:9999px;border:0;cursor:{editingChanges === 0 ? 'default' : 'pointer'};background:{editingChanges === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.08)'};color:{editingChanges === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.85)'};font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:600">Restablecer</button>
        </div>
      </div>

      <div style="padding:0 20px;margin-bottom:16px">
        <button id="plan-shift-btn" onclick={handleShift}
          style="width:100%;text-align:left;cursor:pointer;background:#141414;border:0.5px solid rgba(255,255,255,0.08);border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:13px;color:inherit">
          <div style="width:38px;height:38px;border-radius:11px;flex-shrink:0;background:rgba(255,255,255,0.05);border:0.5px solid rgba(255,255,255,0.07);display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:18px;color:{accent}">→</div>
          <div style="flex:1;min-width:0">
            <div style="font-family:'Space Grotesk',sans-serif;font-size:14.5px;font-weight:600;color:#fafafa;letter-spacing:-0.2px">Me salté un día</div>
            <div style="font-size:11.5px;color:rgba(255,255,255,0.5);margin-top:2px;line-height:1.35">Corre cada entrenamiento un día hacia adelante (Lun→Mar, Mar→Mié…).</div>
          </div>
          <div style="flex-shrink:0;padding:8px 12px;border-radius:10px;background:{accent};color:#0a0a0a;font-family:'Space Grotesk',sans-serif;font-size:12.5px;font-weight:700;white-space:nowrap">Desplazar</div>
        </button>
      </div>

      <div style="padding:0 20px;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,0.42);font-weight:600">
        <span style="width:4px;height:4px;border-radius:50%;background:{accent};flex-shrink:0"></span>
        <span>Toca dos días para intercambiarlos (incluye espacios libres)</span>
      </div>

      <div style="padding:0 20px;display:flex;flex-direction:column;gap:10px">
        {#each order as originalIdx, calIdx (calIdx)}
          {@const day = originalIdx < week.days.length ? week.days[originalIdx] : null}
          {@const hasWorkout = day !== null}
          {@const isTodayCal = calIdx === todayIdx && planWeekIdx === $settings.currentWeekIdx}
          {@const isMoved = hasWorkout && originalIdx !== calIdx}
          {@const isSelected = planSelectedSwapIdx === calIdx}
          <button onclick={() => handleSwap(calIdx)}
            style="background:#141414;border-radius:18px;padding:14px 12px 14px 16px;border:{isSelected ? `1px solid ${accent}` : isTodayCal ? `1px solid ${accent}aa` : '0.5px solid rgba(255,255,255,0.06)'};cursor:pointer;display:flex;gap:13px;align-items:center;color:inherit;position:relative;{isSelected ? `box-shadow:0 0 0 4px ${accent}1f` : ''}transition:border-color 0.18s,box-shadow 0.18s;width:100%;text-align:left;font-family:inherit">
            <div style="width:42px;height:46px;flex-shrink:0;border-radius:12px;background:{isTodayCal ? `${accent}18` : 'rgba(255,255,255,0.05)'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:{isTodayCal ? `0.5px solid ${accent}66` : '0.5px solid rgba(255,255,255,0.05)'}">
              <div style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;color:{isTodayCal ? accent : 'rgba(255,255,255,0.45)'};text-transform:uppercase">{DAY_NAMES_SHORT[calIdx]}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#fafafa;line-height:1.1">{calIdx + 1}</div>
            </div>
            <div style="flex:1;min-width:0">
              {#if day}
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:#fafafa;letter-spacing:-0.3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{day.name}</div>
                  {#if isTodayCal}
                    <div style="width:6px;height:6px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent};flex-shrink:0"></div>
                  {/if}
                </div>
                <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{isTodayCal ? 'Hoy' : ''}{isTodayCal && (isMoved || day.subtitle) ? ' · ' : ''}{day.subtitle || ''}</div>
                {#if isMoved}
                  <div style="display:inline-flex;align-items:center;gap:4px;margin-top:7px;padding:3px 8px;border-radius:9999px;background:{accent}18;border:0.5px solid {accent}3a;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.8px;text-transform:uppercase;color:{accent};font-weight:600;white-space:nowrap">↔ desde {DAY_NAMES_SHORT[originalIdx]}</div>
                {/if}
              {:else}
                <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:500;color:rgba(255,255,255,0.35);margin-top:2px">Sin entrenamiento</div>
              {/if}
            </div>
            <div style="text-align:right;flex-shrink:0;min-width:30px">
              {#if day}
                <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#fafafa;font-weight:500">{(day.exercises || []).length}</div>
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-top:1px">{day.duration || '?'}m</div>
              {:else}
                <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#9bd1ff">Libre</div>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {:else}
      {#if changes > 0}
        <div style="padding:0 20px;margin-bottom:14px">
          <button id="plan-changes-banner" onclick={handleBannerEdit}
            style="width:100%;text-align:left;cursor:pointer;background:{accent}0d;border:0.5px solid {accent}33;border-radius:14px;padding:11px 14px;display:flex;align-items:center;gap:10px;color:inherit">
            <div style="width:7px;height:7px;border-radius:50%;background:{accent};box-shadow:0 0 7px {accent};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-family:'Space Grotesk',sans-serif;font-size:13px;font-weight:600;color:#fafafa;letter-spacing:-0.2px">Semana reprogramada · {changes} {changes === 1 ? 'cambio' : 'cambios'}</div>
              <div style="font-size:10.5px;color:rgba(255,255,255,0.5);margin-top:1px">Temporal · 7 días</div>
            </div>
            <span style="font-family:'Space Grotesk',sans-serif;font-size:12px;font-weight:700;color:{accent};flex-shrink:0">Editar</span>
          </button>
        </div>
      {/if}

      {#if weeks.length > 0}
        <div id="plan-week-tabs" style="padding:0 20px;display:flex;gap:8px;margin-bottom:18px">
          {#each weeks as w, i (i)}
            <button onclick={() => handleWeekClick(i)}
              style="flex:1;padding:12px 8px;border:0;cursor:pointer;background:{planWeekIdx === i ? '#1f1f1f' : 'transparent'};border:{planWeekIdx === i ? `0.5px solid ${(w as any).accent || accent}66` : '0.5px solid rgba(255,255,255,0.06)'};border-radius:14px;color:{planWeekIdx === i ? '#fafafa' : 'rgba(255,255,255,0.5)'};text-align:left;position:relative">
              <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.4px;color:{planWeekIdx === i ? ((w as any).accent || accent) : 'rgba(255,255,255,0.4)'};text-transform:uppercase">{w.tag || ''}</div>
              <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:700;margin-top:2px;letter-spacing:-0.3px">{w.name}</div>
              <div style="font-size:11px;color:rgba(255,255,255,0.45);margin-top:1px">{w.subtitle || ''}</div>
            </button>
          {/each}
        </div>

        <div id="plan-days-grid" style="padding:0 20px;display:flex;flex-direction:column;gap:10px">
          {#each order as originalIdx, calIdx (calIdx)}
            {@const day = originalIdx < week.days.length ? week.days[originalIdx] : null}
            {@const hasWorkout = day !== null}
            {@const isTodayDay = calIdx === todayIdx && planWeekIdx === $settings.currentWeekIdx}
            {@const isMoved = hasWorkout && originalIdx !== calIdx}
            {@const isRest = !hasWorkout || day?.name === 'Rest' || day?.name === 'Descanso'}
            {@const isExpanded = planExpandedDayIdx === calIdx}
            {@const isWorkoutDay = hasWorkout && !isRest}
            <div data-day-index={calIdx}
              style="background:#141414;border-radius:18px;border:{isTodayDay ? `1px solid ${accent}` : '0.5px solid rgba(255,255,255,0.06)'};overflow:hidden">
              <button onclick={() => handleDayToggle(calIdx, hasWorkout, isRest)}
                style="padding:16px;position:relative;display:flex;gap:14px;align-items:center;{isWorkoutDay ? 'cursor:pointer' : ''};width:100%;background:transparent;border:0;text-align:left;color:inherit;font-family:inherit">
                <div style="width:42px;height:42px;flex-shrink:0;border-radius:12px;background:{isRest ? 'rgba(155,209,255,0.1)' : 'rgba(255,255,255,0.05)'};display:flex;flex-direction:column;align-items:center;justify-content:center;border:{isTodayDay ? `0.5px solid ${accent}` : '0.5px solid rgba(255,255,255,0.05)'}">
                  <div style="font-family:'JetBrains Mono',monospace;font-size:8px;letter-spacing:1.2px;color:rgba(255,255,255,0.45);text-transform:uppercase">{DAY_NAMES_SHORT[calIdx]}</div>
                  <div style="font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:500;color:#fafafa;line-height:1">{calIdx + 1}</div>
                </div>
                <div style="flex:1;min-width:0">
                  {#if day}
                    <div style="display:flex;align-items:center;gap:6px">
                      <div style="font-family:'Space Grotesk',sans-serif;font-size:16px;font-weight:600;color:#fafafa;letter-spacing:-0.3px">{day.name}</div>
                      {#if isTodayDay}
                        <div style="width:6px;height:6px;border-radius:50%;background:{accent};box-shadow:0 0 6px {accent}"></div>
                      {/if}
                    </div>
                    <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{day.subtitle || ''}</div>
                    {#if isMoved}
                      <div style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;padding:3px 8px;border-radius:9999px;background:{accent}18;border:0.5px solid {accent}3a;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:0.8px;text-transform:uppercase;color:{accent};font-weight:600;white-space:nowrap">↔ desde {DAY_NAMES_SHORT[originalIdx]}</div>
                    {/if}
                  {:else}
                    <div style="font-family:'Space Grotesk',sans-serif;font-size:15px;font-weight:500;color:rgba(255,255,255,0.35)">Sin entrenamiento</div>
                  {/if}
                </div>
                <div style="text-align:right">
                  {#if isWorkoutDay}
                    <div style="font-family:'JetBrains Mono',monospace;font-size:14px;color:#fafafa;font-weight:500">{day!.exercises.length}</div>
                    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:rgba(255,255,255,0.4);margin-top:1px">ejercicios</div>
                  {:else}
                    <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:1.2px;text-transform:uppercase;color:#9bd1ff">{isRest ? 'DESC' : '—'}</div>
                  {/if}
                </div>
              </button>
              {#if isExpanded && isWorkoutDay}
                <div style="padding:0 16px 16px">
                  {#each (day?.exercises || []) as ex (ex.exerciseId || ex.id)}
                    {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
                    {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
                    {@const exId = ex.exerciseId || ex.id}
                    <button data-exercise-id={exId} onclick={() => handleOpenExercise(ex)}
                      style="width:100%;background:rgba(255,255,255,0.03);border-radius:14px;padding:12px;border:0;cursor:pointer;text-align:left;display:flex;align-items:center;gap:12px;color:inherit;margin-bottom:8px;font-family:inherit">
                      <div style="width:44px;height:44px;flex-shrink:0;border-radius:10px;background:#1c1c1c;border:0.5px solid rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;font-size:18px;overflow:hidden">
                        {#if imgUrl}
                          <img src={imgUrl} alt="" style="width:100%;height:100%;object-fit:cover">
                        {:else}
                          <div style="width:100%;height:100%;background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.018) 0 10px,rgba(255,255,255,0.05) 10px 20px)"></div>
                        {/if}
                      </div>
                      <div style="flex:1;min-width:0">
                        <div style="font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:600;color:#fafafa;letter-spacing:-0.2px;overflow-wrap:break-word">{getExerciseDisplayName(resolved) || 'Desconocido'}</div>
                        <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:2px">{resolved.muscle || ''}</div>
                      </div>
                      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;flex-shrink:0">
                        <div style="font-family:'JetBrains Mono',monospace;font-size:17px;font-weight:500;color:#fafafa;letter-spacing:-0.5px;white-space:nowrap">{ex.sets}<span style="color:rgba(255,255,255,0.35);margin:0 2px">×</span>{ex.reps}</div>
                        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,255,255,0.55)">{exerciseWeights[exId] || ''}</div>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
{/if}
