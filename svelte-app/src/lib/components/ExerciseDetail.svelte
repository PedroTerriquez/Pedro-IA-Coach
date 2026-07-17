<script lang="ts">
  import { logWeight } from '$lib/storage'
  import { toast } from '$lib/stores/ui'
  import LineChart from './LineChart.svelte'
  import Sheet from './Sheet.svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import CoachChat from './CoachChat.svelte'
  import StatBlock from './StatBlock.svelte'
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'

  function getToday(): string {
    const d = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(0, 10)
  }

  interface Alternative {
    name: string
    reason: string
  }

  interface ExerciseLog {
    id: string
    exerciseId: string
    date: string
    weight: number
    units: string
    sets?: number
    reps?: string
  }

  interface ExerciseDetail {
    id: string
    name: string
    muscle: string
    imgUrl?: string
    gifUrl?: string
    tips?: string[]
    alternatives?: Alternative[]
    sets: number
    reps: string
    rest: number
    logs?: ExerciseLog[]
    exerciseId?: string
  }

  let {
    exercise,
    open,
    accent = '#d4ff3a',
    units = 'kg',
    hasPrev = false,
    hasNext = false,
    onNavigate = null,
    onClose = null,
    onLog = null,
    onStartRest = null
  }: {
    exercise: ExerciseDetail
    open: boolean
    accent?: string
    units?: string
    hasPrev?: boolean
    hasNext?: boolean
    onNavigate?: ((dir: 'prev' | 'next') => void) | null
    onClose?: (() => void) | null
    onLog?: (() => void) | null
    onStartRest?: ((data: any) => void) | null
  } = $props()

  let todayStr = $derived(getToday())
  let todayLog = $derived(exercise.logs?.find(l => l.date === todayStr) || null)
  let lastLog = $derived(exercise.logs?.length ? exercise.logs[exercise.logs.length - 1] : null)

  let tab = $state<'workout' | 'history'>('workout')
  let savedWeight = $state(todayLog ? todayLog.weight : null)
  let pendingWeight = $state(todayLog ? todayLog.weight : (lastLog ? lastLog.weight : 0))
  let loggedToday = $state(!!todayLog)
  let trackSR = $state(todayLog?.sets !== undefined && todayLog?.reps !== undefined)
  let pendingSets = $state(trackSR ? todayLog.sets : exercise.sets)
  let pendingReps = $state(trackSR ? todayLog.reps : 8)
  let showGif = $state(false)
  let iniciarLoading = $state(false)

  let chatOpen = $state(false)

  const STEP = 5
  let weightInput: string = $derived(String(pendingWeight || ''))

  // ── History computed ──

  function parseRepsDefault(rep: string | number): number {
    if (typeof rep === 'number') return rep
    const m = String(rep).match(/(\d+)(?:\s*-\s*(\d+))?/)
    if (!m) return 8
    return parseInt(m[2] || m[1], 10)
  }

  let repsParsed = $derived(parseRepsDefault(trackSR ? String(pendingReps) : exercise.reps))

  function close() {
    onClose?.()
  }

  function updateWeightDisplay() {
    weightInput = String(pendingWeight || '')
  }

  function decWeight() {
    pendingWeight = Math.max(0, +(pendingWeight - STEP).toFixed(1))
    updateWeightDisplay()
  }

  function incWeight() {
    pendingWeight = +(pendingWeight + STEP).toFixed(1)
    updateWeightDisplay()
  }

  function handleWeightInput(e: Event) {
    const target = e.target as HTMLInputElement
    const v = target.value.replace(/[^0-9.]/g, '')
    pendingWeight = v === '' ? 0 : parseFloat(v)
  }

  function incSets() { pendingSets = Math.min(20, pendingSets + 1) }
  function decSets() { pendingSets = Math.max(1, pendingSets - 1) }
  function incReps() { pendingReps = Math.min(50, pendingReps + 1) }
  function decReps() { pendingReps = Math.max(1, pendingReps - 1) }

  let isDirty = $derived(loggedToday && pendingWeight !== savedWeight)
  let isLoggedState = $derived(loggedToday && !isDirty)

  async function handleSave() {
    if (pendingWeight === 0) return
    await logWeight(exercise.exerciseId || exercise.id, pendingWeight, units, trackSR ? pendingSets : undefined, trackSR ? String(pendingReps) : undefined)
    savedWeight = pendingWeight
    loggedToday = true
    onLog?.()
    toast.show(`✅ ${pendingWeight}${units} registrado`)
  }

  async function handleClear() {
    loggedToday = false
    savedWeight = null
    pendingWeight = lastLog ? lastLog.weight : 0
    trackSR = false
    pendingSets = exercise.sets
    pendingReps = parseRepsDefault(exercise.reps)
    updateWeightDisplay()
  }

  async function handleIniciar() {
    if (iniciarLoading) return
    iniciarLoading = true
    try {
      if (navigator.vibrate) navigator.vibrate(40)
      onStartRest?.({
        name: exercise.name,
        restSec: exercise.rest,
        tag: 'rest-' + Date.now(),
        sets: exercise.sets,
        reps: exercise.reps,
        exerciseId: exercise.exerciseId || exercise.id
      })
    } finally {
      iniciarLoading = false
    }
  }

  // ── History computed ──
  let allLogData = $derived(exercise.logs || [])
  let maxWeight = $derived(allLogData.length ? Math.max(...allLogData.map(l => l.weight)) : 0)
  let weightCount = $derived(allLogData.filter(l => l.weight > 0).length)
  let firstLog = $derived(allLogData.length ? allLogData[0] : null)
  let totalGain = $derived(firstLog && lastLog ? lastLog.weight - firstLog.weight : 0)
  let pctChange = $derived(firstLog ? ((totalGain / firstLog.weight) * 100).toFixed(1) : '0')
  let reversedLogs = $derived([...allLogData].reverse())
</script>

{#if open}
  <Sheet bind:open={open}>
    <div class="detail-scroll">
        <!-- Navigation pills -->
        <div class="nav-pills">
          <div class="nav-pill-row">
            <button class="pill-btn pill-prev" disabled={!hasPrev} onclick={() => onNavigate?.('prev')} aria-label="Anterior">
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M10 5H1m0 0l4-4M1 5l4 4" stroke="rgba(255,255,255,0.25)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
              <div class="pill-label-col">
                <span class="pill-label">Anterior</span>
                <span class="pill-name">Anterior</span>
              </div>
            </button>
            <button class="iniciar-btn" style="background:{accent}" onclick={handleIniciar} disabled={iniciarLoading}>
              {#if iniciarLoading}
                <span class="iniciar-icon">⏳</span> Enviando...
              {:else}
                <span class="iniciar-icon">⚡</span> Iniciar
              {/if}
            </button>
            <button class="pill-btn pill-next" disabled={!hasNext} onclick={() => onNavigate?.('next')} aria-label="Siguiente">
              <div class="pill-label-col pill-label-col-end">
                <span class="pill-label">Siguiente</span>
                <span class="pill-name">Siguiente</span>
              </div>
              <div class="pill-icon">
                <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M1 5h9m0 0L6 1m4 4L6 9" stroke="rgba(255,255,255,0.25)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </div>
            </button>
          </div>
        </div>

        <!-- Hero -->
        <div class="hero-wrap">
          <div class="hero" class:logged-hero={loggedToday} style="border-color:{loggedToday ? accent : 'rgba(255,255,255,0.06)'};box-shadow:{loggedToday ? `0 0 0 4px ${accent}1a,0 8px 32px ${accent}22` : 'none'}">
            <div class="hero-media">
              {#if exercise.gifUrl}
                <div class="hero-gif-layer" style="opacity:{showGif ? 1 : 0}">
                  <img src={exercise.gifUrl} alt="" class="hero-gif-img">
                </div>
              {/if}
              {#if exercise.imgUrl && !showGif}
                <div class="hero-img-layer" style="background-image:url({exercise.imgUrl})"></div>
              {/if}
            </div>
            {#if exercise.imgUrl && exercise.gifUrl && exercise.imgUrl !== exercise.gifUrl}
              <button class="hero-toggle" onclick={() => showGif = !showGif}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
              </button>
            {/if}
            <div class="hero-top-row">
              <span class="muscle-pill">{exercise.muscle}</span>
              {#if loggedToday}
                <span class="hecho-hoy-badge" style="background:{accent};color:#0a0a0a">
                  <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  HECHO HOY
                </span>
              {:else}
                <div class="accent-dot" style="background:{accent};box-shadow:0 0 10px {accent}"></div>
              {/if}
            </div>
            <div class="hero-bottom-row">
              <div class="hero-name-col">
                <div class="hero-name">{getExerciseDisplayName(exercise)}</div>
                <div class="hero-sets-reps-pill">
                  <span class="sets-reps-num">{exercise.sets}</span>
                  <span class="sets-reps-sep">×</span>
                  <span class="sets-reps-num">{exercise.reps}</span>
                  <span class="pill-unit">sets×reps</span>
                </div>
              </div>
              <div class="hero-search-btns">
                <a href="https://www.google.com/search?tbm=video&q={encodeURIComponent(exercise.name + ' exercise')}" target="_blank" rel="noopener noreferrer" class="search-btn hero-google-btn" aria-label="Buscar en Google">
                  <svg width="15" height="15" viewBox="0 0 48 48" fill="none"><path d="M43.6 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h11c-.5 2.6-1.9 4.9-4 6.4v5.3h6.5c3.8-3.5 6-8.7 6-15.8z" fill="#4285F4"/><path d="M24 44c5.4 0 10-1.8 13.3-4.9l-6.5-5.3c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5v5.5C8.3 39.8 15.7 44 24 44z" fill="#34A853"/><path d="M12.6 27.4c-.8-2.4-.8-4.9 0-7.2v-5.5H5c-2.7 5.4-2.7 11.8 0 17.2l7.6-6.5z" fill="#FBBC05"/><path d="M24 10.3c2.9 0 5.5 1 7.5 3l5.6-5.6C33.8 4.6 29.4 3 24 3 15.7 3 8.3 7.2 5 13.7l7.6 6c1.6-4.8 6.1-8.4 11.4-8.4z" fill="#EA4335"/></svg>
                </a>
                <a href="snssdk1233://search/trending?keyword={encodeURIComponent(exercise.name + ' exercise')}" target="_blank" rel="noopener noreferrer" class="search-btn hero-tiktok-btn" aria-label="Buscar en TikTok">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Prescription strip -->
        <div class="strip-wrap">
          <div class="strip-grid">
            <div class="strip-cell">
              <div class="strip-label">series</div>
              <div class="strip-value">{exercise.sets}</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">reps</div>
              <div class="strip-value">{exercise.reps}</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">desc.</div>
              <div class="strip-value">{exercise.rest}s</div>
            </div>
            <div class="strip-cell">
              <div class="strip-label">última</div>
              <div class="strip-value" style="color:{lastLog && lastLog.weight > 0 ? accent : '#fafafa'}">{lastLog && lastLog.weight > 0 ? `${lastLog.weight}${units}` : '—'}</div>
            </div>
          </div>
        </div>

        <!-- Tab selector -->
        <SegmentedControl
          options={[
            { label: 'Registrar', value: 'workout' },
            { label: 'Historial', value: 'history' }
          ]}
          bind:value={tab}
          {accent}
        />

        <!-- Workout tab -->
        {#if tab === 'workout'}
          <div class="tab-content">
            <div class="workout-card" style="border-color:{loggedToday ? `${accent}33` : 'rgba(255,255,255,0.06)'};box-shadow:{loggedToday ? `0 8px 32px ${accent}11` : '0 6px 20px rgba(0,0,0,0.2)'}">
              {#if loggedToday}
                <div class="card-glow" style="background:{accent}"></div>
              {/if}
              <div class="card-eyebrow">
                <span class="eyebrow-label">Peso de hoy</span>
                {#if loggedToday}
                  <span class="saved-badge" style="color:{accent};background:{accent}1a">
                    <span class="saved-dot" style="background:{accent};box-shadow:0 0 6px {accent}"></span>
                    Guardado
                  </span>
                {/if}
              </div>
              <div class="stepper-row">
                <button class="stepper-btn" onclick={decWeight}>−</button>
                <div class="stepper-display">
                  <input
                    type="text"
                    inputmode="decimal"
                    value={weightInput}
                    oninput={handleWeightInput}
                    placeholder="0"
                    class="weight-input"
                    style="color:{loggedToday ? accent : '#fafafa'}"
                  >
                  <div class="stepper-unit">{units} <span class="sep">·</span> incrementos de {STEP}{units}</div>
                </div>
                <button class="stepper-btn stepper-inc" onclick={incWeight}>+</button>
              </div>
              <div class="sr-section">
                {#if !trackSR}
                  <button class="sr-add-btn" onclick={() => trackSR = true}>
                    <span class="sr-plus">＋</span> Registrar series y repeticiones
                  </button>
                {:else}
                  <div class="sr-panel">
                    <div class="sr-header">
                      <span class="sr-title">Series y repeticiones</span>
                      <button class="sr-remove" onclick={() => trackSR = false}>× quitar</button>
                    </div>
                    <div class="sr-grid">
                      <div class="mini-stepper">
                        <div class="mini-info">
                          <div class="mini-label">Series</div>
                          <div class="mini-value">{pendingSets}</div>
                          <div class="mini-plan">plan · {exercise.sets}</div>
                        </div>
                        <div class="mini-arrows">
                          <button class="mini-arr-btn" onclick={incSets}>+</button>
                          <button class="mini-arr-btn" onclick={decSets}>−</button>
                        </div>
                      </div>
                      <div class="mini-stepper">
                        <div class="mini-info">
                          <div class="mini-label">Reps</div>
                          <div class="mini-value">{pendingReps}</div>
                          <div class="mini-plan">plan · {exercise.reps}</div>
                        </div>
                        <div class="mini-arrows">
                          <button class="mini-arr-btn" onclick={incReps}>+</button>
                          <button class="mini-arr-btn" onclick={decReps}>−</button>
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
              {#if isLoggedState}
                <button class="log-btn saved" style="background:{accent}22;color:{accent}" disabled>
                  <svg width="13" height="10" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4 8-8.5" stroke="{accent}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  Guardado · {pendingWeight}{units}
                </button>
              {:else}
                <button class="log-btn active" style="background:{accent};color:#0a0a0a;box-shadow:0 6px 20px {accent}33" onclick={handleSave}>
                  Registrar · {pendingWeight}{units}
                </button>
              {/if}
              {#if loggedToday}
                <button class="clear-btn" onclick={handleClear}>× Eliminar registro de hoy</button>
              {/if}
            </div>
          </div>

        <!-- History tab -->
        {:else if tab === 'history'}
          <div class="tab-content">
            <div class="stats-grid">
              <StatBlock value={maxWeight} label="Máx total" unit={units} {accent} />
              <StatBlock value={lastLog ? lastLog.weight : 0} label="Actual" unit={units} />
              <StatBlock value={`${totalGain >= 0 ? '+' : ''}${totalGain.toFixed(1)}`} label="Δ 6 sem." unit={units} accent={totalGain >= 0 ? accent : '#ff6b6b'} />
            </div>

            {#if allLogData.length > 0}
              <div class="chart-wrap">
                <div class="chart-card">
                  <div class="chart-header">
                    <span class="chart-title">Peso por sesión</span>
                    <span class="pct-pill">{pctChange >= 0 ? '+' : ''}{pctChange}%</span>
                  </div>
                  <LineChart data={allLogData} width={324} height={170} color={accent} />
                </div>
              </div>
            {/if}

            <div class="session-label">Sesiones anteriores</div>
            <div class="session-list">
              {#if allLogData.length === 0}
                <div class="empty-history">No hay sesiones registradas. ¡Empieza a registrar!</div>
              {:else}
                {#each reversedLogs as sess, i}
                  {@const isPR = weightCount >= 2 && sess.weight === maxWeight}
                  {@const isToday = sess.date === todayStr}
                  {@const prev = i < reversedLogs.length - 1 ? reversedLogs[i + 1] : null}
                  {@const delta = prev ? +(sess.weight - prev.weight).toFixed(1) : null}
                  <div class="session-row" style="border-color:{isToday ? `${accent}55` : 'rgba(255,255,255,0.06)'}">
                    {#if isToday}
                      <div class="session-today-bar" style="background:{accent}"></div>
                    {/if}
                    <div class="session-info">
                      <div class="session-date" style="color:{isToday ? accent : 'rgba(255,255,255,0.7)'}">
                        {sess.date}
                        {#if isToday && sess.sets && sess.reps}
                          <span class="session-sr">{sess.sets}×{sess.reps}</span>
                        {/if}
                      </div>
                      {#if delta !== null && delta !== 0}
                        <div class="session-delta" style="color:{delta > 0 ? accent : '#ff6b6b'};background:{delta > 0 ? `${accent}14` : 'rgba(255,107,107,0.12)'}">
                          <span>{delta > 0 ? '▲' : '▼'}</span>
                          <span>{delta > 0 ? '+' : ''}{delta}{units}</span>
                        </div>
                      {/if}
                      {#if delta === 0}
                        <div class="session-delta">— mantén</div>
                      {/if}
                    </div>
                    <div class="session-weight-col">
                      <div class="session-weight" style="color:{isPR ? accent : '#fafafa'}">
                        {sess.weight}<span class="session-weight-unit">{units}</span>
                      </div>
                      {#if isPR}
                        <div class="session-pr" style="color:{accent}">★ PR</div>
                      {/if}
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Coach FAB -->
      <button id="coach-fab" class="coach-fab" style="border-color:{accent}3a;background:{accent}1a;color:{accent}" onclick={() => chatOpen = true}>
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8.2c0-2.8 2.9-5 6.5-5s6.5 2.2 6.5 5-2.9 5-6.5 5c-.7 0-1.4-.08-2-.23L3.2 14.7l.5-2.4C2.95 11.4 2.5 9.9 2.5 8.2z"/><circle cx="9" cy="8.2" r="0.95" fill="currentColor"/><circle cx="6" cy="8.2" r="0.95" fill="currentColor"/><circle cx="12" cy="8.2" r="0.95" fill="currentColor"/></svg>
        Coach IA
      </button>

    {#if chatOpen}
      <CoachChat {exercise} {accent} onclose={() => chatOpen = false} />
    {/if}
  </Sheet>
{/if}

<style>
  .detail-scroll {
    overflow-y: auto;
    color: var(--text);
    padding-bottom: 60px;
  }
  .nav-pills {
    padding: 10px 14px 0;
  }
  .nav-pill-row {
    display: flex;
    gap: 8px;
  }
  .pill-btn {
    flex: 1;
    min-width: 0;
    background: rgba(255,255,255,0.02);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
    cursor: default;
    color: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 9px;
    opacity: 0.45;
  }
  .pill-prev {
    flex-direction: row;
  }
  .pill-next {
    flex-direction: row-reverse;
  }
  .pill-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .pill-label-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .pill-label-col-end {
    align-items: flex-end;
  }
  .pill-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    font-weight: 600;
    line-height: 1;
  }
  .pill-name {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.3);
    letter-spacing: -0.1px;
    line-height: 1.25;
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .iniciar-btn {
    flex-shrink: 0;
    border: 0;
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--bg);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: -0.1px;
    touch-action: manipulation;
    white-space: nowrap;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .iniciar-btn:disabled {
    background: var(--border-medium);
    cursor: default;
    opacity: 0.5;
  }
  .iniciar-icon {
    font-size: 15px;
    line-height: 1;
  }
  .hero-wrap {
    padding: 12px 14px 0;
  }
  .hero {
    height: 360px;
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    background: #161616;
    border: 0.5px solid;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .logged-hero {
    box-shadow: 0 0 0 4px rgba(212,255,58,0.1), 0 8px 32px rgba(212,255,58,0.13);
  }
  .hero-media {
    position: absolute;
    inset: 0;
  }
  .hero-gif-layer,
  .hero-img-layer {
    position: absolute;
    inset: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }
  .hero-img-layer {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .hero-gif-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
  }
  .hero-toggle {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 5;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .hero-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
    padding: 12px 14px;
  }
  .muscle-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 0.5px solid rgba(255,255,255,0.1);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase;
    white-space: nowrap;
  }
  .hecho-hoy-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px 4px 8px;
    border-radius: 9999px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(212,255,58,0.33);
    animation: fadeUp 0.3s ease-out;
  }
  .accent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
  }
  .hero-bottom-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 1;
    padding: 0 14px 12px;
  }
  .hero-name-col {
    flex: 1;
    min-width: 0;
  }
  .hero-name {
    font-family: var(--font-sans);
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.6px;
    line-height: 1.05;
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .hero-sets-reps-pill {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,0,0,0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 5px 12px;
    border-radius: 9999px;
    border: 0.5px solid rgba(255,255,255,0.1);
    font-family: var(--font-mono);
    font-size: 14px;
    color: rgba(255,255,255,0.85);
    white-space: nowrap;
  }
  .sets-reps-num {
    font-weight: 500;
  }
  .sets-reps-sep {
    color: rgba(255,255,255,0.45);
  }
  .pill-unit {
    margin-left: 4px;
    font-size: 9px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }
  .hero-search-btns {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
    position: relative;
    z-index: 3;
  }
  .search-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    text-decoration: none;
  }
  .strip-wrap {
    padding: 14px 20px 0;
  }
  .strip-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: var(--surface);
    border-radius: 14px;
    border: 0.5px solid var(--border);
    overflow: hidden;
  }
  .strip-cell {
    padding: 11px 6px;
    text-align: center;
    border-right: 0.5px solid rgba(255,255,255,0.05);
  }
  .strip-cell:last-child {
    border-right: none;
  }
  .strip-label {
    font-family: var(--font-mono);
    font-size: 8.5px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    font-weight: 600;
  }
  .strip-value {
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 500;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1;
  }
  .tab-content {
    padding: 14px 20px 30px;
  }
  .workout-card {
    background: var(--surface);
    border-radius: 20px;
    padding: 18px 18px 16px;
    border: 0.5px solid;
    position: relative;
    overflow: hidden;
  }
  .card-glow {
    position: absolute;
    top: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    opacity: 0.09;
    filter: blur(60px);
  }
  .card-eyebrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: relative;
    z-index: 1;
    margin-bottom: 10px;
  }
  .eyebrow-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .saved-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 9999px;
  }
  .saved-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }
  .stepper-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 1;
  }
  .stepper-btn {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--text);
    touch-action: manipulation;
    flex-shrink: 0;
    padding: 0;
    line-height: 1;
    transition: all 0.15s;
  }
  .stepper-display {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }
  .weight-input {
    background: transparent;
    border: 0;
    outline: none;
    text-align: center;
    width: 100%;
    font-family: var(--font-mono);
    font-size: 48px;
    font-weight: 500;
    letter-spacing: -2.2px;
    line-height: 1;
    padding: 0;
  }
  .stepper-unit {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
    white-space: nowrap;
  }
  .sep {
    opacity: 0.5;
    margin: 0 4px;
  }
  .sr-section {
    position: relative;
    z-index: 1;
  }
  .sr-add-btn {
    margin-top: 12px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 9px;
    cursor: pointer;
    background: transparent;
    border: 0.5px dashed rgba(255,255,255,0.15);
    color: rgba(255,255,255,0.55);
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
  .sr-plus {
    font-size: 13px;
    line-height: 1;
    font-weight: 400;
  }
  .sr-panel {
    margin-top: 12px;
    animation: fadeUp 0.2s ease-out;
  }
  .sr-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .sr-title {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
  }
  .sr-remove {
    background: transparent;
    border: 0;
    cursor: pointer;
    color: rgba(255,255,255,0.4);
    font-family: var(--font-sans);
    font-size: 10.5px;
    padding: 2px 4px;
  }
  .sr-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .mini-stepper {
    background: rgba(255,255,255,0.04);
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 8px 8px 8px 11px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .mini-info {
    flex: 1;
    min-width: 0;
  }
  .mini-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.45);
  }
  .mini-value {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 20px;
    font-weight: 500;
    color: var(--text);
    line-height: 1;
    letter-spacing: -0.5px;
  }
  .mini-plan {
    margin-top: 2px;
    font-family: var(--font-mono);
    font-size: 9px;
    color: rgba(255,255,255,0.4);
    letter-spacing: 0.4px;
    white-space: nowrap;
  }
  .mini-arrows {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .mini-arr-btn {
    width: 28px;
    height: 24px;
    border-radius: 6px;
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.1);
    color: var(--text);
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    line-height: 1;
  }
  .log-btn {
    margin-top: 14px;
    width: 100%;
    padding: 14px 18px;
    border-radius: 11px;
    border: 0;
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.1px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    position: relative;
    z-index: 1;
    cursor: pointer;
  }
  .log-btn.saved {
    cursor: default;
    box-shadow: none;
  }
  .clear-btn {
    margin-top: 4px;
    width: 100%;
    padding: 5px;
    background: transparent;
    border: 0;
    cursor: pointer;
    color: rgba(255,255,255,0.4);
    font-family: var(--font-sans);
    font-size: 10.5px;
    letter-spacing: 0.2px;
    position: relative;
    z-index: 1;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    margin-bottom: 20px;
  }
  .chart-wrap {
    margin-bottom: 20px;
  }
  .chart-card {
    background: var(--surface);
    border-radius: 18px;
    padding: 14px;
    border: 0.5px solid var(--border);
  }
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 6px;
  }
  .chart-title {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
  }
  .pct-pill {
    background: var(--border-medium);
    padding: 2px 8px;
    border-radius: 9999px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text);
  }
  .session-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    margin-bottom: 10px;
  }
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .empty-history {
    padding: 20px;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
  }
  .session-row {
    background: var(--surface);
    border-radius: 14px;
    padding: 12px 14px;
    border: 0.5px solid;
    display: flex;
    align-items: center;
    gap: 14px;
    position: relative;
    overflow: hidden;
  }
  .session-today-bar {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
  }
  .session-info {
    flex: 1;
    min-width: 0;
  }
  .session-date {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.4px;
  }
  .session-sr {
    font-family: var(--font-mono);
    font-size: 10px;
    color: rgba(255,255,255,0.5);
    letter-spacing: 0.4px;
  }
  .session-delta {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    margin-top: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.4px;
    background: rgba(255,255,255,0.04);
    padding: 2px 7px;
    border-radius: 6px;
    color: rgba(255,255,255,0.4);
  }
  .session-weight-col {
    text-align: right;
  }
  .session-weight {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 500;
    letter-spacing: -0.4px;
  }
  .session-weight-unit {
    font-size: 10px;
    color: rgba(255,255,255,0.4);
    margin-left: 2px;
  }
  .session-pr {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1.4px;
    margin-top: 2px;
  }

  /* Coach FAB */
  .coach-fab {
    position: absolute;
    bottom: 14px;
    left: 14px;
    padding: 0 12px 0 10px;
    height: 32px;
    border-radius: 9999px;
    border: 0.5px solid;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    z-index: 200;
    font-family: var(--font-sans);
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: -0.2px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
