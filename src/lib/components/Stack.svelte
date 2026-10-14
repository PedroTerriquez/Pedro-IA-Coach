<script lang="ts">
  import type { Snippet } from 'svelte'

  // Flex column with an explicit gap: the stacked-list pattern repeated across views.
  let { gap = 8, id = undefined, class: className = undefined, style = undefined, role = undefined, ariaLabel = undefined, children }: {
    gap?: number
    id?: string
    class?: string
    style?: string
    role?: string
    ariaLabel?: string
    children?: Snippet
  } = $props()
</script>

<div {id} {role} aria-label={ariaLabel} class="stack{className ? ` ${className}` : ''}" style="gap:{gap}px;{style ?? ''}">
  {@render children?.()}
</div>

<style>
  .stack { display: flex; flex-direction: column; }
</style>
