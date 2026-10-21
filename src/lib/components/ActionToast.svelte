<script lang="ts">
  import { fly } from 'svelte/transition'
  import Button from './Button.svelte'

  // A notice with one way back, in the thumb zone over the TabBar
  // («Listo. Tu semana se corrió un día. [Restablecer]»).
  let { visible = false, message, action, id = undefined, onaction }: {
    visible?: boolean
    message: string
    action: string
    id?: string
    onaction: () => void
  } = $props()
</script>

{#if visible}
  <div {id} class="toast" role="status" data-component="ActionToast" transition:fly={{ y: 20, duration: 200 }}>
    <span>{message}</span>
    <Button variant="secondary" size="pill" onclick={onaction}>{action}</Button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 104px;
    z-index: 30;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 8px 8px 8px 18px;
    border-radius: var(--radius-xl);
    background: #1c1c1c;
    border: 0.5px solid var(--border-medium);
    box-shadow: 0 -12px 32px rgba(10, 10, 10, 0.9);
    font-size: 15px;
  }
  span { flex: 1; min-width: 0; line-height: 1.35; }
  /* app.css has a global mono uppercase `.pill` (tags) that Button's pill size also matches */
  .toast :global(.pill) { font-family: var(--font-sans); letter-spacing: normal; text-transform: none; }
</style>
