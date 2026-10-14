<script module lang="ts">
  export type ExerciseEditKind = 'datos' | 'consejos' | 'alternativas'
</script>

<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { muscleLabel } from '$lib/exercise-utils'
  import type { Exercise } from '$lib/types'
  import Button from './Button.svelte'
  import Icon from './Icon.svelte'
  import SectionLabel from './SectionLabel.svelte'

  // Row of Tú › Ejercicios. Opens in place to show tips and alternatives, with
  // one button per sheet (Datos / Consejos / Alternativas). `nav` = a row that
  // just opens something (Sin coincidencia).
  let { exercise, expanded = false, nav = false, ontoggle = () => {}, onedit = () => {} }: {
    exercise: Exercise
    expanded?: boolean
    nav?: boolean
    ontoggle?: (id: string) => void
    onedit?: (kind: ExerciseEditKind) => void
  } = $props()

  let media = $derived(resolveExerciseMedia(exercise))
  let muscle = $derived(muscleLabel(exercise.muscle))
</script>

<div class="xo" class:open={expanded} data-component="ExerciseListItem" data-exercise-id={exercise.id}>
  <button type="button" class="exercise-toggle" aria-expanded={nav ? undefined : expanded} onclick={() => ontoggle(exercise.id)}>
    {#if media.imgUrl}
      <img src={media.imgUrl} alt="" class="thumb" loading="lazy">
    {:else}
      <span class="thumb ph"></span>
    {/if}
    <span class="txt">
      <span class="ex-n">{exercise.name}</span>
      {#if muscle}<span class="ex-s">{muscle}</span>{/if}
    </span>
    <span class="chev"><Icon name={nav ? 'chev' : expanded ? 'up' : 'down'} size={nav ? 16 : 18} /></span>
  </button>

  {#if expanded && !nav}
    <div class="xo-b">
      {#if exercise.tips?.length}
        <SectionLabel sentence>Consejos</SectionLabel>
        <ul class="tl">{#each exercise.tips as tip}<li>{tip}</li>{/each}</ul>
      {/if}
      {#if exercise.alternatives?.length}
        <SectionLabel sentence>Alternativas</SectionLabel>
        {#each exercise.alternatives as alt}
          <div class="alt"><b>{alt.name}</b>{#if alt.reason}<span>{alt.reason}</span>{/if}</div>
        {/each}
      {/if}
      <SectionLabel sentence>Editar</SectionLabel>
      <div class="edit">
        <Button size="pill" variant="secondary" onclick={() => onedit('datos')}>Datos</Button>
        <div class="edit-row">
          <Button size="pill" variant="secondary" onclick={() => onedit('consejos')}>Consejos</Button>
          <Button size="pill" variant="secondary" onclick={() => onedit('alternativas')}>Alternativas</Button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .xo { display: flex; flex-direction: column; border-radius: var(--radius-xl); background: var(--surface); }
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
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font-size: 16px;
    font-weight: 600;
    letter-spacing: -0.2px;
    line-height: 1.25;
  }
  .ex-s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
  .chev { display: grid; color: var(--text-muted); }
  .xo-b { display: flex; flex-direction: column; gap: 10px; padding: 4px 16px 16px 18px; }
  .tl { list-style: none; display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; }
  .tl li { position: relative; padding-left: 16px; font-size: 15px; line-height: 1.4; color: var(--text-secondary); }
  .tl li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--cv-ring-current); }
  .alt { display: flex; flex-direction: column; gap: 2px; margin-bottom: 6px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--cv-fill-1); }
  .alt b { font-size: 15px; }
  .alt span { font-size: 13px; color: var(--text-tertiary); }
  .edit { display: flex; flex-direction: column; gap: 6px; }
  .edit-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .edit :global(.btn-base) { width: 100%; height: 48px; padding: 0 6px; border-radius: var(--radius-lg); }
</style>
