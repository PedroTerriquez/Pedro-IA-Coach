<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  // A 68 px choice inside a sheet: icon (or a custom lead), what it is, what it does, chevron.
  let { icon = '', lead, title, desc = '', id = undefined, chevron = true, onclick, ...rest }: {
    icon?: string
    lead?: Snippet
    title: string
    desc?: string
    id?: string
    chevron?: boolean
    onclick: () => void
    [key: string]: unknown
  } = $props()
</script>

<button {id} type="button" class="opt" class:nochev={!chevron} data-component="ChoiceCard" {onclick} {...rest}>
  {#if lead}{@render lead()}{:else}<Icon name={icon} size={22} />{/if}
  <span class="min0"><b>{title}</b>{#if desc}<span class="d">{desc}</span>{/if}</span>
  {#if chevron}<span class="chev"><Icon name="chev" size={16} /></span>{/if}
</button>

<style>
  .opt {
    display: grid;
    grid-template-columns: 28px minmax(0, 1fr) 16px;
    align-items: center;
    gap: 16px;
    width: 100%;
    min-height: 68px;
    padding: 12px 18px;
    border: 0;
    border-radius: var(--radius-lg);
    background: var(--cv-fill-5);
    color: var(--text);
    font-family: var(--font-sans);
    text-align: left;
    cursor: pointer;
  }
  .opt.nochev { grid-template-columns: 28px minmax(0, 1fr); }
  .min0 { min-width: 0; }
  b { display: block; font-size: 17px; font-weight: 600; letter-spacing: -0.2px; }
  .d { display: block; font-size: 13px; line-height: 1.4; color: var(--text-tertiary); margin-top: 3px; text-wrap: pretty; }
  .chev { display: grid; color: var(--text-muted); }
</style>
