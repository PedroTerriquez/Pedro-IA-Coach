<script lang="ts">
  import type { Snippet } from 'svelte'
  import Caption from './Caption.svelte'

  // The detail sheet's dock: one-line caption + one or two 56 buttons
  // (`timer` = 112 + rest, `even` = two shares), or the search field.
  let { caption = '', layout = 'one', children }: {
    caption?: string
    layout?: 'one' | 'timer' | 'even' | 'search'
    children: Snippet
  } = $props()
</script>

<div class="dock" data-component="LogDock">
  {#if caption}<Caption oneLine>{caption}</Caption>{/if}
  <div class="row {layout}">{@render children()}</div>
</div>

<style>
  .dock {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 28px 20px max(34px, env(safe-area-inset-bottom, 0px));
    background: linear-gradient(to bottom, transparent, var(--surface) 26px);
  }
  .row { display: grid; gap: 8px; }
  .row.one { grid-template-columns: minmax(0, 1fr); }
  .row.timer { grid-template-columns: 112px minmax(0, 1fr); }
  .row.even { grid-template-columns: minmax(0, 1fr) minmax(0, 1.5fr); }
  .row.search { display: block; }
  .row.search { background: var(--surface); }
  /* Labels never wrap: a long name ends in «…» */
  .row :global([data-component="Button"]) { min-width: 0; width: 100%; padding: 0 14px; }
  .row :global(.one-line) { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .row :global(.mono) { font-family: var(--font-mono); letter-spacing: -0.03em; }
</style>
