<script lang="ts">
  let { name, muscle, accent = 'var(--accent)', size = 'lg', imgUrl, actions }: {
    name: string
    muscle: string
    accent?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    imgUrl?: string
    actions?: import('svelte').Snippet
  } = $props()

  let h = $derived(({ sm: 80, md: 140, lg: 200, xl: 240 })[size] || 200)
  let fontSize = $derived(size === 'sm' ? '14px' : '22px')
</script>

<div class="placeholder" data-component="ExercisePlaceholder" style="height:{h}px" class:has-image={!!imgUrl}>
  {#if imgUrl}
    <div class="img-bg" style="background-image:url({imgUrl})">
      <div class="top-row">
        <span class="muscle-tag">{muscle}</span>
        <span class="accent-dot" style="background:{accent};box-shadow:0 0 10px {accent}"></span>
      </div>
      <div class="bottom-row">
        <span class="ex-name" style="font-size:{fontSize}">{name}</span>
        {#if actions}{@render actions()}{/if}
      </div>
    </div>
  {:else}
    <div class="no-img">
      <div class="glow" style="background:{accent}"></div>
      <div class="top-row">
        <span class="muscle-tag-muted">[ foto · {muscle} ]</span>
        <span class="accent-dot" style="background:{accent};box-shadow:0 0 10px {accent}"></span>
      </div>
      <div class="bottom-row">
        <span class="ex-name" style="font-size:{fontSize}">{name}</span>
        {#if actions}{@render actions()}{/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .placeholder {
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    background: #161616;
    border: 0.5px solid rgba(255,255,255,0.06);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 14px;
    box-sizing: border-box;
  }
  .has-image {
    background: #161616;
  }
  .img-bg {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
  .no-img {
    position: absolute;
    inset: 0;
    background: #161616;
    background-image: repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 24px, rgba(255,255,255,0.04) 24px 48px);
  }
  .glow {
    position: absolute;
    width: 220px;
    height: 220px;
    border-radius: 50%;
    opacity: 0.06;
    filter: blur(60px);
    top: -60px;
    right: -60px;
    pointer-events: none;
  }
  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    position: relative;
    z-index: 1;
  }
  .muscle-tag {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
    background: rgba(0,0,0,0.5);
    padding: 2px 8px;
    border-radius: 4px;
  }
  .muscle-tag-muted {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.5px;
    color: rgba(255,255,255,0.4);
    text-transform: uppercase;
  }
  .accent-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }
  .bottom-row {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    background: rgba(0,0,0,0.55);
    padding: 8px 10px;
    border-radius: 8px;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
  .ex-name {
    font-family: var(--font-sans);
    font-weight: 600;
    color: #fafafa;
    letter-spacing: -0.5px;
    line-height: 1.05;
  }
</style>
