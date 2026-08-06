<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    blobColor = 'var(--accent)',
    borderColor = 'rgba(255,255,255,0.08)',
    padding = '24px',
    onclick,
    children
  }: {
    blobColor?: string
    borderColor?: string
    padding?: string
    onclick?: () => void
    children?: Snippet
  } = $props()
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="glow-card"
  data-component="GlowCard"
  style="padding:{padding};border-color:{borderColor};{onclick ? 'cursor:pointer' : ''}"
  onclick={onclick || undefined}
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? 0 : undefined}
  onkeydown={onclick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.() } } : undefined}
>
  <div class="glow-blob" style="background:{blobColor}"></div>
  <div class="glow-content">
    {#if children}{@render children()}{/if}
  </div>
</div>

<style>
  .glow-card {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    background: linear-gradient(155deg, #1a1a1a 0%, #0e0e0e 100%);
    border: 0.5px solid rgba(255,255,255,0.08);
    box-sizing: border-box;
  }
  .glow-blob {
    position: absolute;
    top: -40px;
    right: -40px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    opacity: 0.08;
    filter: blur(60px);
    pointer-events: none;
  }
  .glow-content {
    position: relative;
    z-index: 1;
  }
</style>
