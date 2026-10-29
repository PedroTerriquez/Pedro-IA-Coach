<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'
  import Lead from './Lead.svelte'

  let { title, back = 'Tú', onback, lead = '', leadSnippet }: {
    title: string
    /** Label of the screen it returns to */
    back?: string
    onback: () => void
    lead?: string
    /** Lead with markup (e.g. a counter with its own id) */
    leadSnippet?: Snippet
  } = $props()
</script>

<header class="sub-hd" data-component="SubpageHeader">
  <button type="button" class="back" onclick={onback}><Icon name="back" size={20} />{back}</button>
  <h1 class="ttl2">{title}</h1>
  {#if leadSnippet}<Lead style="margin-top:2px">{@render leadSnippet()}</Lead>{:else if lead}<Lead style="margin-top:2px">{lead}</Lead>{/if}
</header>

<style>
  .sub-hd { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; }
  .back {
    display: flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
    height: 48px;
    min-width: 72px;
    padding: 0 16px 0 4px;
    border: 0;
    background: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    border-radius: var(--radius-md);
  }
  .back:active {
    background: var(--cv-fill-2);
    color: var(--text);
  }
  .ttl2 { font-size: 32px; font-weight: 700; letter-spacing: -1.2px; line-height: 1.05; }
</style>
