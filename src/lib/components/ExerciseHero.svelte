<script lang="ts">
  import { getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import { settings } from '$lib/stores/settings'

  let { exercise, accent = 'var(--accent)', loggedToday = false, showGif = $bindable(false) }: {
    exercise: {
      name: string
      muscle: string
      imgUrl?: string
      gifUrl?: string
      sets: number
      reps: string
    }
    accent?: string
    loggedToday?: boolean
    showGif?: boolean
  } = $props()

  let displayName = $derived(getExerciseDisplayName(exercise, $settings.language))
</script>

<div class="hero-wrap" data-component="ExerciseHero">
  <div class="hero" class:logged-hero={loggedToday} style="border-color:{loggedToday ? accent : 'rgba(255,255,255,0.06)'};box-shadow:{loggedToday ? `0 0 0 4px ${accent}1a,0 8px 32px ${accent}22` : 'none'}">
    <div class="hero-media">
      {#if exercise.gifUrl}
        <div class="hero-gif-layer" style="opacity:{showGif ? 1 : 0}">
          <img src={exercise.gifUrl} alt="" class="hero-gif-img">
        </div>
      {/if}
      {#if exercise.imgUrl && !showGif}
        <div class="hero-img-layer" style="background-image:url({exercise.imgUrl})"></div>
      {/if}
    </div>
    {#if exercise.imgUrl && exercise.gifUrl && exercise.imgUrl !== exercise.gifUrl}
      <button class="hero-toggle" onclick={() => showGif = !showGif}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
      </button>
    {/if}
    <div class="hero-top-row">
      <span class="muscle-pill">{exercise.muscle}</span>
      {#if loggedToday}
        <span class="hecho-hoy-badge" style="background:{accent};color:#0a0a0a">
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><path d="M1 4.5l3 3L10 1" stroke="#0a0a0a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          HECHO HOY
        </span>
      {:else}
        <div class="accent-dot" style="background:{accent};box-shadow:0 0 10px {accent}"></div>
      {/if}
    </div>
    <div class="hero-bottom-row">
      <div class="hero-name-col">
        <div class="hero-name">{displayName}</div>
        <div class="hero-sets-reps-pill">
          <span class="sets-reps-num">{exercise.sets}</span>
          <span class="sets-reps-sep">×</span>
          <span class="sets-reps-num">{exercise.reps}</span>
          <span class="pill-unit">sets×reps</span>
        </div>
      </div>
      <div class="hero-search-btns">
        <a href="https://www.google.com/search?tbm=video&q={encodeURIComponent(displayName + ' exercise')}" target="_blank" rel="noopener noreferrer" class="search-btn hero-google-btn" aria-label="Buscar en Google">
          <svg width="15" height="15" viewBox="0 0 48 48" fill="none"><path d="M43.6 24.5c0-1.6-.1-3.1-.4-4.6H24v8.7h11c-.5 2.6-1.9 4.9-4 6.4v5.3h6.5c3.8-3.5 6-8.7 6-15.8z" fill="#4285F4"/><path d="M24 44c5.4 0 10-1.8 13.3-4.9l-6.5-5.3c-1.8 1.2-4.1 2-6.8 2-5.3 0-9.8-3.6-11.4-8.4H5v5.5C8.3 39.8 15.7 44 24 44z" fill="#34A853"/><path d="M12.6 27.4c-.8-2.4-.8-4.9 0-7.2v-5.5H5c-2.7 5.4-2.7 11.8 0 17.2l7.6-6.5z" fill="#FBBC05"/><path d="M24 10.3c2.9 0 5.5 1 7.5 3l5.6-5.6C33.8 4.6 29.4 3 24 3 15.7 3 8.3 7.2 5 13.7l7.6 6c1.6-4.8 6.1-8.4 11.4-8.4z" fill="#EA4335"/></svg>
        </a>
        <a href="snssdk1233://search/trending?keyword={encodeURIComponent(displayName + ' exercise')}" target="_blank" rel="noopener noreferrer" class="search-btn hero-tiktok-btn" aria-label="Buscar en TikTok">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
        </a>
      </div>
    </div>
  </div>
</div>

<style>
  .hero-wrap {
    padding: 12px 14px 0;
  }
  .hero {
    height: 360px;
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    background: #161616;
    border: 0.5px solid;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-sizing: border-box;
  }
  .logged-hero {
    box-shadow: 0 0 0 4px rgba(212,255,58,0.1), 0 8px 32px rgba(212,255,58,0.13);
  }
  .hero-media {
    position: absolute;
    inset: 0;
  }
  .hero-gif-layer,
  .hero-img-layer {
    position: absolute;
    inset: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }
  .hero-img-layer {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .hero-gif-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
  }
  .hero-toggle {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 5;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.1);
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }
  .hero-top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
    padding: 12px 14px;
  }
  .muscle-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: 9999px;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 0.5px solid rgba(255,255,255,0.1);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    text-transform: uppercase;
    white-space: nowrap;
  }
  .hecho-hoy-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 10px 4px 8px;
    border-radius: 9999px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    font-weight: 700;
    text-transform: uppercase;
    white-space: nowrap;
    box-shadow: 0 4px 12px rgba(212,255,58,0.33);
    animation: fadeUp 0.3s ease-out;
  }
  .accent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
  }
  .hero-bottom-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    position: relative;
    z-index: 1;
    padding: 0 14px 12px;
  }
  .hero-name-col {
    flex: 1;
    min-width: 0;
  }
  .hero-name {
    font-family: var(--font-sans);
    font-size: 26px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.6px;
    line-height: 1.05;
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  .hero-sets-reps-pill {
    margin-top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0,0,0,0.42);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    padding: 5px 12px;
    border-radius: 9999px;
    border: 0.5px solid rgba(255,255,255,0.1);
    font-family: var(--font-mono);
    font-size: 14px;
    color: rgba(255,255,255,0.85);
    white-space: nowrap;
  }
  .sets-reps-num {
    font-weight: 500;
  }
  .sets-reps-sep {
    color: rgba(255,255,255,0.45);
  }
  .pill-unit {
    margin-left: 4px;
    font-size: 9px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }
  .hero-search-btns {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
    align-items: center;
    position: relative;
    z-index: 3;
  }
  .search-btn {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 0.5px solid rgba(255,255,255,0.18);
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    text-decoration: none;
  }
</style>
