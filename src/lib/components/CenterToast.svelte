<script lang="ts">
  let {
    imageSrc = '',
    iconSvg = '',
    message,
    subtext = '',
    timeLabel = '',
    accent = 'var(--accent)',
    duration = 3000,
    onclose = () => {}
  }: {
    imageSrc?: string
    iconSvg?: string
    message: string
    subtext?: string
    timeLabel?: string
    accent?: string
    duration?: number
    onclose?: () => void
  } = $props()

  let closing = $state(false)

  $effect(() => {
    const t = setTimeout(() => { closing = true }, duration)
    return () => clearTimeout(t)
  })

  $effect(() => {
    if (!closing) return
    const t = setTimeout(() => onclose(), 350)
    return () => clearTimeout(t)
  })
</script>

<div class="center-toast-overlay" class:closing data-component="CenterToast">
  <div class="center-toast-body" style="color:{accent}">
    {#if imageSrc}
      <img src={imageSrc} alt="" class="toast-img" />
    {:else if iconSvg}
      <div class="toast-icon">{@html iconSvg}</div>
    {/if}
    <div class="toast-message">{message}</div>
    {#if subtext}<div class="toast-subtext">{subtext}</div>{/if}
    {#if timeLabel}
      <div class="toast-time">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
        {timeLabel}
      </div>
    {/if}
  </div>
</div>

<style>
  .center-toast-overlay {
    position: fixed;
    inset: 0;
    z-index: 300;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    animation: centerToastFadeIn 0.3s ease;
  }

  .center-toast-overlay.closing {
    transition: opacity 0.35s ease;
    opacity: 0;
  }

  .center-toast-body {
    text-align: center;
    animation: centerToastFadeUp 0.4s ease;
    max-width: 86vw;
  }

  .toast-img {
    max-width: 180px;
    max-height: 180px;
    width: auto;
    height: auto;
    border-radius: 16px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  .toast-icon {
    display: inline-flex;
  }

  .toast-message {
    margin-top: 20px;
    font-family: var(--font-sans);
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    letter-spacing: -0.5px;
  }

  .toast-subtext {
    margin-top: 14px;
    font-family: var(--font-sans);
    font-size: 16px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: -0.2px;
    line-height: 1.4;
  }

  .toast-time {
    margin-top: 10px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
  }

  @keyframes centerToastFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes centerToastFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
</style>
