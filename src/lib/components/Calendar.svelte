<script module lang="ts">
export { calStripTime, calKey, calDowMon, calMonday, calAddDays, toLocalDateStr, calDayDiff, makeDayStatusFn, computeWeekStreak, computeBestWeekStreak } from '$lib/calendar-utils'
</script>

<script lang="ts">
  import * as storage from '$lib/storage'
  import ExerciseRow from './ExerciseRow.svelte'
  import ExerciseDetail from './ExerciseDetail.svelte'
  import Button from './Button.svelte'
  import { calStripTime, calKey, calDowMon, calMonday, calAddDays, toLocalDateStr, makeDayStatusFn, computeWeekStreak, computeBestWeekStreak } from '$lib/calendar-utils'
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { startRestFromExercise } from '$lib/rest-timer'

  let {
    accent,
    logsByDate = new Map(),
    program,
    weeks,
    weekIdx,
    units = 'kg',
    today = new Date(),
    exercises = [] as any[],
    language,
    refresh
  }: {
    accent: string
    logsByDate?: Map<number, any[]>
    program: any
    weeks: number
    weekIdx: number
    units?: string
    today?: Date
    exercises?: any[]
    language?: string
    refresh: () => void
  } = $props()

  let exercisesMap = $derived(Object.fromEntries(exercises.map(e => [e.id, e])))

  let viewMonth = $state(new Date(today.getFullYear(), today.getMonth(), 1))
  let selected = $state(calStripTime(today))

  let showDetail = $state(false)
  let detailExercises = $state<any[]>([])
  let detailIdx = $state(0)

  const CAL_DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
  const CAL_DOW_LONG = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
  const CAL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  let dayStatusFn = $derived(makeDayStatusFn(today, logsByDate, program, weeks, weekIdx, exercisesMap, language))
  let streak = $derived(computeWeekStreak(today, logsByDate))
  let startDate = $derived(calAddDays(calMonday(today), -7 * 9))
  let best = $derived(computeBestWeekStreak(startDate, today, logsByDate))

  let monthStart = $derived(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1))
  let lead = $derived(calDowMon(monthStart))
  let daysInMonth = $derived(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate())
  let selRec = $derived(dayStatusFn(selected))
  let detailMeta = $derived(getDayMeta(selRec.status))
  let canPrev = $derived(calMonday(monthStart) >= startDate)
  let canNext = $derived(
    (viewMonth.getFullYear() < today.getFullYear()) ||
    (viewMonth.getFullYear() === today.getFullYear() && viewMonth.getMonth() < today.getMonth())
  )

  let cells = $derived.by(() => {
    const result: (Date | null)[] = []
    for (let i = 0; i < lead; i++) result.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d))
    }
    return result
  })

  let monthDone = $derived(cells.filter(c => c && dayStatusFn(c).status === 'done').length)

  let chain = $derived.by(() => {
    const result: any[] = []
    for (let i = 13; i >= 0; i--) result.push(dayStatusFn(calAddDays(today, -i)))
    return result
  })

  function prevMonth() {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1)
  }

  function nextMonth() {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1)
  }

  function selectDate(date: Date) {
    selected = date
  }

  async function openExerciseDetailAt(dayExercises: any[], idx: number) {
    const resolvedList = await Promise.all(dayExercises.map(async (ex) => {
      const resolved = { ...ex, ...(exercisesMap[ex.exerciseId] || {}) } as any
      const logs = await storage.getLogsForExercise(ex.exerciseId)
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
    const logs = await storage.getLogsForExercise(exId)
    detailExercises = detailExercises.map((e, i) => i === detailIdx ? { ...e, logs } : e)
    refresh()
  }

  function onDetailNavigate(dir: 'prev' | 'next') {
    if (dir === 'next' && detailIdx < detailExercises.length - 1) {
      detailIdx++
    } else if (dir === 'prev' && detailIdx > 0) {
      detailIdx--
    }
  }

  async function markAsDone() {
    const dateStr = toLocalDateStr(selected)
    await storage.logWeight('__day__', 0, 'kg', undefined, undefined, dateStr)
    refresh()
  }

  function cellStatus(date: Date) {
    return dayStatusFn(date)
  }

  function isSelected(date: Date) {
    return calKey(date) === calKey(selected)
  }

  function getDayMeta(status: string) {
    const meta: Record<string, { pill: string; pc: string; pbg: string }> = {
      done: { pill: 'Completado', pc: accent, pbg: `${accent}1c` },
      today: { pill: 'Hoy · pendiente', pc: accent, pbg: `${accent}1c` },
      rest: { pill: 'Descanso', pc: '#9bd1ff', pbg: 'rgba(155,209,255,0.14)' },
      missed: { pill: 'No fuiste', pc: '#ff8a7a', pbg: 'rgba(255,107,107,0.14)' },
      future: { pill: 'Programado', pc: 'rgba(255,255,255,0.6)', pbg: 'rgba(255,255,255,0.06)' },
      none: { pill: 'Sin datos', pc: 'rgba(255,255,255,0.5)', pbg: 'rgba(255,255,255,0.05)' },
    }
    return meta[status] || { pill: '', pc: accent, pbg: `${accent}1c` }
  }
</script>

<div class="calendar-root" data-component="Calendar">
  <!-- Streak Card -->
  <div class="streak-card" style="border-color:{accent}2e">
    <div class="streak-glow" style="background:{accent}"></div>
    <div class="streak-inner">
      <div class="streak-row">
        <div class="flame-box" style="background:{accent}1c;border-color:{accent}3a">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <path d="M12.5 2.5c.8 3-1.4 4.6-2.7 6.2C8.3 10.6 7 12.2 7 14.5a5 5 0 0010 0c0-1.9-.8-3.4-1.7-4.7-.3 1-.9 1.7-1.8 2 .6-2.2-.2-4.7-2-6.3-.1.9-.5 1.6-1 2.2.8-1.9.6-3.7-.2-5.2z" fill={accent} stroke={accent} stroke-width="1" stroke-linejoin="round" />
            <path d="M10 15.5c0-1.2.8-2.1 1.7-2.9.5 1 1.4 1.3 1.4 2.6a1.8 1.8 0 01-3.1 1.2c-.1-.3 0-.6 0-.9z" fill="#0a0a0a" opacity="0.55" />
          </svg>
        </div>
        <div class="streak-text">
          <div class="streak-label" style="color:{accent}">Racha actual</div>
          <div class="streak-count-row">
            <span class="streak-count">{streak}</span>
            <span class="streak-unit">{streak === 1 ? 'semana seguida' : 'semanas seguidas'}</span>
          </div>
          <div class="streak-best">Mejor racha: <strong>{best} {best === 1 ? 'semana' : 'semanas'}</strong></div>
        </div>
      </div>
      <div class="chain-row">
        {#each chain as r, i}
          <div class="chain-bar-col">
            <div
              class="chain-bar"
              style="height:{r.status === 'done' || r.status === 'today' ? 26 : 14}px;background:{r.status === 'done' ? accent : r.status === 'today' ? `${accent}55` : r.status === 'missed' ? '#ff6b6b' : r.status === 'rest' ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.08)'};border:{r.status === 'today' ? `1px solid ${accent}` : r.status === 'missed' ? '1px solid #ff6b6b' : '0'};box-shadow:{r.status === 'done' ? `0 0 8px ${accent}66` : 'none'}"
            ></div>
            <div class="chain-day" style="color:{i === 13 ? accent : 'rgba(255,255,255,0.3)'}">{CAL_DOW[r.dow]}</div>
          </div>
        {/each}
      </div>
      <div class="streak-message">
        {#if selRec.status === 'today' && !selRec.isRest}
          Hoy toca <span style="color:{accent};font-weight:600">{selRec.day ? selRec.day.name : ''}</span> — no rompas la cadena
        {:else if streak > 0}
          Llevas <span style="color:{accent};font-weight:600">{streak} {streak === 1 ? 'semana' : 'semanas'}</span> cumpliendo. ¡Sigue así!
        {:else}
          Arranca esta semana con 4 sesiones para comenzar tu racha.
        {/if}
      </div>
    </div>
  </div>

  <!-- Calendar Grid -->
  <div class="cal-section">
    <div class="cal-card">
      <div class="cal-header">
        <button aria-label="Mes anterior" class="cal-nav-btn" disabled={!canPrev} onclick={prevMonth}>
          <svg width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M7.5 1L1.5 7l6 6" stroke="#fafafa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
        <div class="cal-title">
          <div class="cal-month-year">{CAL_MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}</div>
          <div class="cal-count">{monthDone} entrenamientos</div>
        </div>
        <button aria-label="Mes siguiente" class="cal-nav-btn" disabled={!canNext} onclick={nextMonth}>
          <svg class="flip-x" width="9" height="14" viewBox="0 0 9 14" fill="none"><path d="M7.5 1L1.5 7l6 6" stroke="#fafafa" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" /></svg>
        </button>
      </div>
      <div class="cal-dow-row">
        {#each CAL_DOW as d}
          <div class="cal-dow-label">{d}</div>
        {/each}
      </div>
      <div class="cal-grid">
        {#each cells as cell, i}
          {#if cell}
            {@const rec = cellStatus(cell)}
            {@const s = isSelected(cell)}
            <button
              class="cal-cell"
              style="background:{s ? (rec.status === 'done' ? `${accent}33` : 'rgba(255,255,255,0.08)') : rec.status === 'done' ? `${accent}1f` : 'transparent'};border:{s ? `1px solid ${accent}` : rec.status === 'done' ? `0.5px solid ${accent}3a` : rec.status === 'today' ? `1px solid ${accent}` : rec.status === 'missed' ? '0.5px solid #ff6b6b66' : '0.5px solid transparent'};box-shadow:{rec.status === 'today' ? `0 0 0 3px ${accent}1f` : 'none'}"
              onclick={() => selectDate(cell)}
            >
              <span class="cal-cell-day" style="color:{s && rec.status !== 'done' ? '#fafafa' : rec.status === 'done' ? accent : rec.status === 'rest' ? 'rgba(255,255,255,0.4)' : rec.status === 'missed' ? '#ff8a7a' : rec.status === 'future' ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.18)'}">{cell.getDate()}</span>
              {#if rec.status === 'done'}
                <svg width="14" height="14" viewBox="0 0 24 14" fill="none">
                  <rect x="8.5" y="5" width="7" height="4" rx="1.2" fill={accent} stroke={accent} stroke-width="0.3"/>
                  <rect x="1.5" y="1.5" width="5.5" height="11" rx="2.2" fill={accent} stroke={accent} stroke-width="0.3"/>
                  <rect x="17" y="1.5" width="5.5" height="11" rx="2.2" fill={accent} stroke={accent} stroke-width="0.3"/>
                </svg>
              {:else}
                <span class="cal-cell-dot" style="background:{rec.status === 'rest' ? 'rgba(255,255,255,0.25)' : 'transparent'}"></span>
              {/if}
              {#if rec.status === 'missed'}
                <span class="cal-cell-missed-dot"></span>
              {/if}
            </button>
          {:else}
            <div></div>
          {/if}
        {/each}
      </div>
      <div class="cal-legend">
        <span class="legend-item"><span class="legend-swatch" style="background:{accent}"></span>Entrenado</span>
        <span class="legend-item"><span class="legend-swatch legend-swatch--rest"></span>Descanso</span>
        <span class="legend-item"><span class="legend-ring legend-ring--missed"></span>Faltaste</span>
        <span class="legend-item"><span class="legend-ring" style="border-color:{accent}"></span>Hoy</span>
      </div>
    </div>
  </div>

  <!-- Day Detail -->
  <div class="cal-detail">
    <div
      class="detail-card"
      style="border-color:{selRec.status === 'missed' ? 'rgba(255,107,107,0.25)' : 'rgba(255,255,255,0.06)'}"
    >
      <div class="detail-header">
        <div class="detail-date">
          <div class="detail-date-label">{CAL_DOW_LONG[selRec.dow]} {selRec.date.getDate()} de {CAL_MONTHS[selRec.date.getMonth()].toLowerCase()}</div>
          <div class="detail-title">
            {selRec.isRest ? 'Descanso' : selRec.day ? selRec.day.name : ''}
          </div>
          {#if !selRec.isRest && selRec.day}
            <div class="detail-subtitle">{selRec.day.subtitle || ''}</div>
          {/if}
        </div>
        <div class="detail-pill" style="background:{detailMeta.pbg};color:{detailMeta.pc}">{detailMeta.pill}</div>
      </div>

      {#if selRec.isRest}
        <div class="detail-rest-note">
          Día de recuperación. Descansar también es entrenar — mantiene viva tu racha.
        </div>
      {/if}

      {#if selRec.status === 'missed'}
        <div class="detail-missed-note">
          No registraste este entrenamiento. Estaba programado <strong>{selRec.day ? selRec.day.name : ''}</strong>{selRec.day && selRec.day.subtitle ? ` (${selRec.day.subtitle})` : ''}.
        </div>
        <Button variant="secondary" fullWidth style="margin-top:12px;padding:12px;border-radius:var(--radius-md);border:0.5px solid {accent}55;background:{accent}1c;color:{accent};font-size:14px" onclick={markAsDone}>
          Marcar como hecho
        </Button>
      {/if}

      {#if !selRec.isRest && selRec.status !== 'none' && selRec.exercises.length > 0}
        <div class="detail-exercises" class:dim={selRec.status === 'missed' || selRec.status === 'future'}>
          <div class="detail-ex-section-label">
            <span>{selRec.status === 'done' ? 'Lo que hiciste' : selRec.status === 'today' ? 'Lo que toca hoy' : 'Programado'}</span>
            <span class="detail-ex-divider"></span>
            <span>{selRec.exercises.length} ejercicios</span>
          </div>
          <div class="detail-ex-list">
            {#each selRec.exercises as e, j}
              {@const log = selRec.logs ? selRec.logs.find((l: any) => l.exerciseId !== '__day__' && l.exerciseId === e.exerciseId) : null}
              {@const resolved = { ...e, ...(exercisesMap[e.exerciseId] || {}) }}
              {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
              <ExerciseRow
                name={getExerciseDisplayName(resolved, language)}
                muscle={resolved.muscle || ''}
                {imgUrl}
                weight={log?.weight}
                units={log?.units || units}
                sets={e.sets}
                reps={e.reps}
                {accent}
                onclick={() => openExerciseDetailAt(selRec.exercises, j)}
              />
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

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
  .calendar-root {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .streak-card {
    padding: 0 20px;
    position: relative;
  }
  .streak-glow {
    position: absolute;
    top: -55px;
    right: -45px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    opacity: 0.09;
    filter: blur(55px);
    pointer-events: none;
  }
  .streak-inner {
    background: linear-gradient(160deg, var(--surface) 0%, #111 100%);
    border-radius: var(--radius-xl);
    padding: 18px;
    border: 0.5px solid;
    position: relative;
    z-index: 1;
    overflow: hidden;
  }
  .streak-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
  }
  .flame-box {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-lg);
    flex-shrink: 0;
    border: 0.5px solid;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .streak-text {
    flex: 1;
    min-width: 0;
  }
  .streak-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .streak-count-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-top: 3px;
  }
  .streak-count {
    font-family: var(--font-sans);
    font-size: 40px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -1.8px;
    line-height: 0.9;
  }
  .streak-unit {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 600;
    color: var(--text-secondary);
  }
  .streak-best {
    font-size: 11.5px;
    color: var(--text-secondary);
    margin-top: 4px;
  }
  .streak-best strong {
    color: var(--text);
    font-weight: 600;
  }
  .chain-row {
    display: flex;
    gap: 4px;
    align-items: flex-end;
    justify-content: space-between;
    margin-top: 16px;
  }
  .chain-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .chain-bar {
    width: 100%;
    border-radius: 5px;
    transition: height 0.2s;
  }
  .chain-day {
    font-family: var(--font-mono);
    font-size: 8px;
  }
  .streak-message {
    margin-top: 11px;
    font-size: 11.5px;
    line-height: 1.4;
    color: var(--text-secondary);
    font-family: var(--font-sans);
  }

  .cal-section {
    padding: 12px 20px 0;
  }
  .cal-card {
    background: var(--surface);
    border-radius: var(--radius-xl);
    padding: 16px;
    border: 0.5px solid var(--border);
  }
  .cal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .flip-x {
    transform: scaleX(-1);
  }
  .cal-nav-btn {
    width: 34px;
    height: 34px;
    border-radius: var(--radius-md);
    flex-shrink: 0;
    padding: 0;
    background: var(--border-medium);
    border: 0.5px solid var(--border-medium);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text);
    transition: opacity 0.2s;
  }
  .cal-nav-btn:disabled {
    background: transparent;
    opacity: 0.3;
    cursor: default;
  }
  .cal-title {
    text-align: center;
  }
  .cal-month-year {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.4px;
  }
  .cal-count {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.6px;
    color: var(--text-muted);
    margin-top: 2px;
  }
  .cal-dow-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 6px;
  }
  .cal-dow-label {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .cal-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    min-height: 38px;
    border-radius: var(--radius-md);
    cursor: pointer;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s;
  }
  .cal-cell-day {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    line-height: 1;
  }
  .cal-cell-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }
  .cal-cell-missed-dot {
    position: absolute;
    top: 4px;
    right: 5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #ff6b6b;
  }
  .cal-legend {
    display: flex;
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 14px;
    padding-top: 13px;
    border-top: 0.5px solid var(--border);
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    color: var(--text-secondary);
    font-family: var(--font-sans);
  }
  .legend-swatch {
    width: 11px;
    height: 11px;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .legend-swatch--rest {
    background: rgba(255,255,255,0.18);
  }
  .legend-ring {
    width: 11px;
    height: 11px;
    border-radius: 4px;
    border: 1.5px solid;
    flex-shrink: 0;
  }
  .legend-ring--missed {
    border-color: #ff6b6b;
  }

  .cal-detail {
    padding: 12px 20px 100px;
  }
  .detail-card {
    background: var(--surface);
    border-radius: var(--radius-xl);
    padding: 18px;
    border: 0.5px solid;
  }
  .detail-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }
  .detail-date {
    min-width: 0;
  }
  .detail-date-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .detail-title {
    font-family: var(--font-sans);
    font-size: 22px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.6px;
    margin-top: 4px;
    line-height: 1.05;
  }
  .detail-subtitle {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 3px;
  }
  .detail-pill {
    flex-shrink: 0;
    padding: 5px 11px;
    border-radius: var(--radius-full);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    font-weight: 600;
    white-space: nowrap;
  }
  .detail-rest-note {
    margin-top: 14px;
    padding: 14px;
    border-radius: var(--radius-md);
    background: rgba(155,209,255,0.06);
    border: 0.5px solid rgba(155,209,255,0.18);
    font-size: 12.5px;
    color: var(--text);
    line-height: 1.5;
  }
  .detail-missed-note {
    margin-top: 14px;
    padding: 14px;
    border-radius: var(--radius-md);
    background: rgba(255,107,107,0.06);
    border: 0.5px solid rgba(255,107,107,0.2);
    font-size: 12.5px;
    color: var(--text);
    line-height: 1.5;
  }
  .detail-exercises {
    margin-top: 14px;
  }
  .detail-exercises.dim {
    opacity: 0.5;
  }
  .detail-ex-section-label {
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .detail-ex-divider {
    flex: 1;
    height: 0.5px;
    background: var(--border-medium);
  }
  .detail-ex-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
</style>
