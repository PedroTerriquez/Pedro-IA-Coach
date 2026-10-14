<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

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
  {#if leadSnippet}<p class="lead">{@render leadSnippet()}</p>{:else if lead}<p class="lead">{lead}</p>{/if}
</header>

<style>
  .sub-hd { display: flex; flex-direction: column; gap: 6px; padding-top: 2px; }
  .back {
    display: flex;
    align-items: center;
    gap: 2px;
    width: fit-content;
    height: 44px;
    padding: 0 14px 0 4px;
    margin-left: -10px;
    border: 0;
    background: none;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .ttl2 { font-size: 32px; font-weight: 700; letter-spacing: -1.2px; line-height: 1.05; }
  .lead { margin-top: 2px; font-size: 15px; line-height: 1.45; color: var(--text-secondary); text-wrap: pretty; }
</style>
