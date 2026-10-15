<script lang="ts">
  import type { Snippet } from 'svelte'
  import { DEFAULT_EXERCISE_IMG } from '$lib/data/exercise-dictionary'

  // An exercise reduced to its photo and name (alternatives, search results).
  // Without a photo it shows the default dumbbell. With `onclick` the whole card
  // is one button (its `trailing` must not be interactive); without it,
  // `trailing` can hold its own button (e.g. ✕).
  let { name, imgUrl = '', dimmed = false, onclick = undefined, trailing = undefined }: {
    name: string
    imgUrl?: string
    dimmed?: boolean
    onclick?: () => void
    trailing?: Snippet
  } = $props()

  let src = $derived(imgUrl || DEFAULT_EXERCISE_IMG)
</script>

{#snippet body()}
  <img {src} alt="" class="ph" loading="lazy">
  <span class="n">{name}</span>
  {#if trailing}<span class="tr">{@render trailing()}</span>{/if}
{/snippet}

{#if onclick}
  <button type="button" class="mc" class:dimmed disabled={dimmed} {onclick} data-component="ExerciseMiniCard">{@render body()}</button>
{:else}
  <div class="mc" class:dimmed data-component="ExerciseMiniCard">{@render body()}</div>
{/if}

<style>
  .mc {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 64px;
    padding: 8px 4px 8px 8px;
    border: 0;
    border-radius: 16px;
    background: var(--cv-fill-1);
    color: var(--text);
    font: inherit;
    text-align: left;
  }
  button.mc { cursor: pointer; }
  .mc.dimmed { opacity: 0.45; cursor: default; }
  .ph { display: block; width: 48px; height: 48px; border-radius: 12px; object-fit: cover; background: var(--text); }
  .n { font-size: 15px; font-weight: 600; letter-spacing: -0.1px; line-height: 1.3; text-wrap: pretty; }
  .tr { display: grid; place-items: center; min-width: 8px; color: var(--text-secondary); font-size: 13px; }
</style>
