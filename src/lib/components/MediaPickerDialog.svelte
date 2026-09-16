<script lang="ts">
  import CenterDialog from './CenterDialog.svelte'
  import MediaPicker from './MediaPicker.svelte'
  import type { CatalogKind } from '$lib/admin/catalogs'

  let {
    open = false,
    kind,
    current = '',
    name = '',
    accent = 'var(--accent)',
    related = [],
    onpick,
    onclose = () => {}
  }: {
    open?: boolean
    kind: CatalogKind
    current?: string
    name?: string
    accent?: string
    related?: string[]
    onpick: (url: string) => void
    onclose?: () => void
  } = $props()
</script>

<CenterDialog {open} {onclose} title={name} showClose>
  <MediaPicker {kind} {current} {accent} {related} exerciseName={name} {onpick} />
</CenterDialog>
