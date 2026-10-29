<script lang="ts">
  import Icon from './Icon.svelte'

  // The one close control for sheets: a chevron ↓ that "lowers" the sheet.
  let { onclick, floating = false }: {
    onclick: () => void
    /** Old sheets without a header: pinned over the backdrop, on a blurred circle */
    floating?: boolean
  } = $props()
</script>

<button type="button" class="close" class:floating aria-label="Cerrar" data-component="SheetCloseButton" {onclick}>
  <Icon name="down" size={20} />
</button>

<style>
  .close {
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 50%;
    background: none;
    color: var(--text-tertiary);
    display: grid;
    place-items: center;
    cursor: pointer;
    padding: 0;
  }
  .close.floating {
    position: absolute;
    top: max(8px, env(safe-area-inset-top, 8px));
    right: 8px;
    z-index: 110;
    border: 0.5px solid var(--border-medium);
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: var(--text-secondary);
  }
</style>
