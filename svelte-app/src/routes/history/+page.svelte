<script module lang="ts">
  declare function getExerciseDisplayName(exercise: any): string
</script>

<script lang="ts">
  import { onMount } from 'svelte'
  import { settings } from '$lib/stores/settings'
  import * as storage from '$lib/storage'
  import Calendar from '$lib/components/Calendar.svelte'
  import Sparkline from '$lib/components/Sparkline.svelte'
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

  function setTab(t: 'constancia' | 'ejercicios') {
    historyTab = t
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
  <div class="header">
    <div class="header-breadcrumb">Historial</div>
    <div class="header-title">Progreso.</div>
  </div>

  <div class="tabs">
    <button
      class="tab-btn"
      class:tab-active={historyTab === 'constancia'}
      onclick={() => setTab('constancia')}
    >Constancia</button>
    <button
      class="tab-btn"
      class:tab-active={historyTab === 'ejercicios'}
      onclick={() => setTab('ejercicios')}
    >Ejercicios</button>
  </div>

  {#if !loaded}
    <div class="loading">Cargando...</div>
  {:else if historyTab === 'constancia'}
    {#if !activeProgram || !activeProgram.weeks || activeProgram.weeks.length === 0}
      <div class="empty-state">Selecciona un programa en Tú → Programas para ver tu constancia.</div>
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
        <button
          class="chip"
          class:chip-active={historyFilter === m}
          style={historyFilter === m ? `background:${accent};color:#0a0a0a` : ''}
          onclick={() => setFilter(m)}
        >{m}</button>
      {/each}
    </div>

    {#if filtered.length === 0}
      <div class="empty-state">No se encontraron ejercicios.</div>
    {:else}
      <div class="ex-list">
        {#each filtered as e}
          {@const last = getLastWeight(e.logs)}
          {@const delta = getDelta(e.logs)}
          <button class="ex-card" onclick={() => onOpenExercise(e)}>
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

  .header {
    padding: 56px 20px 16px;
  }
  .header-breadcrumb {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 1.6px;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
  }
  .header-title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 38px;
    font-weight: 700;
    color: #fafafa;
    letter-spacing: -1.5px;
    line-height: 1;
    margin-top: 4px;
  }

  .tabs {
    display: flex;
    gap: 0;
    margin: 0 20px 16px;
    background: rgba(255,255,255,0.04);
    border-radius: 12px;
    padding: 3px;
  }
  .tab-btn {
    flex: 1;
    padding: 9px 0;
    border: 0;
    border-radius: 9px;
    cursor: pointer;
    background: transparent;
    color: rgba(255,255,255,0.5);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.1px;
    transition: background 0.2s, color 0.2s;
  }
  .tab-btn.tab-active {
    background: #1f1f1f;
    color: #fafafa;
  }

  .loading {
    padding: 60px 20px;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
  }

  .empty-state {
    padding: 60px 20px;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
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
  .chip {
    flex-shrink: 0;
    padding: 8px 14px;
    border-radius: 9999px;
    border: 0;
    cursor: pointer;
    background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.7);
    font-family: 'Space Grotesk', sans-serif;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.1px;
    touch-action: manipulation;
    transition: background 0.2s;
    white-space: nowrap;
  }
  .chip.chip-active {
    background: #0a0a0a;
  }

  .ex-list {
    padding: 0 20px 100px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .ex-card {
    background: #141414;
    border-radius: 16px;
    padding: 14px;
    border: 0.5px solid rgba(255,255,255,0.06);
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
    font-family: 'Space Grotesk', sans-serif;
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
    font-family: 'JetBrains Mono', monospace;
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
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 0.6px;
    margin-top: 1px;
  }
</style>
