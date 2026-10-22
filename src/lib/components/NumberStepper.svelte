<script lang="ts">
  import Icon from './Icon.svelte'

  // 58 circles + 56 figure (40 with sm), no keyboard unless `oninput` (Compartidos · Nuevo)
  let {
    display = '',
    label = '',
    unit = '',
    name = '',
    decLabel = '',
    incLabel = '',
    size = 'md',
    decDisabled = false,
    incDisabled = false,
    repeat = false,
    tapToType = false,
    decimals = false,
    onfocus = undefined,
    onstep,
    oninput = undefined,
    ondone = undefined
  }: {
    display?: string
    label?: string
    unit?: string
    name?: string
    /** Overrides «Menos {name}» / «Más {name}» */
    decLabel?: string
    incLabel?: string
    size?: 'sm' | 'md'
    decDisabled?: boolean
    incDisabled?: boolean
    /** Holding − / + keeps stepping, faster the longer it is held */
    repeat?: boolean
    /** With `oninput`: the figure shows until tapped, then turns into the field */
    tapToType?: boolean
    decimals?: boolean
    onfocus?: (e: FocusEvent) => void
    onstep: (dir: 1 | -1) => void
    oninput?: (e: Event) => void
    /** The field closes (blur or Enter) */
    ondone?: () => void
  } = $props()

  const HOLD_START_MS = 380
  const HOLD_MIN_MS = 70
  let holdId: ReturnType<typeof setTimeout> | null = null
  let typing = $state(false)
  let field = $state<HTMLInputElement | null>(null)

  let showField = $derived(!!oninput && (!tapToType || typing))

  function holdStart(e: PointerEvent, dir: 1 | -1) {
    e.preventDefault()
    holdStop()
    onstep(dir)
    let delay = HOLD_START_MS
    const again = () => {
      onstep(dir)
      delay = Math.max(HOLD_MIN_MS, delay * 0.8)
      holdId = setTimeout(again, delay)
    }
    holdId = setTimeout(again, delay)
  }

  function holdStop() {
    if (holdId) { clearTimeout(holdId); holdId = null }
  }

  // With `repeat` the pointer steps; a click without a pointer (keyboard) still does
  function clicked(e: MouseEvent, dir: 1 | -1) {
    if (!repeat || e.detail === 0) onstep(dir)
  }

  function startTyping() {
    typing = true
  }

  function stopTyping() {
    typing = false
    ondone?.()
  }

  function focused(e: FocusEvent) {
    if (tapToType) (e.target as HTMLInputElement).select()
    onfocus?.(e)
  }

  $effect(() => { if (typing) field?.focus() })
  $effect(() => holdStop)
</script>

{#snippet stepButton(dir: 1 | -1)}
  <button
    type="button"
    aria-label={(dir < 0 ? decLabel : incLabel) || (dir < 0 ? (name ? `Menos ${name}` : 'Menos') : (name ? `Más ${name}` : 'Más'))}
    disabled={dir < 0 ? decDisabled : incDisabled}
    onclick={(e) => clicked(e, dir)}
    onpointerdown={repeat ? (e) => holdStart(e, dir) : undefined}
    onpointerup={repeat ? holdStop : undefined}
    onpointerleave={repeat ? holdStop : undefined}
    onpointercancel={repeat ? holdStop : undefined}
  ><Icon name={dir < 0 ? 'minus' : 'plus'} size={22} /></button>
{/snippet}

<div class="stp58" class:sm={size === 'sm'} class:repeat data-component="NumberStepper">
  {@render stepButton(-1)}
  {#if showField}
    <label class="stp58-field">
      <input
        bind:this={field}
        value={display}
        {oninput}
        onfocus={focused}
        onblur={tapToType ? stopTyping : undefined}
        onkeydown={tapToType ? (e) => e.key === 'Enter' && stopTyping() : undefined}
        inputmode={decimals ? 'decimal' : 'numeric'}
        pattern={decimals ? '[0-9.]*' : '[0-9]*'}
        placeholder="0"
        aria-label={name || label}
        style={tapToType ? `width:${Math.max(2, display.length) + 0.6}ch` : undefined}
      >{#if unit}<small>{unit}</small>{/if}
    </label>
  {:else if tapToType && oninput}
    <b role="button" tabindex="0" aria-label="Escribir {name || label}" onclick={startTyping} onkeydown={(e) => e.key === 'Enter' && startTyping()}>{display}{#if unit}<small>{unit}</small>{/if}</b>
  {:else}
    <b aria-live="polite">{display}{#if unit}<small>{unit}</small>{/if}</b>
  {/if}
  {@render stepButton(1)}
</div>

<style>
  .stp58 { display: grid; grid-template-columns: 58px minmax(0, 1fr) 58px; align-items: center; }
  .stp58 button {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    border: 0;
    background: var(--cv-fill-3);
    color: var(--text);
    display: grid;
    place-items: center;
    cursor: pointer;
  }
  .stp58 button:disabled { opacity: 0.3; cursor: default; }
  .stp58.repeat button { touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
  .stp58 b {
    text-align: center;
    font-family: var(--font-mono);
    font-size: 56px;
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text);
    white-space: nowrap;
  }
  .stp58 b small {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 500;
    letter-spacing: 0;
    margin-left: 4px;
    color: var(--text-tertiary);
  }
  .stp58.sm b { font-size: 40px; }
  .stp58-field { display: flex; align-items: baseline; justify-content: center; min-width: 0; }
  .stp58-field input {
    width: 3.2ch;
    min-width: 0;
    padding: 0;
    border: 0;
    background: none;
    text-align: center;
    font-family: var(--font-mono);
    font-size: 56px;
    font-weight: 500;
    letter-spacing: -0.06em;
    line-height: 1;
    color: var(--text);
    outline: none;
  }
  .stp58.sm .stp58-field input { font-size: 40px; }
  .stp58-field small {
    font-family: var(--font-sans);
    font-size: 17px;
    font-weight: 500;
    margin-left: 4px;
    color: var(--text-tertiary);
  }
</style>
