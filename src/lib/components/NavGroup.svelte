<script lang="ts">
  import type { Snippet } from 'svelte'
  import SectionLabel from './SectionLabel.svelte'

  let { label = '', tone = 'surface', id = undefined, children }: {
    label?: string
    /** surface = card on --surface · sheet = 4 % fill, for groups inside a sheet or the editor */
    tone?: 'surface' | 'sheet'
    id?: string
    children?: Snippet
  } = $props()
</script>

<section {id} class="sec" data-component="NavGroup">
  {#if label}<SectionLabel sentence>{label}</SectionLabel>{/if}
  <div class="grp {tone}">{@render children?.()}</div>
</section>

<style>
  .sec { display: flex; flex-direction: column; gap: 10px; }
  .grp { display: flex; flex-direction: column; border-radius: var(--radius-xl); overflow: hidden; background: var(--surface); }
  .grp.sheet { background: var(--cv-fill-1); }
  .grp > :global(* + *) { border-top: 0.5px solid var(--border-medium); }
</style>
