<script lang="ts">
  import type { Snippet } from 'svelte'
  import BottomDock from './BottomDock.svelte'

  let { caption = '', children }: {
    caption?: string
    children?: Snippet
  } = $props()
</script>

<BottomDock {caption} space={96} name="NextStepDock">{@render children?.()}</BottomDock>
