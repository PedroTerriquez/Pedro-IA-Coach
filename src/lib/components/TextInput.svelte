<script lang="ts">
  import type { FullAutoFill } from 'svelte/elements'
  import Field from './Field.svelte'

  let {
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    mono = false,
    disabled = false,
    compact = false,
    style = '',
    maxlength = undefined,
    autocomplete = undefined,
    list = undefined,
    oninput = undefined,
    onblur = undefined,
    onkeydown = undefined,
    id = undefined,
    autofocus = false,
    variant = 'default',
    label = '',
    unit = '',
    error = '',
    inputmode = undefined
  }: {
    value?: string
    placeholder?: string
    type?: 'text' | 'number' | 'password' | 'url'
    mono?: boolean
    disabled?: boolean
    compact?: boolean
    style?: string
    maxlength?: number
    autocomplete?: FullAutoFill
    list?: string
    oninput?: (val: string) => void
    onblur?: () => void
    onkeydown?: (e: KeyboardEvent) => void
    id?: string
    autofocus?: boolean
    /** default = old global input (debt) · field = 52 field with label / unit / error (Compartidos · Nuevo) */
    variant?: 'default' | 'field'
    label?: string
    unit?: string
    error?: string
    inputmode?: 'text' | 'numeric' | 'decimal' | 'url'
  } = $props()

  let inputEl: HTMLInputElement | null = $state(null)

  $effect(() => {
    if (autofocus) inputEl?.focus()
  })
</script>

{#if variant === 'field'}
  <Field tag="label" {label} data-component="TextInput">
    <span class="field" class:is-error={!!error} class:is-disabled={disabled}>
      <input
        bind:this={inputEl}
        class:mono
        {type}
        bind:value
        {placeholder}
        {disabled}
        {maxlength}
        {autocomplete}
        {list}
        {id}
        {inputmode}
        aria-invalid={!!error}
        oninput={(e) => oninput?.((e.target as HTMLInputElement).value)}
        {onblur}
        {onkeydown}
      >
      {#if unit}<span class="fu">{unit}</span>{/if}
    </span>
    {#if error}<span class="ferr" role="alert">{error}</span>{/if}
  </Field>
{:else}
  <input
    bind:this={inputEl}
    class={mono ? 'input-field-mono' : 'input-field'}
    class:compact
    {type}
    bind:value
    {placeholder}
    {disabled}
    {style}
    {maxlength}
    {autocomplete}
    {list}
    {id}
    data-component="TextInput"
    oninput={(e) => oninput?.((e.target as HTMLInputElement).value)}
    {onblur}
    {onkeydown}
  >
{/if}

<style>
  .compact {
    padding: 7px 10px;
    font-size: 13px;
  }

  /* ── Compartidos · Nuevo: field ── */
  .field {
    display: flex;
    align-items: center;
    gap: 10px;
    height: 52px;
    padding: 0 16px;
    border-radius: var(--cv-radius-field);
    background: var(--cv-fill-2);
    min-width: 0;
    transition: box-shadow 0.15s;
  }
  .field:focus-within { box-shadow: inset 0 0 0 1px var(--cv-ring-focus); }
  .field.is-error { box-shadow: inset 0 0 0 1px var(--cv-danger-text); }
  .field.is-disabled { opacity: 0.4; }
  .field input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text);
    caret-color: var(--accent);
    font-family: var(--font-sans);
    font-size: 17px;
  }
  .field input::placeholder { color: var(--text-muted); }
  .field input.mono { font-family: var(--font-mono); font-size: 16px; letter-spacing: -0.03em; }
  .fu { font-size: 15px; color: var(--text-tertiary); }
  .ferr { font-size: 13px; color: var(--cv-danger-text); padding-left: 4px; }
</style>
