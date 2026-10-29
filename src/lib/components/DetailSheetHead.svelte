<script lang="ts">
  import type { Snippet } from 'svelte'
  import { online } from '$lib/stores/network'
  import SheetCloseButton from './SheetCloseButton.svelte'
  import OfflineBanner from './OfflineBanner.svelte'

  // Grab handle, close ↓ and the position («Empuje · 1 de 3»). Offline, the
  // position gives its place to the offline notice. DetailSheet drags it to close.
  let {
    onclose,
    position,
  }: {
    onclose: () => void
    position?: Snippet
  } = $props()
</script>

<div class="grab" aria-hidden="true"></div>
<div class="dsh" data-component="DetailSheetHead">
  <SheetCloseButton onclick={onclose} />
  <div class="dsh-pos">
    {#if !$online}<OfflineBanner inline />{:else if position}<span class="pos-t">{@render position()}</span>{/if}
  </div>
  <span></span>
</div>

<style>
  .grab { width: 36px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.18); margin: 8px auto 0; flex-shrink: 0; }
  .dsh { display: grid; grid-template-columns: 88px minmax(0, 1fr) 88px; align-items: center; min-height: 52px; padding: 2px 10px 0; flex-shrink: 0; }
  .dsh-pos { display: flex; justify-content: center; min-width: 0; text-align: center; font-size: 14px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pos-t { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .dsh-pos :global(b) { color: var(--text); font-weight: 600; }
</style>
