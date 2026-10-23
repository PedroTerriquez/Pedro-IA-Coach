<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { muscleLabel } from '$lib/exercise-utils'
  import type { Exercise } from '$lib/types'
  import Icon from './Icon.svelte'
  import TID from '$lib/test-ids.json'

  // Closed row of Tú › Ejercicios: thumbnail, name and muscle. Opening it shows
  // ExerciseCard in its place. `nav` = a row that just opens something (Sin coincidencia).
  let { exercise, nav = false, dimmed = false, ontoggle = () => {} }: {
    exercise: Exercise
    nav?: boolean
    /** Another exercise is open: this row steps back (still tappable) */
    dimmed?: boolean
    ontoggle?: (id: string) => void
  } = $props()

  let media = $derived(resolveExerciseMedia(exercise))
  let muscle = $derived(muscleLabel(exercise.muscle))
</script>

<div class="xo" class:dimmed data-component="ExerciseListItem" data-exercise-id={exercise.id}>
  <button type="button" class="exercise-toggle" data-testid={TID.exerciseToggle} aria-expanded={nav ? undefined : false} onclick={() => ontoggle(exercise.id)}>
    {#if media.imgUrl}
      <img src={media.imgUrl} alt="" class="thumb" loading="lazy">
    {:else}
      <span class="thumb ph"></span>
    {/if}
    <span class="txt">
      <span class="ex-n">{exercise.name}</span>
      {#if muscle}<span class="ex-s">{muscle}</span>{/if}
    </span>
    <span class="chev"><Icon name={nav ? 'chev' : 'down'} size={nav ? 16 : 18} /></span>
  </button>
</div>

<style>
  .xo { display: flex; flex-direction: column; border-radius: var(--radius-xl); background: var(--surface); transition: opacity 0.2s; }
  .xo.dimmed { opacity: 0.5; }
  .exercise-toggle {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 76px;
    padding: 12px 16px 12px 12px;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .thumb { width: 52px; height: 52px; border-radius: var(--radius-md); object-fit: cover; display: block; background: var(--text); }
  .thumb.ph { background: repeating-linear-gradient(135deg, var(--cv-fill-2) 0 6px, var(--cv-placeholder-stripe) 6px 12px); }
  .txt { min-width: 0; }
  .ex-n {
    display: block;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.25;
    text-wrap: pretty;
  }
  .ex-s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
  .chev { display: grid; color: var(--text-muted); }
</style>
