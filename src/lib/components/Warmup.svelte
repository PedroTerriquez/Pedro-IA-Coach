<script lang="ts">
  import Sheet from './Sheet.svelte'
  import ProgressBar from './ProgressBar.svelte'
  import Button from './Button.svelte'

  let { items, mode, accent, onComplete }: {
    items: any[]
    mode: 'warmup' | 'stretch'
    accent: string
    onComplete?: () => void
  } = $props()

  let isOpen = $state(true)
  let idx = $state(0)
  let swiping = $state(false)
  let showGif = $state(true)

  let total = $derived(items.length)

  let item = $derived(items[idx])

  let gifUrl = $derived(item?.gif || '')

  let sections = $derived([
    { id: 'posInicial', label: 'Posición Inicial', value: item?.posInicial },
    { id: 'ejecucion', label: 'Ejecución', value: item?.ejecucion },
    { id: 'respiracion', label: 'Respiración', value: item?.respiracion },
    { id: 'duracion', label: 'Duración', value: item?.duracion },
  ])

  let hasSections = $derived(sections.some(s => s.value))

  let slideFrom = $state<'left' | 'right' | null>(null)
  let slideOut = $state(false)
  let slideDirection = $state<'left' | 'right'>('right')

  function goTo(newIdx: number, dir: 'left' | 'right') {
    if (swiping || newIdx < 0 || newIdx >= total) return
    swiping = true
    slideDirection = dir
    slideOut = true
    setTimeout(() => {
      idx = newIdx
      slideFrom = dir === 'right' ? 'right' : 'left'
      slideOut = false
      requestAnimationFrame(() => {
        setTimeout(() => {
          slideFrom = null
          swiping = false
        }, 400)
      })
    }, 150)
  }

  function next() {
    if (idx < total - 1) goTo(idx + 1, 'right')
  }

  function prev() {
    if (idx > 0) goTo(idx - 1, 'left')
  }

  function close() {
    isOpen = false
    if (onComplete) onComplete()
  }

  let touchStartX = 0
  let touchStartY = 0

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
  }

  function onTouchMove(e: TouchEvent) {
    if (swiping) return
    const dx = e.touches[0].clientX - touchStartX
    const dy = e.touches[0].clientY - touchStartY
    const swEl = document.querySelector('[data-sw]') as HTMLElement
    if (!swEl) return
    if (Math.abs(dx) > Math.abs(dy) * 0.7) {
      swEl.style.transform = `translateX(${dx * 0.3}px)`
      swEl.style.opacity = `${1 - Math.abs(dx) * 0.002}`
    }
  }

  function onTouchEnd(e: TouchEvent) {
    if (swiping) return
    const dx = e.changedTouches[0].clientX - touchStartX
    const dy = e.changedTouches[0].clientY - touchStartY
    const swEl = document.querySelector('[data-sw]') as HTMLElement
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx) * 0.7) {
      if (swEl) {
        swEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
        swEl.style.transform = 'translateX(0)'
        swEl.style.opacity = '1'
      }
      return
    }
    if (dx < 0 && idx < total - 1) {
      swiping = true
      if (swEl) {
        swEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
        swEl.style.transform = 'translateX(-30%)'
        swEl.style.opacity = '0'
        setTimeout(() => { idx++; swiping = false; slideFrom = 'right'; requestAnimationFrame(() => { setTimeout(() => { slideFrom = null }, 400) }) }, 150)
      } else { idx++; swiping = false }
    } else if (dx > 0 && idx > 0) {
      swiping = true
      if (swEl) {
        swEl.style.transition = 'transform 0.15s ease, opacity 0.15s ease'
        swEl.style.transform = 'translateX(30%)'
        swEl.style.opacity = '0'
        setTimeout(() => { idx--; swiping = false; slideFrom = 'left'; requestAnimationFrame(() => { setTimeout(() => { slideFrom = null }, 400) }) }, 150)
      } else { idx--; swiping = false }
    } else {
      if (swEl) {
        swEl.style.transition = 'transform 0.25s ease, opacity 0.25s ease'
        swEl.style.transform = 'translateX(0)'
        swEl.style.opacity = '1'
      }
    }
  }

  function toggleGif() {
    showGif = !showGif
  }
</script>

{#if items && items.length > 0}
  <Sheet bind:open={isOpen}>
    <div
      class="warmup-scroll"
      data-component="Warmup"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    >
      <div class="nav-row">
        <button class="nav-btn nav-prev" disabled={idx === 0} onclick={prev}>
          <div class="nav-icon">
            <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M10 5H1m0 0l4-4M1 5l4 4" stroke={idx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="nav-label-col">
            <div class="nav-sub">Anterior</div>
            <div class="nav-name">{items[idx - 1]?.name || 'Primero'}</div>
          </div>
        </button>
        <Button variant="primary" {accent} onclick={close} style="flex-shrink:0;box-shadow:0 4px 16px rgba(0,0,0,0.3)">
          <svg width="14" height="11" viewBox="0 0 14 11" fill="none"><path d="M1 5.5l4 4L13 1.5" stroke="var(--bg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Hecho
        </Button>
        <button class="nav-btn nav-next" disabled={idx >= total - 1} onclick={next}>
          <div class="nav-icon">
            <svg width="11" height="10" viewBox="0 0 11 10" fill="none"><path d="M1 5h9m0 0L6 1m4 4L6 9" stroke={idx >= total - 1 ? 'var(--text-muted)' : 'var(--text-secondary)'} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div class="nav-label-col">
            <div class="nav-sub">Siguiente</div>
            <div class="nav-name">{items[idx + 1]?.name || 'Último'}</div>
          </div>
        </button>
      </div>

      <div class="progress-row">
        <div class="step-label">{idx + 1} / {total}</div>
        <ProgressBar done={idx + 1} {total} {accent} showLabel={false} />
      </div>

      <div
        data-sw=""
        class="slide-container"
        style="transition:{slideFrom ? 'transform 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease' : (slideOut ? 'transform 0.15s ease, opacity 0.15s ease' : 'none')};transform:{slideFrom ? 'translateX(0)' : slideOut ? (slideDirection === 'right' ? 'translateX(-30%)' : 'translateX(30%)') : 'translateX(0)'};opacity:{slideFrom ? 1 : slideOut ? 0 : 1}"
      >
        <div class="hero-card-wrap">
          <div class="hero-card">
            <div class="hero-media-layer">
              {#if item?.imgUrl}
                <div class="hero-static" style="opacity:{showGif && gifUrl ? 0 : 1};background:url({item.imgUrl}) center/cover no-repeat"></div>
              {/if}
              {#if gifUrl}
                <div class="hero-gif" style="opacity:{showGif ? 1 : 0}">
                  <img src={gifUrl} alt="" class="hero-gif-img">
                </div>
              {/if}
            </div>
            {#if gifUrl}
              <button class="hero-toggle" onclick={toggleGif}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M2.5 12a9 9 0 0 1 15.5-5L21.5 8"/><path d="M2.5 22v-6h6"/><path d="M21.5 12a9 9 0 0 1-15.5 5L2.5 16"/></svg>
              </button>
            {/if}
            <div class="hero-tags">
              <span class="tag-pill">{item?.tag || ''}</span>
              {#if item?.stallbar}
                <span class="stallbar-badge">STALLBAR</span>
              {/if}
            </div>
            <div class="hero-title-wrap">
              <div class="hero-title">{item?.name}</div>
            </div>
          </div>
        </div>

        <div class="sections-wrap">
          {#if hasSections}
            {#each sections as s}
              {#if s.value}
                <div class="section-card">
                  <div class="section-label">
                    <div class="section-dot" style="background:{accent}"></div>
                    {s.label}
                  </div>
                  <div class="section-text">{s.value}</div>
                </div>
              {/if}
            {/each}
          {:else if item?.desc}
            <div class="section-card">
              <div class="section-label">
                <div class="section-dot" style="background:{accent}"></div>
                Cómo hacerlo
              </div>
              <div class="section-text">{item.desc}</div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Sheet>
{/if}

<style>
  .warmup-scroll {
    overflow: auto;
    flex: 1;
  }

  .nav-row {
    padding: 10px 14px 0;
    display: flex;
    gap: 8px;
  }

  .nav-btn {
    flex: 1;
    min-width: 0;
    background: var(--surface);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 8px 12px;
    color: inherit;
    text-align: left;
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    opacity: 1;
  }

  .nav-btn:disabled {
    background: rgba(255, 255, 255, 0.02);
    cursor: default;
    opacity: 0.45;
  }

  .nav-next {
    text-align: right;
    flex-direction: row-reverse;
  }

  .nav-icon {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    background: var(--border);
    border: 0.5px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nav-btn:disabled .nav-icon {
    background: rgba(255, 255, 255, 0.03);
  }

  .nav-label-col {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .nav-next .nav-label-col {
    align-items: flex-end;
  }

  .nav-sub {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1.3px;
    text-transform: uppercase;
    color: var(--text-muted);
    font-weight: 600;
    line-height: 1;
  }

  .nav-btn:disabled .nav-sub {
    color: var(--text-muted);
  }

  .nav-name {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: -0.1px;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    width: 100%;
  }

  .nav-next .nav-name {
    text-align: right;
  }

  .progress-row {
    padding: 8px 14px 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .step-label {
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.4px;
    color: var(--text-muted);
    font-weight: 500;
  }

  .slide-container {
    will-change: transform, opacity;
  }

  .hero-card-wrap {
    padding: 12px 14px 0;
  }

  .hero-card {
    height: 400px;
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
    background: var(--surface-2);
    border: 0.5px solid var(--border);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .hero-media-layer {
    position: absolute;
    inset: 0;
  }

  .hero-static {
    position: absolute;
    inset: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  .hero-gif {
    position: absolute;
    inset: 0;
    transition: opacity 0.35s;
    pointer-events: none;
  }

  .hero-gif-img {
    position: absolute;
    inset: 0;
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
    border: 0.5px solid var(--border-medium);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .hero-tags {
    display: flex;
    align-items: flex-start;
    position: relative;
    z-index: 1;
    padding: 12px;
    gap: 6px;
  }

  .tag-pill {
    display: inline-flex;
    align-items: center;
    padding: 4px 10px;
    border-radius: var(--radius-full);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border: 0.5px solid var(--border-medium);
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.2px;
    font-weight: 500;
    color: var(--text-secondary);
    text-transform: uppercase;
  }

  .stallbar-badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 8px;
    border-radius: 4px;
    background: #f59e0b;
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1.2px;
    text-transform: uppercase;
    color: var(--bg);
    font-weight: 600;
  }

  .hero-title-wrap {
    padding: 12px;
    position: relative;
    z-index: 1;
  }

  .hero-title {
    font-family: var(--font-sans);
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
    line-height: 1.1;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .sections-wrap {
    padding: 14px 18px 0;
  }

  .section-card {
    background: rgba(255, 255, 255, 0.02);
    border: 0.5px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 6px;
  }

  .section-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 8px;
  }

  .section-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }

  .section-text {
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.82);
    font-family: var(--font-sans);
    letter-spacing: -0.05px;
  }
</style>
