<script lang="ts">
  let { name, muscle, imgUrl, sets, reps, weight, units = 'kg', accent = 'var(--accent)', weightIsTarget = false, selectable = false, selected = false, done = false, onclick, actions }: {
    name: string
    muscle: string
    imgUrl?: string
    sets?: number
    reps?: string
    weight?: number
    units?: string
    accent?: string
    weightIsTarget?: boolean
    selectable?: boolean
    selected?: boolean
    done?: boolean
    onclick?: (e?: MouseEvent) => void
    actions?: import('svelte').Snippet
  } = $props()
</script>

<button class="exercise-row" class:selected class:row-done={done} data-component="ExerciseRow" data-done={done ? 'true' : 'false'} {onclick} type="button">
  <div class="ex-thumb">
    {#if imgUrl}
      <img src={imgUrl} alt="" />
    {:else}
      <div class="ex-placeholder"></div>
    {/if}
    {#if done}
      <div class="ex-done-badge">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
      </div>
    {/if}
  </div>
  <div class="ex-info">
    <div class="ex-name">{name}</div>
    <div class="ex-muscle">{muscle}</div>
  </div>
  <div class="ex-meta">
    {#if sets != null && reps}
      <div class="ex-sets">{sets}<span class="ex-x">x</span>{reps}</div>
    {/if}
    {#if weight != null && weight > 0}
      <div
        class="weight-pill"
        class:target={weightIsTarget}
        style={weightIsTarget ? `border-color:${accent};color:${accent}` : `background:${accent}26`}
      >
        {#if weightIsTarget}
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={accent} stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        {:else}
          {weight}<span class="ex-unit">{units}</span>
        {/if}
      </div>
    {/if}
  </div>
  {#if actions}
    <div class="ex-actions">{@render actions()}</div>
  {/if}
</button>

<style>
  .exercise-row {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 0;
    background: transparent;
    border: 0;
    color: inherit;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
  }

  .exercise-row.selected {
    background: rgba(255, 255, 255, 0.03);
    border-radius: var(--radius-md);
    padding: 8px;
    margin: 0 -8px;
  }

  .ex-thumb {
    position: relative;
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--bg);
    overflow: hidden;
    box-sizing: border-box;
  }

  .ex-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .ex-placeholder {
    width: 100%;
    height: 100%;
    background-image: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 4px,
      var(--border-medium) 4px,
      var(--border-medium) 8px
    );
  }

  .ex-info {
    flex: 1;
    min-width: 0;
  }

  .ex-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ex-muscle {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: 1px;
  }

  .ex-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .weight-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 4px 10px;
    border-radius: 9999px;
    border: 1px solid transparent;
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
  }

  .weight-pill.target {
    background: transparent;
    border-style: dashed;
    border-width: 1.5px;
    padding: 4px 8px;
  }

  .ex-unit {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-secondary);
    margin-left: 1px;
  }

  .ex-sets {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .ex-x {
    font-size: 10px;
    margin: 0 1px;
  }

  .ex-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .exercise-row.row-done .ex-thumb {
    border: 2px solid #34c759;
  }

  .exercise-row.row-done .ex-thumb img {
    border: 2px solid #34c759;
    border-radius: 8px;
    box-sizing: border-box;
  }

  .exercise-row.row-done .ex-name {
    opacity: 0.55;
  }

  .ex-done-badge {
    position: absolute;
    right: 2px;
    bottom: 2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: #34c759;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
