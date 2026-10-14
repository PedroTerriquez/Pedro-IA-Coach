<script lang="ts">
  import type { Snippet } from 'svelte'

  let { message = '', title = '', text = '', variant = 'card', actions, style = '', class: className = '', id = undefined }: {
    /** Old one-line empty state (debt) */
    message?: string
    /** New empty state: title + what to do */
    title?: string
    text?: string
    /** card = dashed card (first time, title 22) · center = no results (title 18) */
    variant?: 'card' | 'center'
    actions?: Snippet
    style?: string
    class?: string
    id?: string
  } = $props()
</script>

{#if title}
  <div {id} class="empty-v2 v-{variant} {className}" data-component="EmptyState" {style}>
    <h3>{title}</h3>
    {#if text}<p>{text}</p>{/if}
    {#if actions}<div class="acts">{@render actions()}</div>{/if}
  </div>
{:else}
  <div {id} class="empty-state {className}" data-component="EmptyState" {style}>
    {message}
  </div>
{/if}

<style>
  .empty-state {
    padding: 40px 20px;
    text-align: center;
    font-size: 13px;
    color: rgba(255,255,255,0.4);
  }

  .empty-v2 { display: flex; flex-direction: column; }
  .v-card {
    gap: 12px;
    padding: 24px 20px 20px;
    border-radius: var(--radius-2xl);
    border: 1px dashed var(--cv-line-dashed);
  }
  .v-card h3 { font-size: 22px; font-weight: 700; letter-spacing: -0.6px; line-height: 1.15; text-wrap: balance; }
  .v-card p { font-size: 15px; line-height: 1.5; color: var(--text-secondary); text-wrap: pretty; }
  .v-card .acts { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; margin-top: 6px; }
  .v-center { align-items: center; text-align: center; gap: 10px; padding: 24px 8px; }
  .v-center h3 { font-size: 18px; font-weight: 600; letter-spacing: -0.3px; }
  .v-center p { font-size: 14px; line-height: 1.5; color: var(--text-tertiary); max-width: 290px; text-wrap: pretty; }
  .v-center .acts { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 6px; }
</style>
