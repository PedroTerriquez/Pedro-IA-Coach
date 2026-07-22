<script lang="ts">
  let {
    value = $bindable(''),
    placeholder = '',
    type = 'text',
    mono = false,
    disabled = false,
    compact = false,
    style = ''
  }: {
    value?: string
    placeholder?: string
    type?: 'text' | 'number'
    mono?: boolean
    disabled?: boolean
    compact?: boolean
    style?: string
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
>

<style>
  .compact {
    padding: 7px 10px;
    font-size: 13px;
  }
</style>
