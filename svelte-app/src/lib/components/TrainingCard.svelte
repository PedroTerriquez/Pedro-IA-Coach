<script lang="ts">
  import ExerciseRow from './ExerciseRow.svelte'
  import { getExerciseDisplayName, resolveExerciseMedia } from '$lib/data/exercise-dictionary'

  let {
    day,
    accent = 'var(--accent)',
    phaseLabel = 'Fase 02',
    title = 'Entrenamiento',
    todayExDone = 0,
    exercisesTotal = 0,
    exercisesById = {},
    onclick = () => {}
  }: {
    day: { name?: string; exercises?: Array<{ exerciseId: string; sets?: number; reps?: string }> }
    accent?: string
    phaseLabel?: string
    title?: string
    todayExDone?: number
    exercisesTotal?: number
    exercisesById?: Record<string, any>
    onclick?: () => void
  } = $props()
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="training-card"
  style="border-color:{accent}66;box-shadow:0 8px 28px {accent}12"
  role="button"
  tabindex="0"
  {onclick}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick() } }}
>
  <div class="between-row">
    <div class="phase-label">{phaseLabel}</div>
    <span class="status-pill" style="background:{accent}1a;border-color:{accent}40;color:{accent}">
      <span class="live-dot-sm" style="background:{accent};box-shadow:0 0 6px {accent}"></span>Sigue
    </span>
  </div>
  <div class="training-card-body">
    <div class="training-title">{title}</div>
    <div class="training-subtitle">{exercisesTotal} ejercicios</div>
  </div>
  <div class="progress-row">
    <div class="progress-track">
      <div class="progress-fill" style="background:{accent};width:{exercisesTotal > 0 ? (todayExDone / exercisesTotal) * 100 : 0}%"></div>
    </div>
    <span class="progress-count" style="color:{todayExDone > 0 ? accent : 'rgba(255,255,255,0.45)'}">{todayExDone}/{exercisesTotal}</span>
  </div>
  {#if day?.exercises && day.exercises.length > 0}
    <div class="exercise-list">
      {#each day.exercises as ex (ex.exerciseId)}
        {@const resolved = { ...ex, ...(exercisesById[ex.exerciseId] || {}) } as any}
        {@const imgUrl = resolveExerciseMedia(resolved).imgUrl}
        <ExerciseRow
          name={getExerciseDisplayName(resolved) || resolved.name}
          muscle={resolved.muscle || ''}
          {imgUrl}
          sets={ex.sets}
          reps={ex.reps}
          {accent}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .training-card {
    flex-shrink: 0;
    margin-top: 16px;
    display: flex;
    flex-direction: column;
    border-radius: 22px;
    cursor: pointer;
    padding: 18px 18px 16px;
    background: var(--surface);
    border: 0.5px solid;
  }

  .between-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .phase-label {
    display: flex;
    align-items: center;
    gap: 7px;
    font-family: var(--font-mono);
    font-size: 9.5px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.42);
    font-weight: 600;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 9999px;
    border: 0.5px solid;
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    font-weight: 600;
  }

  .live-dot-sm {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    display: inline-block;
  }

  .training-card-body {
    margin-top: 8px;
  }

  .training-title {
    font-family: var(--font-sans);
    font-size: 27px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.8px;
    line-height: 1;
  }

  .training-subtitle {
    margin-top: 4px;
    font-size: 12.5px;
    color: rgba(255,255,255,0.5);
  }

  .progress-row {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .progress-track {
    flex: 1;
    height: 4px;
    border-radius: 2px;
    background: rgba(255,255,255,0.1);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s;
  }

  .progress-count {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 0.4px;
  }

  .exercise-list {
    margin-top: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    z-index: 1;
  }
</style>
