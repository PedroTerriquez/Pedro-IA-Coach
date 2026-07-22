<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import type { Exercise } from '$lib/types'
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'
  import TextArea from './TextArea.svelte'

  let {
    exercise,
    expanded = false,
    editing = false,
    editName = '',
    editMuscle = '',
    editImgUrl = '',
    editTips = '',
    editAlts = [],
    ontoggle = () => {},
    onbeginedit = () => {},
    oncanceledit = () => {},
    onsaveedit = () => {},
    ondelete = () => {},
    onaddalt = () => {},
    onremovealt = () => {},
    oneditnameinput = () => {},
    oneditmuscleinput = () => {},
    oneditimgurlinput = () => {},
    onedittipsinput = () => {},
    oneditaltschange = () => {}
  }: {
    exercise: Exercise
    expanded?: boolean
    editing?: boolean
    editName?: string
    editMuscle?: string
    editImgUrl?: string
    editTips?: string
    editAlts?: { name: string; reason: string }[]
    ontoggle?: (id: string) => void
    onbeginedit?: () => void
    oncanceledit?: () => void
    onsaveedit?: () => void
    ondelete?: (ex: Exercise) => void
    onaddalt?: () => void
    onremovealt?: (i: number) => void
    oneditnameinput?: (val: string) => void
    oneditmuscleinput?: (val: string) => void
    oneditimgurlinput?: (val: string) => void
    onedittipsinput?: (val: string) => void
    oneditaltschange?: (alts: { name: string; reason: string }[]) => void
  } = $props()

  let localAlts = $state([...editAlts.map(a => ({ ...a }))])

  $effect(() => {
    localAlts = [...editAlts.map(a => ({ ...a }))]
  })

  function updateAltName(i: number, val: string) {
    localAlts[i].name = val
    oneditaltschange([...localAlts.map(a => ({ ...a }))])
  }

  function updateAltReason(i: number, val: string) {
    localAlts[i].reason = val
    oneditaltschange([...localAlts.map(a => ({ ...a }))])
  }

  function removeAlt(i: number) {
    onremovealt(i)
  }

  let media = $derived(resolveExerciseMedia(exercise))
</script>

<div class="card exercise-item" data-exercise-id={exercise.id}>
  <button class="exercise-toggle" onclick={() => ontoggle(exercise.id)}>
    {#if media.imgUrl}
      <img src={media.imgUrl} alt="" class="exercise-img">
    {:else}
      <div class="exercise-img-placeholder"></div>
    {/if}
    <div class="exercise-info">
      <div class="exercise-name">{exercise.name}</div>
      <div class="exercise-muscle">{exercise.muscle}</div>
    </div>
    <span class="exercise-chevron">{expanded ? '▲' : '▼'}</span>
  </button>

  {#if expanded}
    <div class="exercise-expanded">
      {#if editing}
        <div class="stack edit-stack">
          <TextInput value={editName} oninput={oneditnameinput} placeholder="Nombre" />
          <TextInput value={editMuscle} oninput={oneditmuscleinput} placeholder="Músculo" />
          <TextInput value={editImgUrl} oninput={oneditimgurlinput} placeholder="URL de imagen" />
          <TextArea value={editTips} oninput={onedittipsinput} rows={3} placeholder="Consejos (uno por línea)" compact />
          <div>
            <div class="alt-label">Alternativas</div>
            {#each localAlts as alt, i}
              <div class="alt-row">
                <input value={alt.name} oninput={(e) => updateAltName(i, (e.target as HTMLInputElement).value)} placeholder="Nombre" class="input-sm">
                <input value={alt.reason} oninput={(e) => updateAltReason(i, (e.target as HTMLInputElement).value)} placeholder="Razón" class="input-sm input-sm-alt">
                <button onclick={() => removeAlt(i)} class="alt-remove">✕</button>
              </div>
            {/each}
            <button onclick={onaddalt} class="btn-add-alt">+ Añadir alternativa</button>
          </div>
          <div class="row">
            <Button variant="primary" fullWidth onclick={onsaveedit}>Guardar</Button>
            <Button variant="secondary" fullWidth onclick={oncanceledit}>Cancelar</Button>
          </div>
        </div>
      {:else}
        <div class="row edit-actions">
          <Button variant="secondary" fullWidth onclick={onbeginedit}>Editar</Button>
          <Button variant="danger" fullWidth onclick={() => ondelete(exercise)}>Eliminar</Button>
        </div>
        {#if exercise.tips && exercise.tips.length > 0}
          <div class="tips-section">
            <div class="section-sublabel">Consejos</div>
            {#each exercise.tips as tip}
              <div class="tip-item">• {tip}</div>
            {/each}
          </div>
        {/if}
        {#if exercise.alternatives && exercise.alternatives.length > 0}
          <div class="alts-section">
            <div class="section-sublabel">Alternativas</div>
            {#each exercise.alternatives as alt}
              <div class="alt-item">
                <div class="alt-item-name">{alt.name}</div>
                {#if alt.reason}<div class="alt-item-reason">{alt.reason}</div>{/if}
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/if}
</div>

<style>
  .exercise-item { margin: 0 20px; padding: 0; overflow: hidden; }
  .exercise-toggle { width: 100%; background: transparent; border: 0; cursor: pointer; padding: 14px; display: flex; align-items: center; gap: 12px; color: inherit; text-align: left; font-family: inherit; }
  .exercise-img { width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; background: #0a0a0a; }
  .exercise-img-placeholder { width: 44px; height: 44px; border-radius: 8px; flex-shrink: 0; background: #0a0a0a; }
  .exercise-info { flex: 1; min-width: 0; text-align: left; }
  .exercise-name { font-family: var(--font-sans); font-size: 14px; font-weight: 600; color: #fafafa; letter-spacing: -0.3px; }
  .exercise-muscle { font-size: 11px; color: rgba(255,255,255,0.45); margin-top: 2px; }
  .exercise-chevron { font-size: 10px; color: rgba(255,255,255,0.3); font-family: var(--font-mono); }
  .exercise-expanded { padding: 0 14px 14px; border-top: 0.5px solid rgba(255,255,255,0.04); }
  .edit-stack { margin-top: 12px; }
  .edit-actions { margin-top: 12px; }
  .stack { display: flex; flex-direction: column; gap: 8px; }
  .row { display: flex; gap: 10px; align-items: center; }
  .section-sublabel { font-size: 10px; color: rgba(255,255,255,0.4); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
  .tips-section { margin-top: 10px; }
  .tip-item { font-size: 12px; color: rgba(255,255,255,0.7); padding: 4px 0; border-bottom: 0.5px solid rgba(255,255,255,0.03); }
  .alts-section { margin-top: 10px; }
  .alt-item { padding: 6px 0; border-bottom: 0.5px solid rgba(255,255,255,0.03); }
  .alt-item-name { font-size: 13px; color: #fafafa; font-weight: 600; }
  .alt-item-reason { font-size: 11px; color: rgba(255,255,255,0.5); }
  .alt-label { font-size: 11px; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
  .alt-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
  .input-sm { flex: 1; padding: 8px 10px; border-radius: 8px; border: 0.5px solid rgba(255,255,255,0.1); background: #0a0a0a; color: #fafafa; font-size: 13px; outline: none; box-sizing: border-box; font-family: var(--font-sans); }
  .input-sm-alt { border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.6); font-size: 12px; }
  .alt-remove { background: none; border: 0; color: #ff6b6b; cursor: pointer; font-size: 16px; padding: 4px; }
  .btn-add-alt { width: 100%; padding: 8px; border-radius: 8px; border: 0.5px dashed rgba(255,255,255,0.15); cursor: pointer; background: transparent; color: rgba(255,255,255,0.5); font-size: 12px; }
</style>
