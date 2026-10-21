<script lang="ts">
  import { DEFAULT_EXERCISE_IMG } from '$lib/data/exercise-dictionary'
  import { online } from '$lib/stores/network'
  import Icon from './Icon.svelte'

  // The 112 px media strip of Detalle v2. Exercises show their photo with
  // «Ver animación»; warmup / stretch moves show the whole GIF with «Ver en grande».
  let { kind = 'exercise', imgUrl = '', gifUrl = '', searchName }: {
    kind?: 'exercise' | 'move'
    imgUrl?: string
    gifUrl?: string
    /** Name searched on Google / TikTok */
    searchName: string
  } = $props()

  let showGif = $state(false)
  let big = $state(false)

  let canAnimate = $derived(kind === 'exercise' && !!gifUrl && !!imgUrl && gifUrl !== imgUrl)
  let moveSrc = $derived(gifUrl || imgUrl)
  let exerciseSrc = $derived(showGif && canAnimate ? gifUrl : imgUrl || gifUrl || DEFAULT_EXERCISE_IMG)
  let query = $derived(encodeURIComponent(searchName + ' exercise'))

  // Moving to another exercise starts again on its photo
  $effect(() => {
    void imgUrl
    showGif = false
  })

  function searchGoogle() {
    location.href = `https://www.google.com/search?tbm=video&q=${query}`
  }

  function searchTikTok() {
    location.href = `https://www.tiktok.com/search?q=${query}`
  }
</script>

{#snippet pills()}
  <div class="pills">
    <button type="button" class="img-p" aria-label="Buscar en Google" onclick={searchGoogle}><Icon name="search" size={15} />Google</button>
    <button type="button" class="img-p" aria-label="Buscar en TikTok" onclick={searchTikTok}><Icon name="play" size={14} />TikTok</button>
  </div>
{/snippet}

{#if !$online}
  <div class="media off" data-component="ExerciseMedia">la imagen carga al volver la conexión</div>
{:else if kind === 'move' && !moveSrc}
  <div class="media none" data-component="ExerciseMedia">
    <span>Sin imagen para este movimiento</span>
    {@render pills()}
  </div>
{:else if kind === 'move'}
  <div class="media fit" data-component="ExerciseMedia">
    <img src={moveSrc} alt="" />
    <button type="button" class="corner" aria-label="Ver en grande" onclick={() => (big = true)}><Icon name="expand" size={16} /></button>
    {@render pills()}
  </div>
{:else}
  <div class="media" data-component="ExerciseMedia">
    <img src={exerciseSrc} alt="" />
    {#if canAnimate}
      <button type="button" class="corner" aria-label="Ver animación" aria-pressed={showGif} onclick={() => (showGif = !showGif)}><Icon name="play" size={16} /></button>
    {/if}
    {@render pills()}
  </div>
{/if}

{#if big}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="big" role="presentation" onclick={() => (big = false)}>
    <img src={moveSrc} alt="" />
  </div>
{/if}

<style>
  .media { position: relative; height: 220px; border-radius: var(--radius-xl); background: var(--media-bg); overflow: hidden; flex-shrink: 0; }
  .media img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .media.fit img { object-fit: contain; }
  .media.none { background: var(--cv-fill-1); padding: 14px 16px; }
  .media.none > span { font-size: 14px; color: var(--text-tertiary); }
  .media.off {
    display: grid;
    place-items: center;
    background: repeating-linear-gradient(135deg, var(--cv-fill-1) 0 8px, rgba(255, 255, 255, 0.07) 8px 16px);
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.5px;
    color: var(--text-muted);
  }
  .corner {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: rgba(10, 10, 10, 0.6);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .pills { position: absolute; left: 8px; bottom: 8px; display: flex; gap: 6px; }
  .img-p {
    height: 44px;
    padding: 0 16px;
    border: 0;
    border-radius: var(--radius-full);
    background: rgba(10, 10, 10, 0.6);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 500;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    cursor: pointer;
  }
  .big { position: fixed; inset: 0; z-index: 160; display: grid; place-items: center; padding: 20px; background: var(--cv-scrim); }
  .big img { max-width: 100%; max-height: 80vh; border-radius: var(--radius-xl); background: var(--media-bg); object-fit: contain; }
</style>
