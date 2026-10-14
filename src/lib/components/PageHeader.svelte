<script lang="ts">
  import type { Snippet } from 'svelte'

  let { eyebrow, title, sub = '', action, titleExtra }: {
    eyebrow: string
    title: string
    /** Optional secondary line under the title (15 px) */
    sub?: string
    action?: Snippet
    titleExtra?: Snippet
  } = $props()
</script>

<div class="page-header with-action" data-component="PageHeader">
  <div class="min-0">
    <div class="page-header-eyebrow">{eyebrow}</div>
    <div class="page-header-title">
      {title}
      {#if titleExtra}{@render titleExtra()}{/if}
    </div>
    {#if sub}<div class="page-header-sub">{sub}</div>{/if}
  </div>
  {#if action}{@render action()}{/if}
</div>

<style>
  .min-0 { min-width: 0; flex: 1; }
  .with-action {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
  .page-header-sub {
    font-size: 15px;
    line-height: 1.45;
    color: var(--text-secondary);
    margin-top: 8px;
    text-wrap: pretty;
  }
</style>
