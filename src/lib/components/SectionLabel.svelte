<script lang="ts">
  import type { Snippet } from 'svelte'

  // `accent` stays accepted for the views that still pass it; the new label has no accent bar.
  // `sentence` drops the uppercase treatment (used across Tú, where caps are being removed).
  let { children, right, sentence = false }: {
    children?: Snippet
    right?: Snippet
    accent?: string
    sentence?: boolean
  } = $props()
</script>

<div class="section-label" data-component="SectionLabel">
  <span class="lbl" class:sentence>{#if children}{@render children()}{/if}</span>
  {#if right}<span class="right">{@render right()}</span>{/if}
</div>

<style>
  .section-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 24px;
    padding: 0 4px;
  }
  .lbl {
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 1.4px;
    text-transform: uppercase;
    color: var(--text-tertiary);
    white-space: nowrap;
  }
  .lbl.sentence {
    font-family: var(--font-sans);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0;
    text-transform: none;
    color: var(--text-secondary);
  }
  .right {
    font-size: 12px;
    color: var(--text-muted);
    white-space: nowrap;
  }
</style>
