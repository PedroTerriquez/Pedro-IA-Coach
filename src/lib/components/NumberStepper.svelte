<script lang="ts">
  import StepButton from './StepButton.svelte'
  import type { Snippet } from 'svelte'

  let {
    display = '',
    label = '',
    unit = '',
    name = '',
    framed = false,
    layout = 'inline',
    size = 'md',
    accent = 'var(--accent)',
    tintedInc = false,
    decimals = false,
    decDisabled = false,
    incDisabled = false,
    inputClass = '',
    inputStyle = '',
    onfocus = undefined,
    onstep,
    oninput = undefined,
    note
  }: {
    display?: string
    label?: string
    unit?: string
    name?: string
    framed?: boolean
    layout?: 'inline' | 'stacked'
    size?: 'sm' | 'md' | 'lg'
    accent?: string
    tintedInc?: boolean
    decimals?: boolean
    decDisabled?: boolean
    incDisabled?: boolean
    inputClass?: string
    inputStyle?: string
    onfocus?: (e: FocusEvent) => void
    onstep: (dir: 1 | -1) => void
    oninput?: (e: Event) => void
    note?: Snippet
  } = $props()
</script>

{#snippet dec()}
  <StepButton dir="dec" {size} {accent} disabled={decDisabled} label={name ? `Menos ${name}` : undefined} onclick={() => onstep(-1)} />
{/snippet}
{#snippet inc()}
  <StepButton dir="inc" {size} {accent} tinted={tintedInc} disabled={incDisabled} label={name ? `Más ${name}` : undefined} onclick={() => onstep(1)} />
{/snippet}
{#snippet field()}
  <input
    class="ns-input {inputClass}"
    style={inputStyle}
    value={display}
    {oninput}
    {onfocus}
    readonly={!oninput}
    placeholder="0"
    inputmode={decimals ? 'decimal' : 'numeric'}
    aria-label={name || label}
  >
{/snippet}

<div class="ns {layout} size-{size}" class:framed data-component="NumberStepper">
  {#if layout === 'stacked'}
    {#if label}<div class="ns-label">{label}{#if unit}<span class="ns-unit-inline"> · {unit}</span>{/if}</div>{/if}
    {@render field()}
    {#if note}{@render note()}{/if}
    <div class="ns-steps">
      {@render dec()}
      {@render inc()}
    </div>
  {:else}
    {@render dec()}
    <div class="ns-val">
      {@render field()}
      {#if unit}<span class="ns-unit">{unit}</span>{/if}
      {#if note}{@render note()}{/if}
    </div>
    {@render inc()}
  {/if}
</div>

<style>
  .ns.inline {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .ns.inline.size-lg {
    gap: 12px;
    justify-content: space-between;
    position: relative;
    z-index: 1;
  }
  .ns.framed {
    background: rgba(0,0,0,0.25);
    border: 0.5px solid rgba(255,255,255,0.07);
    border-radius: var(--radius-md);
    padding: 5px;
  }
  .ns.stacked {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }
  .ns.stacked.framed {
    border-radius: 11px;
    padding: 8px 6px 7px;
  }
  .ns-steps {
    display: flex;
    gap: 5px;
    width: 100%;
  }
  .ns-val {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }
  .ns.size-lg .ns-val {
    gap: 3px;
  }
  .ns-input {
    width: 100%;
    background: transparent;
    border: 0;
    outline: none;
    text-align: center;
    font-family: var(--font-mono);
    font-weight: 500;
    color: var(--text);
    line-height: 1;
    padding: 0;
  }
  .ns.size-sm .ns-input {
    font-size: 24px;
    letter-spacing: -1px;
  }
  .ns.size-md .ns-input {
    font-size: clamp(16px, 5.3vw, 21px);
    letter-spacing: -0.8px;
  }
  .ns.size-lg .ns-input {
    font-size: 48px;
    letter-spacing: -2.2px;
  }
  .ns-unit {
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 1.1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .ns-label {
    font-family: var(--font-mono);
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: var(--text-muted);
  }
  .ns-unit-inline {
    opacity: 0.7;
  }
</style>
