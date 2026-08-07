<script lang="ts">
  import { resolveExerciseMedia, getExerciseDisplayName } from '$lib/data/exercise-dictionary'
  import Icon from './Icon.svelte'

  let {
    alternatives = [],
    accent = 'var(--accent)',
    language = 'es',
    isSwapped = false,
    originalName = '',
    onSelect,
    onRevert
  }: {
    alternatives?: { name: string; reason: string }[]
    accent?: string
    language?: string
    isSwapped?: boolean
    originalName?: string
    onSelect: (alt: { name: string; reason: string }) => void
    onRevert: () => void
  } = $props()

  function media(alt: { name: string }) {
    return resolveExerciseMedia({ name: alt.name })
  }

  function displayName(alt: { name: string }) {
    return getExerciseDisplayName({ name: alt.name }, language)
  }
</script>

<div class="tab-content" data-component="AlternativesTab">
  {#if isSwapped}
    <button class="revert-row" onclick={onRevert}>
      <Icon name="restart" size={15} color={accent} />
      <span>Volver a {originalName}</span>
    </button>
  {/if}

  <div class="alt-label">¿Aparato ocupado? Prueba una alternativa</div>

  <div class="alt-list">
    {#each alternatives as alt}
      {@const m = media(alt)}
      <button class="alt-card" onclick={() => onSelect(alt)}>
        <div class="alt-thumb">
          {#if m.imgUrl}
            <img src={m.imgUrl} alt="" loading="lazy" />
          {:else}
            <Icon name="swap" size={18} color="rgba(255,255,255,0.4)" />
          {/if}
        </div>
        <div class="alt-info">
          <div class="alt-name">{displayName(alt)}</div>
          {#if alt.reason}<div class="alt-reason">{alt.reason}</div>{/if}
        </div>
        <div class="alt-chevron" style="color:{accent}">
          <Icon name="swap" size={15} color={accent} />
        </div>
      </button>
    {/each}
  </div>
</div>

<style>
  .tab-content {
    padding: 14px 20px 30px;
  }
  .revert-row {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 11px 14px;
    margin-bottom: 16px;
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
  }
  .alt-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 600;
    margin-bottom: 10px;
  }
  .alt-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .alt-card {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: var(--surface);
    border-radius: 14px;
    border: 0.5px solid var(--border);
    padding: 10px 12px;
    cursor: pointer;
  }
  .alt-thumb {
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255,255,255,0.04);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .alt-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .alt-info {
    flex: 1;
    min-width: 0;
  }
  .alt-name {
    font-family: var(--font-sans);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.1px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .alt-reason {
    margin-top: 2px;
    font-family: var(--font-sans);
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .alt-chevron {
    flex-shrink: 0;
    opacity: 0.8;
  }
</style>
