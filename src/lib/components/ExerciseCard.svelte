<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import { muscleLabel } from '$lib/exercise-utils'
  import { alternativeImage } from '$lib/alternative-search'
  import type { Exercise } from '$lib/types'
  import Icon from './Icon.svelte'
  import ExerciseMiniCard from './ExerciseMiniCard.svelte'

  // An open exercise in Tú › Ejercicios: shows its tips and alternatives.
  // Everything is edited in «Editar ejercicio» (the pencil).
  let { exercise, exercises, onclose, onedit }: {
    exercise: Exercise
    /** All the user's exercises, for the alternatives' photos */
    exercises: Exercise[]
    onclose: () => void
    onedit: () => void
  } = $props()

  let media = $derived(resolveExerciseMedia(exercise))
  let muscle = $derived(muscleLabel(exercise.muscle))
  let tips = $derived(exercise.tips ?? [])
  let alts = $derived(exercise.alternatives ?? [])
</script>

<div class="x3" data-component="ExerciseCard" data-exercise-id={exercise.id}>
  <div class="hd">
    <button type="button" class="exercise-toggle" aria-expanded="true" onclick={onclose}>
      {#if media.imgUrl}<img src={media.imgUrl} alt="" class="thumb">{:else}<span class="thumb ph"></span>{/if}
      <span class="txt">
        <span class="ex-n">{exercise.name}</span>
        {#if muscle}<span class="ex-s">{muscle}</span>{/if}
      </span>
    </button>
    <button type="button" class="pen" aria-label="Editar ejercicio" onclick={onedit}><Icon name="pen" size={18} /></button>
    <button type="button" class="up" aria-label="Cerrar" onclick={onclose}><Icon name="up" size={18} /></button>
  </div>

  <div class="bd">
    {#if tips.length}
      <section>
        <div class="lbl">Consejos<b>{tips.length}</b></div>
        <ul class="tl">{#each tips as tip}<li>{tip}</li>{/each}</ul>
      </section>
    {/if}
    {#if alts.length}
      <section>
        <div class="lbl">Alternativas<b>{alts.length}</b></div>
        <div class="alts">
          {#each alts as alt}
            <ExerciseMiniCard name={alt.name} imgUrl={alternativeImage(alt.name, exercises)} />
          {/each}
        </div>
      </section>
    {/if}
    {#if !tips.length && !alts.length}
      <button type="button" class="inv" onclick={onedit}>
        <b><Icon name="plus" size={18} />Añadir consejos y alternativas</b>
        <span>Frases cortas de técnica y otros ejercicios para cuando la máquina esté ocupada.</span>
      </button>
    {/if}
  </div>
</div>

<style>
  /* Raised above the list (lighter surface, hairline, shadow) so it takes the attention;
     the closed rows dim meanwhile (ExercisesScreen) */
  .x3 {
    display: flex;
    flex-direction: column;
    margin: 4px 0;
    border-radius: var(--radius-xl);
    background: var(--surface-hover);
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1), 0 12px 32px rgba(0, 0, 0, 0.55);
  }
  .hd { display: grid; grid-template-columns: minmax(0, 1fr) 44px 40px; align-items: center; gap: 6px; padding: 12px 6px 8px 12px; }
  .exercise-toggle {
    display: grid;
    grid-template-columns: 52px minmax(0, 1fr);
    align-items: center;
    gap: 14px;
    width: 100%;
    min-height: 56px;
    padding: 0;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }
  .thumb { display: block; width: 52px; height: 52px; border-radius: var(--radius-md); object-fit: cover; background: var(--text); }
  .thumb.ph { background: repeating-linear-gradient(135deg, var(--cv-fill-2) 0 6px, var(--cv-placeholder-stripe) 6px 12px); }
  .txt { min-width: 0; }
  .ex-n { display: block; font-size: 18px; font-weight: 600; letter-spacing: -0.3px; line-height: 1.2; text-wrap: pretty; }
  .ex-s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
  .pen { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 50%; background: rgba(255, 255, 255, 0.07); color: var(--text); cursor: pointer; }
  .up { display: grid; place-items: center; width: 40px; height: 44px; border: 0; background: none; color: var(--text-tertiary); cursor: pointer; }

  .bd { display: flex; flex-direction: column; gap: 18px; padding: 6px 12px 14px; }
  section { display: flex; flex-direction: column; gap: 8px; }
  .lbl { display: flex; align-items: baseline; gap: 8px; padding: 0 6px; font-size: 14px; font-weight: 500; color: var(--text-secondary); }
  .lbl b { font-family: var(--font-mono); font-size: 12px; font-weight: 400; color: var(--text-muted); }
  .tl { list-style: none; display: flex; flex-direction: column; gap: 6px; padding: 0 6px; }
  .tl li { position: relative; padding-left: 16px; font-size: 15px; line-height: 1.4; color: var(--text-secondary); text-wrap: pretty; }
  .tl li::before { content: ''; position: absolute; left: 2px; top: 9px; width: 5px; height: 5px; border-radius: 50%; background: var(--cv-ring-current); }
  .alts { display: flex; flex-direction: column; gap: 6px; }
  .inv {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 14px;
    border: 1px dashed rgba(255, 255, 255, 0.16);
    border-radius: 16px;
    background: none;
    color: var(--text);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .inv b { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
  .inv span { padding-left: 26px; font-size: 13px; line-height: 1.4; color: var(--text-tertiary); text-wrap: pretty; }
</style>
