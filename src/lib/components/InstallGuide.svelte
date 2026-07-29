<script lang="ts">
  import { getPlatform } from '$lib/pwa'
  import { base } from '$app/paths'

  let {
    open = false,
    accent = 'var(--accent)',
    onclose = () => {}
  }: {
    open?: boolean
    accent?: string
    onclose?: () => void
  } = $props()

  let platform = $derived(getPlatform())
  let step = $state(0)

  $effect(() => {
    if (open) step = 0
  })

  function next() { if (step < totalSteps - 1) step++ }
  function prev() { if (step > 0) step-- }

  const iosSteps = [
    {
      title: 'Abre Safari',
      desc: 'Abre la página en Safari, no en Chrome ni en otra app',
      visual: 'safari'
    },
    {
      title: 'Toca Compartir',
      desc: 'Toca el icono de compartir <strong>⎙</strong> en la barra inferior de Safari',
      visual: 'share'
    },
    {
      title: 'Agregar a inicio',
      desc: 'Desplázate y selecciona <strong>Agregar a pantalla de inicio</strong>',
      visual: 'addhome'
    },
    {
      title: 'Confirma',
      desc: 'Toca <strong>Agregar</strong> en la esquina superior derecha',
      visual: 'confirm'
    }
  ]

  const androidSteps = [
    {
      title: 'Abre Chrome',
      desc: 'Usa Google Chrome como navegador',
      visual: 'chrome'
    },
    {
      title: 'Abre el menú',
      desc: 'Toca los tres puntos <strong>⋯</strong> en la esquina superior derecha',
      visual: 'menu'
    },
    {
      title: 'Instalar app',
      desc: 'Selecciona <strong>Instalar app</strong> o <strong>Agregar a pantalla de inicio</strong>',
      visual: 'install'
    },
    {
      title: 'Confirma',
      desc: 'Toca <strong>Instalar</strong> en el diálogo de confirmación',
      visual: 'confirm'
    }
  ]

  const steps = $derived(platform === 'ios' ? iosSteps : androidSteps)
  const totalSteps = $derived(steps.length)
  const isIOS = $derived(platform === 'ios')

  function handleBackdrop(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose()
  }
</script>

{#if open}
  <div class="guide-backdrop" data-component="InstallGuide" role="dialog" tabindex="0"
    onclick={handleBackdrop} onkeydown={(e) => { if (e.key === 'Escape') onclose() }}>
    <div class="guide-panel">
      <div class="guide-header">
        <div class="guide-title">Instalar app</div>
        <button class="guide-close" onclick={onclose} aria-label="Cerrar">✕</button>
      </div>

      <div class="visual-area">
        {#if isIOS}
          <div class="phone-silhouette">
            <div class="ps-notch"></div>
            <div class="ps-url-bar">
              <span class="ps-url">coachpedro.ai</span>
            </div>
            <div class="ps-content">
              <div class="ps-line"></div>
              <div class="ps-line short"></div>
              <div class="ps-line"></div>
            </div>
            <div class="ps-toolbar">
              <span class="ps-tb-icon">&lt;</span>
              <span class="ps-tb-icon">&gt;</span>
              <span class="ps-tb-icon share-btn-icon">
                <img src="{base}/icons/ios-share-button.svg" alt="Compartir" class="share-svg">
                {#if step === 1}
                  <span class="bounce-arrow-wrap">
                    <img src="{base}/icons/ios-bouncing-arrow.svg" alt="" class="bounce-arrow">
                  </span>
                {/if}
              </span>
              <span class="ps-tb-icon">☰</span>
              <span class="ps-tb-icon">+</span>
            </div>
          </div>
        {:else}
          <div class="phone-silhouette">
            <div class="ps-notch"></div>
            <div class="ps-url-bar">
              <span class="ps-url">coachpedro.ai</span>
              {#if step === 1}
                <span class="menu-dots-icon">
                  <img src="{base}/icons/android-menu-dots.svg" alt="Menú" class="menu-svg">
                  <span class="bounce-arrow-wrap down">
                    <img src="{base}/icons/ios-bouncing-arrow.svg" alt="" class="bounce-arrow">
                  </span>
                </span>
              {:else}
                <span class="menu-dots-icon">
                  <img src="{base}/icons/android-menu-dots.svg" alt="Menú" class="menu-svg">
                </span>
              {/if}
            </div>
            <div class="ps-content">
              <div class="ps-line"></div>
              <div class="ps-line short"></div>
              <div class="ps-line"></div>
            </div>
            <div class="ps-toolbar">
              <span class="ps-tb-icon">◁</span>
              <span class="ps-tb-icon">◁</span>
              <span class="ps-tb-icon">□</span>
              <span class="ps-tb-icon">☰</span>
            </div>
          </div>
        {/if}

        <div class="step-counter" style="background:{accent};color:#0a0a0a">
          {step + 1} / {totalSteps}
        </div>

        {#if isIOS && step === 2}
          <div class="callout">
            <span class="callout-icon">📲</span>
            <span class="callout-text">Agregar a pantalla de inicio</span>
          </div>
        {/if}
        {#if !isIOS && (step === 2 || step === 3)}
          <div class="callout">
            <span class="callout-icon">📲</span>
            <span class="callout-text">Instalar app</span>
          </div>
        {/if}
      </div>

      <div class="nav-row">
        <button class="nav-btn" onclick={prev} disabled={step === 0} aria-label="Anterior">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 4l-5 5 5 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
        </button>
        <div class="nav-dots">
          {#each { length: totalSteps } as _, i}
            <button class="nav-dot" class:active={i === step} onclick={() => step = i}
              style:background={i === step ? accent : ''} aria-label="Paso {i + 1}"></button>
          {/each}
        </div>
        <button class="nav-btn" onclick={next} disabled={step === totalSteps - 1} aria-label="Siguiente">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M7 4l5 5-5 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
        </button>
      </div>

      <div class="step-info">
        <div class="step-title-wrap">
          <span class="step-num" style="color:{accent}">{step + 1}.</span>
          {steps[step].title}
        </div>
        <div class="step-desc">{@html steps[step].desc}</div>
      </div>

      <div class="guide-footer">
        <button class="guide-btn" style="background:{accent};color:#0a0a0a" onclick={onclose}>
          Entendido
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .guide-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0,0,0,0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .guide-panel {
    background: #141414;
    border-radius: 24px;
    padding: 20px 20px 18px;
    max-width: 340px;
    width: 100%;
    border: 0.5px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    animation: fadeUp 0.25s ease-out;
    max-height: 95vh;
    overflow-y: auto;
  }
  @keyframes fadeUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  .guide-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .guide-title {
    font-family: var(--font-sans);
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.3px;
  }
  .guide-close {
    background: none;
    border: none;
    color: rgba(255,255,255,0.35);
    font-size: 18px;
    cursor: pointer;
    padding: 4px;
    line-height: 1;
  }

  /* ── Phone silhouette ── */
  .visual-area {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 12px;
    min-height: 200px;
  }
  .phone-silhouette {
    width: 148px;
    height: 240px;
    background: #0f0f0f;
    border-radius: 20px;
    border: 1.5px solid #2a2a2a;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .ps-notch {
    display: flex;
    justify-content: center;
    padding: 4px 0 2px;
  }
  .ps-notch::after {
    content: '';
    width: 36px;
    height: 7px;
    background: #1a1a1a;
    border-radius: 999px;
  }
  .ps-url-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 3px 10px;
    gap: 4px;
  }
  .ps-url {
    font-size: 7px;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.07);
    padding: 3px 10px;
    border-radius: 999px;
    text-align: center;
    flex: 1;
    max-width: 110px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-family: var(--font-sans);
  }
  .menu-dots-icon {
    position: relative;
    display: flex;
    align-items: center;
  }
  .menu-svg {
    width: 18px;
    height: 18px;
  }
  .ps-content {
    flex: 1;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ps-line {
    height: 12px;
    background: rgba(255,255,255,0.06);
    border-radius: 4px;
  }
  .ps-line.short { width: 55%; }

  .ps-toolbar {
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 4px 6px 6px;
    border-top: 0.5px solid rgba(255,255,255,0.06);
  }
  .ps-tb-icon {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: rgba(255,255,255,0.25);
    position: relative;
  }
  .share-btn-icon {
    position: relative;
  }
  .share-svg {
    width: 18px;
    height: 22px;
    filter: brightness(2);
  }

  /* ── Bouncing arrow ── */
  .bounce-arrow-wrap {
    position: absolute;
    top: -40px;
    left: 50%;
    transform: translateX(-50%);
    animation: bounceDown 1.5s ease-in-out infinite;
    pointer-events: none;
    z-index: 5;
  }
  .bounce-arrow-wrap.down {
    top: 32px;
    left: auto;
    right: -6px;
    transform: rotate(90deg);
    transform-origin: center;
  }
  .bounce-arrow {
    width: 24px;
    height: 24px;
  }
  @keyframes bounceDown {
    0%, 100% { transform: translateX(-50%) translateY(0); opacity: 1; }
    50% { transform: translateX(-50%) translateY(8px); opacity: 0.5; }
  }
  .bounce-arrow-wrap.down {
    animation: bounceRight 1.5s ease-in-out infinite;
  }
  @keyframes bounceRight {
    0%, 100% { transform: rotate(90deg) translateX(0); opacity: 1; }
    50% { transform: rotate(90deg) translateX(6px); opacity: 0.5; }
  }

  .step-counter {
    position: absolute;
    top: 4px;
    right: 4px;
    font-family: var(--font-mono);
    font-size: 7px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 999px;
    opacity: 0.8;
    z-index: 2;
  }

  .callout {
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.1);
    border-radius: 10px;
    padding: 8px 12px;
    animation: fadeIn 0.3s ease-out;
  }
  .callout-icon { font-size: 16px; }
  .callout-text {
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 600;
    color: var(--text);
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* ── Navigation ── */
  .nav-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin: 6px 0 10px;
  }
  .nav-btn {
    background: none;
    border: none;
    color: rgba(255,255,255,0.4);
    cursor: pointer;
    padding: 4px;
    line-height: 0;
    transition: color 0.15s;
  }
  .nav-btn:hover { color: var(--text); }
  .nav-btn:disabled { opacity: 0.2; cursor: default; }
  .nav-dots { display: flex; gap: 6px; }
  .nav-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(255,255,255,0.15);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: background 0.2s;
  }
  .nav-dot.active { background: var(--accent); }

  /* ── Step info ── */
  .step-info {
    text-align: center;
    padding: 0 4px;
  }
  .step-title-wrap {
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.2px;
    margin-bottom: 4px;
  }
  .step-num { font-weight: 800; margin-right: 2px; }
  .step-desc {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    line-height: 1.45;
  }
  :global(.guide-panel strong) {
    color: var(--text);
    font-weight: 600;
  }

  .guide-footer { margin-top: 12px; }
  .guide-btn {
    width: 100%;
    border: none;
    border-radius: 999px;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .guide-btn:hover { opacity: 0.9; }
</style>
