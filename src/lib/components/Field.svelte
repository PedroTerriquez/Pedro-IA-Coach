<script lang="ts">
  import type { Snippet } from 'svelte'

  // A form field: small label on top, the control below. `tag="label"` when the
  // control is a single input; other attributes (data-component, style) pass through.
  let { label = '', tag = 'div', children, ...rest }: {
    label?: string
    tag?: 'div' | 'label'
    children?: Snippet
    [attr: string]: unknown
  } = $props()
</script>

<svelte:element this={tag} class="fw" data-component="Field" {...rest}>
  {#if label}<span class="fl">{label}</span>{/if}
  {#if children}{@render children()}{/if}
</svelte:element>

<style>
  .fw { display: flex; flex-direction: column; gap: 8px; }
  .fl { font-size: 13px; color: var(--text-tertiary); padding-left: 4px; }
</style>
