<script lang="ts">
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  let {
    label,
    value = undefined,
    sub = '',
    id = undefined,
    danger = false,
    disabled = false,
    ai = false,
    aiTag = 'Gratis',
    strong = false,
    chevron = true,
    control,
    trailing,
    onclick = undefined
  }: {
    label: string
    /** null = missing value → «Agregar»; undefined = no value */
    value?: string | number | null
    sub?: string
    id?: string
    danger?: boolean
    disabled?: boolean
    /** AI entry row: spark + «Gratis» tag + accent wash */
    ai?: boolean
    aiTag?: string
    /** Bolder label (editor day rows) */
    strong?: boolean
    chevron?: boolean
    /** Interactive control (switch, segmented): the row itself is not a button */
    control?: Snippet
    /** Decorative content in place of the value (e.g. a colour swatch) */
    trailing?: Snippet
    onclick?: () => void
  } = $props()
</script>

{#snippet text()}
  <span class="txt">
    <span class="nr-l" class:strong>
      {#if ai}<span class="ai-i"><Icon name="spark" size={14} /></span>{/if}
      {label}
      {#if ai && aiTag}<span class="ai-tag">{aiTag}</span>{/if}
    </span>
    {#if sub}<span class="nr-s">{sub}</span>{/if}
  </span>
{/snippet}

{#if control}
  <div {id} class="nr" class:danger class:dis={disabled} class:ai data-component="NavRow">
    {@render text()}
    <span class="ctrl">{@render control()}</span>
  </div>
{:else}
  <button {id} type="button" class="nr" class:danger class:dis={disabled} class:ai {disabled} {onclick} data-component="NavRow">
    {@render text()}
    {#if trailing}
      <span class="trail">{@render trailing()}</span>
    {:else if value === null}
      <span class="nr-v add">Agregar</span>
    {:else if value !== undefined && value !== ''}
      <span class="nr-v">{value}</span>
    {:else}
      <span></span>
    {/if}
    {#if chevron}<span class="chev"><Icon name="chev" size={16} /></span>{:else}<span></span>{/if}
  </button>
{/if}

<style>
  .nr {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 56px;
    padding: 8px 14px 8px 16px;
    border: 0;
    background: none;
    color: var(--text);
    text-align: left;
    font: inherit;
    cursor: pointer;
  }
  div.nr { grid-template-columns: minmax(0, 1fr) auto; cursor: default; }
  .txt { min-width: 0; }
  .nr-l { display: flex; align-items: center; gap: 7px; font-size: 16px; font-weight: 500; letter-spacing: -0.2px; }
  .nr-l.strong { font-weight: 600; }
  .nr-s { display: block; margin-top: 3px; font-size: 13px; line-height: 1.35; color: var(--text-tertiary); text-wrap: pretty; }
  .nr-v { font-family: var(--font-mono); font-size: 15px; letter-spacing: -0.02em; color: var(--text-secondary); white-space: nowrap; }
  .nr-v.add { font-family: var(--font-sans); font-weight: 600; letter-spacing: -0.1px; color: var(--text); }
  .trail, .ctrl { display: flex; align-items: center; }
  .chev { display: grid; color: var(--text-muted); flex-shrink: 0; }
  .danger .nr-l { color: var(--cv-danger-text); }
  .dis { opacity: 0.4; cursor: default; }
  .ai { background: linear-gradient(90deg, var(--cv-accent-row), transparent 80%); }
  .ai-i { display: grid; place-items: center; color: var(--accent); flex-shrink: 0; }
  .ai-tag {
    display: inline-flex;
    align-items: center;
    height: 20px;
    margin-left: 2px;
    padding: 0 8px;
    border-radius: var(--radius-full);
    background: var(--cv-accent-tag);
    color: var(--accent);
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 500;
    letter-spacing: 0.6px;
    text-transform: uppercase;
    white-space: nowrap;
  }
</style>
