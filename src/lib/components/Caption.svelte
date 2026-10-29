<script lang="ts">
  import type { Snippet } from 'svelte'

  // Small centered hint under a control or a dock («Se aplica al tocar»).
  // `oneLine` cuts with … instead of wrapping; `style` for the per-view spacing.
  let { children, oneLine = false, style = '' }: {
    children?: Snippet
    oneLine?: boolean
    style?: string
  } = $props()
</script>

<p class="cap" class:one-line={oneLine} {style} data-component="Caption">{#if children}{@render children()}{/if}</p>

<style>
  .cap { font-size: 13px; line-height: 1.45; color: var(--text-tertiary); text-align: center; text-wrap: pretty; }
  .one-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
