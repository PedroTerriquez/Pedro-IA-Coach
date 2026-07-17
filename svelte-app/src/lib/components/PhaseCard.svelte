<script lang="ts">
  let {
    phaseLabel,
    title,
    subtitle,
    count,
    countLabel = 'movimientos',
    status = 'active',
    accent = 'var(--accent)',
    disabled = false,
    progress,
    phaseColor,
    bgSvg,
    onclick
  }: {
    phaseLabel: string
    title: string
    subtitle: string
    count: number
    countLabel?: string
    status: 'active' | 'completed' | 'locked'
    accent?: string
    disabled?: boolean
    progress?: { done: number; total: number }
    phaseColor?: string
    bgSvg?: string
    onclick?: () => void
  } = $props()

  let color = $derived(phaseColor || accent)
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="phase-card"
  class:completed={status === 'completed'}
  class:disabled
  style="--accent:{color};{disabled ? 'opacity:0.55' : ''}"
  onclick={disabled ? undefined : onclick}
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  onkeydown={onclick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.() } } : undefined}
>
  <div class="glow-blob"></div>
  {#if bgSvg}
    <div class="bg-svg">{@html bgSvg}</div>
  {/if}

  <div class="top-row">
    <div class="phase-num">{phaseLabel}</div>
    {#if status === 'completed'}
      <span class="badge badge-done">
        <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Completado
      </span>
    {:else if status === 'active'}
      <span class="badge badge-active">
        <span class="dot"></span>Sigue
      </span>
    {/if}
  </div>

  <div class="content">
    <div class="title">{title}</div>
    <div class="subtitle">{subtitle}</div>
  </div>

  <div class="bottom-row">
    <div class="count-area">
      <div class="count-text">{count} {countLabel}</div>
      {#if progress}
        <div class="progress-row">
          <div class="progress-track">
            <div class="progress-fill" style="width:{progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%"></div>
          </div>
          <span class="progress-label" style="color:{progress.done > 0 ? color : 'rgba(255,255,255,0.45)'}">{progress.done}/{progress.total}</span>
        </div>
      {/if}
    </div>
    <div class="action-btn" class:disabled-btn={disabled} style="background:{disabled ? 'rgba(255,255,255,0.05)' : status === 'completed' ? 'transparent' : color};border:{status === 'completed' ? `1.5px solid ${color}` : disabled ? '0.5px solid rgba(255,255,255,0.08)' : '0'};box-shadow:{disabled || status === 'completed' ? 'none' : `0 8px 22px ${color}55`}">
      {#if status === 'completed'}
        <svg width="22" height="17" viewBox="0 0 22 17" fill="none"><path d="M1 9l6.5 6.5L21 1.5" stroke={color} stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      {:else}
        <svg width="20" height="22" viewBox="0 0 20 22" fill="none" style="margin-left:3px"><path d="M3 2.6v16.8a1 1 0 001.52.85l13.8-8.4a1 1 0 000-1.7L4.52 1.75A1 1 0 003 2.6z" fill={disabled ? 'rgba(255,255,255,0.25)' : '#0a0a0a'}/></svg>
      {/if}
    </div>
  </div>
</div>

<style>
  .phase-card {
    flex: 1;
    min-height: 0;
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    cursor: pointer;
    padding: 18px 18px 16px;
    box-sizing: border-box;
    background: #141414;
    border: 0.5px solid color-mix(in srgb, var(--accent) 40%, transparent);
    box-shadow: 0 8px 28px color-mix(in srgb, var(--accent) 7%, transparent);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    transition: border-color 0.3s, box-shadow 0.3s, background 0.3s;
  }
  .phase-card.completed {
    background: linear-gradient(150deg, color-mix(in srgb, var(--accent) 12%, #131313) 0%, #131313 60%);
    border: 1px solid var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 7%, transparent), 0 10px 30px color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .phase-card.disabled {
    cursor: default;
  }

  .glow-blob {
    position: absolute;
    top: -70px;
    left: -40px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.07;
    filter: blur(60px);
    pointer-events: none;
  }
  .completed .glow-blob {
    opacity: 0;
  }

  .bg-svg {
    position: absolute;
    right: -18px;
    bottom: -22px;
    opacity: 0.05;
    color: var(--accent);
    pointer-events: none;
  }
  .completed .bg-svg {
    opacity: 0.16;
  }

  .top-row {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  .phase-num {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    font-weight: 600;
  }
  .completed .phase-num {
    color: var(--accent);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 9999px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
  }
  .badge-active {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 0.5px solid color-mix(in srgb, var(--accent) 25%, transparent);
    color: var(--accent);
  }
  .badge-done {
    background: var(--accent);
    font-weight: 700;
    color: #0a0a0a;
    box-shadow: 0 4px 12px color-mix(in srgb, var(--accent) 33%, transparent);
    padding: 4px 9px 4px 7px;
  }
  .dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 6px var(--accent);
    display: inline-block;
  }

  .content {
    position: relative;
    z-index: 1;
  }
  .title {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 27px;
    font-weight: 700;
    color: #fafafa;
    letter-spacing: -0.8px;
    line-height: 1;
  }
  .subtitle {
    margin-top: 4px;
    font-size: 12.5px;
    color: rgba(255,255,255,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .bottom-row {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .count-area {
    min-width: 0;
  }
  .count-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.3px;
    color: rgba(255,255,255,0.62);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .progress-row {
    margin-top: 7px;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .progress-track {
    width: 64px;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.1);
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
    transition: width 0.4s;
  }
  .progress-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    letter-spacing: 0.4px;
  }

  .action-btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }
  .disabled-btn {
    border: 0.5px solid rgba(255,255,255,0.08);
  }
</style>
