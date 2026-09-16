<script lang="ts">
  import type { Snippet } from 'svelte'

  let { eyebrow, title, action, titleExtra }: {
    eyebrow: string
    title: string
    action?: Snippet
    titleExtra?: Snippet
  } = $props()
</script>

<div class="page-header" class:with-action={!!action} data-component="PageHeader">
  <div class="min-0">
    <div class="page-header-eyebrow">{eyebrow}</div>
    <div class="page-header-title">
      {title}
      {#if titleExtra}{@render titleExtra()}{/if}
    </div>
  </div>
  {#if action}{@render action()}{/if}
</div>

<style>
  .min-0 { min-width: 0; }
  .with-action {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
</style>
