<script lang="ts">
  import type { FullAutoFill } from 'svelte/elements'

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
    oninput = undefined,
    onblur = undefined,
    id = undefined
  }: {
    value?: string
    placeholder?: string
    type?: 'text' | 'number'
    mono?: boolean
    disabled?: boolean
    compact?: boolean
    style?: string
    maxlength?: number
    autocomplete?: FullAutoFill
    oninput?: (val: string) => void
    onblur?: () => void
    id?: string
  } = $props()
</script>

<input
  class={mono ? 'input-field-mono' : 'input-field'}
  class:compact
  {type}
  bind:value
  {placeholder}
  {disabled}
  {style}
  {maxlength}
  {autocomplete}
  {id}
  data-component="TextInput"
  oninput={(e) => oninput?.((e.target as HTMLInputElement).value)}
  {onblur}
>

<style>
  .compact {
    padding: 7px 10px;
    font-size: 13px;
  }
</style>
