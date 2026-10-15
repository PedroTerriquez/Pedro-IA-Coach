<script lang="ts">
  import { resolveExerciseMedia } from '$lib/data/exercise-dictionary'
  import type { Exercise } from '$lib/types'
  import Button from './Button.svelte'
  import TextInput from './TextInput.svelte'

  // The dictionary image by default. «Pegar URL» shows the field (and pastes the
  // clipboard if it holds a URL); «Volver a la del diccionario» undoes it.
  let { value = $bindable(''), exercise }: {
    value: string
    exercise: Exercise | null
  } = $props()

  // Exercises created from the dictionary store its URL in imgUrl: that one still counts as «Del diccionario»
  let dictionaryImg = $derived(resolveExerciseMedia({ ...exercise, imgUrl: '' }).imgUrl)
  let custom = $derived(!!value.trim() && value.trim() !== dictionaryImg)
  // null = not touched yet: an exercise with its own URL opens on the field
  let manual = $state<boolean | null>(null)
  let editing = $derived(manual ?? custom)
  let thumb = $derived(resolveExerciseMedia({ ...exercise, imgUrl: value.trim() }).imgUrl)

  async function pasteUrl() {
    manual = true
    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (/^https?:\/\//.test(text)) value = text
    } catch { /* no clipboard permission: the field stays for typing */ }
  }

  function useDictionary() {
    value = ''
    manual = false
  }
</script>

{#snippet preview(size: number)}
  {#if thumb}
    <img src={thumb} alt="" class="thumb" style="width:{size}px;height:{size}px">
  {:else}
    <span class="thumb ph" style="width:{size}px;height:{size}px"></span>
  {/if}
{/snippet}

{#if editing}
  <div class="fw" data-component="ImageField">
    <span class="fl">Imagen · URL</span>
    <div class="url">
      {@render preview(52)}
      <TextInput variant="field" type="url" mono bind:value placeholder="https://…" oninput={() => manual = true} />
    </div>
    <Button size="lg" variant="text" style="align-self:flex-start;height:44px;padding:0 4px" onclick={useDictionary}>Volver a la del diccionario</Button>
  </div>
{:else}
  <div class="row" data-component="ImageField">
    {@render preview(40)}
    <span class="txt">
      <span class="l">Imagen</span>
      <span class="s">{thumb ? 'Del diccionario' : 'Sin imagen'}</span>
    </span>
    <Button size="lg" variant="text" style="height:44px;padding:0 14px" onclick={pasteUrl}>Pegar URL</Button>
  </div>
{/if}

<style>
  .fw { display: flex; flex-direction: column; gap: 8px; }
  .fl { font-size: 13px; color: var(--text-tertiary); padding-left: 4px; }
  .url { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 10px; align-items: center; }
  .row {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 0 4px 0 10px;
    border-radius: 16px;
    background: var(--cv-fill-1);
  }
  .thumb { display: block; border-radius: 12px; object-fit: cover; background: var(--text); }
  .url .thumb { border-radius: 14px; }
  .thumb.ph { background: repeating-linear-gradient(135deg, var(--cv-fill-2) 0 6px, var(--cv-placeholder-stripe) 6px 12px); }
  .txt { min-width: 0; }
  .l { display: block; font-size: 16px; font-weight: 500; letter-spacing: -0.2px; }
  .s { display: block; margin-top: 3px; font-size: 13px; color: var(--text-tertiary); }
</style>
