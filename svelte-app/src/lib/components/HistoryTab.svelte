<script lang="ts">
  import LineChart from './LineChart.svelte'
  import StatBlock from './StatBlock.svelte'

  let {
    allLogData = [],
    reversedLogs = [],
    maxWeight = 0,
    lastLog = null,
    totalGain = 0,
    pctChange = '0',
    weightCount = 0,
    accent = 'var(--accent)',
    units = 'kg',
    todayStr = ''
  }: {
    allLogData?: { weight: number; date: string; units?: string; sets?: number; reps?: string }[]
    reversedLogs?: { weight: number; date: string; units?: string; sets?: number; reps?: string }[]
    maxWeight?: number
    lastLog?: { weight: number; date: string } | null
    totalGain?: number
    pctChange?: string
    weightCount?: number
    accent?: string
    units?: string
    todayStr?: string
  } = $props()
</script>

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
          <span class="pct-pill">{parseFloat(pctChange) >= 0 ? '+' : ''}{pctChange}%</span>
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

<style>
  .tab-content {
    padding: 14px 20px 30px;
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
</style>
