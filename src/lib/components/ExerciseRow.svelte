<script lang="ts">
  let { name, muscle, imgUrl, sets, reps, weight, units = 'kg', accent = 'var(--accent)', selectable = false, selected = false, onclick, actions }: {
    name: string
    muscle: string
    imgUrl?: string
    sets?: number
    reps?: string
    weight?: number
    units?: string
    accent?: string
    selectable?: boolean
    selected?: boolean
    onclick?: (e?: MouseEvent) => void
    actions?: import('svelte').Snippet
  } = $props()
</script>

<button class="exercise-row" class:selected data-component="ExerciseRow" {onclick} type="button">
  <div class="ex-thumb">
    {#if imgUrl}
      <img src={imgUrl} alt="" />
    {:else}
      <div class="ex-placeholder"></div>
    {/if}
  </div>
  <div class="ex-info">
    <div class="ex-name">{name}</div>
    <div class="ex-muscle">{muscle}</div>
  </div>
  <div class="ex-meta">
    {#if weight != null && weight > 0}
      <div class="ex-weight">{weight}<span class="ex-unit">{units}</span></div>
    {/if}
    {#if sets != null && reps}
      <div class="ex-sets">{sets}<span class="ex-x">x</span>{reps}</div>
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
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 10px;
    background: var(--bg);
    overflow: hidden;
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
    text-align: right;
    flex-shrink: 0;
  }

  .ex-weight {
    font-family: var(--font-mono);
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
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
</style>
