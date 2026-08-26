<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import * as storage from '$lib/storage'
  import Calendar from '$lib/components/Calendar.svelte'
  import Sparkline from '$lib/components/Sparkline.svelte'
  import SegmentedControl from '$lib/components/SegmentedControl.svelte'
  import Chip from '$lib/components/Chip.svelte'
  import EmptyState from '$lib/components/EmptyState.svelte'
  import ExerciseDetail from '$lib/components/ExerciseDetail.svelte'
  import Icon from '$lib/components/Icon.svelte'
  import type { Exercise, ExerciseLog } from '$lib/types'

  let historyFilter = $state('Todos')
  let historyTab = $state<'constancia' | 'ejercicios'>('constancia')

  let accent = $derived($settings.accentColor || '#d4ff3a')
  let units = $derived($settings.units || 'kg')

  let exercises: Exercise[] = $state([])
  let allLogs: ExerciseLog[] = $state([])
  let activeProgram: any = $state(null)
  let weekIdx = $state(0)
  let loaded = $state(false)

  let detailExercise: (Exercise & { logs: ExerciseLog[] }) | null = $state(null)
  let showDetail = $state(false)

  let expandedId: string | null = $state(null)
  let editingId: string | null = $state(null)
  let editName = $state('')
  let editMuscle = $state('')
  let editImgUrl = $state('')

  let enriched: (Exercise & { logs: ExerciseLog[] })[] = $derived(
    exercises.map(e => ({
      ...e,
      logs: allLogs.filter(l => l.exerciseId === e.id)
    }))
  )

  let muscles = $derived(['Todos', ...new Set(exercises.map(e => e.muscle.split('/')[0].split(/[,\s]+/)[0]))])

  let filtered = $derived(
    historyFilter === 'Todos'
      ? enriched
      : enriched.filter(e => e.muscle.startsWith(historyFilter))
  )

  let logsByDate = $derived.by(() => {
    const map = new Map<number, any[]>()
    for (const l of allLogs) {
      const key = parseInt(l.date.replace(/-/g, ''), 10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(l)
    }
    return map
  })

  function setFilter(m: string) {
    historyFilter = m
  }

  async function load() {
    const [exs, logs, progs, s] = await Promise.all([
      storage.getExercises(),
      storage.getAllLogs(),
      storage.getPrograms(),
      storage.getSettings()
    ])
    exercises = exs
    allLogs = logs

    if (s.activeProgramId) {
      activeProgram = progs.find(p => p.id === s.activeProgramId) || null
    } else {
      activeProgram = null
    }
    weekIdx = s.currentWeekIdx || 0
    loaded = true
  }

  function refresh() {
    load()
  }

  function openDetail(ex: Exercise & { logs: ExerciseLog[] }) {
    detailExercise = ex
    showDetail = true
  }

  function onDetailClose() {
    showDetail = false
    detailExercise = null
  }

  function toggleEdit(ex: Exercise & { logs: ExerciseLog[] }) {
    if (expandedId === ex.id) {
      expandedId = null
      editingId = null
    } else {
      expandedId = ex.id
      editingId = ex.id
      editName = getExerciseDisplayName(ex, $settings.language)
      editMuscle = ex.muscle
      editImgUrl = ex.imgUrl || ''
    }
  }

  function cancelEdit() {
    expandedId = null
    editingId = null
  }

  async function saveEdit(ex: Exercise) {
    await storage.saveExercise({
      ...ex,
      name: editName,
      muscle: editMuscle,
      imgUrl: editImgUrl
    })
    expandedId = null
    editingId = null
    await refresh()
  }

  function getLastWeight(logs: ExerciseLog[]): number {
    return logs.length > 0 ? logs[logs.length - 1].weight : 0
  }

  function getFirstWeight(logs: ExerciseLog[]): number {
    return logs.length > 0 ? logs[0].weight : 0
  }

  function getDelta(logs: ExerciseLog[]): number {
    return getLastWeight(logs) - getFirstWeight(logs)
  }

  function getAllTimeMax(logs: ExerciseLog[]): number {
    return logs.length > 0 ? Math.max(...logs.map(l => l.weight)) : 0
  }

  onMount(() => {
    load()
  })
</script>

<div class="page">
  <div class="page-header">
    <div class="page-header-eyebrow">Historial</div>
    <div class="page-header-title">Progreso.</div>
  </div>

  <div class="segment-wrap">
    <SegmentedControl
      options={[
        { label: 'Constancia', value: 'constancia' },
        { label: 'Ejercicios', value: 'ejercicios' }
      ]}
      bind:value={historyTab}
    />
  </div>

  {#if !loaded}
    <EmptyState message="Cargando..." />
  {:else if historyTab === 'constancia'}
    {#if !activeProgram || !activeProgram.weeks || activeProgram.weeks.length === 0}
      <EmptyState message="Selecciona un programa en Tú → Programas para ver tu constancia." />
    {:else}
      <Calendar
        {accent}
        {logsByDate}
        program={activeProgram}
        weeks={activeProgram.weeks.length}
        weekIdx={weekIdx}
        {units}
        {exercises}
        language={$settings.language}
        today={new Date()}
        {refresh}
      />
    {/if}
  {:else}
    <div class="chips-row">
      {#each muscles as m}
        <button onclick={() => setFilter(m)}>
          <Chip
            color={historyFilter === m ? accent : 'rgba(255,255,255,0.06)'}
            textColor={historyFilter === m ? 'var(--bg)' : 'rgba(255,255,255,0.5)'}
          >{m}</Chip>
        </button>
      {/each}
    </div>

    {#if filtered.length === 0}
      <EmptyState message="No se encontraron ejercicios." />
    {:else}
      <div class="ex-list">
        {#each filtered as e}
          {@const last = getLastWeight(e.logs)}
          {@const delta = getDelta(e.logs)}
          <div
            class="card ex-card"
            role="button"
            tabindex="0"
            onclick={() => openDetail(e)}
            onkeydown={(ev) => {
              if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault()
                openDetail(e)
              }
            }}
          >
            <div class="ex-info">
              <div class="ex-name-row">
                <span class="ex-name">{getExerciseDisplayName(e, $settings.language)}</span>
                <button
                  class="ex-edit-btn"
                  onclick={(ev) => { ev.stopPropagation(); toggleEdit(e) }}
                  aria-label="Editar ejercicio"
                >
                  <Icon name="pencil" size={16} color="rgba(255,255,255,0.4)" />
                </button>
              </div>
              <div class="ex-muscle">{e.muscle}</div>
            </div>
            {#if e.logs.length > 0}
              <div class="ex-sparkline">
                <Sparkline data={e.logs} width={70} height={26} color={delta >= 0 ? accent : '#ff6b6b'} />
              </div>
            {:else}
              <div class="ex-sparkline-placeholder"></div>
            {/if}
            <div class="ex-stats">
              <div class="ex-last">{last}<span class="ex-unit">{units}</span></div>
              <div class="ex-delta" style="color:{delta >= 0 ? accent : '#ff6b6b'}">{delta >= 0 ? '+' : ''}{delta.toFixed(1)}</div>
            </div>
          </div>

          {#if expandedId === e.id}
            <div class="ex-edit-form">
              <input
                type="text"
                value={editName}
                oninput={(ev) => editName = (ev.target as HTMLInputElement).value}
                placeholder="Nombre"
                class="ex-edit-input"
              />
              <input
                type="text"
                value={editMuscle}
                oninput={(ev) => editMuscle = (ev.target as HTMLInputElement).value}
                placeholder="Músculo"
                class="ex-edit-input"
              />
              <input
                type="text"
                value={editImgUrl}
                oninput={(ev) => editImgUrl = (ev.target as HTMLInputElement).value}
                placeholder="URL imagen (opcional)"
                class="ex-edit-input"
              />
              <div class="ex-edit-actions">
                <button class="btn-cancel" onclick={cancelEdit}>Cancelar</button>
                <button class="btn-save" onclick={() => saveEdit(e)}>Guardar</button>
              </div>
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  {/if}
</div>

{#if detailExercise}
  <ExerciseDetail
    exercise={{
      ...detailExercise,
      sets: 0,
      reps: '',
      rest: 0,
      logs: detailExercise.logs
    }}
    open={showDetail}
    {accent}
    {units}
    hasPrev={false}
    hasNext={false}
    isToday={false}
    onClose={onDetailClose}
  />
{/if}

<style>
  .page {
    display: flex;
    flex-direction: column;
  }

  .segment-wrap {
    margin: 0 20px 16px;
  }

  .chips-row {
    display: flex;
    gap: 8px;
    padding: 0 20px 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .chips-row button {
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }
  .chips-row::-webkit-scrollbar {
    display: none;
  }

  .ex-list {
    padding: 0 20px 100px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ex-card {
    padding: 14px;
    cursor: pointer;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 12px;
    color: inherit;
    transition: border-color 0.2s;
  }
  .ex-info {
    flex: 1;
    min-width: 0;
  }
  .ex-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: #fafafa;
    letter-spacing: -0.3px;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ex-muscle {
    font-size: 11px;
    color: rgba(255,255,255,0.45);
    margin-top: 2px;
  }
  .ex-sparkline {
    flex-shrink: 0;
  }
  .ex-sparkline-placeholder {
    width: 70px;
    height: 26px;
    flex-shrink: 0;
  }
  .ex-stats {
    text-align: right;
    min-width: 56px;
  }
  .ex-last {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    color: #fafafa;
    letter-spacing: -0.3px;
  }
  .ex-unit {
    font-size: 9px;
    color: rgba(255,255,255,0.4);
    margin-left: 1px;
  }
  .ex-delta {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.6px;
    margin-top: 1px;
  }
  .ex-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .ex-edit-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
    transition: opacity 0.15s;
    flex-shrink: 0;
  }
  .ex-edit-btn:active {
    opacity: 1;
  }

  .ex-edit-form {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border-top: 1px solid rgba(255,255,255,0.06);
  }

  .ex-edit-input {
    background: #1a1a1a;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 12px;
    color: #fafafa;
    font-size: 14px;
    font-family: 'Space Grotesk', sans-serif;
    outline: none;
  }
  .ex-edit-input:focus {
    border-color: rgba(255,255,255,0.2);
  }

  .ex-edit-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
  }
  .btn-cancel {
    background: none;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 8px 16px;
    color: rgba(255,255,255,0.5);
    font-size: 13px;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
  .btn-save {
    background: var(--accent, #d4ff3a);
    border: none;
    border-radius: 10px;
    padding: 8px 16px;
    color: #0a0a0a;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    font-family: 'Space Grotesk', sans-serif;
  }
</style>
