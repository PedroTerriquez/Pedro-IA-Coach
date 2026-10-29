<script lang="ts">
  import type { Snippet } from 'svelte'
  import SegmentedControl from './SegmentedControl.svelte'
  import BottomDock from './BottomDock.svelte'

  // Historial's dock (Historial · Nuevo): the Días / Ejercicios switch in the
  // thumb zone, with an optional caption and main button over it.
  let { value = $bindable(), options, label, caption = '', onchange, children }: {
    value: string
    options: { label: string; value: string }[]
    label: string
    caption?: string
    onchange?: (value: string) => void
    children?: Snippet
  } = $props()
</script>

<BottomDock {caption} name="ViewSwitchDock">
  {@render children?.()}
  <SegmentedControl size="tabs" {label} {options} bind:value {onchange} />
</BottomDock>
