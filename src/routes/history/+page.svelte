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

  function onOpenExercise(ex: Exercise) {
    console.log('Open exercise:', ex.name)
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
            color={historyFilter === m ? accent : undefined}
            textColor={historyFilter === m ? 'var(--bg)' : undefined}
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
          <button class="card ex-card" onclick={() => onOpenExercise(e)}>
            <div class="ex-info">
              <div class="ex-name">{getExerciseDisplayName(e, $settings.language)}</div>
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
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

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
</style>
