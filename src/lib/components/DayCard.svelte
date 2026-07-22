<script lang="ts">
  let {
    dayName,
    dayNumber,
    title,
    subtitle = '',
    isToday = false,
    isMoved = false,
    movedFrom = '',
    exerciseCount = 0,
    duration,
    isRest = false,
    isExpanded = false,
    accent = 'var(--accent)',
    onclick,
    children
  }: {
    dayName: string
    dayNumber: number
    title: string
    subtitle?: string
    isToday?: boolean
    isMoved?: boolean
    movedFrom?: string
    exerciseCount?: number
    duration?: string
    isRest?: boolean
    isExpanded?: boolean
    accent?: string
    onclick?: () => void
    children?: any
  } = $props()
</script>

<div class="day-card" class:today={isToday} data-component="DayCard" style="--accent:{accent}">
  <button class="day-header" onclick={onclick} disabled={!onclick}>
    <div class="day-badge" class:today-badge={isToday} class:rest-badge={isRest}>
      <div class="badge-day">{dayName}</div>
      <div class="badge-num">{dayNumber}</div>
    </div>
    <div class="day-info">
      {#if title}
        <div class="day-title-row">
          <div class="day-title">{title}</div>
          {#if isToday}
            <div class="today-dot"></div>
          {/if}
        </div>
        {#if subtitle}
          <div class="day-subtitle">{subtitle}</div>
        {/if}
        {#if isMoved}
          <div class="moved-chip">↔ desde {movedFrom}</div>
        {/if}
      {:else}
        <div class="day-empty">Sin entrenamiento</div>
      {/if}
    </div>
    <div class="day-meta">
      {#if title && !isRest}
        <div class="meta-count">{exerciseCount}</div>
        <div class="meta-label">{duration ? `${duration}m` : 'ejercicios'}</div>
      {:else}
        <div class="meta-rest">{isRest ? 'DESC' : '—'}</div>
      {/if}
    </div>
  </button>

  {#if isExpanded && children}
    <div class="day-body">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .day-card {
    background: #141414;
    border-radius: 18px;
    border: 0.5px solid rgba(255,255,255,0.06);
    overflow: hidden;
    transition: border-color 0.18s, box-shadow 0.18s;
  }
  .day-card.today {
    border: 1px solid var(--accent);
  }

  .day-header {
    padding: 16px;
    position: relative;
    display: flex;
    gap: 14px;
    align-items: center;
    cursor: pointer;
    width: 100%;
    background: transparent;
    border: 0;
    text-align: left;
    color: inherit;
    font-family: inherit;
  }

  .day-badge {
    width: 42px;
    height: 42px;
    flex-shrink: 0;
    border-radius: 12px;
    background: rgba(255,255,255,0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 0.5px solid rgba(255,255,255,0.05);
  }
  .today-badge {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 0.5px solid var(--accent);
  }
  .rest-badge {
    background: rgba(155,209,255,0.1);
  }
  .badge-day {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.45);
    text-transform: uppercase;
  }
  .today-badge .badge-day {
    color: var(--accent);
  }
  .badge-num {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    color: #fafafa;
    line-height: 1;
  }

  .day-info {
    flex: 1;
    min-width: 0;
  }
  .day-title-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .day-title {
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 600;
    color: #fafafa;
    letter-spacing: -0.3px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .today-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
    flex-shrink: 0;
  }
  .day-subtitle {
    font-size: 11px;
    color: rgba(255,255,255,0.5);
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .day-empty {
    font-family: var(--font-sans);
    font-size: 15px;
    font-weight: 500;
    color: rgba(255,255,255,0.35);
    margin-top: 2px;
  }
  .moved-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 6px;
    padding: 3px 8px;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 0.5px solid color-mix(in srgb, var(--accent) 23%, transparent);
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 600;
    white-space: nowrap;
  }

  .day-meta {
    text-align: right;
  }
  .meta-count {
    font-family: var(--font-mono);
    font-size: 14px;
    color: #fafafa;
    font-weight: 500;
  }
  .meta-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    margin-top: 1px;
  }
  .meta-rest {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: #9bd1ff;
  }

  .day-body {
    padding: 0 16px 16px;
  }
</style>
