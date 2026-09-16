<script lang="ts">
  let {
    dir = 'inc',
    size = 'md',
    accent = 'var(--accent)',
    tinted = false,
    disabled = false,
    label = '',
    onclick = undefined
  }: {
    dir?: 'inc' | 'dec'
    size?: 'sm' | 'md' | 'lg'
    accent?: string
    tinted?: boolean
    disabled?: boolean
    label?: string
    onclick?: () => void
  } = $props()
</script>

<button
  type="button"
  class="step-btn {size}"
  data-component="StepButton"
  aria-label={label}
  {disabled}
  {onclick}
  style={tinted ? `color:${accent};background:${accent}18;border-color:${accent}44` : ''}
>
  {dir === 'inc' ? '+' : '−'}
</button>

<style>
  .step-btn {
    background: rgba(255,255,255,0.06);
    border: 0.5px solid rgba(255,255,255,0.1);
    color: var(--text);
    font-family: var(--font-mono);
    font-weight: 400;
    cursor: pointer;
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: manipulation;
    flex-shrink: 0;
    transition: all 0.15s;
  }
  .step-btn:disabled {
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.2);
    cursor: default;
  }
  .sm {
    flex: 1;
    height: 30px;
    border-radius: 8px;
    font-size: 17px;
  }
  .md {
    width: clamp(28px, 8.5vw, 34px);
    height: 38px;
    border-radius: 9px;
    font-size: 18px;
  }
  .lg {
    width: 54px;
    height: 54px;
    border-radius: 50%;
    background: var(--border);
    font-family: var(--font-sans);
    font-size: 28px;
  }
</style>
