<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children?: Snippet } = $props()
</script>

<span class="tag" data-component="Tag">{@render children?.()}</span>

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    height: 28px;
    padding: 0 12px;
    border-radius: var(--radius-full);
    background: var(--cv-fill-3);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }
</style>
